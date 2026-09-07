import { FileCategory, CompressionResult } from '../types';
import JSZip from 'jszip';

export function formatBytes(bytes: number, decimals: number = 2): string {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
}

export function detectFileCategory(file: File): 'pdf' | 'image' | 'video' | 'audio' | 'document' | null {
  const type = file.type.toLowerCase();
  const name = file.name.toLowerCase();

  if (type === 'application/pdf' || name.endsWith('.pdf')) {
    return 'pdf';
  }
  if (
    type.startsWith('image/') ||
    name.endsWith('.jpg') ||
    name.endsWith('.jpeg') ||
    name.endsWith('.png') ||
    name.endsWith('.webp') ||
    name.endsWith('.svg') ||
    name.endsWith('.gif') ||
    name.endsWith('.bmp') ||
    name.endsWith('.avif')
  ) {
    return 'image';
  }
  if (
    type.startsWith('video/') ||
    name.endsWith('.mp4') ||
    name.endsWith('.mov') ||
    name.endsWith('.mkv') ||
    name.endsWith('.webm') ||
    name.endsWith('.avi') ||
    name.endsWith('.m4v')
  ) {
    return 'video';
  }
  if (
    type.startsWith('audio/') ||
    name.endsWith('.mp3') ||
    name.endsWith('.wav') ||
    name.endsWith('.m4a') ||
    name.endsWith('.aac') ||
    name.endsWith('.ogg') ||
    name.endsWith('.flac')
  ) {
    return 'audio';
  }
  if (
    name.endsWith('.docx') || name.endsWith('.pptx') || name.endsWith('.xlsx') ||
    name.endsWith('.docm') || name.endsWith('.pptm') || name.endsWith('.xlsm') ||
    type === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' ||
    type === 'application/vnd.openxmlformats-officedocument.presentationml.presentation' ||
    type === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
  ) {
    return 'document';
  }
  return null;
}

export function getAcceptedExtensions(category: FileCategory): string {
  switch (category) {
    case 'pdf':
      return '.pdf,application/pdf';
    case 'image':
      return '.jpg,.jpeg,.png,.webp,.gif,.bmp,.avif,image/jpeg,image/png,image/webp,image/*';
    case 'video':
      return '.mp4,.mov,.mkv,.webm,.avi,video/mp4,video/quicktime,video/x-matroska,video/webm,video/*';
    case 'audio':
      return '.mp3,.wav,.m4a,.aac,.ogg,.flac,audio/mpeg,audio/wav,audio/mp4,audio/ogg,audio/*';
    case 'document':
      return '.docx,.pptx,.xlsx,.docm,.pptm,.xlsm,application/vnd.openxmlformats-officedocument.wordprocessingml.document,application/vnd.openxmlformats-officedocument.presentationml.presentation,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
    case 'all':
    default:
      return '.pdf,.jpg,.jpeg,.png,.webp,.gif,.mp4,.mov,.webm,.mp3,.wav,.m4a,.docx,.pptx,.xlsx,.docm,.pptm,.xlsm,application/pdf,image/*,video/*,audio/*,application/vnd.openxmlformats-officedocument.*';
  }
}

export function generateCompressedFilename(originalName: string, targetFormat?: string, actualMimeType?: string): string {
  const lastDotIndex = originalName.lastIndexOf('.');
  const rawBaseName = lastDotIndex !== -1 ? originalName.substring(0, lastDotIndex) : originalName;
  const safeBase = rawBaseName.replace(/[\\/:*?"<>|#%&{}]/g, '_').trim() || 'file';
  let extension = lastDotIndex !== -1 ? originalName.substring(lastDotIndex) : '';

  // Determine extension from actual output MIME type if available
  if (actualMimeType) {
    if (actualMimeType === 'image/webp') extension = '.webp';
    else if (actualMimeType === 'image/jpeg') extension = '.jpg';
    else if (actualMimeType === 'image/png') extension = '.png';
    else if (actualMimeType === 'application/pdf') extension = '.pdf';
    else if (actualMimeType === 'audio/wav') extension = '.wav';
    else if (actualMimeType === 'audio/mpeg' || actualMimeType === 'audio/mp3') extension = '.mp3';
    else if (actualMimeType === 'video/webm') extension = '.webm';
    else if (actualMimeType === 'video/mp4') extension = '.mp4';
  } else if (targetFormat && targetFormat !== 'original') {
    if (targetFormat === 'image/webp') extension = '.webp';
    else if (targetFormat === 'image/jpeg') extension = '.jpg';
    else if (targetFormat === 'image/png') extension = '.png';
    else if (targetFormat === 'audio/mp3') extension = '.mp3';
    else if (targetFormat === 'audio/wav') extension = '.wav';
  }

  return `${safeBase}_compressed${extension}`;
}

export function downloadBlob(blob: Blob, filename: string): void {
  if (!blob) {
    console.error('downloadBlob: Blob is missing or invalid');
    return;
  }

  // Ensure safe filename for local filesystem
  const safeFilename = filename.replace(/[\\/:*?"<>|]/g, '_').trim() || 'compressed_file';

  // Support legacy Microsoft browsers (IE / older Edge)
  if (typeof (window.navigator as any)?.msSaveOrOpenBlob === 'function') {
    try {
      (window.navigator as any).msSaveOrOpenBlob(blob, safeFilename);
      return;
    } catch (e) {
      console.warn('msSaveOrOpenBlob failed, proceeding with anchor download:', e);
    }
  }

  const safeBlob = blob instanceof Blob ? blob : new Blob([blob], { type: 'application/octet-stream' });
  const url = URL.createObjectURL(safeBlob);

  const anchor = document.createElement('a');
  anchor.style.position = 'fixed';
  anchor.style.top = '-9999px';
  anchor.style.left = '-9999px';
  anchor.style.opacity = '0';
  anchor.href = url;
  anchor.download = safeFilename;
  anchor.rel = 'noopener noreferrer';

  document.body.appendChild(anchor);

  try {
    const clickEvent = new MouseEvent('click', {
      view: window,
      bubbles: true,
      cancelable: true,
    });
    anchor.dispatchEvent(clickEvent);
  } catch {
    anchor.click();
  }

  // Retain anchor in DOM briefly: removing synchronously cancels the download in Chrome, Firefox, and WebKit
  setTimeout(() => {
    try {
      if (anchor.parentNode) {
        anchor.parentNode.removeChild(anchor);
      }
    } catch {}
  }, 2000);

  // Keep object URL alive for 60 seconds to ensure the browser finishes streaming the payload
  setTimeout(() => {
    try {
      URL.revokeObjectURL(url);
    } catch {}
  }, 60000);
}

/**
 * Zips multiple compressed results into a single convenient archive download
 */
export async function downloadBatchZip(results: any[], zipFilename = 'Compressed_Files.zip'): Promise<void> {
  const zip = new JSZip();
  let count = 0;
  results.forEach((item, index) => {
    const res: CompressionResult = item?.result || item;
    if (!res?.compressedBlob) return;
    const name = res.compressedName || `compressed_file_${index + 1}`;
    zip.file(name, res.compressedBlob);
    count++;
  });

  if (count === 0) return;

  const zipContent = await zip.generateAsync({ type: 'blob' });
  downloadBlob(zipContent, zipFilename);
}
