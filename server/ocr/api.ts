/**
 * ZipStream OCR & Searchable PDF API Router
 * 
 * Exposes secure endpoints for:
 * - POST /api/ocr (Process PDF and stream searchable PDF)
 * - GET  /api/ocr/languages (Available multilingual packs)
 * - GET  /api/ocr/health (Subsystem readiness probe)
 * - GET  /api/ocr/:jobId/download (Authorized download with IDOR protection)
 */

import express, { Request, Response } from 'express';
import { createRateLimiter } from '../security/rateLimiter';
import { sendError } from '../security/errorResponse';
import { sanitizeFileName } from '../security/validation';
import { OcrService, OCR_MAX_FILE_SIZE_BYTES, OCR_MAX_FILE_SIZE_MB } from './ocrService';
import { createReadStream, existsSync } from 'fs';

const router = express.Router();

// 1. Language catalog
router.get('/languages', (_req: Request, res: Response) => {
  res.set('Cache-Control', 'public, max-age=3600');
  res.json({
    languages: OcrService.getSupportedLanguages(),
  });
});

// 2. Health probe
router.get('/health', (_req: Request, res: Response) => {
  res.json({
    status: 'ok',
    service: 'ZipStream OCR Subsystem',
    timestamp: new Date().toISOString(),
  });
});

// 3. Process OCR Request
router.post(
  '/',
  createRateLimiter('ocr'),
  express.raw({
    type: ['application/pdf', 'application/octet-stream'],
    limit: `${OCR_MAX_FILE_SIZE_MB}mb`,
  }),
  async (req: Request, res: Response) => {
    const requestId = (req.header('x-request-id') || req.header('x-ocr-job-id') || '') as string;
    const body = Buffer.isBuffer(req.body) ? req.body : Buffer.from(req.body || []);

    if (!body.length) {
      return sendError(res, 400, 'EMPTY_FILE', 'PDF file payload is empty', undefined, requestId);
    }

    if (body.length > OCR_MAX_FILE_SIZE_BYTES) {
      return sendError(
        res,
        413,
        'FILE_TOO_LARGE',
        `PDF exceeds the ${OCR_MAX_FILE_SIZE_MB}MB OCR processing limit`,
        undefined,
        requestId
      );
    }

    const rawFileName = req.header('x-file-name') || (req.query.filename as string) || 'document.pdf';
    const originalFileName = sanitizeFileName(rawFileName);

    const options = OcrService.validateOptions({
      language: (req.header('x-ocr-language') || req.query.lang || 'eng') as any,
      mode: (req.header('x-ocr-mode') || req.query.mode || 'auto') as any,
      deskew: (req.header('x-ocr-deskew') || req.query.deskew || 'true') === 'true',
      rotate: (req.header('x-ocr-rotate') || req.query.rotate || 'true') === 'true',
    });

    try {
      const { job, outputBuffer } = await OcrService.processOcr(body, originalFileName, options);

      const baseName = originalFileName.replace(/\.[^/.]+$/, '');
      const downloadName = `${baseName}_searchable.pdf`;

      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename="${downloadName}"; filename*=UTF-8''${encodeURIComponent(downloadName)}`);
      res.setHeader('X-OCR-Job-Id', job.jobId);
      res.setHeader('X-OCR-Status', 'completed');
      res.setHeader('X-OCR-Duration-Sec', String(job.durationSec || 0));
      res.setHeader('X-OCR-Language', job.language);
      res.setHeader('X-Original-Size', String(job.originalSize));
      res.setHeader('X-Searchable-Size', String(outputBuffer.length));
      res.setHeader('Cache-Control', 'private, no-store, no-cache, must-revalidate');

      return res.send(outputBuffer);
    } catch (err: any) {
      const msg = err.message || 'OCR processing failed';
      if (msg.includes('password protected') || msg.includes('encrypted')) {
        return sendError(res, 422, 'ENCRYPTED_PDF', msg, undefined, requestId);
      }
      if (msg.includes('too large')) {
        return sendError(res, 413, 'FILE_TOO_LARGE', msg, undefined, requestId);
      }
      if (msg.includes('timed out')) {
        return sendError(res, 504, 'OCR_TIMEOUT', msg, undefined, requestId);
      }
      return sendError(res, 500, 'OCR_PROCESSING_FAILED', msg, err, requestId);
    }
  }
);

// 4. Authorized Download with IDOR Protection
router.get('/:jobId/download', (req: Request, res: Response) => {
  const { jobId } = req.params;
  const token = (req.query.token as string) || '';

  const job = OcrService.getJob(jobId);
  if (!job) {
    return sendError(res, 404, 'JOB_NOT_FOUND', 'OCR job not found or has expired');
  }

  // IDOR Protection: Verify capability token
  if (!token || token !== job.downloadToken) {
    return sendError(res, 403, 'UNAUTHORIZED_ACCESS', 'Invalid or expired download authorization token');
  }

  if (job.status !== 'completed' || !job.outputPath || !existsSync(job.outputPath)) {
    return sendError(res, 410, 'OUTPUT_EXPIRED', 'OCR output is no longer available on the server');
  }

  const baseName = job.originalFileName.replace(/\.[^/.]+$/, '');
  const downloadName = `${baseName}_searchable.pdf`;

  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', `attachment; filename="${downloadName}"; filename*=UTF-8''${encodeURIComponent(downloadName)}`);
  res.setHeader('Cache-Control', 'private, no-store, no-cache, must-revalidate');

  const stream = createReadStream(job.outputPath);
  return stream.pipe(res);
});

export default router;
