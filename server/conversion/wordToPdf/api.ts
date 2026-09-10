import { Router, Request, Response } from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs/promises';
import { createReadStream } from 'fs';
import crypto from 'crypto';
import os from 'os';
import { WordConversionJobData, WordConversionJobResult, WordJobState } from './types';
import { validateWordInput, MAX_WORD_FILE_BYTES, sanitizeFileName } from './validator';
import { convertWordDocumentToPdf, isOfficeEngineAvailable } from './converter';
import { cleanupJobWorkDir, deleteFileSafe, startPeriodicCleanup } from './cleanup';

const router = Router();

// Base storage directory configuration
const BASE_STORAGE = process.env.STORAGE_DIR || path.join(os.tmpdir(), 'zipstream-storage');
const WORD_UPLOAD_DIR = path.join(BASE_STORAGE, 'word-uploads');
const CONVERTED_PDF_DIR = path.join(BASE_STORAGE, 'word-converted');
const WORK_BASE_DIR = path.join(os.tmpdir(), 'zipstream-word-work');

// Ensure base directories exist
void fs.mkdir(WORD_UPLOAD_DIR, { recursive: true }).catch(() => undefined);
void fs.mkdir(CONVERTED_PDF_DIR, { recursive: true }).catch(() => undefined);
void fs.mkdir(WORK_BASE_DIR, { recursive: true }).catch(() => undefined);

// Start 2-hour TTL cleanup sweep
startPeriodicCleanup(CONVERTED_PDF_DIR, 2 * 3600 * 1000);
startPeriodicCleanup(WORD_UPLOAD_DIR, 1 * 3600 * 1000);
startPeriodicCleanup(WORK_BASE_DIR, 1 * 3600 * 1000);

const upload = multer({
  dest: WORD_UPLOAD_DIR,
  limits: {
    fileSize: MAX_WORD_FILE_BYTES,
  },
});

interface LocalJobState {
  jobId: string;
  state: WordJobState;
  progress: number;
  message?: string;
  result?: WordConversionJobResult;
  error?: string;
  createdAt: number;
}

const localWordJobs = new Map<string, LocalJobState>();

// Periodic in-memory state garbage collection
setInterval(() => {
  const cutoff = Date.now() - 4 * 3600 * 1000;
  for (const [id, job] of localWordJobs.entries()) {
    if (job.createdAt < cutoff) localWordJobs.delete(id);
  }
}, 30 * 60 * 1000);

/**
 * Execute job asynchronously
 */
async function processWordJobLocally(jobData: WordConversionJobData): Promise<void> {
  const { jobId } = jobData;
  localWordJobs.set(jobId, {
    jobId,
    state: 'processing',
    progress: 25,
    message: 'Starting Office conversion engine...',
    createdAt: Date.now(),
  });

  try {
    const result = await convertWordDocumentToPdf(jobData, (progress, message) => {
      const record = localWordJobs.get(jobId);
      if (record) {
        record.progress = progress;
        record.message = message;
        if (progress >= 75) {
          record.state = 'validating';
        }
      }
    });

    localWordJobs.set(jobId, {
      jobId,
      state: 'completed',
      progress: 100,
      message: 'Conversion completed and PDF validated successfully.',
      result,
      createdAt: Date.now(),
    });
  } catch (err: any) {
    console.error(`[WordApi] Job ${jobId} failed:`, err?.message);
    await cleanupJobWorkDir(jobData.workDir);
    await deleteFileSafe(jobData.inputFilePath);

    localWordJobs.set(jobId, {
      jobId,
      state: 'failed',
      progress: 0,
      error: err?.message || 'Word document conversion failed.',
      createdAt: Date.now(),
    });
  }
}

/**
 * GET /api/convert/health
 * Health check endpoint reporting LibreOffice binary status
 */
router.get('/health', async (_req: Request, res: Response) => {
  const engineStatus = await isOfficeEngineAvailable();
  res.json({
    status: 'ok',
    officeEngine: engineStatus,
  });
});

/**
 * POST /api/convert/word-to-pdf
 * Ingest Word file (.docx / .doc), run rigorous validation, and queue conversion
 */
