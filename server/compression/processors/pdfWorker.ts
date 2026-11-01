import { execFile } from 'child_process';
import { promisify } from 'util';
import fs from 'fs/promises';
import { CompressionJobData } from '../types';
import sharp from 'sharp';

const execFileAsync = promisify(execFile);

export interface ProcessResult {
  outputFilePath: string;
  compressedSize: number;
}

/**
 * Native PDF image-stream optimizer. It works on a fresh copy of the source PDF
 * for each profile, so a failed/oversized attempt can never replace a better result.
 */
async function compressPdfInStream(
  inputFilePath: string,
  outputFilePath: string,
  level: 'high' | 'medium' | 'low' = 'medium',
  targetBytes?: number,
  onProgress?: (percentage: number) => Promise<void>
): Promise<number> {
    const { PDFDocument, PDFName, PDFRawStream, PDFNumber } = await import('pdf-lib');
  const sourceBytes = await fs.readFile(inputFilePath);
  const hasTarget = Number.isFinite(targetBytes) && Number(targetBytes) > 0 && Number(targetBytes) < sourceBytes.length;
  const target = hasTarget ? Math.floor(Number(targetBytes)) : undefined;

  const profiles = level === 'high'
    ? [
        { maxDimension: 800, jpegQuality: 45 },
        { maxDimension: 650, jpegQuality: 38 },
        { maxDimension: 500, jpegQuality: 30 },
        { maxDimension: 380, jpegQuality: 24 },
      ]
    : level === 'low'
    ? [
        { maxDimension: 1800, jpegQuality: 80 },
        { maxDimension: 1400, jpegQuality: 70 },
        { maxDimension: 1200, jpegQuality: 60 },
        { maxDimension: 900, jpegQuality: 48 },
        { maxDimension: 700, jpegQuality: 38 },
        { maxDimension: 500, jpegQuality: 28 },
        { maxDimension: 350, jpegQuality: 22 },
      ]
    : [
        { maxDimension: 1200, jpegQuality: 65 },
        { maxDimension: 1000, jpegQuality: 58 },
        { maxDimension: 800, jpegQuality: 48 },
        { maxDimension: 650, jpegQuality: 40 },
        { maxDimension: 500, jpegQuality: 32 },
        { maxDimension: 380, jpegQuality: 25 },
      ];

  const attempts = hasTarget ? profiles : profiles.slice(0, 1);
  let bestSmaller: Uint8Array | undefined;
  let bestUnderTarget: Uint8Array | undefined;

  for (let profileIndex = 0; profileIndex < attempts.length; profileIndex++) {
    const profile = attempts[profileIndex];
    const pdfDoc = await PDFDocument.load(sourceBytes, { ignoreEncryption: true });
    const context = pdfDoc.context;
    const indirectObjects = context.enumerateIndirectObjects();

    interface ImageTask {
      obj: any;
      dict: any;
      origBuffer: Buffer;
    }

    const imageTasks: ImageTask[] = [];
    for (const [, obj] of indirectObjects) {
      if (obj instanceof PDFRawStream) {
        const dict = obj.dict;
        const subtype = dict.get(PDFName.of('Subtype'));
        if (subtype === PDFName.of('Image')) {
          const filterStr = dict.get(PDFName.of('Filter'))?.toString() || '';
          // Sharp accepts JPEG payloads directly. Flate streams contain PDF
          // predictor/DecodeParms data and are not safe to reinterpret as image
          // bytes here; leave them to Ghostscript's PDF-aware decoder.
          if (filterStr === '/DCTDecode') {
            imageTasks.push({ obj, dict, origBuffer: Buffer.from(obj.contents) });
          }
        }
      }
    }

    let completedTasks = 0;
    const batchSize = 6;
    for (let i = 0; i < imageTasks.length; i += batchSize) {
      const chunk = imageTasks.slice(i, i + batchSize);
      await Promise.all(chunk.map(async ({ obj, dict, origBuffer }) => {
        try {
          const recompressed = await sharp(origBuffer, { failOn: 'none' })
            .resize({
              width: profile.maxDimension,
              height: profile.maxDimension,
              fit: 'inside',
              withoutEnlargement: true,
            })
            .jpeg({
              quality: profile.jpegQuality,
              mozjpeg: true,
              chromaSubsampling: level === 'high' ? '4:2:0' : '4:4:4',
            })
            .toBuffer();

          if (recompressed.length < origBuffer.length) {
            obj.contents = new Uint8Array(recompressed);
            dict.set(PDFName.of('Length'), PDFNumber.of(recompressed.length));
            dict.set(PDFName.of('Filter'), PDFName.of('DCTDecode'));
            dict.delete(PDFName.of('DecodeParms'));

            const meta = await sharp(recompressed).metadata();
            if (meta.width) dict.set(PDFName.of('Width'), PDFNumber.of(meta.width));
            if (meta.height) dict.set(PDFName.of('Height'), PDFNumber.of(meta.height));
            dict.set(PDFName.of('BitsPerComponent'), PDFNumber.of(8));
            dict.set(PDFName.of('ColorSpace'), PDFName.of(meta.channels === 1 ? 'DeviceGray' : 'DeviceRGB'));
            dict.delete(PDFName.of('Decode'));
          }
        } catch {
          // Unsupported image filters are left unchanged rather than risking corruption.
        }
      }));

      completedTasks += chunk.length;
      if (onProgress && imageTasks.length > 0) {
        const fraction = (profileIndex + completedTasks / imageTasks.length) / attempts.length;
        await onProgress(Math.min(88, 30 + Math.floor(fraction * 55)));
      }
    }

    const compressedBytes = await pdfDoc.save({
      useObjectStreams: true,
      addDefaultPage: false,
      objectsPerTick: 100,
    });

    if (compressedBytes.length > 0 && compressedBytes.length < sourceBytes.length) {
      if (!bestSmaller || compressedBytes.length < bestSmaller.length) {
        bestSmaller = compressedBytes;
      }
      if (target && compressedBytes.length <= target &&
          (!bestUnderTarget || compressedBytes.length > bestUnderTarget.length)) {
        bestUnderTarget = compressedBytes;
      }
    }

    // The native profiles are also ordered from higher to lower quality.
    // Stop at the first valid output under the cap instead of decoding and
    // rebuilding every remaining profile.
    if (target && compressedBytes.length > 0 && compressedBytes.length <= target &&
        compressedBytes.length < sourceBytes.length) {
      bestUnderTarget = compressedBytes;
      break;
    }

    if (!hasTarget) break;
  }

  // Prefer the largest valid candidate that satisfies the cap. If no candidate
  // can meet it, preserve the smallest valid reduction and let the UI say so.
  const selected = bestUnderTarget || bestSmaller;
  if (!selected) {
    throw new Error('Native PDF optimization could not produce a smaller valid file.');
  }

  await fs.writeFile(outputFilePath, selected);
  return selected.length;
}

