import { PDFDocument, rgb, degrees, StandardFonts } from 'pdf-lib';
import { ImageToPdfItem, ImageToPdfSettings, SplitPdfSettings, WatermarkPdfSettings } from '../types';
import JSZip from 'jszip';

/**
 * Reads page count of a PDF file quickly
 */
export async function getPdfPageCount(file: File): Promise<number> {
  try {
    const arrayBuffer = await file.arrayBuffer();
    const pdfDoc = await PDFDocument.load(arrayBuffer, { ignoreEncryption: true });
    return pdfDoc.getPageCount();
  } catch (err) {
    console.warn('Failed to parse PDF page count:', err);
    return 1;
  }
}

/**
 * Merges multiple PDF files into a single valid PDF
 */
export async function mergePdfFiles(
  files: File[],
  options: { addBlankSeparators?: boolean } = {}
): Promise<{ blob: Blob; totalPages: number }> {
  const mergedPdf = await PDFDocument.create();

  for (let i = 0; i < files.length; i++) {
    const file = files[i];
    const fileBytes = await file.arrayBuffer();
    const currentPdf = await PDFDocument.load(fileBytes, { ignoreEncryption: true });
    const copiedPages = await mergedPdf.copyPages(currentPdf, currentPdf.getPageIndices());

    copiedPages.forEach((page) => mergedPdf.addPage(page));

    // Optional blank page separator between documents
    if (options.addBlankSeparators && i < files.length - 1 && copiedPages.length % 2 !== 0) {
      mergedPdf.addPage();
    }
  }

  mergedPdf.setProducer('ZipStream PDF Studio');
  mergedPdf.setCreator('ZipStream Web Engine');

  const mergedBytes = await mergedPdf.save({ useObjectStreams: true });
  const blob = new Blob([mergedBytes], { type: 'application/pdf' });
  return {
    blob,
    totalPages: mergedPdf.getPageCount(),
  };
}

/**
 * Splits or extracts pages from a PDF file
 */
export async function splitPdfFile(
  file: File,
  settings: SplitPdfSettings
): Promise<{ singleBlob?: Blob; zipBlob?: Blob; totalPagesExtracted: number }> {
  const fileBytes = await file.arrayBuffer();
  const sourcePdf = await PDFDocument.load(fileBytes, { ignoreEncryption: true });
  const totalAvailablePages = sourcePdf.getPageCount();

  if (settings.mode === 'all_pages') {
    // Split every single page into separate PDF and package as ZIP
    const zip = new JSZip();
    const baseName = file.name.replace(/\.[^/.]+$/, '');

    for (let i = 0; i < totalAvailablePages; i++) {
      const singlePageDoc = await PDFDocument.create();
      const [copiedPage] = await singlePageDoc.copyPages(sourcePdf, [i]);
      singlePageDoc.addPage(copiedPage);

      const singleBytes = await singlePageDoc.save({ useObjectStreams: true });
      zip.file(`${baseName}_page_${i + 1}.pdf`, singleBytes);
    }

    const zipBlob = await zip.generateAsync({ type: 'blob' });
    return { zipBlob, totalPagesExtracted: totalAvailablePages };
  } else {
    // Parse range string (e.g., "1-3, 5, 8-10")
    const pageIndices = parsePageRanges(settings.pageRanges, totalAvailablePages);

    if (pageIndices.length === 0) {
      throw new Error('Please enter valid page numbers or ranges (e.g. 1-3, 5).');
    }

    const splitDoc = await PDFDocument.create();
    const copiedPages = await splitDoc.copyPages(sourcePdf, pageIndices);
    copiedPages.forEach((page) => splitDoc.addPage(page));

    const splitBytes = await splitDoc.save({ useObjectStreams: true });
    const singleBlob = new Blob([splitBytes], { type: 'application/pdf' });
    return { singleBlob, totalPagesExtracted: copiedPages.length };
  }
}

/**
 * Parses user range strings like "1-3, 5, 7-10" into 0-based page indices
 */
export function parsePageRanges(rangeStr: string, totalPages: number): number[] {
  const indices = new Set<number>();
  const parts = rangeStr.split(',').map((p) => p.trim()).filter(Boolean);

  for (const part of parts) {
    if (part.includes('-')) {
      const [startStr, endStr] = part.split('-').map((s) => parseInt(s.trim(), 10));
      if (!isNaN(startStr) && !isNaN(endStr)) {
        const start = Math.max(1, Math.min(startStr, endStr));
        const end = Math.min(totalPages, Math.max(startStr, endStr));
        for (let p = start; p <= end; p++) {
          indices.add(p - 1);
        }
      }
    } else {
      const pageNum = parseInt(part, 10);
      if (!isNaN(pageNum) && pageNum >= 1 && pageNum <= totalPages) {
        indices.add(pageNum - 1);
      }
    }
  }

  return Array.from(indices).sort((a, b) => a - b);
}

/**
 * Converts multiple JPG / PNG / WebP images into a single clean PDF document
 */
