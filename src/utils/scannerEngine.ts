import { PDFDocument } from 'pdf-lib';
import { ScannedPage, ScanFilterMode } from '../types';
import JSZip from 'jszip';

export interface FilterAdjustments {
  brightness?: number; // -50 to +50
  contrast?: number;   // -50 to +50
}

export interface PdfExportOptions {
  pageSize?: 'a4' | 'letter' | 'fit';
  margin?: 'none' | 'small';
}

/**
 * Applies document enhancement filters to an image data URL via Canvas
 */
export async function processDocumentFilter(
  dataUrl: string,
  filter: ScanFilterMode,
  rotation: number = 0,
  adjustments?: FilterAdjustments
): Promise<{ dataUrl: string; blob: Blob; width: number; height: number }> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
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

      const imgData = ctx.getImageData(0, 0, targetW, targetH);
      const data = imgData.data;
      const len = data.length;

      const brightness = adjustments?.brightness ?? 0;
      const contrast = adjustments?.contrast ?? 0;

      // Contrast factor calculation (-100 to 100 range mapped to 259 formula)
      const contrastFactor = (259 * (contrast + 255)) / (255 * (259 - contrast));
      const brightnessShift = brightness * 1.5;

      if (filter === 'clean_bw') {
        // High-contrast clean paper document scanner with adaptive thresholding
        // Compute sample luminance to adapt dynamically
        let totalLuminance = 0;
        const sampleStep = Math.max(1, Math.floor(len / 40000));
        let sampleCount = 0;

        for (let i = 0; i < len; i += 4 * sampleStep) {
          const lum = 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];
          totalLuminance += lum;
          sampleCount++;
        }
        const avgLuminance = sampleCount > 0 ? totalLuminance / sampleCount : 128;
        const threshold = Math.max(115, Math.min(185, avgLuminance * 0.95));

        for (let i = 0; i < len; i += 4) {
          let gray = 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];
          if (brightness !== 0) gray += brightnessShift;
          if (contrast !== 0) gray = contrastFactor * (gray - 128) + 128;

          // Adaptive paper whitening & ink enhancement with smooth anti-aliasing curve
          let val = 255;
          if (gray < threshold - 30) {
            val = Math.max(0, (gray / (threshold - 30)) * 40); // Deep rich black ink
          } else if (gray < threshold + 15) {
            const factor = (gray - (threshold - 30)) / 45;
            val = Math.min(255, Math.max(0, factor * 255));
          }
          data[i] = val;
          data[i + 1] = val;
          data[i + 2] = val;
        }
        ctx.putImageData(imgData, 0, 0);

      } else if (filter === 'auto_enhance') {
        // "Magic Color" CamScanner mode:
        // Whitens off-white paper backgrounds, intensifies colored inks (stamps, signatures), and sharpens text
        for (let i = 0; i < len; i += 4) {
          let r = data[i];
          let g = data[i + 1];
          let b = data[i + 2];

          // Boost paper background to crisp white while preserving color hues
          const maxChannel = Math.max(r, g, b);
          const minChannel = Math.min(r, g, b);
          const saturation = maxChannel === 0 ? 0 : (maxChannel - minChannel) / maxChannel;

          // Stretch contrast
          r = Math.min(255, Math.max(0, (r - 18) * 1.22));
          g = Math.min(255, Math.max(0, (g - 18) * 1.22));
          b = Math.min(255, Math.max(0, (b - 18) * 1.22));

          // If it's near-white paper (low saturation, high brightness), push to pure clean white
          const lum = 0.299 * r + 0.587 * g + 0.114 * b;
          if (lum > 180 && saturation < 0.18) {
            const boost = (lum - 180) / 75;
            r = Math.min(255, r + (255 - r) * boost);
            g = Math.min(255, g + (255 - g) * boost);
            b = Math.min(255, b + (255 - b) * boost);
          } else if (saturation > 0.15) {
            // Enhance vibrant ink colors (e.g. blue or red ink/stamps)
            r = Math.min(255, Math.max(0, r * 1.08));
            g = Math.min(255, Math.max(0, g * 1.08));
            b = Math.min(255, Math.max(0, b * 1.08));
          }

          if (brightness !== 0) {
            r = Math.min(255, Math.max(0, r + brightnessShift));
            g = Math.min(255, Math.max(0, g + brightnessShift));
            b = Math.min(255, Math.max(0, b + brightnessShift));
          }

          if (contrast !== 0) {
            r = Math.min(255, Math.max(0, contrastFactor * (r - 128) + 128));
            g = Math.min(255, Math.max(0, contrastFactor * (g - 128) + 128));
            b = Math.min(255, Math.max(0, contrastFactor * (b - 128) + 128));
          }

          data[i] = r;
          data[i + 1] = g;
          data[i + 2] = b;
        }
        ctx.putImageData(imgData, 0, 0);

      } else if (filter === 'grayscale') {
        // Clean high-contrast grayscale
        for (let i = 0; i < len; i += 4) {
          let gray = 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];
          gray = Math.min(255, Math.max(0, (gray - 20) * 1.25));

          if (brightness !== 0) gray += brightnessShift;
          if (contrast !== 0) gray = contrastFactor * (gray - 128) + 128;

          const finalVal = Math.min(255, Math.max(0, gray));
          data[i] = finalVal;
          data[i + 1] = finalVal;
          data[i + 2] = finalVal;
        }
        ctx.putImageData(imgData, 0, 0);

      } else if (filter === 'original' && (brightness !== 0 || contrast !== 0)) {
        // Original with user brightness/contrast adjustments
        for (let i = 0; i < len; i += 4) {
          let r = data[i];
          let g = data[i + 1];
          let b = data[i + 2];

          if (brightness !== 0) {
            r = Math.min(255, Math.max(0, r + brightnessShift));
            g = Math.min(255, Math.max(0, g + brightnessShift));
            b = Math.min(255, Math.max(0, b + brightnessShift));
          }

          if (contrast !== 0) {
            r = Math.min(255, Math.max(0, contrastFactor * (r - 128) + 128));
            g = Math.min(255, Math.max(0, contrastFactor * (g - 128) + 128));
            b = Math.min(255, Math.max(0, contrastFactor * (b - 128) + 128));
          }

          data[i] = r;
          data[i + 1] = g;
          data[i + 2] = b;
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
 * Standard page sizes in points (72 points = 1 inch)
 */
const PAGE_DIMENSIONS = {
  a4: { width: 595.28, height: 841.89 },
  letter: { width: 612, height: 792 },
};

/**
 * Compiles a stack of scanned pages into a standard multi-page PDF
 */
export async function createPdfFromScannedPages(
  pages: ScannedPage[],
  options?: PdfExportOptions
): Promise<Blob> {
  const pdfDoc = await PDFDocument.create();
  const targetSize = options?.pageSize || 'a4';
  const marginSize = options?.margin === 'small' ? 24 : 0;

  for (const pageItem of pages) {
    let embeddedImg;
    const arrayBuffer = await pageItem.blob.arrayBuffer();

    try {
      embeddedImg = await pdfDoc.embedJpg(arrayBuffer);
    } catch {
      try {
        embeddedImg = await pdfDoc.embedPng(arrayBuffer);
      } catch {
        // Fallback: decode via canvas to pure JPEG
        const img = await new Promise<HTMLImageElement>((resolve, reject) => {
          const i = new Image();
          i.crossOrigin = 'anonymous';
          i.onload = () => resolve(i);
          i.onerror = reject;
          i.src = pageItem.dataUrl;
        });

        const c = document.createElement('canvas');
        c.width = img.width;
        c.height = img.height;
        const ctx = c.getContext('2d');
        ctx?.drawImage(img, 0, 0);

        const jpegBlob = await new Promise<Blob>((resolve) => {
          c.toBlob((b) => resolve(b!), 'image/jpeg', 0.92);
        });
        const fallbackBuf = await jpegBlob.arrayBuffer();
        embeddedImg = await pdfDoc.embedJpg(fallbackBuf);
      }
    }

    const imgWidth = embeddedImg.width;
    const imgHeight = embeddedImg.height;

    if (targetSize === 'fit') {
      // Use original image pixel dimensions
      const page = pdfDoc.addPage([imgWidth, imgHeight]);
      page.drawImage(embeddedImg, {
        x: 0,
        y: 0,
        width: imgWidth,
        height: imgHeight,
      });
    } else {
      // Standard A4 or Letter
      const baseDim = PAGE_DIMENSIONS[targetSize] || PAGE_DIMENSIONS.a4;
      const isLandscape = imgWidth > imgHeight;
      const pageWidth = isLandscape ? baseDim.height : baseDim.width;
      const pageHeight = isLandscape ? baseDim.width : baseDim.height;

      const printableWidth = pageWidth - marginSize * 2;
      const printableHeight = pageHeight - marginSize * 2;

      const scale = Math.min(printableWidth / imgWidth, printableHeight / imgHeight);
      const drawWidth = imgWidth * scale;
      const drawHeight = imgHeight * scale;

      const x = (pageWidth - drawWidth) / 2;
      const y = (pageHeight - drawHeight) / 2;

      const page = pdfDoc.addPage([pageWidth, pageHeight]);
      page.drawImage(embeddedImg, {
        x,
        y,
        width: drawWidth,
        height: drawHeight,
      });
    }
  }

  pdfDoc.setProducer('ZipStream CamScanner');
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
