import { describe, it, expect } from 'vitest';
import { processPdf } from '../compression/processors/pdfWorker';
import { PDFDocument, rgb } from 'pdf-lib';
import sharp from 'sharp';
import fs from 'fs/promises';
import path from 'path';
import os from 'os';

async function createImageHeavyPdf(): Promise<Uint8Array> {
  // Deterministic high-entropy source image makes this regression meaningful:
  // the PDF is large because it contains real image data, not padding bytes.
  const width = 1600;
  const height = 2000;
  const raw = Buffer.alloc(width * height * 3);
  let seed = 0x12345678;
  for (let i = 0; i < raw.length; i++) {
    seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
    raw[i] = seed >>> 24;
  }

  const jpegBytes = await sharp(raw, {
    raw: { width, height, channels: 3 },
    limitInputPixels: width * height,
  }).jpeg({ quality: 95, chromaSubsampling: '4:4:4' }).toBuffer();

  const pdfDoc = await PDFDocument.create();
  const embeddedImage = await pdfDoc.embedJpg(jpegBytes);
  for (let pageNumber = 1; pageNumber <= 3; pageNumber++) {
    const page = pdfDoc.addPage([600, 800]);
    page.drawImage(embeddedImage, { x: 0, y: 0, width: 600, height: 750 });
    page.drawText(`ZipStream image compression regression - page ${pageNumber}`, {
      x: 30,
      y: 770,
      size: 12,
      color: rgb(0.1, 0.2, 0.8),
    });
  }
  return pdfDoc.save();
}

describe('PDF Compression Engine Regression Suite', () => {
  it('reduces a real image-heavy PDF, preserves all pages, and respects a feasible target cap', async () => {
    const testPdfBytes = await createImageHeavyPdf();
    const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'zipstream-regression-'));
    const inputPath = path.join(tempDir, 'test-source.pdf');
    await fs.writeFile(inputPath, testPdfBytes);

    try {
      const cases: Array<{
        level: 'low' | 'medium' | 'high';
        targetSizeBytes?: number;
      }> = [
        // A very mild cap asks the low profile ladder to prove it can find a
        // smaller candidate; without a cap it is correct to preserve inputs
        // that would grow when re-encoded.
        { level: 'low', targetSizeBytes: Math.floor(testPdfBytes.length * 0.99) },
        { level: 'medium', targetSizeBytes: Math.floor(testPdfBytes.length * 0.85) },
        { level: 'high', targetSizeBytes: Math.floor(testPdfBytes.length * 0.65) },
      ];

      for (const testCase of cases) {
        const outputPath = path.join(tempDir, `test-output-${testCase.level}.pdf`);
        const result = await processPdf({
          jobId: `test-regression-${testCase.level}`,
          originalFileName: 'test-source.pdf',
          originalSize: testPdfBytes.length,
          mimeType: 'application/pdf',
          category: 'pdf',
          inputFilePath: inputPath,
          outputFilePath: outputPath,
          options: testCase,
          createdAt: Date.now(),
        });

        expect(result.compressedSize).toBeGreaterThan(0);
        expect(result.compressedSize).toBeLessThan(testPdfBytes.length);

        const outputBuf = await fs.readFile(outputPath);
        expect(outputBuf.length).toBe(result.compressedSize);
        expect(outputBuf.subarray(0, 5).toString('ascii')).toBe('%PDF-');

        const loadedOutput = await PDFDocument.load(outputBuf);
        expect(loadedOutput.getPageCount()).toBe(3);

        if (testCase.targetSizeBytes) {
          expect(result.compressedSize).toBeLessThanOrEqual(testCase.targetSizeBytes);
        }
      }
    } finally {
      await fs.rm(tempDir, { recursive: true, force: true }).catch(() => undefined);
    }
  }, 90000);
});
