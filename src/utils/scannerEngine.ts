import { PDFDocument } from 'pdf-lib';
import { ScannedPage, ScanFilterMode } from '../types';
import JSZip from 'jszip';

/**
 * Applies document enhancement filters to an image data URL via Canvas
 */
export async function processDocumentFilter(
  dataUrl: string,
  filter: ScanFilterMode,
  rotation: number = 0
): Promise<{ dataUrl: string; blob: Blob; width: number; height: number }> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      // Determine canvas dimensions according to rotation
      const is90or270 = rotation % 180 !== 0;
      const targetW = is90or270 ? img.height : img.width;
      const targetH = is90or270 ? img.width : img.height;

      const canvas = document.createElement('canvas');
      canvas.width = targetW;
      canvas.height = targetH;
      const ctx = canvas.getContext('2d', { willReadFrequently: true });

      if (!ctx) {
        return reject(new Error('Canvas 2D context unavailable'));
      }

      // Apply rotation transformation
      ctx.save();
      ctx.translate(targetW / 2, targetH / 2);
      ctx.rotate((rotation * Math.PI) / 180);
      ctx.drawImage(img, -img.width / 2, -img.height / 2);
      ctx.restore();

      // Apply image filters if not 'original'
      if (filter !== 'original') {
        const imgData = ctx.getImageData(0, 0, targetW, targetH);
        const data = imgData.data;
        const len = data.length;

        if (filter === 'grayscale') {
          for (let i = 0; i < len; i += 4) {
            const gray = 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];
            data[i] = gray;
            data[i + 1] = gray;
            data[i + 2] = gray;
          }
        } else if (filter === 'auto_enhance') {
          // Document Magic Color: contrast stretch + slight gamma increase + sharpening
          for (let i = 0; i < len; i += 4) {
            let r = data[i];
            let g = data[i + 1];
            let b = data[i + 2];

            // Contrast stretch
            r = Math.min(255, Math.max(0, (r - 20) * 1.25));
            g = Math.min(255, Math.max(0, (g - 20) * 1.25));
            b = Math.min(255, Math.max(0, (b - 20) * 1.25));

            data[i] = r;
            data[i + 1] = g;
            data[i + 2] = b;
          }
        } else if (filter === 'clean_bw') {
          // High-contrast clean paper document scanner thresholding
          for (let i = 0; i < len; i += 4) {
            const gray = 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];
            // Adaptive threshold: pushes light grays to pure paper white (255) and dark text to deep black (0)
            const val = gray > 140 ? 255 : Math.max(0, (gray - 50) * 1.6);
            data[i] = val;
            data[i + 1] = val;
            data[i + 2] = val;
          }
        }

        ctx.putImageData(imgData, 0, 0);
      }

      canvas.toBlob(
        (blob) => {
          if (!blob) return reject(new Error('Failed to generate image blob'));
          const finalDataUrl = canvas.toDataURL('image/jpeg', 0.92);
          resolve({
            dataUrl: finalDataUrl,
            blob,
            width: targetW,
            height: targetH,
          });
        },
        'image/jpeg',
        0.92
      );
    };

    img.onerror = () => reject(new Error('Failed to load image source'));
    img.src = dataUrl;
  });
}

/**
 * Compiles a stack of scanned pages into a standard multi-page PDF
 */
export async function createPdfFromScannedPages(pages: ScannedPage[]): Promise<Blob> {
  const pdfDoc = await PDFDocument.create();

  for (const pageItem of pages) {
    const arrayBuffer = await pageItem.blob.arrayBuffer();
    const embeddedImg = await pdfDoc.embedJpg(arrayBuffer);

    const { width, height } = embeddedImg;
    const page = pdfDoc.addPage([width, height]);
    page.drawImage(embeddedImg, {
      x: 0,
      y: 0,
      width,
      height,
    });
  }

  pdfDoc.setProducer('ZipStream Document Scanner');
  pdfDoc.setCreator('ZipStream Web Engine');

  const pdfBytes = await pdfDoc.save({ useObjectStreams: true });
  return new Blob([pdfBytes], { type: 'application/pdf' });
}

/**
 * Packages all scanned pages into a ZIP containing high-res JPEG images
 */
export async function packageScannedPagesZip(pages: ScannedPage[]): Promise<Blob> {
  const zip = new JSZip();

  for (let i = 0; i < pages.length; i++) {
    const page = pages[i];
    const arrayBuffer = await page.blob.arrayBuffer();
    const padIndex = String(i + 1).padStart(2, '0');
    zip.file(`scan_page_${padIndex}.jpg`, arrayBuffer);
  }

  return zip.generateAsync({ type: 'blob' });
}
