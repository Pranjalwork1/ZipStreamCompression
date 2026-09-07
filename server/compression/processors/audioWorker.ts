import { spawn, execFile } from 'child_process';
import { promisify } from 'util';
import fs from 'fs/promises';
import { CompressionJobData } from '../types';
import { ProcessResult } from './pdfWorker';

const execFileAsync = promisify(execFile);

/**
 * Validates whether the audio file is readable and non-corrupted using ffprobe.
 */
async function probeAudio(ffprobePath: string, filePath: string): Promise<number> {
  try {
    const { stdout } = await execFileAsync(
      ffprobePath,
      [
        '-v', 'error',
        '-show_entries', 'format=duration',
        '-of', 'json',
        filePath,
      ],
      { timeout: 10000 }
    );
    const data = JSON.parse(stdout);
    return parseFloat(data.format?.duration || '0');
  } catch (err: any) {
    throw new Error(`Corrupted audio file: unable to read audio streams (${err.message}).`);
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
 * Audio Worker: Runs FFmpeg to downmix to stereo (-ac 2) and
 * compress according to user preset:
 * - high (Smaller / Extreme): 64kbps MP3 or 48kbps Opus
 * - medium (Recommended / Balanced): 128kbps MP3 or 96kbps Opus
 * - low (Less / Best Quality): 192kbps MP3 or 160kbps Opus
 */
export async function processAudio(
  job: CompressionJobData,
  onProgress?: (percentage: number) => Promise<void>
): Promise<ProcessResult> {
  const ffmpegPath = getFfmpegPath();
  const ffprobePath = getFfprobePath();
  const timeoutMs = Number(process.env.AUDIO_TIMEOUT_MS) || 180000; // 3 minutes default

  if (onProgress) await onProgress(10);

  // 1. Corrupted file check
  const duration = await probeAudio(ffprobePath, job.inputFilePath);

  if (onProgress) await onProgress(20);

  const level = job.options?.level || 'medium';
  const audioCodec = job.options?.audioCodec || 'mp3';

  let mp3Bitrate = '128k';
  let opusBitrate = '96k';

  if (level === 'high') {
    mp3Bitrate = '64k';
    opusBitrate = '48k';
  } else if (level === 'low') {
    mp3Bitrate = '192k';
    opusBitrate = '160k';
  }

  const codecArgs =
    audioCodec === 'opus'
      ? ['-c:a', 'libopus', '-b:a', opusBitrate, '-vbr', 'on']
      : ['-c:a', 'libmp3lame', '-b:a', mp3Bitrate];

  // FFmpeg arguments:
  // -ac 2 (downmix to stereo)
  // preset bitrate
  const args = [
    '-y',
    '-i', job.inputFilePath,
    '-ac', '2',
    ...codecArgs,
    '-progress', 'pipe:1',
    job.outputFilePath,
  ];

  return new Promise((resolve, reject) => {
    let timer: NodeJS.Timeout | null = null;
    let timedOut = false;
    let lastProgressPct = 20;

    const child = spawn(ffmpegPath, args, {
      stdio: ['ignore', 'pipe', 'pipe'],
    });

    timer = setTimeout(() => {
      timedOut = true;
      console.warn(`[AudioWorker] Job ${job.jobId} timed out after ${timeoutMs}ms.`);
      child.kill('SIGTERM');
      setTimeout(() => {
        if (!child.killed) child.kill('SIGKILL');
      }, 4000);
    }, timeoutMs);

    let stderrBuffer = '';

    child.stderr.on('data', (chunk) => {
      stderrBuffer += chunk.toString();
      if (stderrBuffer.length > 16384) {
        stderrBuffer = stderrBuffer.slice(-8192);
      }
    });

    child.stdout.on('data', (chunk) => {
      const text = chunk.toString();
      const match = text.match(/out_time_us=(\d+)/);
      if (match && duration > 0) {
        const timeSec = parseInt(match[1], 10) / 1000000;
        const pct = Math.min(95, Math.max(20, Math.floor((timeSec / duration) * 80) + 20));
        if (pct > lastProgressPct) {
          lastProgressPct = pct;
          if (onProgress) onProgress(pct).catch(() => undefined);
        }
      }
    });

    child.on('error', (err) => {
      if (timer) clearTimeout(timer);
      reject(new Error(`Failed to start FFmpeg for audio: ${err.message}`));
    });

    child.on('close', async (code) => {
      if (timer) clearTimeout(timer);

      if (timedOut) {
        await fs.rm(job.outputFilePath, { force: true }).catch(() => undefined);
        return reject(new Error(`Audio compression timed out after ${Math.round(timeoutMs / 1000)} seconds.`));
      }

      if (code !== 0) {
        await fs.rm(job.outputFilePath, { force: true }).catch(() => undefined);
        return reject(new Error(`FFmpeg audio compression failed (code ${code}): ${stderrBuffer.slice(-500)}`));
      }

      const stat = await fs.stat(job.outputFilePath).catch(() => null);
      if (!stat || stat.size === 0) {
        return reject(new Error('Audio compression completed but generated an empty output file.'));
      }

      if (onProgress) await onProgress(100);

      resolve({
        outputFilePath: job.outputFilePath,
        compressedSize: stat.size,
      });
    });
  });
}
