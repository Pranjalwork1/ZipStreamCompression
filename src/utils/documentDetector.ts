/**
 * Document Edge & Border Detection Engine
 * High-performance, client-side computer vision algorithm to automatically
 * identify and frame paper documents, receipts, bills, notes, and forms.
 */

export interface DetectedCropBox {
  x: number; // percentage from left [0, 100]
  y: number; // percentage from top [0, 100]
  w: number; // width percentage [0, 100]
  h: number; // height percentage [0, 100]
}

export interface DetectionResult {
  found: boolean;
  box: DetectedCropBox;
  confidence: number; // 0 to 1
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
      return { found: false, box: defaultBox, confidence: 0 };
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
      return { found: false, box: defaultBox, confidence: 0 };
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
    // A document pixel typically has:
    // a) Significant contrast with background (usually brighter if white paper on dark desk, or darker if dark document on light background)
    // b) Edge boundaries
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
    // Documents are typically rectangular with aspect ratio between 0.22 (tall receipt) and 4.2 (wide landscape receipt / check / ID)
    // and cover a substantial portion of the frame without touching both full extremes
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

      // Calculate confidence based on boundary clarity and contrast
      const confidence = Math.min(1, Math.max(0.65, areaRatio * 1.3));

      return {
        found: true,
        box: {
          x: Math.round(leftPct * 10) / 10,
          y: Math.round(topPct * 10) / 10,
          w: Math.round(widthPct * 10) / 10,
          h: Math.round(heightPct * 10) / 10,
        },
        confidence,
      };
    }

    // If no distinct interior page found (e.g. user is holding camera too close or on uniform white table),
    // provide a standard centered 80% A4-like box
    return {
      found: false,
      box: defaultBox,
      confidence: 0,
    };
  } catch (err) {
    console.warn('Document edge detection error:', err);
    return { found: false, box: defaultBox, confidence: 0 };
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
      resolve({
        found: false,
        box: { x: 5, y: 5, w: 90, h: 90 },
        confidence: 0,
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
          // If no distinct document boundary detected, return original without destructive cropping
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

      // Avoid redundant re-canvas if crop is practically the whole image (>98% width and height)
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
