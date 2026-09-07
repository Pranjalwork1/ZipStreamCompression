import sharp, { Sharp, Metadata } from 'sharp';
import fs from 'fs/promises';
import { CompressionJobData } from '../types';
import { ProcessResult } from './pdfWorker';

/**
 * Image Worker: Converts image to WebP or optimized JPEG using libvips (via Sharp).
 * Strips EXIF metadata, resizes dimensions, and applies user-selected compression levels:
 * - high (Extreme / Smaller): max 1920px, 50% quality WebP / MozJPEG
 * - medium (Recommended / Balanced): max 2560px, 75% quality WebP / MozJPEG
 * - low (Less / Best Quality): max 3840px, 85% quality WebP / MozJPEG
 */
export async function processImage(
  job: CompressionJobData,
  onProgress?: (percentage: number) => Promise<void>
): Promise<ProcessResult> {
  if (onProgress) await onProgress(15);

  let pipeline: Sharp;
  try {
    pipeline = sharp(job.inputFilePath, {
      failOn: 'none', // Attempt to recover slightly damaged images if possible
    });
  } catch (err: any) {
    throw new Error(`Corrupted image file: ${err.message}`);
  }

  // Probe metadata to check dimensions & verify corruption
  let metadata: Metadata;
  try {
    metadata = await pipeline.metadata();
  } catch (err: any) {
    throw new Error(`Failed to decode image metadata (corrupted image): ${err.message}`);
  }

  if (onProgress) await onProgress(35);

  const level = job.options?.level || 'medium';

  // Quality & Resolution tuning according to iLoveIMG / iLovePDF presets
  let quality = 75;
  let maxWidth = 2560;
  let effort = 4;

  if (level === 'high') {
    // Smaller / Extreme
    quality = 50;
    maxWidth = 1920;
    effort = 5;
  } else if (level === 'low') {
    // Less / Best Quality
    quality = 85;
    maxWidth = 3840;
    effort = 3;
  }

  // 1. Auto-rotate based on EXIF orientation first, then strip all EXIF / ICC / XMP metadata
  pipeline = pipeline.rotate(); // Applies orientation without keeping EXIF bloat

  // 2. Resize down if the width or height exceeds maximum dimension
  if ((metadata.width && metadata.width > maxWidth) || (metadata.height && metadata.height > maxWidth)) {
    pipeline = pipeline.resize({
      width: maxWidth,
      height: maxWidth,
      withoutEnlargement: true,
      fit: 'inside',
    });
  }

  if (onProgress) await onProgress(60);

  // 3. Convert to WebP or optimized JPEG with tuned quality
  const requestedFormat = job.options?.imageFormat || (job.mimeType === 'image/png' ? 'webp' : 'jpeg');

  if (requestedFormat === 'webp') {
    pipeline = pipeline.webp({
      quality,
      lossless: false,
      effort,
    });
  } else {
    pipeline = pipeline.jpeg({
      quality,
      progressive: true,
      mozjpeg: true,
      chromaSubsampling: level === 'high' ? '4:2:0' : '4:4:4',
    });
  }

  if (onProgress) await onProgress(85);

  try {
    await pipeline.toFile(job.outputFilePath);
  } catch (err: any) {
    throw new Error(`Image compression failed (libvips error): ${err.message}`);
  }

  const stat = await fs.stat(job.outputFilePath);
  if (!stat || stat.size === 0) {
    throw new Error('Image compression produced an empty output file.');
  }

  if (onProgress) await onProgress(100);

  return {
    outputFilePath: job.outputFilePath,
    compressedSize: stat.size,
  };
}
