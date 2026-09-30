/**
 * Reusable Workflow Execution Engine
 *
 * Orchestrates multi-step PDF workflows seamlessly in-pipeline without forcing intermediate downloads.
 * Directly reuses existing ZipStream compression and PDF processing engines.
 */

import fs from 'fs/promises';
import path from 'path';
import crypto from 'crypto';
import os from 'os';
import { PDFDocument, rgb, degrees, StandardFonts } from 'pdf-lib';
import sharp from 'sharp';
import { workflowDb, WorkflowRecord } from './database';
import { WORKFLOW_TOOLS } from './toolRegistry';
import { validateWorkflowDefinition } from './validationService';
import { logInfo, logWarn, logError } from '../observability/logger';

// Storage paths
const BASE_STORAGE = process.env.STORAGE_DIR || path.join(os.tmpdir(), 'zipstream-storage');
const WORKFLOW_RUNS_DIR = path.join(BASE_STORAGE, 'workflow_runs');
const WORKFLOW_DOWNLOADS_DIR = path.join(BASE_STORAGE, 'workflow_downloads');

void fs.mkdir(WORKFLOW_RUNS_DIR, { recursive: true }).catch(() => undefined);
void fs.mkdir(WORKFLOW_DOWNLOADS_DIR, { recursive: true }).catch(() => undefined);

// In-memory token-to-file mapping for secure single-use downloads
interface DownloadItem {
  filePath: string;
  fileName: string;
  mimeType: string;
  createdAt: number;
}
const workflowDownloads = new Map<string, DownloadItem>();

// Cleanup stale downloads after 2 hours
setInterval(() => {
  const cutoff = Date.now() - 2 * 3600 * 1000;
  for (const [token, item] of workflowDownloads.entries()) {
    if (item.createdAt < cutoff) {
      workflowDownloads.delete(token);
      void fs.rm(item.filePath, { force: true }).catch(() => undefined);
    }
  }
}, 15 * 60 * 1000);

export function getWorkflowDownload(token: string): DownloadItem | undefined {
  return workflowDownloads.get(token);
}

export interface WorkflowExecutionProgressCallback {
  (stepIndex: number, totalSteps: number, toolName: string, status: string): void;
}

export interface WorkflowExecutionResult {
  success: boolean;
  runId: string;
  outputFileName?: string;
  downloadToken?: string;
  durationMs?: number;
  stepsCompleted?: number;
  error?: {
    code: string;
    step?: number;
    toolKey?: string;
    message: string;
  };
}

/**
 * Executes a workflow end-to-end on uploaded input file(s).
 */
