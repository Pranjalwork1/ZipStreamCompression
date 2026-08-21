import { FileCategory } from '../types';

export function formatBytes(bytes: number, decimals = 1): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
}

export function calculateSavings(original: number, compressed: number): { percent: number; savedBytes: number } {
  if (original <= 0) return { percent: 0, savedBytes: 0 };
  const savedBytes = Math.max(0, original - compressed);
  const percent = Math.round((savedBytes / original) * 100);
  return { percent, savedBytes };
}

export function detectFileCategory(file: File): FileCategory {
  const type = file.type.toLowerCase();
  const name = file.name.toLowerCase();

  if (type.startsWith('image/') || /\.(jpg|jpeg|png|webp|gif|svg|avif|bmp|tiff|heic)$/i.test(name)) {
    return 'image';
  }
  if (type === 'application/pdf' || name.endsWith('.pdf')) {
    return 'pdf';
  }
  if (type.startsWith('audio/') || /\.(mp3|wav|ogg|m4a|aac|flac)$/i.test(name)) {
    return 'audio';
  }
  if (type.startsWith('video/') || /\.(mp4|webm|mov|mkv|avi)$/i.test(name)) {
    return 'video';
  }
  if (type.includes('zip') || type.includes('tar') || type.includes('compressed') || /\.(zip|rar|7z|tar|gz)$/i.test(name)) {
    return 'archive';
  }
  return 'other';
}

export function getFileExtension(filename: string): string {
  const parts = filename.split('.');
  return parts.length > 1 ? parts.pop()!.toUpperCase() : 'FILE';
}
