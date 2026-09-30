/**
 * Periodic Orphan Temporary Directory & File Cleanup Daemon
 *
 * Scans OS temp and storage directories to safely purge abandoned
 * processing jobs, temporary folders, and expired room document payloads.
 */

import fs from 'fs/promises';
import path from 'path';
import os from 'os';
import { serverConfig } from '../config/env';

export async function runOrphanCleanup(): Promise<{ cleanedDirs: number; cleanedFiles: number }> {
  let cleanedDirs = 0;
  let cleanedFiles = 0;
  const now = Date.now();
  const maxAgeMs = 2 * 60 * 60 * 1000; // 2 hours

  // 1. Clean OS temporary directories matching zipstream-*
  try {
    const tmpDir = os.tmpdir();
    const entries = await fs.readdir(tmpDir, { withFileTypes: true }).catch(() => []);

    for (const entry of entries) {
      if (entry.isDirectory() && entry.name.startsWith('zipstream-')) {
        const fullPath = path.join(tmpDir, entry.name);
        try {
          const stats = await fs.stat(fullPath);
          if (now - stats.mtimeMs > maxAgeMs) {
            await fs.rm(fullPath, { recursive: true, force: true });
            cleanedDirs++;
          }
        } catch {
          // Skip inaccessible entries
        }
      }
    }
  } catch (err: any) {
    console.warn('[OrphanCleanup] Error cleaning OS temp directory:', err.message);
  }

  // 2. Clean storage uploads and compressed output directories if older than 4 hours
  const storageDirs = [serverConfig.uploadDir, serverConfig.compressedDir];
  const storageMaxAgeMs = 4 * 60 * 60 * 1000;

  for (const dir of storageDirs) {
    try {
      const files = await fs.readdir(dir, { withFileTypes: true }).catch(() => []);
      for (const file of files) {
        if (file.isFile()) {
          const filePath = path.join(dir, file.name);
          try {
            const stats = await fs.stat(filePath);
            if (now - stats.mtimeMs > storageMaxAgeMs) {
              await fs.rm(filePath, { force: true });
              cleanedFiles++;
            }
          } catch {
            // Skip busy or locked files
          }
        }
      }
    } catch {
      // Storage directory may not yet exist
    }
  }

  return { cleanedDirs, cleanedFiles };
}

let cleanupTimer: NodeJS.Timeout | null = null;

export function startOrphanCleanupDaemon(intervalMs = 30 * 60 * 1000): void {
  if (cleanupTimer) return;
  // Run once on startup after 30 seconds
  setTimeout(() => {
    void runOrphanCleanup();
  }, 30000);

  // Then periodically
  cleanupTimer = setInterval(() => {
    void runOrphanCleanup();
  }, intervalMs);

  // Unref timer so it doesn't block node process exit
  cleanupTimer.unref();
}

export function stopOrphanCleanupDaemon(): void {
  if (cleanupTimer) {
    clearInterval(cleanupTimer);
    cleanupTimer = null;
  }
}
