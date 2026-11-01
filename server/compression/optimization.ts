import fs from 'fs/promises';
import path from 'path';
import { CompressionJobData } from './types';

export type ImageOutputFormat = 'original' | 'webp' | 'jpeg' | 'png';

/** Accept both API-friendly MIME values and internal short format identifiers. */
export function normalizeImageOutputFormat(value: unknown): ImageOutputFormat {
  const format = String(value ?? 'original').trim().toLowerCase();
  if (format === 'image/webp' || format === 'webp') return 'webp';
  if (format === 'image/jpeg' || format === 'jpeg' || format === 'jpg') return 'jpeg';
  if (format === 'image/png' || format === 'png') return 'png';
  return 'original';
}

export function getImageOutputExtension(format: ImageOutputFormat, originalExtension: string): string {
  switch (format) {
    case 'webp': return 'webp';
    case 'jpeg': return 'jpg';
    case 'png': return 'png';
    default: return originalExtension.replace(/^\\./, '') || 'bin';
  }
}

export interface PreservedOriginal {
  outputFilePath: string;
  compressedSize: number;
  mimeType: string;
}

/**
 * Normalize a caller-supplied maximum output size. Invalid, non-positive, and
 * already-satisfied targets are treated as no-op targets.
 */
export function isTargetAlreadySatisfied(job: CompressionJobData): boolean {
  const value = Number(job.options?.targetSizeBytes);
  return Number.isFinite(value) && value > 0 && value >= job.originalSize;
}

export function getTargetSizeBytes(job: CompressionJobData): number | undefined {
  const value = Number(job.options?.targetSizeBytes);
  if (!Number.isFinite(value) || value <= 0 || value >= job.originalSize) return undefined;
  return Math.floor(value);
}

export function getOutputPathForExtension(outputFilePath: string, extension: string): string {
  const normalizedExtension = extension.startsWith('.') ? extension : `.${extension}`;
  const parsed = path.parse(outputFilePath);
  return path.join(parsed.dir, `${parsed.name}${normalizedExtension}`);
}

export function getExtensionForMimeType(mimeType: string, inputFilePath: string): string {
  const knownExtensions: Record<string, string> = {
    'application/pdf': '.pdf',
    'image/jpeg': '.jpg',
    'image/png': '.png',
    'image/webp': '.webp',
    'image/gif': '.gif',
    'image/bmp': '.bmp',
    'image/tiff': '.tiff',
    'image/svg+xml': '.svg',
    'video/mp4': '.mp4',
    'video/quicktime': '.mov',
    'video/webm': '.webm',
    'video/x-matroska': '.mkv',
    'video/x-msvideo': '.avi',
    'audio/mpeg': '.mp3',
    'audio/opus': '.opus',
    'audio/ogg': '.ogg',
    'audio/wav': '.wav',
    'audio/flac': '.flac',
    'audio/aac': '.aac',
  };
  return knownExtensions[mimeType] || path.extname(inputFilePath) || '.bin';
}

/**
 * Preserve the original file when an encoder cannot produce a smaller result.
 * The original is copied to the compression output directory so the normal
 * worker cleanup can safely remove the upload temporary file.
 */
export async function preserveOriginal(job: CompressionJobData): Promise<PreservedOriginal> {
  const extension = getExtensionForMimeType(job.mimeType, job.inputFilePath);
  const outputFilePath = getOutputPathForExtension(job.outputFilePath, extension);
  await fs.copyFile(job.inputFilePath, outputFilePath);
  const stat = await fs.stat(outputFilePath);
  return {
    outputFilePath,
    compressedSize: stat.size,
    mimeType: job.mimeType,
  };
}
