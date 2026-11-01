import { execFile } from 'child_process';
import { promisify } from 'util';
import fs from 'fs/promises';
import { PDFDocument, PDFName } from 'pdf-lib';
import { CompressionJobData } from '../types';
import { getTargetSizeBytes, isTargetAlreadySatisfied, preserveOriginal } from '../optimization';

const execFileAsync = promisify(execFile);

export interface ProcessResult {
  outputFilePath: string;
  compressedSize: number;
  /** Actual encoded MIME type; omitted when it is identical to the upload MIME type. */
  mimeType?: string;
}

type GhostscriptProfile = {
  pdfSettings: '/screen' | '/ebook' | '/printer';
  dpi: number;
  jpegQuality: number;
  monoDpi: number;
};

function getGhostscriptProfiles(level: 'high' | 'medium' | 'low'): GhostscriptProfile[] {
  const profiles: Record<'high' | 'medium' | 'low', GhostscriptProfile[]> = {
    high: [
      { pdfSettings: '/screen', dpi: 96, jpegQuality: 60, monoDpi: 150 },
      { pdfSettings: '/screen', dpi: 72, jpegQuality: 52, monoDpi: 150 },
      { pdfSettings: '/screen', dpi: 60, jpegQuality: 44, monoDpi: 120 },
      { pdfSettings: '/screen', dpi: 48, jpegQuality: 36, monoDpi: 120 },
      { pdfSettings: '/screen', dpi: 36, jpegQuality: 28, monoDpi: 120 },
    ],
    medium: [
      { pdfSettings: '/ebook', dpi: 150, jpegQuality: 76, monoDpi: 300 },
      { pdfSettings: '/ebook', dpi: 120, jpegQuality: 68, monoDpi: 240 },
      { pdfSettings: '/screen', dpi: 96, jpegQuality: 60, monoDpi: 150 },
      { pdfSettings: '/screen', dpi: 72, jpegQuality: 52, monoDpi: 150 },
      { pdfSettings: '/screen', dpi: 60, jpegQuality: 44, monoDpi: 120 },
      { pdfSettings: '/screen', dpi: 48, jpegQuality: 36, monoDpi: 120 },
    ],
    low: [
      { pdfSettings: '/printer', dpi: 220, jpegQuality: 88, monoDpi: 300 },
      { pdfSettings: '/printer', dpi: 200, jpegQuality: 84, monoDpi: 300 },
      { pdfSettings: '/ebook', dpi: 150, jpegQuality: 76, monoDpi: 300 },
    ],
  };
  return profiles[level] || profiles.medium;
}

function hasNonEmptyPdfObject(document: PDFDocument, value: any): boolean {
  if (value === undefined || value === null) return false;
  try {
    const resolved = document.context.lookup(value) as any;
    if (!resolved || String(resolved) === 'null') return false;

    // pdf-lib represents arrays with size() and dictionaries with entries().
    // Use structural checks to avoid relying on classes not re-exported by
    // the public pdf-lib package entry point.
    if (typeof resolved.size === 'function') return resolved.size() > 0;
    if (typeof resolved.entries === 'function') return resolved.entries().length > 0;
    return true;
  } catch {
    // Unknown or malformed objects are treated conservatively.
    return true;
  }
}

async function inspectPdf(filePath: string): Promise<{ pageCount: number; hasInteractiveContent: boolean }> {
  const bytes = await fs.readFile(filePath);
  if (bytes.length < 8 || bytes.subarray(0, 5).toString('ascii') !== '%PDF-') {
    throw new Error('File does not contain a valid PDF header.');
  }

  const document = await PDFDocument.load(bytes, {
    ignoreEncryption: false,
    updateMetadata: false,
  });
  const pageCount = document.getPageCount();
  if (pageCount < 1) throw new Error('PDF contains no pages.');

  // pdf-lib may materialize an empty /Names dictionary. Only mark the PDF as
  // interactive when actual forms, annotations, name-tree entries, outlines,
  // actions, or tagged structure are present.
  const catalog = document.catalog;
  const hasAcroForm = hasNonEmptyPdfObject(document, catalog.get(PDFName.of('AcroForm')));
  const namesValue = catalog.get(PDFName.of('Names'));
  const namesDictionary = namesValue ? document.context.lookup(namesValue) as any : undefined;
  const hasNameTreeContent = Boolean(namesDictionary && typeof namesDictionary.get === 'function') &&
    ['Dests', 'JavaScript', 'EmbeddedFiles'].some(key =>
      hasNonEmptyPdfObject(document, namesDictionary.get(PDFName.of(key)))
    );
  const hasAnnotations = document.getPages().some(page =>
    hasNonEmptyPdfObject(document, page.node.get(PDFName.of('Annots')))
  );
  const hasOtherInteractiveContent = [
    'Outlines',
    'OpenAction',
    'AA',
    'StructTreeRoot',
  ].some(key => hasNonEmptyPdfObject(document, catalog.get(PDFName.of(key))));

  return {
    pageCount,
    hasInteractiveContent: hasAcroForm || hasNameTreeContent || hasAnnotations || hasOtherInteractiveContent,
  };
}

async function isValidPdfFile(filePath: string): Promise<boolean> {
  try {
    await inspectPdf(filePath);
    return true;
  } catch {
    return false;
  }
}

