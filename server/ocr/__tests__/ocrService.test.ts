import { describe, it, expect, beforeEach } from 'vitest';
import { OcrService, OCR_MAX_FILE_SIZE_BYTES } from '../ocrService';
import { SUPPORTED_OCR_LANGUAGES } from '../types';

describe('OCR Service Validation & Option Normalization', () => {
  it('should normalize default OCR options correctly', () => {
    const opts = OcrService.validateOptions({});
    expect(opts.language).toBe('eng');
    expect(opts.mode).toBe('auto');
    expect(opts.deskew).toBe(true);
    expect(opts.rotate).toBe(true);
  });

  it('should accept valid allowlisted languages (English, Hindi, Multilingual)', () => {
    const engOpts = OcrService.validateOptions({ language: 'eng' });
    expect(engOpts.language).toBe('eng');

    const hinOpts = OcrService.validateOptions({ language: 'hin' });
    expect(hinOpts.language).toBe('hin');

    const multiOpts = OcrService.validateOptions({ language: 'eng+hin' as any });
    expect(multiOpts.language).toBe('eng+hin');

    const fraOpts = OcrService.validateOptions({ language: 'fra' });
    expect(fraOpts.language).toBe('fra');
  });

  it('should fallback to English for unknown or malicious language codes', () => {
    const badOpts = OcrService.validateOptions({ language: 'malicious; rm -rf /' as any });
    expect(badOpts.language).toBe('eng');
  });

  it('should respect custom OCR modes (force, skip)', () => {
    const forceOpts = OcrService.validateOptions({ mode: 'force' });
    expect(forceOpts.mode).toBe('force');

    const skipOpts = OcrService.validateOptions({ mode: 'skip' });
    expect(skipOpts.mode).toBe('skip');

    const invalidMode = OcrService.validateOptions({ mode: 'invalid' as any });
    expect(invalidMode.mode).toBe('auto');
  });

  it('should expose verified supported languages catalog', () => {
    const languages = OcrService.getSupportedLanguages();
    expect(languages.length).toBeGreaterThanOrEqual(6);

    const codes = languages.map((l) => l.code);
    expect(codes).toContain('eng');
    expect(codes).toContain('hin');
    expect(codes).toContain('eng+hin');
    expect(codes).toContain('fra');
    expect(codes).toContain('deu');
    expect(codes).toContain('spa');
  });
});

describe('OCR Service Input & Security Validation', () => {
  it('should reject empty PDF buffers', async () => {
    const emptyBuf = Buffer.alloc(0);
    const opts = OcrService.validateOptions({});

    await expect(
      OcrService.processOcr(emptyBuf, 'empty.pdf', opts)
    ).rejects.toThrow('PDF file buffer is empty');
  });

  it('should reject files without valid %PDF- magic header', async () => {
    const fakeBuf = Buffer.from('NOT_A_PDF_DOCUMENT_CONTENT');
    const opts = OcrService.validateOptions({});

    await expect(
      OcrService.processOcr(fakeBuf, 'fake.pdf', opts)
    ).rejects.toThrow('Invalid PDF file format. Expected standard %PDF- header.');
  });

  it('should reject files exceeding the maximum size limit', async () => {
    // Create oversized buffer descriptor
    const oversizedBuf = Buffer.alloc(OCR_MAX_FILE_SIZE_BYTES + 1024);
    oversizedBuf.write('%PDF-1.4');
    const opts = OcrService.validateOptions({});

    await expect(
      OcrService.processOcr(oversizedBuf, 'huge.pdf', opts)
    ).rejects.toThrow('PDF is too large for OCR processing');
  });
});
