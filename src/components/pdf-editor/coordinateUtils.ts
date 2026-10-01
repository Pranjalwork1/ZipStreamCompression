/**
 * ZipStream PDF Editor — Coordinate Conversion & Color Utilities
 * 
 * Translates between Screen (CSS pixels), Editor Page Space (72 DPI points, top-left origin),
 * and native PDF Coordinates (72 DPI points, bottom-left origin for pdf-lib).
 */

import { rgb, RGB } from 'pdf-lib';

export interface ScreenCoord {
  x: number;
  y: number;
}

export interface PageCoord {
  x: number;
  y: number;
}

export interface PdfLibCoords {
  x: number;
  y: number;
  width: number;
  height: number;
}

/**
 * Converts screen/pointer event coordinates (relative to the page element)
 * to internal page points (72 DPI).
 */
export function screenToPageCoords(
  screenX: number,
  screenY: number,
  scale: number
): PageCoord {
  const safeScale = scale > 0 ? scale : 1;
  return {
    x: Math.round((screenX / safeScale) * 100) / 100,
    y: Math.round((screenY / safeScale) * 100) / 100,
  };
}

/**
 * Converts internal page points to screen pixels for display.
 */
export function pageToScreenCoords(
  pageX: number,
  pageY: number,
  scale: number
): ScreenCoord {
  return {
    x: Math.round(pageX * scale * 100) / 100,
    y: Math.round(pageY * scale * 100) / 100,
  };
}

/**
 * Converts top-left editor coordinates into pdf-lib's bottom-left origin coordinate space.
 */
export function pageToPdfLibCoords(
  x: number,
  y: number,
  width: number,
  height: number,
  pageHeight: number
): PdfLibCoords {
  return {
    x: Math.max(0, x),
    // In PDF coordinates, (0, 0) is bottom-left, so top-left y needs to be subtracted from page height
    y: Math.max(0, pageHeight - (y + height)),
    width: Math.max(1, width),
    height: Math.max(1, height),
  };
}

/**
 * Converts a Hex color string (#RRGGBB or #RGB) into pdf-lib RGB object (0.0 - 1.0)
 */
export function hexToPdfLibRgb(hexColor: string, defaultColor: RGB = rgb(0, 0, 0)): RGB {
  if (!hexColor || hexColor === 'transparent') {
    return defaultColor;
  }

  let clean = hexColor.replace('#', '').trim();
  if (clean.length === 3) {
    clean = clean.split('').map((c) => c + c).join('');
  }

  if (clean.length !== 6) {
    return defaultColor;
  }

  const r = parseInt(clean.substring(0, 2), 16) / 255;
  const g = parseInt(clean.substring(2, 4), 16) / 255;
  const b = parseInt(clean.substring(4, 6), 16) / 255;

  if (isNaN(r) || isNaN(g) || isNaN(b)) {
    return defaultColor;
  }

  return rgb(
    Math.max(0, Math.min(1, r)),
    Math.max(0, Math.min(1, g)),
    Math.max(0, Math.min(1, b))
  );
}

/**
 * Clamps a number between min and max bounds.
 */
export function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}