type GhostscriptProfile = {
  pdfSettings: string;
  dpi: number;
  jpegQuality: number;
  monoDpi: number;
};

function getGhostscriptProfiles(
  level: 'high' | 'medium' | 'low',
  includeTargetAttempts: boolean
): GhostscriptProfile[] {
  const profiles: Record<'high' | 'medium' | 'low', GhostscriptProfile[]> = {
    high: [
      { pdfSettings: '/screen', dpi: 72, jpegQuality: 55, monoDpi: 150 },
      { pdfSettings: '/screen', dpi: 60, jpegQuality: 48, monoDpi: 120 },
      { pdfSettings: '/screen', dpi: 48, jpegQuality: 38, monoDpi: 120 },
      { pdfSettings: '/screen', dpi: 36, jpegQuality: 28, monoDpi: 120 },
    ],
    medium: [
      { pdfSettings: '/ebook', dpi: 144, jpegQuality: 70, monoDpi: 240 },
      { pdfSettings: '/screen', dpi: 96, jpegQuality: 60, monoDpi: 150 },
      { pdfSettings: '/screen', dpi: 72, jpegQuality: 48, monoDpi: 150 },
      { pdfSettings: '/screen', dpi: 60, jpegQuality: 38, monoDpi: 120 },
      { pdfSettings: '/screen', dpi: 48, jpegQuality: 28, monoDpi: 120 },
    ],
    low: [
      { pdfSettings: '/printer', dpi: 200, jpegQuality: 85, monoDpi: 300 },
      { pdfSettings: '/ebook', dpi: 144, jpegQuality: 70, monoDpi: 240 },
      { pdfSettings: '/screen', dpi: 96, jpegQuality: 58, monoDpi: 150 },
      { pdfSettings: '/screen', dpi: 72, jpegQuality: 45, monoDpi: 150 },
      { pdfSettings: '/screen', dpi: 48, jpegQuality: 30, monoDpi: 120 },
    ],
  };
  const selected = profiles[level] || profiles.medium;
  return includeTargetAttempts ? selected : selected.slice(0, 1);
}

