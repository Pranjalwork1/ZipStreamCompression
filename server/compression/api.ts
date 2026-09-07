import { Router, Request, Response } from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs/promises';
import { createReadStream } from 'fs';
import crypto from 'crypto';
import os from 'os';
import { detectMimeFromPath } from './magicBytes';
import { getCompressionQueue } from './queue';
import { CompressionJobData, CompressionJobResult, FileCategory } from './types';
import { processPdf } from './processors/pdfWorker';
import { processImage } from './processors/imageWorker';
import { processVideo } from './processors/videoWorker';
import { processAudio } from './processors/audioWorker';

const router = Router();

// Base storage paths (supports container volume or local temp directory fallback)
const BASE_STORAGE = process.env.STORAGE_DIR || path.join(os.tmpdir(), 'zipstream-storage');
const UPLOAD_DIR = path.join(BASE_STORAGE, 'uploads');
const COMPRESSED_DIR = path.join(BASE_STORAGE, 'compressed');

// Ensure directories exist asynchronously
void fs.mkdir(UPLOAD_DIR, { recursive: true }).catch(() => undefined);
void fs.mkdir(COMPRESSED_DIR, { recursive: true }).catch(() => undefined);

const MAX_UPLOAD_BYTES = (Number(process.env.MAX_UPLOAD_MB) || 250) * 1024 * 1024;

const upload = multer({
  dest: UPLOAD_DIR,
  limits: {
    fileSize: MAX_UPLOAD_BYTES,
  },
});

// ─── Embedded Local Job Runner (Active when Redis is offline or running locally) ───
interface LocalJobRecord {
  state: 'waiting' | 'active' | 'completed' | 'failed';
  progress: number;
  returnvalue?: CompressionJobResult;
  failedReason?: string;
  createdAt: number;
}
const localJobs = new Map<string, LocalJobRecord>();

// Periodic cleanup of completed local jobs older than 2 hours
setInterval(() => {
  const cutoff = Date.now() - 2 * 3600 * 1000;
  for (const [id, job] of localJobs.entries()) {
    if (job.createdAt < cutoff) localJobs.delete(id);
  }
}, 30 * 60 * 1000);

async function runJobLocally(jobData: CompressionJobData): Promise<void> {
  const jobId = jobData.jobId;
  localJobs.set(jobId, { state: 'active', progress: 5, createdAt: Date.now() });

  console.log(`[LocalEngine] Processing Job ${jobId} (${jobData.category}) locally: "${jobData.originalFileName}"`);
  const startTime = Date.now();

  try {
    await fs.mkdir(path.dirname(jobData.outputFilePath), { recursive: true });

    let processResult: { outputFilePath: string; compressedSize: number };
    const updateProgress = async (pct: number) => {
      const record = localJobs.get(jobId);
      if (record) record.progress = pct;
    };

    switch (jobData.category) {
      case 'pdf':
        processResult = await processPdf(jobData, updateProgress);
        break;
      case 'image':
        processResult = await processImage(jobData, updateProgress);
        break;
      case 'video':
        processResult = await processVideo(jobData, updateProgress);
        break;
      case 'audio':
        processResult = await processAudio(jobData, updateProgress);
        break;
      default:
        throw new Error(`Unsupported category: ${(jobData as any).category}`);
    }

    const durationMs = Date.now() - startTime;
    const savedBytes = Math.max(0, jobData.originalSize - processResult.compressedSize);
    const reductionPercentage =
      jobData.originalSize > 0
        ? Math.round(((jobData.originalSize - processResult.compressedSize) / jobData.originalSize) * 1000) / 10
        : 0;

    const downloadToken = crypto.randomBytes(24).toString('hex');
    await fs.rm(jobData.inputFilePath, { force: true }).catch(() => undefined);

    const result: CompressionJobResult = {
      jobId: jobData.jobId,
      originalFileName: jobData.originalFileName,
      originalSize: jobData.originalSize,
      compressedSize: processResult.compressedSize,
      savedBytes,
      reductionPercentage,
      outputFileName: path.basename(processResult.outputFilePath),
      outputFilePath: processResult.outputFilePath,
      mimeType: jobData.mimeType,
      category: jobData.category,
      downloadToken,
      durationMs,
    };

    localJobs.set(jobId, {
      state: 'completed',
      progress: 100,
      returnvalue: result,
      createdAt: Date.now(),
    });

    console.log(
      `[LocalEngine] Completed Job ${jobId} in ${durationMs}ms - Saved ${reductionPercentage}% (${(savedBytes / 1024 / 1024).toFixed(2)} MB)`
    );
  } catch (err: any) {
    console.error(`[LocalEngine] Job ${jobId} failed:`, err.message);
    localJobs.set(jobId, {
      state: 'failed',
      progress: 0,
      failedReason: err.message || 'Compression failed.',
      createdAt: Date.now(),
    });
  }
}

