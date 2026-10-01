/**
 * ZipStream PDF Editor — Native PDF Export Service
 * 
 * Non-destructively overlays editor objects onto the original PDF document
 * using pdf-lib. Preserves all vector text, bookmarks, form fields, and resolution.
 */

import { PDFDocument, StandardFonts, rgb, degrees, PDFPage, PDFFont } from 'pdf-lib';
import {
  EditorObject,
  TextObject,
  ImageObject,
  ShapeObject,
  HighlightObject,
  MarkupObject,
  DrawObject,
  CommentObject,
} from './types';
import { pageToPdfLibCoords, hexToPdfLibRgb } from './coordinateUtils';

/**
 * Helper to convert any image Data URL (including webp) to standard PNG bytes.
 */
async function dataUrlToPngBytes(dataUrl: string): Promise<Uint8Array> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = img.naturalWidth || img.width;
      canvas.height = img.naturalHeight || img.height;
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        reject(new Error('Failed to get 2d canvas context for image conversion'));
        return;
      }
      ctx.drawImage(img, 0, 0);
      canvas.toBlob((blob) => {
        if (!blob) {
          reject(new Error('Canvas toBlob failed'));
          return;
        }
        const reader = new FileReader();
        reader.onloadend = () => {
          resolve(new Uint8Array(reader.result as ArrayBuffer));
        };
        reader.onerror = reject;
        reader.readAsArrayBuffer(blob);
      }, 'image/png');
    };
    img.onerror = (e) => reject(new Error('Failed to load image for PDF embedding: ' + e));
    img.src = dataUrl;
  });
}

/**
 * Maps user font selection to standard pdf-lib font pairs.
 */
async function resolveFonts(pdfDoc: PDFDocument) {
  const helvetica = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const helveticaBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
  const helveticaOblique = await pdfDoc.embedFont(StandardFonts.HelveticaOblique);
  const helveticaBoldOblique = await pdfDoc.embedFont(StandardFonts.HelveticaBoldOblique);

  const times = await pdfDoc.embedFont(StandardFonts.TimesRoman);
  const timesBold = await pdfDoc.embedFont(StandardFonts.TimesRomanBold);
  const timesItalic = await pdfDoc.embedFont(StandardFonts.TimesRomanItalic);

  const courier = await pdfDoc.embedFont(StandardFonts.Courier);
  const courierBold = await pdfDoc.embedFont(StandardFonts.CourierBold);

  return {
    helvetica,
    helveticaBold,
    helveticaOblique,
    helveticaBoldOblique,
    times,
    timesBold,
    timesItalic,
    courier,
    courierBold,
  };
}

function selectFont(
  fonts: Awaited<ReturnType<typeof resolveFonts>>,
  family: string,
  weight: string,
  style: string
): PDFFont {
  const isBold = weight === 'bold';
  const isItalic = style === 'italic';

  if (family === 'TimesRoman') {
    if (isBold) return fonts.timesBold;
    if (isItalic) return fonts.timesItalic;
    return fonts.times;
  }

  if (family === 'Courier') {
    if (isBold) return fonts.courierBold;
    return fonts.courier;
  }

  // Default Helvetica
  if (isBold && isItalic) return fonts.helveticaBoldOblique;
  if (isBold) return fonts.helveticaBold;
  if (isItalic) return fonts.helveticaOblique;
  return fonts.helvetica;
}

export interface ExportProgressCallback {
  (currentStep: string, percentage: number): void;
}

/**
 * Main export function: Loads the original PDF file, applies all overlay objects,
 * and produces a new downloadable PDF Blob.
 */