async function isValidPdfFile(filePath: string): Promise<boolean> {
  let handle: any;
  try {
    handle = await fs.open(filePath, 'r');
    const header = Buffer.alloc(5);
    const read = await handle.read(header, 0, 5, 0);
    return read.bytesRead === 5 && header.toString('ascii') === '%PDF-';
  } catch {
    return false;
  } finally {
    if (handle) await handle.close().catch(() => undefined);
  }
}

/**
 * Compresses with Ghostscript profiles and a native fallback. A requested size
 * is treated as an upper bound: the worker searches progressively smaller
 * profiles, then reports the best real output. It never returns an inflated PDF.
 */
export async function processPdf(
  job: CompressionJobData,
  onProgress?: (percentage: number) => Promise<void>
): Promise<ProcessResult> {
  const gsPath = process.env.GHOSTSCRIPT_PATH || 'gs';
  const timeoutMs = Number(process.env.PDF_TIMEOUT_MS) || 180000;
  const deadline = Date.now() + timeoutMs;
  const level = job.options?.level || 'medium';
  const requestedTarget = Number(job.options?.targetSizeBytes);
  if (Number.isFinite(requestedTarget) && requestedTarget >= job.originalSize && requestedTarget > 0) {
    // The source already fits. Do not re-encode it and risk quality loss.
    await fs.copyFile(job.inputFilePath, job.outputFilePath);
    if (onProgress) await onProgress(100);
    return {
      outputFilePath: job.outputFilePath,
      compressedSize: job.originalSize,
    };
  }
  const targetBytes = Number.isFinite(requestedTarget) &&
    requestedTarget > 0 &&
    requestedTarget < job.originalSize
      ? Math.floor(requestedTarget)
      : undefined;

  const profiles = getGhostscriptProfiles(level, Boolean(targetBytes));
  const candidates: Array<{ filePath: string; size: number }> = [];
  const temporaryPaths: string[] = [];

  if (onProgress) await onProgress(10);

  try {
    for (let i = 0; i < profiles.length; i++) {
      const remainingMs = deadline - Date.now();
      if (remainingMs <= 0) break;
      const profile = profiles[i];
      const candidatePath = job.outputFilePath + '.ghostscript-' + i + '.pdf';
      temporaryPaths.push(candidatePath);

      const args = [
        '-dSAFER',
        '-dBATCH',
        '-dNOPAUSE',
        '-dQUIET',
        '-dPDFSTOPONERROR',
        '-sDEVICE=pdfwrite',
        '-dCompatibilityLevel=1.4',
        // PDFSETTINGS initializes a broad preset. Apply it before the explicit
        // controls below so this profile's DPI and JPEG quality actually win.
        '-dPDFSETTINGS=' + profile.pdfSettings,
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
        '-dColorImageResolution=' + profile.dpi,
        '-dGrayImageResolution=' + profile.dpi,
        '-dMonoImageResolution=' + profile.monoDpi,
        '-dJPEGQ=' + profile.jpegQuality,
        '-sOutputFile=' + candidatePath,
        job.inputFilePath,
      ];

      try {
        if (onProgress) await onProgress(20 + Math.floor((i / profiles.length) * 55));
        await execFileAsync(gsPath, args, {
          // Bound each full-document render while keeping all attempts within
          // the overall PDF job budget.
          timeout: Math.min(45_000, remainingMs),
          maxBuffer: 16 * 1024 * 1024,
        });

        const stat = await fs.stat(candidatePath).catch(() => null);
        if (stat && stat.size > 0 && stat.size < job.originalSize &&
            await isValidPdfFile(candidatePath)) {
          candidates.push({ filePath: candidatePath, size: stat.size });

          // Profiles are ordered from higher to lower quality. Once a valid
          // result meets the requested cap, later passes can only reduce
          // quality further, so stop here and keep this first fitting result.
          if (targetBytes !== undefined && stat.size <= targetBytes) break;
        }
      } catch (err: any) {
        console.warn('[PDFWorker] Ghostscript profile failed: ' + err.message);
        // A missing executable or a failed input generally makes later passes fail too.
        break;
      }

      if (!targetBytes && candidates.length > 0) break;
    }

    const hasTargetCandidate = targetBytes !== undefined &&
      candidates.some(candidate => candidate.size <= targetBytes);

    // Run the native optimizer when Ghostscript is unavailable, cannot reduce
    // the source, or has not yet reached the requested upper bound.
    if (candidates.length === 0 || (targetBytes !== undefined && !hasTargetCandidate)) {
      const nativePath = job.outputFilePath + '.native.pdf';
      temporaryPaths.push(nativePath);
      try {
        await compressPdfInStream(
          job.inputFilePath,
          nativePath,
          level,
          targetBytes,
          onProgress
        );
        const nativeStat = await fs.stat(nativePath).catch(() => null);
        if (nativeStat && nativeStat.size > 0 && nativeStat.size < job.originalSize &&
            await isValidPdfFile(nativePath)) {
          candidates.push({ filePath: nativePath, size: nativeStat.size });
        }
      } catch (fallbackError: any) {
        console.warn('[PDFWorker] Native fallback could not improve the PDF: ' + fallbackError.message);
      }
    }

    const smallerCandidates = candidates.filter(candidate => candidate.size < job.originalSize);
    const fittingCandidates = targetBytes === undefined
      ? []
      : smallerCandidates.filter(candidate => candidate.size <= targetBytes);

    let best: { filePath: string; size: number } | undefined;
    if (fittingCandidates.length > 0) {
      // Largest result under the cap gives the best quality among tested profiles.
      best = fittingCandidates.reduce((current, candidate) =>
        candidate.size > current.size ? candidate : current
      );
    } else if (targetBytes !== undefined && smallerCandidates.length > 0) {
      // The cap may be impossible for this document; keep the smallest safe result.
      best = smallerCandidates.reduce((current, candidate) =>
        candidate.size < current.size ? candidate : current
      );
    } else if (smallerCandidates.length > 0) {
      best = smallerCandidates.reduce((current, candidate) =>
        candidate.size > current.size ? candidate : current
      );
    }

    if (!best) {
      throw new Error('This PDF is already optimized or its contents cannot be reduced safely.');
    }

    await fs.copyFile(best.filePath, job.outputFilePath);
    const finalStat = await fs.stat(job.outputFilePath);

    if (onProgress) await onProgress(100);

    return {
      outputFilePath: job.outputFilePath,
      compressedSize: finalStat.size,
    };
  } finally {
    await Promise.all(temporaryPaths.map(filePath =>
      fs.rm(filePath, { force: true }).catch(() => undefined)
    ));
  }
}