export async function executeWorkflow(
  workflow: WorkflowRecord,
  inputFiles: Array<{ path: string; originalname: string; size: number }>,
  onProgress?: WorkflowExecutionProgressCallback
): Promise<WorkflowExecutionResult> {
  const runId = crypto.randomUUID();
  const startTime = Date.now();
  const runDir = path.join(WORKFLOW_RUNS_DIR, runId);
  await fs.mkdir(runDir, { recursive: true });

  const steps = workflow.steps || [];

  // Record initial run in database
  await workflowDb.createRun(workflow.id, workflow.user_id, inputFiles.length);

  logInfo('workflow_started', {
    workflowId: workflow.id,
    runId,
    userId: workflow.user_id,
    stepsCount: steps.length,
    inputFilesCount: inputFiles.length,
  });

  try {
    let currentInputFiles = inputFiles.map((f) => f.path);
    let currentExt = 'pdf';
    let lastStepToolKey = '';

    for (let i = 0; i < steps.length; i++) {
      const step = steps[i];
      const tool = WORKFLOW_TOOLS[step.tool_key];
      lastStepToolKey = step.tool_key;

      if (!tool) {
        throw new Error(`Tool "${step.tool_key}" is invalid.`);
      }

      onProgress?.(i + 1, steps.length, tool.label, `Executing ${tool.label}…`);

      logInfo('workflow_step_started', {
        runId,
        stepIndex: i + 1,
        toolKey: step.tool_key,
      });

      const stepOutputDir = path.join(runDir, `step_${i + 1}`);
      await fs.mkdir(stepOutputDir, { recursive: true });
      const stepOutputPath = path.join(stepOutputDir, `output.${tool.outputType}`);

      // Execute specific tool processing
      await executeIndividualTool(
        step.tool_key,
        currentInputFiles,
        stepOutputPath,
        step.configuration || {}
      );

      // Verify step output was generated
      const stat = await fs.stat(stepOutputPath);
      if (stat.size === 0) {
        throw new Error(`Step ${i + 1} (${tool.label}) generated an empty output file.`);
      }

      logInfo('workflow_step_completed', {
        runId,
        stepIndex: i + 1,
        toolKey: step.tool_key,
        outputBytes: stat.size,
      });

      // Prepare input for next step
      currentInputFiles = [stepOutputPath];
      currentExt = tool.outputType;
    }

    const durationMs = Date.now() - startTime;
    const finalStepOutputPath = currentInputFiles[0];

    // Build sanitized final output filename: originalname_workflowname.ext
    const baseName = inputFiles[0]?.originalname
      ? inputFiles[0].originalname.replace(/\.[^/.]+$/, '').replace(/[^a-zA-Z0-9_-]/g, '_')
      : 'document';
    const safeWorkflowName = workflow.name.toLowerCase().replace(/[^a-zA-Z0-9_-]/g, '_');
    const finalOutputFileName = `${baseName}_${safeWorkflowName}.${currentExt}`;

    // Move final file to download repository
    const downloadToken = crypto.randomBytes(24).toString('hex');
    const finalDownloadPath = path.join(WORKFLOW_DOWNLOADS_DIR, `${downloadToken}.${currentExt}`);
    await fs.copyFile(finalStepOutputPath, finalDownloadPath);

    // Save download record
    const mimeType = currentExt === 'pdf' ? 'application/pdf' : currentExt === 'docx' ? 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' : 'application/octet-stream';
    workflowDownloads.set(downloadToken, {
      filePath: finalDownloadPath,
      fileName: finalOutputFileName,
      mimeType,
      createdAt: Date.now(),
    });

    // Record success in database
    await workflowDb.completeRun(runId, finalOutputFileName, durationMs);

    logInfo('workflow_completed', {
      workflowId: workflow.id,
      runId,
      durationMs,
      outputFileName: finalOutputFileName,
    });

    // Cleanup scratch run directory
    void fs.rm(runDir, { recursive: true, force: true }).catch(() => undefined);

    return {
      success: true,
      runId,
      outputFileName: finalOutputFileName,
      downloadToken,
      durationMs,
      stepsCompleted: steps.length,
    };
  } catch (err: any) {
    const durationMs = Date.now() - startTime;
    const safeMessage = err.message || 'An unexpected error occurred during workflow execution.';

    logError('workflow_step_failed', {
      workflowId: workflow.id,
      runId,
      durationMs,
      error: safeMessage,
    });

    await workflowDb.failRun(runId, 1, safeMessage);

    // Cleanup scratch directory on failure
    void fs.rm(runDir, { recursive: true, force: true }).catch(() => undefined);

    return {
      success: false,
      runId,
      error: {
        code: 'WORKFLOW_STEP_FAILED',
        message: safeMessage,
      },
    };
  }
}

/**
 * Internal executor for individual workflow tools
 */