router.post('/word-to-pdf', upload.single('file'), async (req: Request, res: Response) => {
  if (!req.file) {
    return res.status(400).json({ error: 'No Word file uploaded. Send file under field "file".' });
  }

  const tempFilePath = req.file.path;
  const originalFileName = req.file.originalname || 'document.docx';

  try {
    // 1. Strict input validation
    const validation = await validateWordInput(tempFilePath, originalFileName);
    if (!validation.isValid) {
      await deleteFileSafe(tempFilePath);
      return res.status(400).json({
        error: validation.error || 'Invalid Word document.',
      });
    }

    const jobId = crypto.randomUUID();
    const workDir = path.join(WORK_BASE_DIR, jobId);
    const outputFileName = `converted-${jobId}.pdf`;
    const outputFilePath = path.join(CONVERTED_PDF_DIR, outputFileName);

    const jobData: WordConversionJobData = {
      jobId,
      originalFileName: validation.sanitizedFileName,
      originalSize: req.file.size,
      inputExtension: validation.extension,
      mimeType: validation.mimeType,
      inputFilePath: tempFilePath,
      outputFilePath,
      workDir,
      createdAt: Date.now(),
    };

    // Register job state
    localWordJobs.set(jobId, {
      jobId,
      state: 'queued',
      progress: 15,
      message: 'Word document queued for conversion...',
      createdAt: Date.now(),
    });

    // Run conversion job
    void processWordJobLocally(jobData);

    return res.status(202).json({
      success: true,
      jobId,
      status: 'queued',
      file: {
        originalFileName: validation.sanitizedFileName,
        size: req.file.size,
        extension: validation.extension,
      },
      statusUrl: `/api/convert/jobs/${jobId}`,
      downloadUrl: `/api/convert/download/${jobId}`,
    });
  } catch (err: any) {
    console.error('[WordApi] Error during Word file ingestion:', err);
    await deleteFileSafe(tempFilePath);
    return res.status(500).json({ error: 'Failed to ingest Word document for conversion.' });
  }
});

/**
 * GET /api/convert/jobs/:jobId
 * Returns current status, actual conversion progress, and download link on completion
 */
router.get('/jobs/:jobId', (req: Request, res: Response) => {
  const { jobId } = req.params;
  const job = localWordJobs.get(jobId);

  if (!job) {
    return res.status(404).json({ error: 'Conversion job not found or expired.' });
  }

  if (job.state === 'completed' && job.result) {
    return res.json({
      jobId,
      status: 'completed',
      progress: 100,
      message: job.message,
      result: {
        originalFileName: job.result.originalFileName,
        originalSize: job.result.originalSize,
        outputFileName: job.result.outputFileName,
        outputSize: job.result.outputSize,
        pageCount: job.result.pageCount,
        durationMs: job.result.durationMs,
        downloadUrl: job.result.downloadUrl,
      },
    });
  }

  if (job.state === 'failed') {
    return res.status(422).json({
      jobId,
      status: 'failed',
      progress: 0,
      error: job.error || 'Conversion failed.',
    });
  }

  return res.json({
    jobId,
    status: job.state,
    progress: job.progress,
    message: job.message || 'Processing document...',
  });
});

/**
 * GET /api/convert/download/:jobId
 * Streams the final validated PDF file as an attachment
 */
router.get('/download/:jobId', async (req: Request, res: Response) => {
  const { jobId } = req.params;
  const job = localWordJobs.get(jobId);

  if (!job || !job.result) {
    return res.status(404).json({ error: 'Converted PDF document not found or still processing.' });
  }

  const filePath = job.result.outputFilePath;
  let stat;
  try {
    stat = await fs.stat(filePath);
  } catch {
    return res.status(410).json({ error: 'The converted PDF file has expired and is no longer available.' });
  }

  const downloadName = sanitizeFileName(job.result.outputFileName);

  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Length', String(stat.size));
  res.setHeader('Content-Disposition', `attachment; filename="${downloadName}"`);
  res.setHeader('Cache-Control', 'no-store');

  const stream = createReadStream(filePath);
  stream.on('error', (streamErr) => {
    console.error(`[WordApi] Stream error downloading job ${jobId}:`, streamErr);
    if (!res.headersSent) {
      res.status(500).json({ error: 'Failed to stream PDF download.' });
    }
  });
  stream.pipe(res);
});

export default router;
