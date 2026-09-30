/**
 * File Security & Input Validation Utilities
 *
 * Enforces magic-byte inspection, path traversal prevention, filename sanitization,
 * and ZIP bomb extraction protection.
 */

import path from 'path';

/**
 * Strips path traversal characters, control codes, and dangerous sequences
 * while preserving legitimate multilingual filenames (e.g. 'résumé.pdf', 'हिंदी.pdf', 'file (1).pdf').
 */
export function sanitizeFileName(rawName: string, defaultName = 'file'): string {
  if (!rawName || typeof rawName !== 'string') return defaultName;

  let decoded = rawName;
  try {
    decoded = decodeURIComponent(rawName);
  } catch {
    // Keep raw string if URI decode fails
  }

  // Remove directory separators, null bytes, and traversal tokens
  let cleaned = decoded
    .replace(/[/\\]/g, '_')
    .replace(/\.\.+/g, '.')
    .replace(/[\x00-\x1f\x7f-\x9f]/g, '')
    .trim();

  // Strip leading dots or underscores
  cleaned = cleaned.replace(/^[._]+/, '');

  if (!cleaned || cleaned.length === 0) {
    return defaultName;
  }

  // Limit maximum length to 240 chars to fit standard filesystem limits
  if (cleaned.length > 240) {
    const ext = path.extname(cleaned);
    const base = path.basename(cleaned, ext).slice(0, 240 - ext.length);
    cleaned = `${base}${ext}`;
  }

  return cleaned;
}

/**
 * Ensures a target path strictly resides within the expected parent directory.
 * Prevents directory traversal attacks via symlinks or crafted path strings.
 */
export function isPathInsideDirectory(childPath: string, parentDir: string): boolean {
  const relative = path.relative(parentDir, childPath);
  return !relative.startsWith('..') && !path.isAbsolute(relative);
}

/**
 * Validates that a buffer has a valid PDF magic header (%PDF-)
 */
export function isValidPdfBuffer(buffer: Buffer): boolean {
  if (!buffer || buffer.length < 5) return false;
  return buffer.subarray(0, 5).toString('ascii') === '%PDF-';
}

/**
 * Safeguards for ZIP extraction (ZIP Bomb / Decompression Bomb protection)
 */
export interface ZipSafetyLimits {
  maxTotalBytes: number;
  maxFilesCount: number;
  maxSingleFileBytes: number;
  maxCompressionRatio: number;
}

export const DEFAULT_ZIP_LIMITS: ZipSafetyLimits = {
  maxTotalBytes: 500 * 1024 * 1024, // 500 MB max uncompressed
  maxFilesCount: 2000,              // 2000 files max
  maxSingleFileBytes: 150 * 1024 * 1024, // 150 MB max per file
  maxCompressionRatio: 50,          // 50:1 max ratio
};
