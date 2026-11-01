import { execFile } from 'child_process';
import { promisify } from 'util';
import fs from 'fs/promises';
import { CompressionJobData } from '../types';
import { ProcessResult } from './pdfWorker';
import { getOutputPathForExtension, getTargetSizeBytes, isTargetAlreadySatisfied, preserveOriginal } from '../optimization';
import ffmpegInstaller from '@ffmpeg-installer/ffmpeg';
import ffprobeInstaller from '@ffprobe-installer/ffprobe';

const execFileAsync = promisify(execFile);

type ProbeResult = {
  duration: number;
  hasVideo: boolean;
};

async function probeVideo(ffprobePath: string, filePath: string): Promise<ProbeResult> {
  try {
    const { stdout } = await execFileAsync(
      ffprobePath,
      [
        '-v', 'error',
        '-show_entries', 'format=duration:stream=codec_type',
        '-of', 'json',
        filePath,
      ],
      { timeout: 30000, maxBuffer: 4 * 1024 * 1024, windowsHide: true }
    );
    const data = JSON.parse(stdout);
    const duration = Number.parseFloat(data.format?.duration || '0');
    const hasVideo = Array.isArray(data.streams) &&
      data.streams.some((stream: any) => stream.codec_type === 'video');
    if (!Number.isFinite(duration) || duration <= 0 || !hasVideo) {
      throw new Error('No valid video stream or duration was found.');
    }
    return { duration, hasVideo };
  } catch (err: any) {
    throw new Error(`Unable to read video streams: ${err.message}`);
  }
}

function getFfmpegPath(): string {
  if (process.env.FFMPEG_PATH) return process.env.FFMPEG_PATH;
  const installer = (ffmpegInstaller as any)?.path || (ffmpegInstaller as any)?.default?.path;
  return installer || 'ffmpeg';
}

function getFfprobePath(): string {
  if (process.env.FFPROBE_PATH) return process.env.FFPROBE_PATH;
  const installer = (ffprobeInstaller as any)?.path || (ffprobeInstaller as any)?.default?.path;
  return installer || 'ffprobe';
}

async function encodeVideo(
  ffmpegPath: string,
  inputPath: string,
  outputPath: string,
  codec: 'libx264' | 'libx265',
  crf: number,
  maxWidth: number,
  timeoutMs: number,
  targetVideoBitrate?: number
): Promise<void> {
  const preset = 'slow';
  const common = [
    '-y',
    '-i', inputPath,
    '-map', '0:v:0',
    '-map', '0:a?',
    '-vf', `scale='min(${maxWidth},iw)':-2:force_original_aspect_ratio=decrease`,
    '-c:v', codec,
    '-preset', preset,
    '-pix_fmt', 'yuv420p',
    '-map_metadata', '-1',
    '-threads', '0',
  ];

  if (targetVideoBitrate && targetVideoBitrate > 0) {
    const passLog = `${outputPath}.passlog`;
    const passOne = [
      ...common,
      '-b:v', String(targetVideoBitrate),
      '-pass', '1',
      '-passlogfile', passLog,
      '-an',
      '-f', 'null',
      process.platform === 'win32' ? 'NUL' : '/dev/null',
    ];
    const passTwo = [
      ...common,
      '-b:v', String(targetVideoBitrate),
      '-pass', '2',
      '-passlogfile', passLog,
      '-c:a', 'aac',
      '-b:a', '96k',
      '-ac', '2',
      '-movflags', '+faststart',
      outputPath,
    ];
    try {
      await execFileAsync(ffmpegPath, passOne, { timeout: timeoutMs, maxBuffer: 8 * 1024 * 1024, windowsHide: true });
      await execFileAsync(ffmpegPath, passTwo, { timeout: timeoutMs, maxBuffer: 8 * 1024 * 1024, windowsHide: true });
    } finally {
      await Promise.all([
        fs.rm(`${passLog}-0.log`, { force: true }).catch(() => undefined),
        fs.rm(`${passLog}-0.log.mbtree`, { force: true }).catch(() => undefined),
        fs.rm(`${passLog}-0.log.temp`, { force: true }).catch(() => undefined),
      ]);
    }
    return;
  }

  await execFileAsync(ffmpegPath, [
    ...common,
    '-crf', String(crf),
    '-c:a', 'aac',
    '-b:a', '128k',
    '-ac', '2',
    '-movflags', '+faststart',
    outputPath,
  ], { timeout: timeoutMs, maxBuffer: 8 * 1024 * 1024, windowsHide: true });
}

