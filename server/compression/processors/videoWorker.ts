import { spawn, execFile } from 'child_process';
import { promisify } from 'util';
import fs from 'fs/promises';
import { CompressionJobData } from '../types';
import { ProcessResult } from './pdfWorker';

const execFileAsync = promisify(execFile);

/**
 * Validates whether the media file is readable and non-corrupted using ffprobe.
 */
async function probeVideo(ffprobePath: string, filePath: string): Promise<{ duration: number; hasVideo: boolean }> {
  try {
    const { stdout } = await execFileAsync(
      ffprobePath,
      [
        '-v', 'error',
        '-show_entries', 'format=duration:stream=codec_type',
        '-of', 'json',
        filePath,
      ],
      { timeout: 15000 }
    );
    const data = JSON.parse(stdout);
    const duration = parseFloat(data.format?.duration || '0');
    const hasVideo = Array.isArray(data.streams) && data.streams.some((s: any) => s.codec_type === 'video');
    return { duration, hasVideo };
  } catch (err: any) {
    throw new Error(`Corrupted video file: ffprobe was unable to read file streams (${err.message}).`);
  }
}

function getFfmpegPath(): string {
  if (process.env.FFMPEG_PATH) return process.env.FFMPEG_PATH;
  try {
    const installer = require('@ffmpeg-installer/ffmpeg');
    if (installer?.path) return installer.path;
  } catch {}
  return 'ffmpeg';
}

function getFfprobePath(): string {
  if (process.env.FFPROBE_PATH) return process.env.FFPROBE_PATH;
  try {
    const installer = require('@ffprobe-installer/ffprobe');
    if (installer?.path) return installer.path;
  } catch {}
  return 'ffprobe';
}

/**
 * Video Worker: Re-encodes video according to user preset:
 * - high (Extreme / Smaller): 720p max, CRF 32, AAC 96k, preset medium
 * - medium (Recommended / Balanced): 1080p max, CRF 28, AAC 128k, preset medium
 * - low (Less / Best Quality): 1080p max, CRF 23, AAC 192k, preset medium
 * Incorporates strict process timeouts and corrupted file guards.
 */
export async function processVideo(
  job: CompressionJobData,
  onProgress?: (percentage: number) => Promise<void>
): Promise<ProcessResult> {
  const ffmpegPath = getFfmpegPath();
  const ffprobePath = getFfprobePath();
  const timeoutMs = Number(process.env.VIDEO_TIMEOUT_MS) || 600000; // 10 minutes default

  if (onProgress) await onProgress(5);

  // 1. Guard against corrupted videos via ffprobe
  const { duration } = await probeVideo(ffprobePath, job.inputFilePath);

  if (onProgress) await onProgress(10);

  const level = job.options?.level || 'medium';
  const codec = job.options?.videoCodec || 'libx264';

  let crf = 28;
  let maxScaleWidth = 1920;
  let audioBitrate = '128k';

  if (level === 'high') {
    // Smaller / Extreme
    crf = job.options?.crf !== undefined ? job.options.crf : 32;
    maxScaleWidth = 1280; // 720p
    audioBitrate = '96k';
  } else if (level === 'low') {
    // Best Quality
    crf = job.options?.crf !== undefined ? job.options.crf : 23;
    maxScaleWidth = 1920; // 1080p
    audioBitrate = '192k';
  } else {
    // Balanced
    crf = job.options?.crf !== undefined ? job.options.crf : 28;
    maxScaleWidth = 1920;
    audioBitrate = '128k';
  }

  // FFmpeg arguments:
  // - scale='min(maxScaleWidth,iw)':-2 maintains aspect ratio, caps width, ensures even dimensions
  // - -c:v libx264 -crf [crf] -preset medium
  // - -c:a aac -b:a [audioBitrate] -ac 2
  // - -movflags +faststart for immediate web streaming
  // - -progress pipe:1 for real-time progress parsing
  const args = [
    '-y',
    '-i', job.inputFilePath,
    '-vf', `scale='min(${maxScaleWidth},iw)':-2`,
    '-c:v', codec,
    '-crf', String(crf),
    '-preset', 'medium',
    '-c:a', 'aac',
    '-b:a', audioBitrate,
    '-ac', '2',
    '-movflags', '+faststart',
    '-progress', 'pipe:1',
    job.outputFilePath,
  ];

  return new Promise((resolve, reject) => {
    let timer: NodeJS.Timeout | null = null;
    let timedOut = false;
    let lastProgressPct = 10;

    const child = spawn(ffmpegPath, args, {
      stdio: ['ignore', 'pipe', 'pipe'],
    });

    // Timeout guard with clean SIGTERM / SIGKILL cascade
    timer = setTimeout(() => {
      timedOut = true;
      console.warn(`[VideoWorker] Job ${job.jobId} timed out after ${timeoutMs}ms. Terminating FFmpeg...`);
      child.kill('SIGTERM');
      setTimeout(() => {
        if (!child.killed) child.kill('SIGKILL');
      }, 5000);
    }, timeoutMs);

    let stderrBuffer = '';

    child.stderr.on('data', (chunk) => {
      stderrBuffer += chunk.toString();
      if (stderrBuffer.length > 32768) {
        stderrBuffer = stderrBuffer.slice(-16384);
      }
    });

    // Parse progress stream
    child.stdout.on('data', (chunk) => {
      const text = chunk.toString();
      const match = text.match(/out_time_us=(\d+)/);
      if (match && duration > 0) {
        const timeSec = parseInt(match[1], 10) / 1000000;
        const pct = Math.min(95, Math.max(10, Math.floor((timeSec / duration) * 90) + 10));
        if (pct > lastProgressPct) {
          lastProgressPct = pct;
          if (onProgress) {
            onProgress(pct).catch(() => undefined);
          }
        }
      }
    });

    child.on('error', (err) => {
      if (timer) clearTimeout(timer);
      reject(new Error(`Failed to start FFmpeg for video processing: ${err.message}`));
    });

    child.on('close', async (code) => {
      if (timer) clearTimeout(timer);

      if (timedOut) {
        await fs.rm(job.outputFilePath, { force: true }).catch(() => undefined);
        return reject(new Error(`Video compression timed out after ${Math.round(timeoutMs / 1000)} seconds.`));
      }

      if (code !== 0) {
        await fs.rm(job.outputFilePath, { force: true }).catch(() => undefined);
        return reject(new Error(`FFmpeg exited with error code ${code}: ${stderrBuffer.slice(-500)}`));
      }

      const stat = await fs.stat(job.outputFilePath).catch(() => null);
      if (!stat || stat.size === 0) {
        return reject(new Error('Video compression completed but generated an empty output file.'));
      }

      if (onProgress) await onProgress(100);

      resolve({
        outputFilePath: job.outputFilePath,
        compressedSize: stat.size,
      });
    });
  });
}