/**
 * Helper to determine clean output extension based on category and options
 */
function getOutputExtension(category: FileCategory, options?: any): string {
  switch (category) {
    case 'pdf':
      return 'pdf';
    case 'image':
      return options?.imageFormat === 'jpeg' ? 'jpg' : 'webp';
    case 'video':
      return 'mp4';
    case 'audio':
      return options?.audioCodec === 'opus' ? 'opus' : 'mp3';
    default:
      return 'bin';
  }
}

/**
 * POST /api/compress/upload
 * Ingests a file, checks magic bytes to detect true MIME type,
 * saves to storage, and pushes a job to the Redis queue (or embedded local runner if offline).
 */
router.post('/upload', upload.single('file'), async (req: Request, res: Response) => {
  if (!req.file) {
    return res.status(400).json({ error: 'No file uploaded. Send file under field "file".' });
  }

  const tempFilePath = req.file.path;
  const originalFileName = req.file.originalname || 'file';

  try {
    // 1. Detect true MIME type and category using magic bytes inspection
    const detected = await detectMimeFromPath(tempFilePath);

    if (!detected) {
      await fs.rm(tempFilePath, { force: true }).catch(() => undefined);
      return res.status(415).json({
        error: 'Unsupported or unidentifiable file format. Supported formats: PDF, Images (JPG, PNG, WebP, GIF), Videos (MP4, MOV, MKV, AVI, WebM), Audio (MP3, WAV, FLAC, OGG).',
      });
    }

    const jobId = crypto.randomUUID();
    const outputExtension = getOutputExtension(detected.category, req.body);
    const outputFileName = `compressed-${jobId}.${outputExtension}`;
    const outputFilePath = path.join(COMPRESSED_DIR, outputFileName);

    // Optional user-specified compression settings
    const options: CompressionJobData['options'] = {
      level: req.body.level || 'medium',
      targetSizeBytes: req.body.targetSizeBytes ? Number(req.body.targetSizeBytes) : undefined,
      imageFormat: req.body.imageFormat,
      videoCodec: req.body.videoCodec || 'libx264',
      crf: req.body.crf ? Number(req.body.crf) : 28,
      audioCodec: req.body.audioCodec || 'mp3',
    };

    const jobData: CompressionJobData = {
      jobId,
      originalFileName,
      originalSize: req.file.size,
      mimeType: detected.mime,
      category: detected.category,
      inputFilePath: tempFilePath,
      outputFilePath,
      options,
      createdAt: Date.now(),
    };

    // 2. Try pushing to Redis queue via BullMQ; fallback to embedded local runner if Redis is offline
    let enqueuedToRedis = false;
    try {
      const queue = getCompressionQueue();
      const addPromise = queue.add(`compress-${detected.category}`, jobData, {
        jobId,
        priority: detected.category === 'pdf' || detected.category === 'image' ? 1 : 2,
      });
      const timeoutPromise = new Promise((_, reject) =>
        setTimeout(() => reject(new Error('Redis timeout')), 1200)
      );
      await Promise.race([addPromise, timeoutPromise]);
      enqueuedToRedis = true;
    } catch {
      // Redis is offline -> run on local embedded runner
      enqueuedToRedis = false;
      localJobs.set(jobId, { state: 'waiting', progress: 0, createdAt: Date.now() });
      void runJobLocally(jobData);
    }

    return res.status(202).json({
      success: true,
      jobId,
      status: 'queued',
      mode: enqueuedToRedis ? 'distributed-redis' : 'embedded-local-runner',
      file: {
        originalFileName,
        size: req.file.size,
        mimeType: detected.mime,
        category: detected.category,
      },
      statusUrl: `/api/compress/jobs/${jobId}`,
    });
  } catch (err: any) {
    console.error('Error during file ingestion:', err);
    await fs.rm(tempFilePath, { force: true }).catch(() => undefined);
    return res.status(500).json({ error: 'Failed to enqueue file for compression.' });
  }
});

/**
 * GET /api/compress/jobs/:jobId
 * Returns current status of the compression job, real-time progress,
 * and the download URL upon completion.
 */