export async function convertImagesToPdf(
  images: ImageToPdfItem[],
  settings: ImageToPdfSettings
): Promise<{ blob: Blob; totalPages: number }> {
  const pdfDoc = await PDFDocument.create();

  // Page Dimensions in points (72 pt per inch)
  const A4_PORTRAIT: [number, number] = [595.28, 841.89];
  const A4_LANDSCAPE: [number, number] = [841.89, 595.28];
  const LETTER_PORTRAIT: [number, number] = [612, 792];
  const LETTER_LANDSCAPE: [number, number] = [792, 612];

  let marginPt = 0;
  if (settings.margin === 'small') marginPt = 20;
  if (settings.margin === 'large') marginPt = 40;

  for (const imgItem of images) {
    let embeddedImage;
    const arrayBuffer = await imgItem.file.arrayBuffer();

    // Check if jpeg or png
    const isPng = imgItem.file.type === 'image/png' || imgItem.name.toLowerCase().endsWith('.png');

    try {
      if (isPng) {
        embeddedImage = await pdfDoc.embedPng(arrayBuffer);
      } else {
        embeddedImage = await pdfDoc.embedJpg(arrayBuffer);
      }
    } catch {
      // If WebP or other format, render to canvas as JPEG arrayBuffer first
      const fallbackBytes = await convertImageToJpegBytes(imgItem.dataUrl, settings.quality || 0.9);
      embeddedImage = await pdfDoc.embedJpg(fallbackBytes);
    }

    const { width: imgW, height: imgH } = embeddedImage;

    // Determine target page width and height
    let pageW = imgW;
    let pageH = imgH;

    if (settings.pageSize === 'a4') {
      const isLandscape =
        settings.orientation === 'landscape' ||
        (settings.orientation === 'fit' && imgW > imgH);
      [pageW, pageH] = isLandscape ? A4_LANDSCAPE : A4_PORTRAIT;
    } else if (settings.pageSize === 'letter') {
      const isLandscape =
        settings.orientation === 'landscape' ||
        (settings.orientation === 'fit' && imgW > imgH);
      [pageW, pageH] = isLandscape ? LETTER_LANDSCAPE : LETTER_PORTRAIT;
    } else {
      // fit to image
      pageW = imgW + marginPt * 2;
      pageH = imgH + marginPt * 2;
    }

    const page = pdfDoc.addPage([pageW, pageH]);

    // Calculate fitted bounding box inside margins
    const availableW = Math.max(10, pageW - marginPt * 2);
    const availableH = Math.max(10, pageH - marginPt * 2);

    const scale = Math.min(availableW / imgW, availableH / imgH, 1);
    const drawW = imgW * scale;
    const drawH = imgH * scale;

    const posX = marginPt + (availableW - drawW) / 2;
    const posY = marginPt + (availableH - drawH) / 2;

    page.drawImage(embeddedImage, {
      x: posX,
      y: posY,
      width: drawW,
      height: drawH,
    });
  }

  pdfDoc.setProducer('ZipStream Images to PDF');
  pdfDoc.setCreator('ZipStream Web Engine');

  const pdfBytes = await pdfDoc.save({ useObjectStreams: true });
  const blob = new Blob([pdfBytes], { type: 'application/pdf' });
  return {
    blob,
    totalPages: pdfDoc.getPageCount(),
  };
}

/**
 * Stamps customizable watermark text onto a PDF document
 */
export async function stampWatermarkPdf(
  file: File,
  settings: WatermarkPdfSettings
): Promise<{ blob: Blob; totalPages: number }> {
  const fileBytes = await file.arrayBuffer();
  const pdfDoc = await PDFDocument.load(fileBytes, { ignoreEncryption: true });
  const helveticaBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
  const totalPages = pdfDoc.getPageCount();

  // Color mapping
  let colorRgb = rgb(0.5, 0.5, 0.5); // gray
  if (settings.color === 'red') colorRgb = rgb(0.85, 0.15, 0.15);
  if (settings.color === 'blue') colorRgb = rgb(0.0, 0.44, 0.89);
  if (settings.color === 'black') colorRgb = rgb(0.1, 0.1, 0.1);

  const text = settings.text || 'CONFIDENTIAL';
  const fontSize = settings.fontSize || 42;
  const opacity = Math.min(1, Math.max(0.05, settings.opacity || 0.3));

  for (let i = 0; i < totalPages; i++) {
    const page = pdfDoc.getPage(i);
    const { width, height } = page.getSize();
    const textWidth = helveticaBold.widthOfTextAtSize(text, fontSize);
    const textHeight = helveticaBold.heightAtSize(fontSize);

    let x = (width - textWidth) / 2;
    let y = (height - textHeight) / 2;
    let rotation = degrees(settings.rotationDegrees || 45);

    if (settings.position === 'top') {
      y = height - textHeight - 40;
      rotation = degrees(0);
    } else if (settings.position === 'bottom') {
      y = 40;
      rotation = degrees(0);
    }

    page.drawText(text, {
      x,
      y,
      size: fontSize,
      font: helveticaBold,
      color: colorRgb,
      opacity,
      rotate: rotation,
    });
  }

  const stampedBytes = await pdfDoc.save({ useObjectStreams: true });
  const blob = new Blob([stampedBytes], { type: 'application/pdf' });
  return {
    blob,
    totalPages,
  };
}

/**
 * Helper to convert any image Data URL into JPEG bytes for embedding
 */
function convertImageToJpegBytes(dataUrl: string, quality = 0.9): Promise<Uint8Array> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = img.width;
      canvas.height = img.height;
      const ctx = canvas.getContext('2d');
      if (!ctx) return reject(new Error('Canvas context unavailable'));

      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(img, 0, 0);

      canvas.toBlob(
        async (blob) => {
          if (!blob) return reject(new Error('Image blob conversion failed'));
          const buffer = await blob.arrayBuffer();
          resolve(new Uint8Array(buffer));
        },
        'image/jpeg',
        quality
      );
    };
    img.onerror = () => reject(new Error('Failed to load image for PDF embedding'));
    img.src = dataUrl;
  });
}
