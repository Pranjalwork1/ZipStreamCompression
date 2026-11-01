import { afterEach, describe, expect, it } from 'vitest';
import sharp from 'sharp';
import fs from 'fs/promises';
import os from 'os';
import path from 'path';
import { processImage } from '../processors/imageWorker';

const temporaryDirectories: string[] = [];

async function createTempDirectory(): Promise<string> {
  const directory = await fs.mkdtemp(path.join(os.tmpdir(), 'zipstream-adaptive-compression-'));
  temporaryDirectories.push(directory);
  return directory;
}

afterEach(async () => {
  await Promise.all(temporaryDirectories.splice(0).map(directory =>
    fs.rm(directory, { recursive: true, force: true }).catch(() => undefined)
  ));
});

describe('Adaptive image compression', () => {
  it('reduces transparent PNGs without discarding the alpha channel', async () => {
    const directory = await createTempDirectory();
    const inputPath = path.join(directory, 'source.png');
    const outputPath = path.join(directory, 'compressed-output.webp');

    const width = 512;
    const height = 512;
    const raw = Buffer.alloc(width * height * 4);
    let seed = 0xdecafbad;
    for (let pixel = 0; pixel < width * height; pixel++) {
      seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
      raw[pixel * 4] = seed >>> 24;
      seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
      raw[pixel * 4 + 1] = seed >>> 24;
      seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
      raw[pixel * 4 + 2] = seed >>> 24;
      raw[pixel * 4 + 3] = pixel % 3 === 0 ? 0 : 255;
    }

    const source = await sharp(raw, {
      raw: { width, height, channels: 4 },
    }).png().toBuffer();
    await fs.writeFile(inputPath, source);

    const result = await processImage({
      jobId: 'image-alpha-regression',
      originalFileName: 'source.png',
      originalSize: source.length,
      mimeType: 'image/png',
      category: 'image',
      inputFilePath: inputPath,
      outputFilePath: outputPath,
      options: { level: 'medium', targetSizeBytes: Math.floor(source.length * 0.9) },
      createdAt: Date.now(),
    });

    expect(result.compressedSize).toBeGreaterThan(0);
    expect(result.compressedSize).toBeLessThan(source.length);
    expect(result.mimeType).toBe('image/webp');
    expect(result.outputFilePath.endsWith('.webp')).toBe(true);

    const outputMetadata = await sharp(result.outputFilePath).metadata();
    expect(outputMetadata.hasAlpha).toBe(true);
    expect(outputMetadata.width).toBe(width);
    expect(outputMetadata.height).toBe(height);
  });
});