/**
 * High-integrity PDF compression via Ghostscript's pdfwrite pipeline.
 *
 * The optimizer validates each output with pdf-lib, never accepts a larger
 * candidate, and preserves interactive PDFs because rewriters can lose forms,
 * links, annotations, or named destinations. A target is a hard upper bound
 * where achievable; if it cannot be met, the smallest validated reduction is
 * returned and the caller can communicate that the target was missed.
 */
export async function processPdf(
  job: CompressionJobData,
  onProgress?: (percentage: number) => Promise<void>
): Promise<ProcessResult> {
  const targetBytes = getTargetSizeBytes(job);
  if (isTargetAlreadySatisfied(job)) {
    const preserved = await preserveOriginal(job);
    if (onProgress) await onProgress(100);
    return preserved;
  }

  const sourceInspection = await inspectPdf(job.inputFilePath);
  if (sourceInspection.hasInteractiveContent) {
    const preserved = await preserveOriginal(job);
    if (onProgress) await onProgress(100);
    return preserved;
  }

  const gsPath = process.env.GHOSTSCRIPT_PATH || 'gs';
  const timeoutMs = Math.max(30000, Number(process.env.PDF_TIMEOUT_MS) || 180000);
  const level = job.options?.level || 'medium';
  const profiles = getGhostscriptProfiles(level);
  const attempts = targetBytes ? profiles : profiles.slice(0, 1);
  const candidates: Array<{ filePath: string; size: number }> = [];
  const temporaryPaths: string[] = [];

  if (onProgress) await onProgress(10);

  try {
    for (let index = 0; index < attempts.length; index++) {
      const profile = attempts[index];
      const candidatePath = `${job.outputFilePath}.candidate-${index}.pdf`;
      temporaryPaths.push(candidatePath);

      const args = [
        '-dSAFER',
        '-dBATCH',
        '-dNOPAUSE',
        '-dQUIET',
        '-dPDFSTOPONERROR',
        '-sDEVICE=pdfwrite',
        '-dCompatibilityLevel=1.7',
        '-dDetectDuplicateImages=true',
        '-dCompressFonts=true',
        '-dSubsetFonts=true',
        '-dAutoRotatePages=/None',
        '-dDownsampleColorImages=true',
        '-dDownsampleGrayImages=true',
        '-dDownsampleMonoImages=true',
        '-dColorImageDownsampleType=/Bicubic',
        '-dGrayImageDownsampleType=/Bicubic',
        '-dMonoImageDownsampleType=/Subsample',
        '-dAutoFilterColorImages=false',
        '-dColorImageFilter=/DCTEncode',
        '-dAutoFilterGrayImages=false',
        '-dGrayImageFilter=/DCTEncode',
        `-dColorImageResolution=${profile.dpi}`,
        `-dGrayImageResolution=${profile.dpi}`,
        `-dMonoImageResolution=${profile.monoDpi}`,
        `-dJPEGQ=${profile.jpegQuality}`,
        `-dPDFSETTINGS=${profile.pdfSettings}`,
        `-sOutputFile=${candidatePath}`,
        job.inputFilePath,
      ];

      if (onProgress) {
        await onProgress(15 + Math.floor((index / attempts.length) * 70));
      }

      try {
        await execFileAsync(gsPath, args, {
          timeout: timeoutMs,
          maxBuffer: 16 * 1024 * 1024,
          windowsHide: true,
        });
      } catch (error: any) {
        // If Ghostscript isn't installed or cannot parse this source, do not
        // attempt unsafe native PDF stream surgery. Preserve the original.
        console.warn(`[PDFWorker] Ghostscript profile ${index + 1} failed: ${error.message}`);
        break;
      }

      const stat = await fs.stat(candidatePath).catch(() => null);
      if (stat && stat.size > 0 && stat.size < job.originalSize &&
          await isValidPdfFile(candidatePath)) {
        candidates.push({ filePath: candidatePath, size: stat.size });
      }

      if (!targetBytes && candidates.length > 0) break;
      if (targetBytes && candidates.some(candidate => candidate.size <= targetBytes)) {
        // Continue the ladder to find the highest-quality candidate which fits.
      }
    }

    const fitting = targetBytes
      ? candidates.filter(candidate => candidate.size <= targetBytes)
      : [];
    const selected = fitting.length
      ? fitting.reduce((best, current) => current.size > best.size ? current : best)
      : candidates.length
        ? candidates.reduce((best, current) => current.size < best.size ? current : best)
        : undefined;

    if (!selected) {
      const preserved = await preserveOriginal(job);
      if (onProgress) await onProgress(100);
      return preserved;
    }

    await fs.copyFile(selected.filePath, job.outputFilePath);
    const finalInspection = await inspectPdf(job.outputFilePath);
    if (finalInspection.pageCount !== sourceInspection.pageCount) {
      await fs.rm(job.outputFilePath, { force: true }).catch(() => undefined);
      const preserved = await preserveOriginal(job);
      if (onProgress) await onProgress(100);
      return preserved;
    }

    const finalStat = await fs.stat(job.outputFilePath);
    if (onProgress) await onProgress(100);
    return {
      outputFilePath: job.outputFilePath,
      compressedSize: finalStat.size,
      mimeType: 'application/pdf',
    };
  } finally {
    await Promise.all(temporaryPaths.map(filePath =>
      fs.rm(filePath, { force: true }).catch(() => undefined)
    ));
  }
}
