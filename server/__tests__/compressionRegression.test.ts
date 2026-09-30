import { describe, it, expect } from 'vitest';
import { processPdf } from '../compression/processors/pdfWorker';
import { PDFDocument, rgb } from 'pdf-lib';
import fs from 'fs/promises';
import path from 'path';
import os from 'os';

describe('PDF Compression Engine Regression Suite', () => {
  it('should process a valid multi-page PDF through compression presets without corruption', async () => {
    // 1. Create a reproducible test PDF with pdf-lib
    const pdfDoc = await PDFDocument.create();
    for (let i = 1; i <= 3; i++) {
      const page = pdfDoc.addPage([600, 800]);
      page.drawText(`ZipStream Regression Test - Page ${i}`, {
        x: 50,
        y: 700,
        size: 24,
        color: rgb(0.1, 0.2, 0.8),
      });
      page.drawText('Testing that compression preserves text layout, font tables, and page counts.', {
        x: 50,
        y: 650,
        size: 14,
        color: rgb(0.2, 0.2, 0.2),
      });
    }

    const testPdfBytes = await pdfDoc.save();
    const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'zipstream-regression-'));
    const inputPath = path.join(tempDir, 'test-source.pdf');
    await fs.writeFile(inputPath, testPdfBytes);

    try {
      const levels: Array<'low' | 'medium' | 'high'> = ['low', 'medium', 'high'];

      for (const level of levels) {
        const outputPath = path.join(tempDir, `test-output-${level}.pdf`);

        const result = await processPdf({
          jobId: `test-regression-${level}`,
          originalFileName: 'test-source.pdf',
          originalSize: testPdfBytes.length,
          mimeType: 'application/pdf',
          category: 'pdf',
          inputFilePath: inputPath,
          outputFilePath: outputPath,
          options: { level },
          createdAt: Date.now(),
        });

        // A. Output file must exist and be non-empty
        expect(result.compressedSize).toBeGreaterThan(0);
        const outputBuf = await fs.readFile(outputPath);
        expect(outputBuf.length).toBe(result.compressedSize);

        // B. Output must have valid PDF magic bytes
        expect(outputBuf.subarray(0, 5).toString('ascii')).toBe('%PDF-');

        // C. Output must be loadable and page count must be preserved exactly
        const loadedOutput = await PDFDocument.load(outputBuf);
        expect(loadedOutput.getPageCount()).toBe(3);
      }
    } finally {
      await fs.rm(tempDir, { recursive: true, force: true }).catch(() => undefined);
    }
  }, 45000); // 45s timeout for Ghostscript / native processing
});
