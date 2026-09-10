import fs from 'fs/promises';
import path from 'path';
import JSZip from 'jszip';
import { PDFDocument } from 'pdf-lib';

export const MAX_WORD_FILE_BYTES = (Number(process.env.MAX_WORD_FILE_MB) || 100) * 1024 * 1024;

export interface InputValidationResult {
  isValid: boolean;
  sanitizedFileName: string;
  extension: 'docx' | 'doc';
  mimeType: string;
  error?: string;
}

export interface PdfValidationResult {
  isValid: boolean;
  pageCount: number;
  sizeBytes: number;
  error?: string;
}

/**
 * Sanitize an uploaded file name to prevent path traversal and unsafe characters
 */
export function sanitizeFileName(rawName: string): string {
  const base = path.basename(rawName).trim();
  // Remove control chars, path separators, and limit length
  const cleaned = base.replace(/[<>:"/\\|?*\x00-\x1F]/g, '_').slice(0, 200);
  return cleaned || 'document.docx';
}

/**
 * Validate input Word file format, size, extension, and binary structure
 */
export async function validateWordInput(filePath: string, originalName: string): Promise<InputValidationResult> {
  const sanitizedFileName = sanitizeFileName(originalName);
  const ext = path.extname(sanitizedFileName).toLowerCase().replace('.', '');

  if (ext !== 'docx' && ext !== 'doc') {
    return {
      isValid: false,
      sanitizedFileName,
      extension: 'docx',
      mimeType: '',
      error: 'Unsupported file extension. Only Microsoft Word (.docx and .doc) files are supported.',
    };
  }

  let stat;
  try {
    stat = await fs.stat(filePath);
  } catch {
    return {
      isValid: false,
      sanitizedFileName,
      extension: ext as 'docx' | 'doc',
      mimeType: '',
      error: 'Uploaded file could not be read on disk.',
    };
  }

  if (stat.size === 0) {
    return {
      isValid: false,
      sanitizedFileName,
      extension: ext as 'docx' | 'doc',
      mimeType: '',
      error: 'The uploaded file is empty (0 bytes).',
    };
  }

  if (stat.size > MAX_WORD_FILE_BYTES) {
    return {
      isValid: false,
      sanitizedFileName,
      extension: ext as 'docx' | 'doc',
      mimeType: '',
      error: `File exceeds the maximum allowed size of ${(MAX_WORD_FILE_BYTES / 1024 / 1024).toFixed(0)}MB.`,
    };
  }

  // Read header bytes to inspect magic numbers
  const fileHandle = await fs.open(filePath, 'r');
  const headerBuf = Buffer.alloc(16);
  await fileHandle.read(headerBuf, 0, 16, 0);
  await fileHandle.close();

  if (ext === 'docx') {
    // DOCX files are standard OpenXML ZIP archives (PK\x03\x04)
    const isZip = headerBuf[0] === 0x50 && headerBuf[1] === 0x4b && (headerBuf[2] === 0x03 || headerBuf[2] === 0x05);
    if (!isZip) {
      return {
        isValid: false,
        sanitizedFileName,
        extension: 'docx',
        mimeType: '',
        error: 'Invalid or corrupted DOCX file. File signature does not match OpenXML format.',
      };
    }

    // Verify DOCX internal structure contains word/document.xml or [Content_Types].xml
    try {
      const fileBytes = await fs.readFile(filePath);
      const zip = await JSZip.loadAsync(fileBytes);
      const hasContentTypes = Boolean(zip.file('[Content_Types].xml'));
      const hasWordFolder = Object.keys(zip.files).some((f) => f.startsWith('word/'));
      if (!hasContentTypes && !hasWordFolder) {
        return {
          isValid: false,
          sanitizedFileName,
          extension: 'docx',
          mimeType: '',
          error: 'Corrupted DOCX archive. Required Word XML structure is missing.',
        };
      }
    } catch {
      return {
        isValid: false,
        sanitizedFileName,
        extension: 'docx',
        mimeType: '',
        error: 'This Word document appears to be corrupted and could not be read.',
      };
    }

    return {
      isValid: true,
      sanitizedFileName,
      extension: 'docx',
      mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    };
  }

  // ext === 'doc': Legacy Word Document (Compound File Binary Format / OLE2)
  // Magic bytes: 0xD0 0xCF 0x11 0xE0 0xA1 0xB1 0x1A 0xE1
  const isOle =
    headerBuf[0] === 0xd0 &&
    headerBuf[1] === 0xcf &&
    headerBuf[2] === 0x11 &&
    headerBuf[3] === 0xe0 &&
    headerBuf[4] === 0xa1 &&
    headerBuf[5] === 0xb1 &&
    headerBuf[6] === 0x1a &&
    headerBuf[7] === 0xe1;

  if (!isOle) {
    return {
      isValid: false,
      sanitizedFileName,
      extension: 'doc',
      mimeType: '',
      error: 'Invalid or corrupted DOC file. Missing OLE2 binary file signature.',
    };
  }

  return {
    isValid: true,
    sanitizedFileName,
    extension: 'doc',
    mimeType: 'application/msword',
  };
}

/**
 * Validate the generated PDF output file thoroughly:
 * 1. File exists on disk
 * 2. File size > 0
 * 3. Starts with valid %PDF- magic bytes
 * 4. Can be parsed cleanly by pdf-lib
 * 5. Contains at least one page
 */
export async function validatePdfOutput(pdfPath: string): Promise<PdfValidationResult> {
  let stat;
  try {
    stat = await fs.stat(pdfPath);
  } catch {
    return {
      isValid: false,
      pageCount: 0,
      sizeBytes: 0,
      error: 'Output PDF file was not generated by conversion worker.',
    };
  }

  if (stat.size === 0) {
    return {
      isValid: false,
      pageCount: 0,
      sizeBytes: 0,
      error: 'Generated PDF is empty (0 bytes).',
    };
  }

  // Check magic bytes %PDF-
  const handle = await fs.open(pdfPath, 'r');
  const headerBuf = Buffer.alloc(8);
  await handle.read(headerBuf, 0, 8, 0);
  await handle.close();

  if (headerBuf.subarray(0, 5).toString('ascii') !== '%PDF-') {
    return {
      isValid: false,
      pageCount: 0,
      sizeBytes: stat.size,
      error: 'Output file is not a valid PDF document (missing %PDF header).',
    };
  }

  // Parse with pdf-lib to ensure document structure is non-corrupt and read page count
  try {
    const pdfBytes = await fs.readFile(pdfPath);
    const pdfDoc = await PDFDocument.load(pdfBytes, { ignoreEncryption: true });
    const pageCount = pdfDoc.getPageCount();

    if (pageCount <= 0) {
      return {
        isValid: false,
        pageCount: 0,
        sizeBytes: stat.size,
        error: 'Generated PDF contains zero pages.',
      };
    }

    return {
      isValid: true,
      pageCount,
      sizeBytes: stat.size,
    };
  } catch (err: any) {
    return {
      isValid: false,
      pageCount: 0,
      sizeBytes: stat.size,
      error: `PDF validation failed: ${err?.message || 'Malformed PDF document structure.'}`,
    };
  }
}
