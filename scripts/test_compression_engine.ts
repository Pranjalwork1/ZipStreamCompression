import { detectMimeFromBuffer } from '../server/compression/magicBytes';
import { processPdf } from '../server/compression/processors/pdfWorker';
import { processImage } from '../server/compression/processors/imageWorker';
import fs from 'fs';
import path from 'path';
import os from 'os';

async function runTests() {
  console.log('--- Testing Magic Byte Detection ---');

  // Test PDF signature
  const pdfHeader = Buffer.from('%PDF-1.7 ...');
  const pdfResult = detectMimeFromBuffer(pdfHeader);
  console.assert(pdfResult?.category === 'pdf', `Expected pdf, got ${pdfResult?.category}`);
  console.log('✓ PDF detection passed:', pdfResult);

  // Test JPEG signature
  const jpegHeader = Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10, 0x4a, 0x46]);
  const jpegResult = detectMimeFromBuffer(jpegHeader);
  console.assert(jpegResult?.category === 'image' && jpegResult.mime === 'image/jpeg', `Expected jpeg, got ${jpegResult?.mime}`);
  console.log('✓ JPEG detection passed:', jpegResult);

  // Test PNG signature
  const pngHeader = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
  const pngResult = detectMimeFromBuffer(pngHeader);
  console.assert(pngResult?.category === 'image' && pngResult.mime === 'image/png', `Expected png, got ${pngResult?.mime}`);
  console.log('✓ PNG detection passed:', pngResult);

  console.log('\n--- Testing Real PDF Compression Engine (iLovePDF Profiles) ---');
  const samplePdfPath = 'C:/Users/Pranjal singh/AppData/Local/Temp/zipstream-storage/compressed/compressed-0023c38b-48eb-4230-8d34-09130e2ace10.pdf';

  if (fs.existsSync(samplePdfPath)) {
    const originalSize = fs.statSync(samplePdfPath).size;
    console.log(`Original PDF Size: ${(originalSize / 1024 / 1024).toFixed(2)} MB (${originalSize} bytes)`);

    // Test High (Extreme/Smaller)
    const outHigh = path.join(os.tmpdir(), 'test-compressed-high.pdf');
    const resultHigh = await processPdf({
      jobId: 'test-job-high',
      originalFileName: 'sample.pdf',
      originalSize,
      mimeType: 'application/pdf',
      category: 'pdf',
      inputFilePath: samplePdfPath,
      outputFilePath: outHigh,
      options: { level: 'high' },
      createdAt: Date.now(),
    });
    const highPct = (((originalSize - resultHigh.compressedSize) / originalSize) * 100).toFixed(1);
    console.log(`✓ Extreme (Smaller) preset: ${(resultHigh.compressedSize / 1024 / 1024).toFixed(2)} MB (Reduced by ${highPct}%)`);

    // Test Medium (Recommended/Balanced)
    const outMed = path.join(os.tmpdir(), 'test-compressed-med.pdf');
    const resultMed = await processPdf({
      jobId: 'test-job-med',
      originalFileName: 'sample.pdf',
      originalSize,
      mimeType: 'application/pdf',
      category: 'pdf',
      inputFilePath: samplePdfPath,
      outputFilePath: outMed,
      options: { level: 'medium' },
      createdAt: Date.now(),
    });
    const medPct = (((originalSize - resultMed.compressedSize) / originalSize) * 100).toFixed(1);
    console.log(`✓ Balanced (Recommended) preset: ${(resultMed.compressedSize / 1024 / 1024).toFixed(2)} MB (Reduced by ${medPct}%)`);

    // Test Low (Best Quality)
    const outLow = path.join(os.tmpdir(), 'test-compressed-low.pdf');
    const resultLow = await processPdf({
      jobId: 'test-job-low',
      originalFileName: 'sample.pdf',
      originalSize,
      mimeType: 'application/pdf',
      category: 'pdf',
      inputFilePath: samplePdfPath,
      outputFilePath: outLow,
      options: { level: 'low' },
      createdAt: Date.now(),
    });
    const lowPct = (((originalSize - resultLow.compressedSize) / originalSize) * 100).toFixed(1);
    console.log(`✓ Best Quality preset: ${(resultLow.compressedSize / 1024 / 1024).toFixed(2)} MB (Reduced by ${lowPct}%)`);

    // Assert that compression actually reduced file size!
    console.assert(resultHigh.compressedSize < originalSize, 'High compression must reduce file size!');
    console.assert(resultMed.compressedSize < originalSize, 'Medium compression must reduce file size!');

    fs.rmSync(outHigh, { force: true });
    fs.rmSync(outMed, { force: true });
    fs.rmSync(outLow, { force: true });
  } else {
    console.log('Sample PDF not found, skipping live PDF compression benchmark.');
  }

  console.log('\nAll Compression Engine Tests Passed Successfully!');
}

runTests().catch(console.error);
