import { Worker, Job } from 'bullmq';
import crypto from 'crypto';
import fs from 'fs/promises';
import path from 'path';
import { COMPRESSION_QUEUE_NAME, getRedisConnection } from './queue';
import { CompressionJobData, CompressionJobResult } from './types';
import { processPdf } from './processors/pdfWorker';
import { processImage } from './processors/imageWorker';
import { processVideo } from './processors/videoWorker';
import { processAudio } from './processors/audioWorker';

const concurrency = Number(process.env.WORKER_CONCURRENCY) || 4;

console.log(`[Worker] Starting ZipStream Compression Worker Pool (concurrency: ${concurrency})...`);

export const compressionWorker = new Worker<CompressionJobData, CompressionJobResult>(
  COMPRESSION_QUEUE_NAME,
  async (job: Job<CompressionJobData, CompressionJobResult>) => {
    const startTime = Date.now();
    const data = job.data;

    console.log(`[Worker] Processing Job ${job.id} - Type: ${data.category}, File: "${data.originalFileName}" (${(data.originalSize / 1024 / 1024).toFixed(2)} MB)`);

    // Ensure output directory exists
    await fs.mkdir(path.dirname(data.outputFilePath), { recursive: true });

    let processResult: { outputFilePath: string; compressedSize: number };

    const updateProgress = async (pct: number) => {
      await job.updateProgress(pct);
    };

    switch (data.category) {
      case 'pdf':
        processResult = await processPdf(data, updateProgress);
        break;

      case 'image':
        processResult = await processImage(data, updateProgress);
        break;

      case 'video':
        processResult = await processVideo(data, updateProgress);
        break;

      case 'audio':
        processResult = await processAudio(data, updateProgress);
        break;

      default:
        throw new Error(`Unsupported category: ${(data as any).category}`);
    }

    const durationMs = Date.now() - startTime;
    const savedBytes = Math.max(0, data.originalSize - processResult.compressedSize);
    const reductionPercentage =
      data.originalSize > 0
        ? Math.round(((data.originalSize - processResult.compressedSize) / data.originalSize) * 1000) / 10
        : 0;

    const downloadToken = crypto.randomBytes(24).toString('hex');

    // Optionally cleanup temporary raw input file to save disk space
    await fs.rm(data.inputFilePath, { force: true }).catch(() => undefined);

    const result: CompressionJobResult = {
      jobId: data.jobId,
      originalFileName: data.originalFileName,
      originalSize: data.originalSize,
      compressedSize: processResult.compressedSize,
      savedBytes,
      reductionPercentage,
      outputFileName: path.basename(processResult.outputFilePath),
      outputFilePath: processResult.outputFilePath,
      mimeType: data.mimeType,
      category: data.category,
      downloadToken,
      durationMs,
    };

    console.log(
      `[Worker] Completed Job ${job.id} in ${durationMs}ms - Saved ${reductionPercentage}% (${(savedBytes / 1024 / 1024).toFixed(2)} MB)`
    );

    return result;
  },
  {
    connection: getRedisConnection(),
    concurrency,
  }
);

compressionWorker.on('completed', (job) => {
  console.log(`[Worker] Job ${job.id} marked COMPLETED.`);
});

compressionWorker.on('failed', (job, err) => {
  console.error(`[Worker] Job ${job?.id} FAILED:`, err.message);
});

compressionWorker.on('error', (err) => {
  console.error('[Worker] Fatal Worker Error:', err);
});

// Standalone execution entrypoint check
if (process.argv[1] && process.argv[1].endsWith('worker.ts')) {
  console.log('[Worker] Worker process running in standalone daemon mode. Waiting for jobs...');
}
