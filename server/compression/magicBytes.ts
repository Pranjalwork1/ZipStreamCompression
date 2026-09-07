import { Buffer } from 'buffer';
import fs from 'fs/promises';
import { DetectedMime } from './types';

/**
 * Detects the true MIME type and category of a file by inspecting its header magic bytes.
 * This prevents file extension spoofing and ensures files are routed to the proper worker.
 */
export async function detectMimeFromPath(filePath: string): Promise<DetectedMime | null> {
  const handle = await fs.open(filePath, 'r');
  try {
    const buffer = Buffer.alloc(64);
    const { bytesRead } = await handle.read(buffer, 0, 64, 0);
    return detectMimeFromBuffer(buffer.subarray(0, bytesRead));
  } finally {
    await handle.close().catch(() => undefined);
  }
}

export function detectMimeFromBuffer(buffer: Buffer): DetectedMime | null {
  if (!buffer || buffer.length < 4) return null;

  // 1. PDF: %PDF- (0x25 0x50 0x44 0x46 0x2D)
  if (
    buffer[0] === 0x25 &&
    buffer[1] === 0x50 &&
    buffer[2] === 0x44 &&
    buffer[3] === 0x46 &&
    buffer[4] === 0x2d
  ) {
    return { mime: 'application/pdf', ext: 'pdf', category: 'pdf' };
  }

  // 2. JPEG: FF D8 FF
  if (buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) {
    return { mime: 'image/jpeg', ext: 'jpg', category: 'image' };
  }

  // 3. PNG: 89 50 4E 47 0D 0A 1A 0A
  if (
    buffer[0] === 0x89 &&
    buffer[1] === 0x50 &&
    buffer[2] === 0x4e &&
    buffer[3] === 0x47 &&
    buffer[4] === 0x0d &&
    buffer[5] === 0x0a &&
    buffer[6] === 0x1a &&
    buffer[7] === 0x0a
  ) {
    return { mime: 'image/png', ext: 'png', category: 'image' };
  }

  // 4. GIF: GIF87a or GIF89a
  if (
    buffer[0] === 0x47 &&
    buffer[1] === 0x49 &&
    buffer[2] === 0x46 &&
    buffer[3] === 0x38 &&
    (buffer[4] === 0x37 || buffer[4] === 0x39) &&
    buffer[5] === 0x61
  ) {
    return { mime: 'image/gif', ext: 'gif', category: 'image' };
  }

  // 5. RIFF container: WebP, AVI, WAV
  if (
    buffer[0] === 0x52 &&
    buffer[1] === 0x49 &&
    buffer[2] === 0x46 &&
    buffer[3] === 0x46 &&
    buffer.length >= 12
  ) {
    const subType = buffer.subarray(8, 12).toString('ascii');
    if (subType === 'WEBP') {
      return { mime: 'image/webp', ext: 'webp', category: 'image' };
    }
    if (subType === 'AVI ') {
      return { mime: 'video/x-msvideo', ext: 'avi', category: 'video' };
    }
    if (subType === 'WAVE') {
      return { mime: 'audio/wav', ext: 'wav', category: 'audio' };
    }
  }

  // 6. MP4 / MOV / M4V (ISO Base Media File Format: ftyp box at offset 4)
  if (buffer.length >= 12 && buffer.subarray(4, 8).toString('ascii') === 'ftyp') {
    const majorBrand = buffer.subarray(8, 12).toString('ascii').toLowerCase();
    if (majorBrand.startsWith('qt')) {
      return { mime: 'video/quicktime', ext: 'mov', category: 'video' };
    }
    return { mime: 'video/mp4', ext: 'mp4', category: 'video' };
  }

  // 7. Matroska / WebM (EBML: 0x1A 0x45 0xDF 0xA3)
  if (
    buffer[0] === 0x1a &&
    buffer[1] === 0x45 &&
    buffer[2] === 0xdf &&
    buffer[3] === 0xa3
  ) {
    // Check if webm
    const textSample = buffer.subarray(0, Math.min(64, buffer.length)).toString('latin1');
    if (textSample.includes('webm')) {
      return { mime: 'video/webm', ext: 'webm', category: 'video' };
    }
    return { mime: 'video/x-matroska', ext: 'mkv', category: 'video' };
  }

  // 8. MP3 audio (ID3 tag or MPEG sync word)
  if (buffer[0] === 0x49 && buffer[1] === 0x44 && buffer[2] === 0x33) {
    return { mime: 'audio/mpeg', ext: 'mp3', category: 'audio' };
  }
  if (buffer[0] === 0xff && (buffer[1] & 0xe0) === 0xe0) {
    // MPEG frame sync
    return { mime: 'audio/mpeg', ext: 'mp3', category: 'audio' };
  }

  // 9. FLAC: fLaC (0x66 0x4C 0x61 0x43)
  if (
    buffer[0] === 0x66 &&
    buffer[1] === 0x4c &&
    buffer[2] === 0x61 &&
    buffer[3] === 0x43
  ) {
    return { mime: 'audio/flac', ext: 'flac', category: 'audio' };
  }

  // 10. OGG container (OggS: 0x4F 0x67 0x67 0x53)
  if (
    buffer[0] === 0x4f &&
    buffer[1] === 0x67 &&
    buffer[2] === 0x67 &&
    buffer[3] === 0x53
  ) {
    return { mime: 'audio/ogg', ext: 'ogg', category: 'audio' };
  }

  return null;
}