/**
 * Video optimizer uses slow x264/x265 encoding presets for better rate-distortion
 * efficiency. Size-capped jobs use two-pass average-bitrate encoding with a
 * retry ladder. Outputs are probed before acceptance, and larger-than-source
 * encodes are discarded in favour of the untouched original.
 */
export async function processVideo(
  job: CompressionJobData,
  onProgress?: (percentage: number) => Promise<void>
): Promise<ProcessResult> {
  if (isTargetAlreadySatisfied(job)) {
    const preserved = await preserveOriginal(job);
    if (onProgress) await onProgress(100);
    return preserved;
  }

  const ffmpegPath = getFfmpegPath();
  const ffprobePath = getFfprobePath();
  const timeoutMs = Math.max(60000, Number(process.env.VIDEO_TIMEOUT_MS) || 900000);
  const { duration } = await probeVideo(ffprobePath, job.inputFilePath);
  const targetBytes = getTargetSizeBytes(job);
  const codec = job.options?.videoCodec || 'libx264';
  const level = job.options?.level || 'medium';

  if (onProgress) await onProgress(10);

  const targetBps = targetBytes
    ? Math.floor((targetBytes * 8 * 0.94) / duration)
    : undefined;
  const audioBps = targetBps ? 96000 : 128000;
  const baseVideoBps = targetBps ? Math.max(80000, targetBps - audioBps) : undefined;
  const profiles = targetBytes
    ? [
        { factor: 1, width: 1920, crf: 24 },
        { factor: 0.88, width: 1920, crf: 26 },
        { factor: 0.76, width: 1600, crf: 28 },
        { factor: 0.64, width: 1280, crf: 30 },
        { factor: 0.52, width: 960, crf: 32 },
        { factor: 0.40, width: 854, crf: 35 },
      ]
    : [level === 'high'
      ? { factor: 1, width: 1280, crf: 29 }
      : level === 'low'
        ? { factor: 1, width: 1920, crf: 22 }
        : { factor: 1, width: 1600, crf: 25 }];

  const candidates: Array<{ path: string; size: number }> = [];
  const temporaryPaths: string[] = [];
  const outputFilePath = getOutputPathForExtension(job.outputFilePath, '.mp4');

  try {
    for (let index = 0; index < profiles.length; index++) {
      const profile = profiles[index];
      const candidatePath = `${outputFilePath}.candidate-${index}.mp4`;
      temporaryPaths.push(candidatePath);

      const bitrate = baseVideoBps
        ? Math.max(64000, Math.floor(baseVideoBps * profile.factor))
        : undefined;

      if (onProgress) {
        await onProgress(Math.min(90, 15 + Math.floor((index / profiles.length) * 70)));
      }

      try {
        await encodeVideo(
          ffmpegPath,
          job.inputFilePath,
          candidatePath,
          codec,
          profile.crf,
          profile.width,
          timeoutMs,
          bitrate
        );
      } catch (error: any) {
        console.warn(`[VideoWorker] Encoding profile ${index + 1} failed: ${error.message}`);
        if (index === 0) throw error;
        continue;
      }

      const stat = await fs.stat(candidatePath).catch(() => null);
      if (!stat || stat.size <= 0 || stat.size >= job.originalSize) continue;

      try {
        await probeVideo(ffprobePath, candidatePath);
      } catch {
        continue;
      }

      candidates.push({ path: candidatePath, size: stat.size });
      if (!targetBytes) break;
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

    await fs.copyFile(selected.path, outputFilePath);
    const stat = await fs.stat(outputFilePath);
    if (onProgress) await onProgress(100);
    return {
      outputFilePath,
      compressedSize: stat.size,
      mimeType: 'video/mp4',
    };
  } finally {
    await Promise.all(temporaryPaths.map(filePath =>
      fs.rm(filePath, { force: true }).catch(() => undefined)
    ));
  }
}