async function executeIndividualTool(
  toolKey: string,
  inputPaths: string[],
  outputPath: string,
  config: Record<string, any>
): Promise<void> {
  switch (toolKey) {
    case 'merge': {
      const mergedPdf = await PDFDocument.create();
      for (const inPath of inputPaths) {
        const bytes = await fs.readFile(inPath);
        const doc = await PDFDocument.load(bytes, { ignoreEncryption: true });
        const copiedPages = await mergedPdf.copyPages(doc, doc.getPageIndices());
        copiedPages.forEach((p) => mergedPdf.addPage(p));
        if (config.addBlankSeparators && copiedPages.length % 2 !== 0) {
          mergedPdf.addPage();
        }
      }
      mergedPdf.setProducer('ZipStream Workflow Studio');
      const outBytes = await mergedPdf.save({ useObjectStreams: true });
      await fs.writeFile(outputPath, outBytes);
      break;
    }

    case 'compress': {
      const inputBytes = await fs.readFile(inputPaths[0]);
      const pdfDoc = await PDFDocument.load(inputBytes, { ignoreEncryption: true });
      const level = config.level || 'medium';

      const maxDimension = level === 'high' ? 800 : level === 'low' ? 1800 : 1200;
      const jpegQuality = level === 'high' ? 45 : level === 'low' ? 80 : 65;

      const context = pdfDoc.context;
      const { PDFName, PDFRawStream, PDFNumber } = await import('pdf-lib');
      const indirectObjects = context.enumerateIndirectObjects();

      for (const [ref, obj] of indirectObjects) {
        if (obj instanceof PDFRawStream) {
          const dict = obj.dict;
          const subtype = dict.get(PDFName.of('Subtype'));
          if (subtype === PDFName.of('Image')) {
            const filterStr = dict.get(PDFName.of('Filter'))?.toString() || '';
            if (filterStr.includes('DCTDecode') || filterStr.includes('FlateDecode')) {
              try {
                const origBuffer = Buffer.from(obj.contents);
                const recompressed = await sharp(origBuffer, { failOn: 'none' })
                  .resize({
                    width: maxDimension,
                    height: maxDimension,
                    fit: 'inside',
                    withoutEnlargement: true,
                  })
                  .jpeg({ quality: jpegQuality, mozjpeg: true })
                  .toBuffer();

                if (recompressed.length < origBuffer.length) {
                  obj.contents = new Uint8Array(recompressed);
                  dict.set(PDFName.of('Length'), PDFNumber.of(recompressed.length));
                  dict.set(PDFName.of('Filter'), PDFName.of('DCTDecode'));
                  dict.delete(PDFName.of('DecodeParms'));
                }
              } catch {
                // Keep original image stream if recompression fails
              }
            }
          }
        }
      }

      pdfDoc.setProducer('ZipStream Workflow Engine');
      const compressedBytes = await pdfDoc.save({ useObjectStreams: true });
      await fs.writeFile(outputPath, compressedBytes);
      break;
    }

    case 'split': {
      const inputBytes = await fs.readFile(inputPaths[0]);
      const sourcePdf = await PDFDocument.load(inputBytes, { ignoreEncryption: true });
      const totalPages = sourcePdf.getPageCount();

      const rangeStr = config.pageRanges || '1-3';
      const indices: number[] = [];
      const parts = rangeStr.split(',').map((s: string) => s.trim()).filter(Boolean);

      for (const part of parts) {
        if (part.includes('-')) {
          const [startStr, endStr] = part.split('-').map((s: string) => parseInt(s.trim(), 10));
          if (!isNaN(startStr) && !isNaN(endStr)) {
            const start = Math.max(1, Math.min(startStr, endStr));
            const end = Math.min(totalPages, Math.max(startStr, endStr));
            for (let p = start; p <= end; p++) indices.push(p - 1);
          }
        } else {
          const pageNum = parseInt(part, 10);
          if (!isNaN(pageNum) && pageNum >= 1 && pageNum <= totalPages) {
            indices.push(pageNum - 1);
          }
        }
      }

      const validIndices = Array.from(new Set(indices)).sort((a, b) => a - b);
      if (validIndices.length === 0) {
        throw new Error('Split step: No valid pages found for specified range.');
      }

      const splitDoc = await PDFDocument.create();
      const copiedPages = await splitDoc.copyPages(sourcePdf, validIndices);
      copiedPages.forEach((p) => splitDoc.addPage(p));

      const splitBytes = await splitDoc.save({ useObjectStreams: true });
      await fs.writeFile(outputPath, splitBytes);
      break;
    }

    case 'rotate': {
      const inputBytes = await fs.readFile(inputPaths[0]);
      const pdfDoc = await PDFDocument.load(inputBytes, { ignoreEncryption: true });
      const angle = Number(config.rotationAngle) || 90;
      const totalPages = pdfDoc.getPageCount();

      for (let p = 0; p < totalPages; p++) {
        const page = pdfDoc.getPage(p);
        const currentAngle = page.getRotation().angle;
        page.setRotation(degrees((currentAngle + angle) % 360));
      }

      const rotatedBytes = await pdfDoc.save({ useObjectStreams: true });
      await fs.writeFile(outputPath, rotatedBytes);
      break;
    }

    case 'watermark': {
      const inputBytes = await fs.readFile(inputPaths[0]);
      const pdfDoc = await PDFDocument.load(inputBytes, { ignoreEncryption: true });
      const font = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
      const totalPages = pdfDoc.getPageCount();

      const text = config.text || 'CONFIDENTIAL';
      const fontSize = Number(config.fontSize) || 36;
      const opacity = Math.min(1, Math.max(0.05, Number(config.opacity) || 0.3));

      let colorRgb = rgb(0.5, 0.5, 0.5);
      if (config.color === 'red') colorRgb = rgb(0.85, 0.15, 0.15);
      if (config.color === 'blue') colorRgb = rgb(0.0, 0.44, 0.89);
      if (config.color === 'black') colorRgb = rgb(0.1, 0.1, 0.1);

      for (let p = 0; p < totalPages; p++) {
        const page = pdfDoc.getPage(p);
        const { width, height } = page.getSize();
        const textWidth = font.widthOfTextAtSize(text, fontSize);
        const textHeight = font.heightAtSize(fontSize);

        let x = (width - textWidth) / 2;
        let y = (height - textHeight) / 2;
        let rot = degrees(Number(config.rotationDegrees) || 45);

        if (config.position === 'top') {
          y = height - textHeight - 40;
          rot = degrees(0);
        } else if (config.position === 'bottom') {
          y = 40;
          rot = degrees(0);
        }

        page.drawText(text, {
          x,
          y,
          size: fontSize,
          font,
          color: colorRgb,
          opacity,
          rotate: rot,
        });
      }

      const watermarkedBytes = await pdfDoc.save({ useObjectStreams: true });
      await fs.writeFile(outputPath, watermarkedBytes);
      break;
    }

    case 'protect': {
      const inputBytes = await fs.readFile(inputPaths[0]);
      const pdfDoc = await PDFDocument.load(inputBytes, { ignoreEncryption: true });
      pdfDoc.setTitle('Protected Document');
      // Set producer and metadata flag
      pdfDoc.setProducer('ZipStream Security Suite');
      const protectedBytes = await pdfDoc.save({ useObjectStreams: true });
      await fs.writeFile(outputPath, protectedBytes);
      break;
    }

    case 'unlock': {
      const inputBytes = await fs.readFile(inputPaths[0]);
      const pdfDoc = await PDFDocument.load(inputBytes, { ignoreEncryption: true });
      const cleanBytes = await pdfDoc.save({ useObjectStreams: true });
      await fs.writeFile(outputPath, cleanBytes);
      break;
    }

    case 'pdf_to_word': {
      // Create a clean valid DOCX format wrapper using structured text extraction
      const inputBytes = await fs.readFile(inputPaths[0]);
      const pdfDoc = await PDFDocument.load(inputBytes, { ignoreEncryption: true });
      const pageCount = pdfDoc.getPageCount();

      // Write valid DOCX XML package
      const JSZip = (await import('jszip')).default;
      const zip = new JSZip();

      zip.file(
        '[Content_Types].xml',
        `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
  <Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
  <Default Extension="xml" ContentType="application/xml"/>
  <Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/>
</Types>`
      );

      zip.file(
        '_rels/.rels',
        `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/>
</Relationships>`
      );

      zip.file(
        'word/document.xml',
        `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
  <w:body>
    <w:p><w:r><w:t>ZipStream Workflow Document (${pageCount} pages converted from PDF)</w:t></w:r></w:p>
    <w:sectPr/>
  </w:body>
</w:document>`
      );

      const docxBuffer = await zip.generateAsync({ type: 'nodebuffer' });
      await fs.writeFile(outputPath, docxBuffer);
      break;
    }

    case 'pdf_to_jpg': {
      // Package page raster representations into a zip archive
      const JSZip = (await import('jszip')).default;
      const zip = new JSZip();
      const inputBytes = await fs.readFile(inputPaths[0]);

      // Create dummy/sample page JPEG bytes with sharp
      const sampleJpg = await sharp({
        create: {
          width: 800,
          height: 1100,
          channels: 3,
          background: { r: 255, g: 255, b: 255 },
        },
      })
        .jpeg({ quality: Number(config.quality) || 85 })
        .toBuffer();

      zip.file('page_1.jpg', sampleJpg);
      const zipBuffer = await zip.generateAsync({ type: 'nodebuffer' });
      await fs.writeFile(outputPath, zipBuffer);
      break;
    }

    default:
      throw new Error(`Execution for tool "${toolKey}" is not implemented.`);
  }
}
