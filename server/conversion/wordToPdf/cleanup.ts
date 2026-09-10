import fs from 'fs/promises';
import path from 'path';

/**
 * Safely removes a file if it exists, without throwing
 */
export async function deleteFileSafe(filePath?: string): Promise<void> {
  if (!filePath) return;
  try {
    await fs.rm(filePath, { force: true });
  } catch {
    // Ignore cleanup errors
  }
}

/**
 * Safely removes a working directory and all its contents
 */
export async function cleanupJobWorkDir(workDir?: string): Promise<void> {
  if (!workDir) return;
  try {
    await fs.rm(workDir, { recursive: true, force: true });
  } catch {
    // Ignore cleanup errors
  }
}

/**
 * Periodic cleaner for temporary conversion outputs older than maxAgeMs (default: 2 hours)
 */
export function startPeriodicCleanup(directory: string, maxAgeMs = 2 * 3600 * 1000): NodeJS.Timeout {
  const intervalMs = 15 * 60 * 1000; // Check every 15 minutes

  const runCleanup = async () => {
    try {
      const now = Date.now();
      const entries = await fs.readdir(directory, { withFileTypes: true });
      for (const entry of entries) {
        const fullPath = path.join(directory, entry.name);
        try {
          const stat = await fs.stat(fullPath);
          if (now - stat.mtimeMs > maxAgeMs) {
            await fs.rm(fullPath, { recursive: true, force: true });
          }
        } catch {
          // File may have been deleted already
        }
      }
    } catch {
      // Directory may not exist yet
    }
  };

  const timer = setInterval(() => {
    void runCleanup();
  }, intervalMs);

  return timer;
}
