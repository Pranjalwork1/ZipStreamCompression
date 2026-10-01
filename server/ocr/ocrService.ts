/**
 * ZipStream Production OCR & Searchable PDF Service
 * 
 * Orchestrates OCR processing via Cloudflare Container / local OCRmyPDF sandbox.
 * Enforces security boundaries, resource limits, language allowlists, and automatic cleanup.
 */

import fs from 'fs/promises';
import { existsSync, createReadStream } from 'fs';
import path from 'path';
import os from 'os';
import crypto from 'crypto';
import { execFile } from 'child_process';
import { promisify } from 'util';
import {
  OcrJob,
  OcrOptions,
  OcrLanguageCode,
  SUPPORTED_OCR_LANGUAGES,
} from './types';
import { isValidPdfBuffer } from '../security/validation';
import { logInfo, logWarn, logError } from '../observability/logger';

const execFileAsync = promisify(execFile);

// Configurable resource limits
export const OCR_MAX_FILE_SIZE_MB = Number(process.env.OCR_MAX_FILE_SIZE_MB) || 50;
export const OCR_MAX_FILE_SIZE_BYTES = OCR_MAX_FILE_SIZE_MB * 1024 * 1024;
export const OCR_MAX_PAGES = Number(process.env.OCR_MAX_PAGES) || 100;
export const OCR_TIMEOUT_MS = Number(process.env.OCR_TIMEOUT_MS) || 180000; // 3 minutes
export const OCR_JOB_TTL_MS = Number(process.env.OCR_JOB_TTL_MS) || 60 * 60 * 1000; // 1 hour

const OCR_CONTAINER_URL = (process.env.OCR_CONTAINER_URL || '').replace(/\/+$/, '');
const OCR_TEMP_DIR = path.join(os.tmpdir(), 'zipstream-ocr-service');

// Ephemeral in-memory job store
const activeJobs = new Map<string, OcrJob>();

// Ensure temp directory exists
void fs.mkdir(OCR_TEMP_DIR, { recursive: true }).catch(() => undefined);

// Periodic cleanup of expired OCR jobs and files
setInterval(() => {
  const now = Date.now();
  for (const [jobId, job] of activeJobs.entries()) {
    if (job.expiresAt < now) {
      activeJobs.delete(jobId);
      if (job.outputPath && existsSync(job.outputPath)) {
        void fs.rm(path.dirname(job.outputPath), { recursive: true, force: true }).catch(() => undefined);
      }
    }
  }
}, 5 * 60 * 1000);

export class OcrService {
  /**
   * Validates options and normalizes language code.
   */
  public static validateOptions(options: Partial<OcrOptions>): OcrOptions {
    const rawLang = (options.language || 'eng').trim().toLowerCase() as OcrLanguageCode;
    const language = SUPPORTED_OCR_LANGUAGES[rawLang] ? rawLang : 'eng';
    const mode = ['auto', 'force', 'skip'].includes(options.mode || '') ? options.mode! : 'auto';
    const deskew = options.deskew !== false; // default true
    const rotate = options.rotate !== false; // default true

    return {
      language,
      mode,
      deskew,
      rotate,
      timeoutSec: Math.floor(OCR_TIMEOUT_MS / 1000),
    };
  }

  /**
   * Executes OCR job on input PDF buffer.
   */
  public static async processOcr(
    fileBuffer: Buffer,
    originalFileName: string,
    options: OcrOptions,
    userId?: string
  ): Promise<{ job: OcrJob; outputBuffer: Buffer }> {
    const startTime = Date.now();
    const jobId = crypto.randomUUID();
    const downloadToken = crypto.randomBytes(24).toString('hex');

    // 1. Strict Validation
    if (!fileBuffer || !fileBuffer.length) {
      throw new Error('PDF file buffer is empty.');
    }

    if (fileBuffer.length > OCR_MAX_FILE_SIZE_BYTES) {
      throw new Error(`This PDF is too large for OCR processing. Maximum limit is ${OCR_MAX_FILE_SIZE_MB}MB.`);
    }

    if (!isValidPdfBuffer(fileBuffer)) {
      throw new Error('Invalid PDF file format. Expected standard %PDF- header.');
    }

    const jobDir = path.join(OCR_TEMP_DIR, `job_${jobId}`);
    await fs.mkdir(jobDir, { recursive: true });
    const inputPath = path.join(jobDir, 'input.pdf');
    const outputPath = path.join(jobDir, 'searchable.pdf');

    const job: OcrJob = {
      jobId,
      userId,
      status: 'processing',
      originalFileName,
      originalSize: fileBuffer.length,
      language: options.language,
      downloadToken,
      createdAt: startTime,
      expiresAt: startTime + OCR_JOB_TTL_MS,
      outputPath,
    };
    activeJobs.set(jobId, job);

    try {
      await fs.writeFile(inputPath, fileBuffer);
      let outputBuffer: Buffer;

      // 2. Execution Strategy: Cloudflare Container vs. Local Process
      if (OCR_CONTAINER_URL) {
        logInfo(`[OCR] Routing job ${jobId} to Cloudflare Container at ${OCR_CONTAINER_URL}`);
        outputBuffer = await this.executeViaContainer(OCR_CONTAINER_URL, fileBuffer, options, jobId);
        await fs.writeFile(outputPath, outputBuffer);
      } else {
        logInfo(`[OCR] Processing job ${jobId} via local OCRmyPDF sandbox`);
        outputBuffer = await this.executeViaLocalCli(inputPath, outputPath, options, jobId);
      }

      // 3. Output Validation
      if (!outputBuffer || outputBuffer.length === 0) {
        throw new Error('OCR process completed but returned an empty output.');
      }

      if (!isValidPdfBuffer(outputBuffer)) {
        throw new Error('OCR generated an invalid or corrupted PDF output.');
      }

      const durationSec = Math.round((Date.now() - startTime) / 100) / 10;
      job.status = 'completed';
      job.outputSize = outputBuffer.length;
      job.durationSec = durationSec;

      logInfo(`[OCR] Job ${jobId} completed successfully in ${durationSec}s (Output: ${outputBuffer.length} bytes)`);
      return { job, outputBuffer };

    } catch (err: any) {
      job.status = 'failed';
      job.error = err.message || 'OCR processing failed on this document.';
      logError(`[OCR] Job ${jobId} failed: ${job.error}`);
      throw err;
    }
  }

