import { describe, expect, it } from 'vitest';
import { execFile } from 'child_process';
import { promisify } from 'util';
import fs from 'fs/promises';
import os from 'os';
import path from 'path';
import ffmpegInstaller from '@ffmpeg-installer/ffmpeg';
import ffprobeInstaller from '@ffprobe-installer/ffprobe';
import { processAudio } from '../compression/processors/audioWorker';
import { processVideo } from '../compression/processors/videoWorker';
import { CompressionJobData } from '../compression/types';

const execFileAsync = promisify(execFile);
const ffmpegPath = (ffmpegInstaller as any).path as string;
const ffprobePath = (ffprobeInstaller as any).path as string;

async function probe(filePath: string): Promise<any> {
  const { stdout } = await execFileAsync(ffprobePath, [
    '-v', 'error', '-show_entries', 'format=duration:stream=codec_type,channels', '-of', 'json', filePath,
  ]);
  return JSON.parse(stdout);
}

function makeJob(
  category: 'audio' | 'video',
  inputFilePath: string,
  outputFilePath: string,
  originalSize: number,
  options: CompressionJobData['options'] = {}
): CompressionJobData {
  return {
    jobId: `${category}-regression`,
    originalFileName: path.basename(inputFilePath),
    originalSize,
    mimeType: category === 'audio' ? 'audio/wav' : 'video/mp4',
    category,
    inputFilePath,
    outputFilePath,
    options,
    createdAt: Date.now(),
  };
}

describe('Audio and video compression regression', () => {
  it('compresses mono audio, keeps one channel, and respects a feasible byte cap', async () => {
    const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'zipstream-audio-'));
    const inputPath = path.join(tempDir, 'source.wav');
    const outputPath = path.join(tempDir, 'compressed.mp3');
    try {
      await execFileAsync(ffmpegPath, [
        '-y', '-f', 'lavfi', '-i', 'sine=frequency=440:duration=12', '-ac', '1', '-ar', '44100', inputPath,
      ]);
      const originalSize = (await fs.stat(inputPath)).size;
      const targetSizeBytes = Math.floor(originalSize * 0.12);
      const result = await processAudio(makeJob('audio', inputPath, outputPath, originalSize, {
        level: 'medium', audioCodec: 'mp3', targetSizeBytes,
      }));
      const outputInfo = await probe(result.outputFilePath);
      expect(result.compressedSize).toBeLessThan(originalSize);
      expect(result.compressedSize).toBeLessThanOrEqual(targetSizeBytes);
      expect(outputInfo.streams.find((stream: any) => stream.codec_type === 'audio')?.channels).toBe(1);
      expect(Number(outputInfo.format.duration)).toBeGreaterThan(11.5);
    } finally {
      await fs.rm(tempDir, { recursive: true, force: true }).catch(() => undefined);
    }
  }, 45000);

  it('compresses video without changing duration and enforces the requested output cap', async () => {
    const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'zipstream-video-'));
    const inputPath = path.join(tempDir, 'source.mp4');
    const outputPath = path.join(tempDir, 'compressed.mp4');
    try {
      await execFileAsync(ffmpegPath, [
        '-y', '-f', 'lavfi', '-i', 'testsrc2=size=640x360:rate=24:duration=8',
        '-f', 'lavfi', '-i', 'sine=frequency=660:duration=8', '-c:v', 'libx264', '-crf', '18',
        '-preset', 'ultrafast', '-c:a', 'aac', '-b:a', '128k', '-shortest', inputPath,
      ], { timeout: 30000 });
      const originalSize = (await fs.stat(inputPath)).size;
      const targetSizeBytes = Math.floor(originalSize * 0.8);
      const result = await processVideo(makeJob('video', inputPath, outputPath, originalSize, {
        level: 'medium', videoCodec: 'libx264', crf: 28, targetSizeBytes,
      }));
      const outputInfo = await probe(result.outputFilePath);
      expect(result.compressedSize).toBeLessThan(originalSize);
      expect(result.compressedSize).toBeLessThanOrEqual(targetSizeBytes);
      expect(outputInfo.streams.some((stream: any) => stream.codec_type === 'video')).toBe(true);
      expect(Math.abs(Number(outputInfo.format.duration) - 8)).toBeLessThan(0.3);
    } finally {
      await fs.rm(tempDir, { recursive: true, force: true }).catch(() => undefined);
    }
  }, 60000);
});
