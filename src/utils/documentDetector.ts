/**
 * Document Edge & Border Detection Engine
 * High-performance, client-side computer vision algorithm to automatically
 * identify and frame paper documents, receipts, bills, notes, and forms.
 */

export interface Point2D {
  x: number; // percentage [0, 100]
  y: number; // percentage [0, 100]
}

export interface Quad {
  tl: Point2D;
  tr: Point2D;
  br: Point2D;
  bl: Point2D;
}

export interface DetectedCropBox {
  x: number; // percentage from left [0, 100]
  y: number; // percentage from top [0, 100]
  w: number; // width percentage [0, 100]
  h: number; // height percentage [0, 100]
}

export interface DetectionResult {
  found: boolean;
  box: DetectedCropBox;
  quad: Quad;
  confidence: number; // 0 to 1
  luminance: number; // 0 to 255
  areaRatio: number; // 0 to 1
}

// Processing canvas dimensions (lightweight for sub-10ms real-time execution)
const WORK_WIDTH = 320;

/**
 * Detects the bounding box of a visible document page in a video frame, image, or canvas.
 */
export function detectDocumentBounds(
  source: HTMLVideoElement | HTMLImageElement | HTMLCanvasElement | ImageBitmap,
  options?: {
    minAreaRatio?: number; // Minimum document area relative to frame (default 0.08)
    maxAreaRatio?: number; // Maximum document area relative to frame (default 0.96)
    paddingPercent?: number; // Safe margin around detected boundary (default 1.5)
  }
): DetectionResult {
  const minAreaRatio = options?.minAreaRatio ?? 0.08;
  const maxAreaRatio = options?.maxAreaRatio ?? 0.96;
  const paddingPercent = options?.paddingPercent ?? 1.5;

  const defaultBox: DetectedCropBox = { x: 10, y: 8, w: 80, h: 84 };
  const defaultQuad: Quad = {
    tl: { x: defaultBox.x, y: defaultBox.y },
    tr: { x: defaultBox.x + defaultBox.w, y: defaultBox.y },
    br: { x: defaultBox.x + defaultBox.w, y: defaultBox.y + defaultBox.h },
    bl: { x: defaultBox.x, y: defaultBox.y + defaultBox.h },
  };

  try {
    let srcW = 0;
    let srcH = 0;

    if (source instanceof HTMLVideoElement) {
      srcW = source.videoWidth;
      srcH = source.videoHeight;
    } else if (source instanceof HTMLImageElement) {
      srcW = source.naturalWidth || source.width;
      srcH = source.naturalHeight || source.height;
    } else if (source instanceof HTMLCanvasElement || (typeof ImageBitmap !== 'undefined' && source instanceof ImageBitmap)) {
      srcW = source.width;
      srcH = source.height;
    }

    if (!srcW || !srcH) {
      return { found: false, box: defaultBox, quad: defaultQuad, confidence: 0, luminance: 128, areaRatio: 0 };
    }

    // Downscale to WORK_WIDTH preserving aspect ratio
    const workW = WORK_WIDTH;
    const workH = Math.max(80, Math.round((srcH / srcW) * workW));

    // Offscreen canvas for fast pixel processing
    const canvas = document.createElement('canvas');
    canvas.width = workW;
    canvas.height = workH;
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    if (!ctx) {
      return { found: false, box: defaultBox, quad: defaultQuad, confidence: 0, luminance: 128, areaRatio: 0 };
    }

    ctx.drawImage(source as CanvasImageSource, 0, 0, workW, workH);
    const imgData = ctx.getImageData(0, 0, workW, workH);
    const data = imgData.data;

    // 1. Estimate background color & luminance from perimeter margins (outer 5%)
    let bgLumSum = 0;
    let bgSamples = 0;
    const marginX = Math.max(3, Math.floor(workW * 0.05));
    const marginY = Math.max(3, Math.floor(workH * 0.05));

    for (let x = 0; x < workW; x += 4) {
      // Top row & bottom row
      for (let y = 0; y < marginY; y += 2) {
        const idxTop = (y * workW + x) * 4;
        const idxBot = ((workH - 1 - y) * workW + x) * 4;
        bgLumSum += 0.299 * data[idxTop] + 0.587 * data[idxTop + 1] + 0.114 * data[idxTop + 2];
        bgLumSum += 0.299 * data[idxBot] + 0.587 * data[idxBot + 1] + 0.114 * data[idxBot + 2];
        bgSamples += 2;
      }
    }

    for (let y = marginY; y < workH - marginY; y += 4) {
      // Left margin & right margin
      for (let x = 0; x < marginX; x += 2) {
        const idxLeft = (y * workW + x) * 4;
        const idxRight = (y * workW + (workW - 1 - x)) * 4;
        bgLumSum += 0.299 * data[idxLeft] + 0.587 * data[idxLeft + 1] + 0.114 * data[idxLeft + 2];
        bgLumSum += 0.299 * data[idxRight] + 0.587 * data[idxRight + 1] + 0.114 * data[idxRight + 2];
        bgSamples += 2;
      }
    }

    const bgAvgLum = bgSamples > 0 ? bgLumSum / bgSamples : 128;

    // 2. Grayscale & Sobel Edge Gradient + Contrast Difference Map
    const gray = new Uint8Array(workW * workH);
    for (let i = 0; i < workW * workH; i++) {
      const p = i * 4;
      gray[i] = Math.round(0.299 * data[p] + 0.587 * data[p + 1] + 0.114 * data[p + 2]);
    }

    // Identify candidate document pixels:
    const isDocPixel = new Uint8Array(workW * workH);
    const lumDiffThreshold = Math.max(22, Math.abs(bgAvgLum - 128) > 30 ? 25 : 20);

    for (let y = 1; y < workH - 1; y++) {
      const rowOffset = y * workW;
      for (let x = 1; x < workW - 1; x++) {
        const idx = rowOffset + x;
        const lum = gray[idx];

        // Contrast differential against perimeter background
        const diff = Math.abs(lum - bgAvgLum);

        // Simple gradient magnitude
        const gx = Math.abs(gray[idx + 1] - gray[idx - 1]);
        const gy = Math.abs(gray[idx + workW] - gray[idx - workW]);
        const grad = gx + gy;

        // Candidate document interior or edge
        if (diff > lumDiffThreshold || grad > 45) {
          isDocPixel[idx] = 1;
        }
      }
    }

    // 3. Compute row-wise and column-wise projection densities to find document boundaries
    const rowCounts = new Int32Array(workH);
    const colCounts = new Int32Array(workW);

    for (let y = 0; y < workH; y++) {
      const rowOffset = y * workW;
      for (let x = 0; x < workW; x++) {
        if (isDocPixel[rowOffset + x] === 1) {
          rowCounts[y]++;
          colCounts[x]++;
        }
      }
    }

    // Find boundaries using adaptive threshold based on average density
    let maxColCount = 0;
    for (let x = 0; x < workW; x++) {
      if (colCounts[x] > maxColCount) maxColCount = colCounts[x];
    }
    let maxRowCount = 0;
    for (let y = 0; y < workH; y++) {
      if (rowCounts[y] > maxRowCount) maxRowCount = rowCounts[y];
    }

    const colThreshold = Math.max(workH * 0.12, maxColCount * 0.22);
    const rowThreshold = Math.max(workW * 0.12, maxRowCount * 0.22);

    let minX = 0;
    let maxX = workW - 1;
    let minY = 0;
    let maxY = workH - 1;

    // Scan inward from left
    for (let x = marginX; x < workW - marginX; x++) {
      if (colCounts[x] >= colThreshold) {
        minX = x;
        break;
      }
    }

    // Scan inward from right
    for (let x = workW - 1 - marginX; x >= marginX; x--) {
      if (colCounts[x] >= colThreshold) {
        maxX = x;
        break;
      }
    }

    // Scan inward from top
    for (let y = marginY; y < workH - marginY; y++) {
      if (rowCounts[y] >= rowThreshold) {
        minY = y;
        break;
      }
    }

    // Scan inward from bottom
    for (let y = workH - 1 - marginY; y >= marginY; y--) {
      if (rowCounts[y] >= rowThreshold) {
        maxY = y;
        break;
      }
    }

    const docW = maxX - minX;
    const docH = maxY - minY;

    const areaRatio = (docW * docH) / (workW * workH);
    const aspect = docW / docH;

    // Validation: Is this a legitimate document candidate?
    const isValidAspect = aspect >= 0.22 && aspect <= 4.2;
    const isValidArea = areaRatio >= minAreaRatio && areaRatio <= maxAreaRatio;
    const isInsideFrame = minX >= marginX * 0.5 && maxX <= workW - marginX * 0.5 && minY >= marginY * 0.5 && maxY <= workH - marginY * 0.5;

    if (isValidAspect && isValidArea && isInsideFrame) {
      // Convert to percentages [0, 100] with safe margin padding
      let leftPct = (minX / workW) * 100 - paddingPercent;
      let topPct = (minY / workH) * 100 - paddingPercent;
      let widthPct = (docW / workW) * 100 + paddingPercent * 2;
      let heightPct = (docH / workH) * 100 + paddingPercent * 2;

      // Clamp bounds to [0, 100]
      leftPct = Math.max(1, Math.min(85, leftPct));
      topPct = Math.max(1, Math.min(85, topPct));
      widthPct = Math.min(100 - leftPct, Math.max(15, widthPct));
      heightPct = Math.min(100 - topPct, Math.max(15, heightPct));

      const confidence = Math.min(1, Math.max(0.65, areaRatio * 1.3));

      const box: DetectedCropBox = {
        x: Math.round(leftPct * 10) / 10,
        y: Math.round(topPct * 10) / 10,
        w: Math.round(widthPct * 10) / 10,
        h: Math.round(heightPct * 10) / 10,
      };

      const quad: Quad = {
        tl: { x: box.x, y: box.y },
        tr: { x: Math.min(100, Math.round((box.x + box.w) * 10) / 10), y: box.y },
        br: { x: Math.min(100, Math.round((box.x + box.w) * 10) / 10), y: Math.min(100, Math.round((box.y + box.h) * 10) / 10) },
        bl: { x: box.x, y: Math.min(100, Math.round((box.y + box.h) * 10) / 10) },
      };

      return {
        found: true,
        box,
        quad,
        confidence,
        luminance: Math.round(bgAvgLum),
        areaRatio,
      };
    }

    return {
      found: false,
      box: defaultBox,
      quad: defaultQuad,
      confidence: 0,
      luminance: Math.round(bgAvgLum),
      areaRatio: 0,
    };
  } catch (err) {
    console.warn('Document edge detection error:', err);
    return {
      found: false,
      box: defaultBox,
      quad: defaultQuad,
      confidence: 0,
      luminance: 128,
      areaRatio: 0,
    };
  }
}