export async function exportEditedPdf(
  originalFile: File,
  objects: EditorObject[],
  onProgress?: ExportProgressCallback
): Promise<{ blob: Blob; filename: string }> {
  onProgress?.('Loading original document…', 15);

  const arrayBuffer = await originalFile.arrayBuffer();
  const pdfDoc = await PDFDocument.load(arrayBuffer, { ignoreEncryption: true });

  onProgress?.('Embedding fonts and graphic assets…', 35);
  const fonts = await resolveFonts(pdfDoc);
  const pages = pdfDoc.getPages();
  const totalPages = pages.length;

  // Group objects by 1-indexed page number
  const objectsByPage = new Map<number, EditorObject[]>();
  for (const obj of objects) {
    const list = objectsByPage.get(obj.page) || [];
    list.push(obj);
    objectsByPage.set(obj.page, list);
  }

  onProgress?.('Applying edits to pages…', 55);

  for (let pageNum = 1; pageNum <= totalPages; pageNum++) {
    const page = pages[pageNum - 1];
    const pageObjects = objectsByPage.get(pageNum);
    if (!pageObjects || pageObjects.length === 0) continue;

    const { height: pageHeight } = page.getSize();

    for (const obj of pageObjects) {
      const opacity = typeof obj.opacity === 'number' ? obj.opacity : 1.0;

      // ─── 1. TEXT OBJECT ──────────────────────────────────────────────────
      if (obj.type === 'text') {
        const textObj = obj as TextObject;
        if (!textObj.content || !textObj.content.trim()) continue;

        const font = selectFont(
          fonts,
          textObj.fontFamily || 'Helvetica',
          textObj.fontWeight,
          textObj.fontStyle
        );
        const fontSize = Math.max(6, textObj.fontSize || 16);
        const fontColor = hexToPdfLibRgb(textObj.color, rgb(0, 0, 0));
        const coords = pageToPdfLibCoords(
          textObj.x,
          textObj.y,
          textObj.width,
          textObj.height,
          pageHeight
        );

        // Optional text background highlight/box
        if (textObj.backgroundColor && textObj.backgroundColor !== 'transparent') {
          page.drawRectangle({
            x: coords.x,
            y: coords.y,
            width: coords.width,
            height: coords.height,
            color: hexToPdfLibRgb(textObj.backgroundColor, rgb(1, 1, 1)),
            opacity: 0.85,
          });
        }

        const lines = textObj.content.split('\n');
        const lineHeight = fontSize * 1.25;

        lines.forEach((lineText, idx) => {
          if (!lineText) return;
          const textWidth = font.widthOfTextAtSize(lineText, fontSize);
          let startX = coords.x;
          if (textObj.textAlign === 'center') {
            startX = coords.x + Math.max(0, (coords.width - textWidth) / 2);
          } else if (textObj.textAlign === 'right') {
            startX = coords.x + Math.max(0, coords.width - textWidth);
          }

          const lineY = coords.y + coords.height - (idx + 1) * lineHeight;

          page.drawText(lineText, {
            x: startX,
            y: lineY,
            size: fontSize,
            font,
            color: fontColor,
            opacity,
          });

          // Text underline
          if (textObj.textDecoration === 'underline') {
            page.drawLine({
              start: { x: startX, y: lineY - 2 },
              end: { x: startX + textWidth, y: lineY - 2 },
              thickness: Math.max(1, fontSize / 14),
              color: fontColor,
              opacity,
            });
          }
        });
      }

      // ─── 2. IMAGE OBJECT ─────────────────────────────────────────────────
      else if (obj.type === 'image') {
        const imgObj = obj as ImageObject;
        if (!imgObj.dataUrl) continue;

        try {
          const pngBytes = await dataUrlToPngBytes(imgObj.dataUrl);
          const embeddedImage = await pdfDoc.embedPng(pngBytes);
          const coords = pageToPdfLibCoords(
            imgObj.x,
            imgObj.y,
            imgObj.width,
            imgObj.height,
            pageHeight
          );

          page.drawImage(embeddedImage, {
            x: coords.x,
            y: coords.y,
            width: coords.width,
            height: coords.height,
            opacity,
          });
        } catch (imgErr) {
          console.warn('Failed to embed image in PDF export:', imgErr);
        }
      }

      // ─── 3. SHAPE OBJECT ─────────────────────────────────────────────────
      else if (obj.type === 'shape') {
        const shapeObj = obj as ShapeObject;
        const coords = pageToPdfLibCoords(
          shapeObj.x,
          shapeObj.y,
          shapeObj.width,
          shapeObj.height,
          pageHeight
        );
        const strokeColor = hexToPdfLibRgb(shapeObj.stroke, rgb(0.02, 0.37, 0.99));
        const hasFill = shapeObj.fill && shapeObj.fill !== 'transparent';
        const fillColor = hasFill ? hexToPdfLibRgb(shapeObj.fill, rgb(1, 1, 1)) : undefined;

        if (shapeObj.shapeType === 'rectangle') {
          page.drawRectangle({
            x: coords.x,
            y: coords.y,
            width: coords.width,
            height: coords.height,
            borderWidth: shapeObj.strokeWidth || 2,
            borderColor: strokeColor,
            color: fillColor,
            opacity,
          });
        } else if (shapeObj.shapeType === 'circle') {
          const rx = coords.width / 2;
          const ry = coords.height / 2;
          page.drawEllipse({
            x: coords.x + rx,
            y: coords.y + ry,
            xScale: rx,
            yScale: ry,
            borderWidth: shapeObj.strokeWidth || 2,
            borderColor: strokeColor,
            color: fillColor,
            opacity,
          });
        } else if (shapeObj.shapeType === 'line' || shapeObj.shapeType === 'arrow') {
          // Line from top-left to bottom-right of bounding box
          const startX = coords.x;
          const startY = coords.y + coords.height;
          const endX = coords.x + coords.width;
          const endY = coords.y;

          page.drawLine({
            start: { x: startX, y: startY },
            end: { x: endX, y: endY },
            thickness: shapeObj.strokeWidth || 2,
            color: strokeColor,
            opacity,
          });

          // Draw arrowhead if arrow shape
          if (shapeObj.shapeType === 'arrow') {
            const angle = Math.atan2(endY - startY, endX - startX);
            const headLength = Math.min(18, Math.max(8, shapeObj.strokeWidth * 4));
            const angleOffset = Math.PI / 6;

            const arrowP1X = endX - headLength * Math.cos(angle - angleOffset);
            const arrowP1Y = endY - headLength * Math.sin(angle - angleOffset);
            const arrowP2X = endX - headLength * Math.cos(angle + angleOffset);
            const arrowP2Y = endY - headLength * Math.sin(angle + angleOffset);

            page.drawLine({
              start: { x: endX, y: endY },
              end: { x: arrowP1X, y: arrowP1Y },
              thickness: shapeObj.strokeWidth || 2,
              color: strokeColor,
              opacity,
            });
            page.drawLine({
              start: { x: endX, y: endY },
              end: { x: arrowP2X, y: arrowP2Y },
              thickness: shapeObj.strokeWidth || 2,
              color: strokeColor,
              opacity,
            });
          }
        }
      }

      // ─── 4. HIGHLIGHT OBJECT ─────────────────────────────────────────────
      else if (obj.type === 'highlight') {
        const hlObj = obj as HighlightObject;
        const coords = pageToPdfLibCoords(
          hlObj.x,
          hlObj.y,
          hlObj.width,
          hlObj.height,
          pageHeight
        );
        const color = hexToPdfLibRgb(hlObj.color, rgb(1, 0.91, 0.08));

        page.drawRectangle({
          x: coords.x,
          y: coords.y,
          width: coords.width,
          height: coords.height,
          color,
          opacity: typeof hlObj.opacity === 'number' ? hlObj.opacity : 0.35,
        });
      }

      // ─── 5. MARKUP (Underline / Strikethrough) ───────────────────────────
      else if (obj.type === 'markup') {
        const mkObj = obj as MarkupObject;
        const coords = pageToPdfLibCoords(
          mkObj.x,
          mkObj.y,
          mkObj.width,
          mkObj.height,
          pageHeight
        );
        const color = hexToPdfLibRgb(mkObj.color, rgb(0.94, 0.27, 0.27));
        const thickness = Math.max(1, mkObj.strokeWidth || 2);

        const targetY =
          mkObj.markupType === 'underline'
            ? coords.y + 2
            : coords.y + coords.height / 2;

        page.drawLine({
          start: { x: coords.x, y: targetY },
          end: { x: coords.x + coords.width, y: targetY },
          thickness,
          color,
          opacity,
        });
      }

      // ─── 6. FREEHAND DRAW OBJECT ─────────────────────────────────────────
      else if (obj.type === 'draw') {
        const drawObj = obj as DrawObject;
        if (!drawObj.points || drawObj.points.length < 2) continue;

        const color = hexToPdfLibRgb(drawObj.color, rgb(0.02, 0.37, 0.99));
        const thickness = Math.max(1, drawObj.strokeWidth || 3);

        for (let i = 0; i < drawObj.points.length - 1; i++) {
          const p1 = drawObj.points[i];
          const p2 = drawObj.points[i + 1];

          // Convert points from top-left space to bottom-left PDF space
          const x1 = p1.x;
          const y1 = pageHeight - p1.y;
          const x2 = p2.x;
          const y2 = pageHeight - p2.y;

          page.drawLine({
            start: { x: x1, y: y1 },
            end: { x: x2, y: y2 },
            thickness,
            color,
            opacity: drawObj.opacity || 1.0,
          });
        }
      }

      // ─── 7. COMMENT / NOTE OBJECT ────────────────────────────────────────
      else if (obj.type === 'comment') {
        const cObj = obj as CommentObject;
        const coords = pageToPdfLibCoords(
          cObj.x,
          cObj.y,
          cObj.width || 24,
          cObj.height || 24,
          pageHeight
        );
        const pinColor = hexToPdfLibRgb(cObj.color, rgb(0.96, 0.62, 0.04));

        // Draw note indicator badge
        page.drawRectangle({
          x: coords.x,
          y: coords.y,
          width: 22,
          height: 22,
          color: pinColor,
          borderColor: rgb(1, 1, 1),
          borderWidth: 1.5,
          opacity: 0.95,
        });

        // Small '💬' marker text
        page.drawText('N', {
          x: coords.x + 6,
          y: coords.y + 5,
          size: 11,
          font: fonts.helveticaBold,
          color: rgb(1, 1, 1),
        });
      }
    }
  }

  onProgress?.('Generating final PDF…', 85);
  pdfDoc.setProducer('ZipStream Edit PDF Studio');
  pdfDoc.setCreator('ZipStream Web Engine');

  const pdfBytes = await pdfDoc.save({ useObjectStreams: true });
  const blob = new Blob([pdfBytes], { type: 'application/pdf' });

  const originalBase = originalFile.name.replace(/\.[^/.]+$/, '');
  const filename = `${originalBase}_edited.pdf`;

  onProgress?.('Complete!', 100);

  return { blob, filename };
}