router.get('/jobs/:jobId', async (req: Request, res: Response) => {
  const { jobId } = req.params;
  try {
    // 1. Check local jobs first
    if (localJobs.has(jobId)) {
      const job = localJobs.get(jobId)!;
      if (job.state === 'completed') {
        const returnData = job.returnvalue;
        return res.json({
          jobId,
          status: 'completed',
          progress: 100,
          result: {
            originalFileName: returnData?.originalFileName,
            originalSize: returnData?.originalSize,
            compressedSize: returnData?.compressedSize,
            savedBytes: returnData?.savedBytes,
            reductionPercentage: returnData?.reductionPercentage,
            mimeType: returnData?.mimeType,
            category: returnData?.category,
            durationMs: returnData?.durationMs,
            downloadUrl: `/api/compress/download/${jobId}`,
          },
        });
      }
      if (job.state === 'failed') {
        return res.status(422).json({
          jobId,
          status: 'failed',
          failedReason: job.failedReason || 'Compression failed.',
        });
      }
      return res.json({
        jobId,
        status: job.state,
        progress: job.progress,
      });
    }

    // 2. Query Redis queue
    const queue = getCompressionQueue();
    const job = await queue.getJob(jobId);

    if (!job) {
      return res.status(404).json({ error: 'Compression job not found.' });
    }

    const state = await job.getState();
    const progress = job.progress || 0;

    if (state === 'completed') {
      const returnData = job.returnvalue;
      return res.json({
        jobId,
        status: 'completed',
        progress: 100,
        result: {
          originalFileName: returnData?.originalFileName,
          originalSize: returnData?.originalSize,
          compressedSize: returnData?.compressedSize,
          savedBytes: returnData?.savedBytes,
          reductionPercentage: returnData?.reductionPercentage,
          mimeType: returnData?.mimeType,
          category: returnData?.category,
          durationMs: returnData?.durationMs,
          downloadUrl: `/api/compress/download/${jobId}`,
        },
      });
    }

    if (state === 'failed') {
      return res.status(422).json({
        jobId,
        status: 'failed',
        failedReason: job.failedReason || 'Compression failed.',
      });
    }

    return res.json({
      jobId,
      status: state,
      progress: typeof progress === 'number' ? progress : 0,
    });
  } catch (err: any) {
    console.error(`Error querying job ${jobId}:`, err);
    return res.status(500).json({ error: 'Failed to retrieve job status.' });
  }
});

/**
 * GET /api/compress/download/:jobId
 * Returns the final compressed file as an attachment with appropriate headers.
 */
router.get('/download/:jobId', async (req: Request, res: Response) => {
  const { jobId } = req.params;
  try {
    let result: CompressionJobResult | undefined;

    if (localJobs.has(jobId) && localJobs.get(jobId)?.returnvalue) {
      result = localJobs.get(jobId)!.returnvalue;
    } else {
      const queue = getCompressionQueue();
      const job = await queue.getJob(jobId);
      if (job?.returnvalue) result = job.returnvalue;
    }

    if (!result) {
      return res.status(404).json({ error: 'Compressed file not found or still processing.' });
    }

    const filePath = result.outputFilePath;
    const stat = await fs.stat(filePath).catch(() => null);
    if (!stat) {
      return res.status(410).json({ error: 'The compressed file has expired or was removed.' });
    }

    const ext = path.extname(filePath) || `.${result.outputFileName.split('.').pop()}`;
    const baseName = path.basename(result.originalFileName, path.extname(result.originalFileName));
    const downloadName = `${baseName}-compressed${ext}`;

    res.setHeader('Content-Type', result.mimeType || 'application/octet-stream');
    res.setHeader('Content-Length', String(stat.size));
    res.setHeader(
      'Content-Disposition',
      `attachment; filename*=UTF-8''${encodeURIComponent(downloadName)}`
    );
    res.setHeader('X-Original-Size', String(result.originalSize));
    res.setHeader('X-Compressed-Size', String(result.compressedSize));
    res.setHeader('X-Reduction-Percentage', String(result.reductionPercentage));

    const fileStream = createReadStream(filePath);
    return fileStream.pipe(res);
  } catch (err: any) {
    console.error(`Error streaming download for job ${jobId}:`, err);
    return res.status(500).json({ error: 'Failed to download compressed file.' });
  }
});

/**
 * GET /api/compress/health
 * Reports operational status and queue metrics
 */
router.get('/health', async (_req: Request, res: Response) => {
  try {
    const queue = getCompressionQueue();
    const countsPromise = queue.getJobCounts('waiting', 'active', 'completed', 'failed');
    const timeoutPromise = new Promise((_, reject) =>
      setTimeout(() => reject(new Error('Redis timeout')), 1000)
    );
    const counts = (await Promise.race([countsPromise, timeoutPromise])) as any;

    return res.json({
      status: 'ok',
      mode: 'distributed-redis',
      engine: 'ZipStream Distributed Compression Engine',
      queue: counts,
      storageDir: BASE_STORAGE,
      timestamp: new Date().toISOString(),
    });
  } catch {
    // Graceful reporting when running in embedded local runner mode
    return res.json({
      status: 'ok',
      mode: 'embedded-local-runner',
      engine: 'ZipStream Compression Engine',
      localJobsActive: Array.from(localJobs.values()).filter(j => j.state === 'active').length,
      localJobsTotal: localJobs.size,
      storageDir: BASE_STORAGE,
      timestamp: new Date().toISOString(),
    });
  }
});

export default router;
