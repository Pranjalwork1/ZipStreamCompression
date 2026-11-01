import { execFile } from 'child_process';
import { promisify } from 'util';
import fs from 'fs/promises';
import { CompressionJobData } from '../types';
import { ProcessResult } from './pdfWorker';
import { getOutputPathForExtension, getTargetSizeBytes, isTargetAlreadySatisfied, preserveOriginal } from '../optimization';
import ffmpegInstaller from '@ffmpeg-installer/ffmpeg';
import ffprobeInstaller from '@ffprobe-installer/ffprobe';

const execFileAsync = promisify(execFile);

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

async function probeAudio(ffprobePath: string, filePath: string): Promise<number> {
  try {
    const { stdout } = await execFileAsync(
      ffprobePath,
      ['-v', 'error', '-show_entries', 'format=duration:stream=codec_type', '-of', 'json', filePath],
      { timeout: 30000, maxBuffer: 4 * 1024 * 1024, windowsHide: true }
    );
    const data = JSON.parse(stdout);
    const duration = Number.parseFloat(data.format?.duration || '0');
    const hasAudio = Array.isArray(data.streams) &&
      data.streams.some((stream: any) => stream.codec_type === 'audio');
    if (!Number.isFinite(duration) || duration <= 0 || !hasAudio) {
      throw new Error('No valid audio stream or duration was found.');
    }
    return duration;
  } catch (err: any) {
    throw new Error(`Unable to read audio streams: ${err.message}`);
  }
}

async function encodeAudio(
  ffmpegPath: string,
  inputPath: string,
  outputPath: string,
  codec: 'mp3' | 'opus',
  bitrate: number,
  timeoutMs: number
): Promise<void> {
  const codecArgs = codec === 'opus'
    ? ['-c:a', 'libopus', '-b:a', String(bitrate), '-vbr', 'on', '-compression_level', '10']
    : ['-c:a', 'libmp3lame', '-b:a', String(bitrate), '-abr', '1', '-compression_level', '2'];

  await execFileAsync(ffmpegPath, [
    '-y',
    '-i', inputPath,
    '-map', '0:a:0',
    '-vn',
    '-sn',
    '-dn',
    '-map_metadata', '-1',
    ...codecArgs,
    outputPath,
  ], { timeout: timeoutMs, maxBuffer: 8 * 1024 * 1024, windowsHide: true });
}

/**
 * Adaptive audio optimizer. Target-size jobs retry decreasing bitrates, while
 * normal jobs use the selected quality preset. The best candidate below the cap
 * is chosen; if no candidate is smaller than the source, the original is kept.
 * The encoder no longer forces all audio to stereo, preserving multichannel
 * source layouts unless the target codec itself cannot represent them.
 */
export async function processAudio(
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
  const timeoutMs = Math.max(30000, Number(process.env.AUDIO_TIMEOUT_MS) || 240000);
  const duration = await probeAudio(ffprobePath, job.inputFilePath);
  const targetBytes = getTargetSizeBytes(job);
  const codec = job.options?.audioCodec || 'mp3';
  const level = job.options?.level || 'medium';

  if (onProgress) await onProgress(10);

  let bitrates: number[];
  if (targetBytes) {
    const targetBps = Math.max(24000, Math.floor((targetBytes * 8 * 0.96) / duration));
    bitrates = [
      Math.min(320000, targetBps),
      Math.min(256000, Math.floor(targetBps * 0.88)),
      Math.min(192000, Math.floor(targetBps * 0.76)),
      Math.min(128000, Math.floor(targetBps * 0.64)),
      Math.min(96000, Math.floor(targetBps * 0.52)),
      Math.max(24000, Math.floor(targetBps * 0.40)),
    ].filter((value, index, list) => value > 0 && list.indexOf(value) === index);
  } else if (codec === 'opus') {
    bitrates = [level === 'high' ? 48_000 : level === 'low' ? 160_000 : 96_000];
  } else {
    bitrates = [level === 'high' ? 64_000 : level === 'low' ? 192_000 : 128_000];
  }

  const extension = codec === 'opus' ? '.opus' : '.mp3';
  const mimeType = codec === 'opus' ? 'audio/ogg' : 'audio/mpeg';
  const outputFilePath = getOutputPathForExtension(job.outputFilePath, extension);
  const temporaryPaths: string[] = [];
  const candidates: Array<{ path: string; size: number }> = [];

  try {
    for (let index = 0; index < bitrates.length; index++) {
      const candidatePath = `${outputFilePath}.candidate-${index}${extension}`;
      temporaryPaths.push(candidatePath);

      if (onProgress) {
        await onProgress(Math.min(90, 20 + Math.floor((index / bitrates.length) * 65)));
      }

      try {
        await encodeAudio(ffmpegPath, job.inputFilePath, candidatePath, codec, bitrates[index], timeoutMs);
      } catch (error: any) {
        console.warn(`[AudioWorker] Audio encoding profile ${index + 1} failed: ${error.message}`);
        if (index === 0) throw error;
        continue;
      }

      const stat = await fs.stat(candidatePath).catch(() => null);
      if (stat && stat.size > 0 && stat.size < job.originalSize) {
        candidates.push({ path: candidatePath, size: stat.size });
      }
      if (!targetBytes && candidates.length > 0) break;
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
      mimeType,
    };
  } finally {
    await Promise.all(temporaryPaths.map(filePath =>
      fs.rm(filePath, { force: true }).catch(() => undefined)
    ));
  }
}
