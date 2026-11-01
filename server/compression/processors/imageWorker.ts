import sharp, { Metadata, Sharp } from 'sharp';
import fs from 'fs/promises';
import { CompressionJobData } from '../types';
import { ProcessResult } from './pdfWorker';
import { normalizeImageFormat } from '../formats';

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

  let metadata: Metadata;
  try {
    metadata = await sharp(job.inputFilePath, { failOn: 'none' }).metadata();
  } catch (err: any) {
    throw new Error(`Failed to decode image metadata (corrupted image): ${err.message}`);
  }

  if (onProgress) await onProgress(35);

  const level = job.options?.level || 'medium';

  // Quality & Resolution tuning according to iLoveIMG / iLovePDF presets
  let quality = 75;
  let maxWidth = 2560;
  let effort = 3;

  if (level === 'high') {
    // Smaller / Extreme
    quality = 50;
    maxWidth = 1920;
    effort = 4;
  } else if (level === 'low') {
    // Less / Best Quality
    quality = 85;
    maxWidth = 3840;
    effort = 2;
  }

  // 1. Resolve format values from both API forms (`webp`) and UI MIME forms
  // (`image/webp`). This keeps the bytes, extension, and download MIME aligned.
  const requestedFormat = normalizeImageFormat(job.options?.imageFormat, job.mimeType);

  const targetBytes = Number(job.options?.targetSizeBytes);
  const hasTarget = Number.isFinite(targetBytes) && targetBytes > 0;
  const profiles = [{ quality, maxWidth }];
  if (hasTarget) {
    // Progressively spend quality and resolution only as needed to approach
    // the requested cap. Without a cap, keep the single fast preset pass.
    for (const [qualityScale, dimension] of [[0.88, 1800], [0.74, 1400], [0.60, 1100], [0.46, 850], [0.34, 640]] as const) {
      profiles.push({
        quality: Math.max(20, Math.round(quality * qualityScale)),
        maxWidth: Math.min(maxWidth, dimension),
      });
    }
  }

  const candidates: Buffer[] = [];
  for (let index = 0; index < profiles.length; index++) {
    const profile = profiles[index];
    let pipeline: Sharp = sharp(job.inputFilePath, { failOn: 'none' })
      .rotate()
      .resize({
        width: profile.maxWidth,
        height: profile.maxWidth,
        withoutEnlargement: true,
        fit: 'inside',
      });

    if (requestedFormat === 'webp') {
      pipeline = pipeline.webp({ quality: profile.quality, lossless: false, effort });
    } else {
      pipeline = pipeline.jpeg({
        quality: profile.quality,
        progressive: true,
        mozjpeg: true,
        chromaSubsampling: level === 'high' ? '4:2:0' : '4:4:4',
      });
    }

    try {
      const candidate = await pipeline.toBuffer();
      if (candidate.length > 0) candidates.push(candidate);
      if (onProgress) await onProgress(60 + Math.floor(((index + 1) / profiles.length) * 30));
      if (hasTarget && candidate.length <= targetBytes) break;
    } catch (err: any) {
      throw new Error(`Image compression failed (libvips error): ${err.message}`);
    }
  }

  const fitting = hasTarget ? candidates.filter(candidate => candidate.length <= targetBytes) : [];
  const selected = fitting[0] || candidates.reduce<Buffer | undefined>(
    (smallest, candidate) => !smallest || candidate.length < smallest.length ? candidate : smallest,
    undefined,
  );
  if (!selected) {
    throw new Error('Image compression produced an empty output file.');
  }
  if (selected.length >= job.originalSize) {
    throw new Error('This image is already optimized or cannot be reduced safely with the selected output format.');
  }

  await fs.writeFile(job.outputFilePath, selected);

  if (onProgress) await onProgress(100);

  return {
    outputFilePath: job.outputFilePath,
    compressedSize: selected.length,
  };
}
