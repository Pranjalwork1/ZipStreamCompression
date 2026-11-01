import { CompressionJobData, FileCategory } from './types';

export type ImageOutputFormat = 'webp' | 'jpeg';
export type AudioOutputCodec = 'opus' | 'mp3';

export function normalizeImageFormat(value: unknown, sourceMimeType?: string): ImageOutputFormat {
  const format = String(value || '').toLowerCase();
  if (format === 'jpeg' || format === 'jpg' || format === 'image/jpeg') return 'jpeg';
  if (format === 'webp' || format === 'image/webp') return 'webp';
  return sourceMimeType === 'image/png' ? 'webp' : 'jpeg';
}

export function normalizeAudioCodec(value: unknown): AudioOutputCodec {
  return String(value || '').toLowerCase().includes('opus') ? 'opus' : 'mp3';
}

export function getOutputExtension(category: FileCategory, job: Pick<CompressionJobData, 'mimeType' | 'options'>): string {
  switch (category) {
    case 'pdf': return 'pdf';
    case 'image': return normalizeImageFormat(job.options?.imageFormat, job.mimeType) === 'jpeg' ? 'jpg' : 'webp';
    case 'video': return 'mp4';
    case 'audio': return normalizeAudioCodec(job.options?.audioCodec);
    default: return 'bin';
  }
}

export function getOutputMimeType(category: FileCategory, job: Pick<CompressionJobData, 'mimeType' | 'options'>): string {
  switch (category) {
    case 'pdf': return 'application/pdf';
    case 'image': return normalizeImageFormat(job.options?.imageFormat, job.mimeType) === 'jpeg' ? 'image/jpeg' : 'image/webp';
    case 'video': return 'video/mp4';
    case 'audio': return normalizeAudioCodec(job.options?.audioCodec) === 'opus' ? 'audio/opus' : 'audio/mpeg';
    default: return job.mimeType || 'application/octet-stream';
  }
}
