import sharp, { Metadata } from 'sharp';
import fs from 'fs/promises';
import { CompressionJobData } from '../types';
import { ProcessResult } from './pdfWorker';
import { getOutputPathForExtension, getTargetSizeBytes, preserveOriginal } from '../optimization';

type ImageProfile = { quality: number; effort: number; maxDimension?: number };

function getImageProfiles(level: 'low' | 'medium' | 'high', hasTarget: boolean): ImageProfile[] {
  if (hasTarget) {
    return [
      { quality: 86, effort: 6, maxDimension: 3200 },
      { quality: 80, effort: 6, maxDimension: 2800 },
      { quality: 74, effort: 6, maxDimension: 2400 },
      { quality: 68, effort: 6, maxDimension: 2000 },
      { quality: 62, effort: 6, maxDimension: 1720 },
      { quality: 56, effort: 6, maxDimension: 1440 },
      { quality: 50, effort: 6, maxDimension: 1200 },
      { quality: 44, effort: 6, maxDimension: 960 },
      { quality: 38, effort: 6, maxDimension: 800 },
      { quality: 32, effort: 6, maxDimension: 640 },
    ];
  }
  if (level === 'high') return [{ quality: 50, effort: 5, maxDimension: 1920 }];
  if (level === 'low') return [{ quality: 88, effort: 4, maxDimension: 3840 }];
  return [{ quality: 80, effort: 5, maxDimension: 2560 }];
}

async function createImageCandidate(
  inputFilePath: string,
  metadata: Metadata,
  profile: ImageProfile,
  format: 'webp' | 'jpeg',
  preserveAnimation: boolean
): Promise<Buffer> {
  let pipeline = sharp(inputFilePath, {
    failOn: 'none',
    animated: preserveAnimation,
    limitInputPixels: 268402689,
  }).rotate();

  if (profile.maxDimension &&
      ((metadata.width || 0) > profile.maxDimension || (metadata.height || 0) > profile.maxDimension)) {
    pipeline = pipeline.resize({
      width: profile.maxDimension,
      height: profile.maxDimension,
      fit: 'inside',
      withoutEnlargement: true,
    });
  }

  if (format === 'webp') {
    pipeline = pipeline.webp({
      quality: profile.quality,
      effort: profile.effort,
      smartSubsample: true,
      nearLossless: false,
    });
  } else {
    pipeline = pipeline
      .flatten({ background: '#ffffff' })
      .jpeg({
        quality: profile.quality,
        progressive: true,
        mozjpeg: true,
        chromaSubsampling: '4:2:0',
        optimiseCoding: true,
      });
  }

  return pipeline.toBuffer();
}

/**
 * Adaptive raster optimizer. Searches a quality ladder for size-capped jobs,
 * picks the largest candidate below the cap, and never replaces the source
 * with a larger file. Transparent and animated sources default to WebP.
 */
export async function processImage(
  job: CompressionJobData,
  onProgress?: (percentage: number) => Promise<void>
): Promise<ProcessResult> {
  if (onProgress) await onProgress(10);

  let metadata: Metadata;
  try {
    metadata = await sharp(job.inputFilePath, {
      failOn: 'none',
      animated: true,
      limitInputPixels: 268402689,
    }).metadata();
  } catch (err: any) {
    throw new Error(`Failed to decode image metadata: ${err.message}`);
  }

  if (!metadata.width || !metadata.height) {
    throw new Error('The uploaded image has no readable dimensions.');
  }

  const hasAlpha = metadata.hasAlpha === true;
  const isAnimated = (metadata.pages || 1) > 1;
  const requestedFormat = job.options?.imageFormat;
  const format: 'webp' | 'jpeg' = requestedFormat === 'jpeg'
    ? 'jpeg'
    : requestedFormat === 'webp' || hasAlpha || isAnimated || job.mimeType !== 'image/jpeg'
      ? 'webp'
      : 'jpeg';

  const targetBytes = getTargetSizeBytes(job);
  const profiles = getImageProfiles(job.options?.level || 'medium', Boolean(targetBytes));
  const attempts = targetBytes ? profiles : profiles.slice(0, 1);
  const candidates: Buffer[] = [];

  for (let index = 0; index < attempts.length; index++) {
    if (onProgress) {
      await onProgress(Math.min(90, 20 + Math.floor(((index + 1) / attempts.length) * 65)));
    }
    try {
      const bytes = await createImageCandidate(
        job.inputFilePath,
        metadata,
        attempts[index],
        format,
        isAnimated && format === 'webp'
      );
      if (bytes.length > 0 && bytes.length < job.originalSize) candidates.push(bytes);
    } catch (err: any) {
      if (index === 0) throw new Error(`Image compression failed: ${err.message}`);
    }
  }

  const fitting = targetBytes ? candidates.filter(bytes => bytes.length <= targetBytes) : [];
  const selected = fitting.length
    ? fitting.reduce((best, current) => current.length > best.length ? current : best)
    : candidates.length
      ? candidates.reduce((best, current) => current.length < best.length ? current : best)
      : undefined;

  if (!selected) {
    const preserved = await preserveOriginal(job);
    if (onProgress) await onProgress(100);
    return {
      outputFilePath: preserved.outputFilePath,
      compressedSize: preserved.compressedSize,
      mimeType: preserved.mimeType,
    };
  }

  const mimeType = format === 'webp' ? 'image/webp' : 'image/jpeg';
  const extension = format === 'webp' ? '.webp' : '.jpg';
  const outputFilePath = getOutputPathForExtension(job.outputFilePath, extension);
  await fs.writeFile(outputFilePath, selected);

  const stat = await fs.stat(outputFilePath);
  if (!stat.size || stat.size >= job.originalSize) {
    await fs.rm(outputFilePath, { force: true }).catch(() => undefined);
    const preserved = await preserveOriginal(job);
    if (onProgress) await onProgress(100);
    return {
      outputFilePath: preserved.outputFilePath,
      compressedSize: preserved.compressedSize,
      mimeType: preserved.mimeType,
    };
  }

  if (onProgress) await onProgress(100);
  return { outputFilePath, compressedSize: stat.size, mimeType };
}