/**
 * Loads a data URL into an image and detects the document boundary.
 */
export async function detectDocumentInImage(
  dataUrl: string
): Promise<DetectionResult> {
  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      const result = detectDocumentBounds(img, {
        minAreaRatio: 0.1,
        maxAreaRatio: 0.95,
        paddingPercent: 1.2,
      });
      resolve(result);
    };
    img.onerror = () => {
      const fallbackBox: DetectedCropBox = { x: 5, y: 5, w: 90, h: 90 };
      resolve({
        found: false,
        box: fallbackBox,
        quad: {
          tl: { x: 5, y: 5 },
          tr: { x: 95, y: 5 },
          br: { x: 95, y: 95 },
          bl: { x: 5, y: 95 },
        },
        confidence: 0,
        luminance: 128,
        areaRatio: 0,
      });
    };
    img.src = dataUrl;
  });
}

/**
 * Automatically crops an image data URL to the detected or specified document bounds.
 * If no box is provided, it detects document bounds automatically.
 */
export async function autoCropDocumentImage(
  dataUrl: string,
  explicitBox?: DetectedCropBox
): Promise<{ croppedDataUrl: string; wasCropped: boolean; box: DetectedCropBox }> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      let boxToUse = explicitBox;
      let detectedFound = false;

      if (!boxToUse) {
        const detection = detectDocumentBounds(img);
        if (detection.found && detection.confidence >= 0.6) {
          boxToUse = detection.box;
          detectedFound = true;
        } else {
          return resolve({
            croppedDataUrl: dataUrl,
            wasCropped: false,
            box: { x: 0, y: 0, w: 100, h: 100 },
          });
        }
      } else {
        detectedFound = true;
      }

      const srcW = img.naturalWidth || img.width;
      const srcH = img.naturalHeight || img.height;

      const sx = Math.max(0, Math.round((boxToUse.x / 100) * srcW));
      const sy = Math.max(0, Math.round((boxToUse.y / 100) * srcH));
      const sw = Math.min(srcW - sx, Math.max(20, Math.round((boxToUse.w / 100) * srcW)));
      const sh = Math.min(srcH - sy, Math.max(20, Math.round((boxToUse.h / 100) * srcH)));

      if (sw >= srcW * 0.97 && sh >= srcH * 0.97 && sx <= srcW * 0.02 && sy <= srcH * 0.02) {
        return resolve({
          croppedDataUrl: dataUrl,
          wasCropped: false,
          box: { x: 0, y: 0, w: 100, h: 100 },
        });
      }

      const canvas = document.createElement('canvas');
      canvas.width = sw;
      canvas.height = sh;
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        return resolve({
          croppedDataUrl: dataUrl,
          wasCropped: false,
          box: boxToUse,
        });
      }

      ctx.drawImage(img, sx, sy, sw, sh, 0, 0, sw, sh);
      const croppedDataUrl = canvas.toDataURL('image/jpeg', 0.95);

      resolve({
        croppedDataUrl,
        wasCropped: detectedFound,
        box: boxToUse,
      });
    };
    img.onerror = () => reject(new Error('Failed to load image for cropping'));
    img.src = dataUrl;
  });
}