  /**
   * Invokes Cloudflare OCR Container via internal HTTP API.
   */
  private static async executeViaContainer(
    containerUrl: string,
    fileBuffer: Buffer,
    options: OcrOptions,
    jobId: string
  ): Promise<Buffer> {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), OCR_TIMEOUT_MS);

    try {
      const resp = await fetch(`${containerUrl}/ocr`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/pdf',
          'Content-Length': String(fileBuffer.length),
          'X-OCR-Job-Id': jobId,
          'X-OCR-Language': options.language,
          'X-OCR-Mode': options.mode,
          'X-OCR-Deskew': String(options.deskew),
          'X-OCR-Rotate': String(options.rotate),
          'X-OCR-Timeout': String(Math.floor(OCR_TIMEOUT_MS / 1000)),
        },
        body: fileBuffer,
        signal: controller.signal,
      });

      if (!resp.ok) {
        const errJson = await resp.json().catch(() => ({ error: `HTTP ${resp.status} ${resp.statusText}` })) as any;
        if (resp.status === 422 || errJson.code === 'ENCRYPTED_PDF') {
          throw new Error('This PDF is password protected or encrypted. Please unlock it before applying OCR.');
        }
        throw new Error(errJson.error || errJson.details || `OCR container responded with status ${resp.status}`);
      }

      const arrayBuf = await resp.arrayBuffer();
      return Buffer.from(arrayBuf);
    } catch (err: any) {
      if (err.name === 'AbortError') {
        throw new Error(`OCR processing timed out after ${OCR_TIMEOUT_MS / 1000} seconds.`);
      }
      throw err;
    } finally {
      clearTimeout(timeout);
    }
  }

  /**
   * Invokes local OCRmyPDF binary with rigid arguments and no shell interpolation.
   */
  private static async executeViaLocalCli(
    inputPath: string,
    outputPath: string,
    options: OcrOptions,
    jobId: string
  ): Promise<Buffer> {
    const args: string[] = [
      '--language', options.language,
      '--output-type', 'pdf',
      '--jobs', '2',
      '--optimize', '0',
    ];

    if (options.deskew) {
      args.push('--deskew');
    }
    if (options.rotate) {
      args.push('--rotate-pages');
    }
    if (options.mode === 'force') {
      args.push('--redo-ocr');
    } else if (options.mode === 'skip') {
      args.push('--skip-text');
    }

    args.push(inputPath, outputPath);

    try {
      await execFileAsync('ocrmypdf', args, {
        timeout: OCR_TIMEOUT_MS,
        maxBuffer: 32 * 1024 * 1024,
      });
      return await fs.readFile(outputPath);
    } catch (err: any) {
      const msg = (err.stderr || err.stdout || err.message || '').toString();
      if (msg.includes('EncryptedPdfError') || msg.includes('password') || err.code === 2) {
        throw new Error('This PDF is password protected or encrypted. Please unlock it before applying OCR.');
      }
      if (msg.includes('already has text') || err.code === 6) {
        // Return original if page already has text and skip wasn't specified
        return await fs.readFile(inputPath);
      }
      if (err.killed || err.signal === 'SIGTERM') {
        throw new Error(`OCR processing timed out after ${OCR_TIMEOUT_MS / 1000} seconds.`);
      }
      throw new Error(`OCR execution failed: ${msg.slice(0, 300) || 'Unknown error'}`);
    }
  }

  public static getJob(jobId: string): OcrJob | undefined {
    return activeJobs.get(jobId);
  }

  public static getSupportedLanguages() {
    return Object.values(SUPPORTED_OCR_LANGUAGES);
  }
}