/**
 * Warps a four-point quadrilateral into a rectified flat rectangle using client-side mesh warping.
 * Provides high-speed GPU-accelerated perspective correction.
 */
export async function warpPerspectiveImage(
  dataUrl: string,
  quad: Quad
): Promise<{ croppedDataUrl: string; width: number; height: number }> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      const srcW = img.naturalWidth || img.width;
      const srcH = img.naturalHeight || img.height;

      // Convert normalized percentages to pixel coordinates
      const p0 = { x: (quad.tl.x / 100) * srcW, y: (quad.tl.y / 100) * srcH };
      const p1 = { x: (quad.tr.x / 100) * srcW, y: (quad.tr.y / 100) * srcH };
      const p2 = { x: (quad.br.x / 100) * srcW, y: (quad.br.y / 100) * srcH };
      const p3 = { x: (quad.bl.x / 100) * srcW, y: (quad.bl.y / 100) * srcH };

      // Destination rectangle dimensions estimated from quad edge lengths
      const topW = Math.hypot(p1.x - p0.x, p1.y - p0.y);
      const botW = Math.hypot(p2.x - p3.x, p2.y - p3.y);
      const leftH = Math.hypot(p3.x - p0.x, p3.y - p0.y);
      const rightH = Math.hypot(p2.x - p1.x, p2.y - p1.y);

      const targetW = Math.max(40, Math.round(Math.max(topW, botW)));
      const targetH = Math.max(40, Math.round(Math.max(leftH, rightH)));

      const canvas = document.createElement('canvas');
      canvas.width = targetW;
      canvas.height = targetH;
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        return resolve({ croppedDataUrl: dataUrl, width: srcW, height: srcH });
      }

      // If quad is virtually an axis-aligned box (within 2.5% deviation), perform fast direct crop
      const isRect =
        Math.abs(p0.y - p1.y) < srcH * 0.025 &&
        Math.abs(p3.y - p2.y) < srcH * 0.025 &&
        Math.abs(p0.x - p3.x) < srcW * 0.025 &&
        Math.abs(p1.x - p2.x) < srcW * 0.025;

      if (isRect) {
        const sx = Math.max(0, Math.min(srcW - 20, Math.min(p0.x, p3.x)));
        const sy = Math.max(0, Math.min(srcH - 20, Math.min(p0.y, p1.y)));
        const sw = Math.min(srcW - sx, targetW);
        const sh = Math.min(srcH - sy, targetH);
        ctx.drawImage(img, sx, sy, sw, sh, 0, 0, targetW, targetH);
        return resolve({
          croppedDataUrl: canvas.toDataURL('image/jpeg', 0.95),
          width: targetW,
          height: targetH,
        });
      }

      // Perspective mesh warp (10x10 grid of bilinear texture-mapped triangles)
      const GRID = 10;
      for (let gy = 0; gy < GRID; gy++) {
        for (let gx = 0; gx < GRID; gx++) {
          const u0 = gx / GRID;
          const u1 = (gx + 1) / GRID;
          const v0 = gy / GRID;
          const v1 = (gy + 1) / GRID;

          const s00 = {
            x: (1 - u0) * (1 - v0) * p0.x + u0 * (1 - v0) * p1.x + u0 * v0 * p2.x + (1 - u0) * v0 * p3.x,
            y: (1 - u0) * (1 - v0) * p0.y + u0 * (1 - v0) * p1.y + u0 * v0 * p2.y + (1 - u0) * v0 * p3.y,
          };
          const s10 = {
            x: (1 - u1) * (1 - v0) * p0.x + u1 * (1 - v0) * p1.x + u1 * v0 * p2.x + (1 - u1) * v0 * p3.x,
            y: (1 - u1) * (1 - v0) * p0.y + u1 * (1 - v0) * p1.y + u1 * v0 * p2.y + (1 - u1) * v0 * p3.y,
          };
          const s01 = {
            x: (1 - u0) * (1 - v1) * p0.x + u0 * (1 - v1) * p1.x + u0 * v1 * p2.x + (1 - u0) * v1 * p3.x,
            y: (1 - u0) * (1 - v1) * p0.y + u0 * (1 - v1) * p1.y + u0 * v1 * p2.y + (1 - u0) * v1 * p3.y,
          };
          const s11 = {
            x: (1 - u1) * (1 - v1) * p0.x + u1 * (1 - v1) * p1.x + u1 * v1 * p2.x + (1 - u1) * v1 * p3.x,
            y: (1 - u1) * (1 - v1) * p0.y + u1 * (1 - v1) * p1.y + u1 * v1 * p2.y + (1 - u1) * v1 * p3.y,
          };

          const d00 = { x: u0 * targetW, y: v0 * targetH };
          const d10 = { x: u1 * targetW, y: v0 * targetH };
          const d01 = { x: u0 * targetW, y: v0 * targetH };
          const d11 = { x: u1 * targetW, y: v1 * targetH };

          // Upper triangle
          drawAffineTriangle(ctx, img, s00, s10, s01, d00, d10, d01);
          // Lower triangle
          drawAffineTriangle(ctx, img, s10, s11, s01, d10, d11, d01);
        }
      }

      resolve({
        croppedDataUrl: canvas.toDataURL('image/jpeg', 0.95),
        width: targetW,
        height: targetH,
      });
    };
    img.onerror = () => reject(new Error('Failed to load image for perspective warping'));
    img.src = dataUrl;
  });
}

function drawAffineTriangle(
  ctx: CanvasRenderingContext2D,
  img: HTMLImageElement,
  s0: Point2D,
  s1: Point2D,
  s2: Point2D,
  d0: Point2D,
  d1: Point2D,
  d2: Point2D
) {
  ctx.save();
  ctx.beginPath();
  ctx.moveTo(d0.x, d0.y);
  ctx.lineTo(d1.x, d1.y);
  ctx.lineTo(d2.x, d2.y);
  ctx.closePath();
  ctx.clip();

  const den = (s0.x - s2.x) * (s1.y - s2.y) - (s1.x - s2.x) * (s0.y - s2.y);
  if (Math.abs(den) < 1e-6) {
    ctx.restore();
    return;
  }

  const a = ((d0.x - d2.x) * (s1.y - s2.y) - (d1.x - d2.x) * (s0.y - s2.y)) / den;
  const b = ((d0.y - d2.y) * (s1.y - s2.y) - (d1.y - d2.y) * (s0.y - s2.y)) / den;
  const c = ((s0.x - s2.x) * (d1.x - d2.x) - (s1.x - s2.x) * (d0.x - d2.x)) / den;
  const d = ((s0.x - s2.x) * (d1.y - d2.y) - (s1.x - s2.x) * (d0.y - d2.y)) / den;
  const e = d0.x - a * s0.x - c * s0.y;
  const f = d0.y - b * s0.x - d * s0.y;

  ctx.transform(a, b, c, d, e, f);
  ctx.drawImage(img, 0, 0);
  ctx.restore();
}
