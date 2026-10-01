/**
 * Server-Side Dynamic SEO Metadata & Canonical Tag Injector
 *
 * Injects per-route <title>, <meta description>, canonical URL, and OpenGraph
 * tags into index.html before serving to search engine crawlers and users.
 */

export interface PageSeoMetadata {
  title: string;
  description: string;
  h1?: string;
}

export const SEO_TOOL_METADATA: Record<string, PageSeoMetadata> = {
  '/': {
    title: 'Compress PDF Online Free — Fast & Private | ZipStream',
    description: 'ZipStream is a free, privacy-first online tool to compress, merge, split, and convert PDFs and documents. Client-side browser processing with isolated server conversion.',
  },
  '/compress-pdf': {
    title: 'Compress PDF Online Free — Reduce PDF Size | ZipStream',
    description: 'Reduce PDF file size online while preserving visual quality. Fast, privacy-first PDF compression with customizable quality presets.',
    h1: 'Compress PDF Online',
  },
  '/merge-pdf': {
    title: 'Merge PDF Files Online Free — Combine PDFs | ZipStream',
    description: 'Combine multiple PDF files into a single organized document in your browser. Reorder pages and merge with zero file uploads.',
    h1: 'Merge PDF Files Online',
  },
  '/split-pdf': {
    title: 'Split PDF Online Free — Extract Pages | ZipStream',
    description: 'Split PDF documents and extract custom page ranges online. Download individual pages or a combined ZIP archive with complete privacy.',
    h1: 'Split PDF Online',
  },
  '/images-to-pdf': {
    title: 'Images to PDF Converter Free — JPG, PNG to PDF | ZipStream',
    description: 'Convert JPG, PNG, and WebP images into a multi-page PDF document online. Customize page orientation, margin, and order.',
    h1: 'Convert Images to PDF',
  },
  '/jpg-to-pdf': {
    title: 'JPG to PDF Converter Free Online — Fast & High Quality | ZipStream',
    description: 'Convert JPG photos and graphics into clean PDF documents directly in your browser. No registration required.',
    h1: 'Convert JPG to PDF Online',
  },
  '/scan-document': {
    title: 'Scan Documents Online Free — Camera to PDF Scanner | ZipStream',
    description: 'Use your phone or webcam to scan paper documents with real-time automatic border detection, contrast enhancement, and PDF export.',
    h1: 'Scan Documents Online',
  },
  '/watermark-pdf': {
    title: 'Watermark PDF Online Free — Add Stamp or Text | ZipStream',
    description: 'Add confidential, draft, copyright, or custom text watermarks to your PDF documents. Customize opacity, position, and angle.',
    h1: 'Watermark PDF Online',
  },
  '/pdf-to-word': {
    title: 'PDF to Word Converter Free Online — DOCX Export | ZipStream',
    description: 'Convert PDF documents into editable Microsoft Word (.docx) files online. Retain layout, text layers, and typography.',
    h1: 'Convert PDF to Word Online',
  },
  '/word-to-pdf': {
    title: 'Word to PDF Converter Free Online — High Fidelity | ZipStream',
    description: 'Convert Word DOCX and DOC files to PDF with full layout fidelity, vector typography, and table styling in an isolated sandbox.',
    h1: 'Convert Word to PDF Online',
  },
  '/pdf-to-excel': {
    title: 'PDF to Excel Converter Free Online — Extract Tables | ZipStream',
    description: 'Extract tables and spreadsheet data from PDF files into Microsoft Excel (.xlsx) format directly in your browser.',
    h1: 'Convert PDF to Excel Online',
  },
  '/excel-to-pdf': {
    title: 'Excel to PDF Converter Free Online — XLSX to PDF | ZipStream',
    description: 'Convert Excel spreadsheets and worksheets to clean, printable PDF documents with custom formatting.',
    h1: 'Convert Excel to PDF Online',
  },
  '/pdf-to-powerpoint': {
    title: 'PDF to PowerPoint Converter Free — PDF to PPTX | ZipStream',
    description: 'Convert PDF document pages into editable Microsoft PowerPoint presentation slides (.pptx) online.',
    h1: 'Convert PDF to PowerPoint Online',
  },
  '/powerpoint-to-pdf': {
    title: 'PowerPoint to PDF Converter Free — PPTX to PDF | ZipStream',
    description: 'Convert PowerPoint presentations to PDF documents free. Export all presentation slides cleanly.',
    h1: 'Convert PowerPoint to PDF Online',
  },
  '/pdf-to-jpg': {
    title: 'PDF to JPG Converter Free Online — Extract Images | ZipStream',
    description: 'Convert PDF pages into high-resolution JPG or PNG images online. Fast, browser-based rendering without uploading files.',
    h1: 'Convert PDF to JPG Online',
  },
  '/extract-text': {
    title: 'Extract Text from PDF Free — PDF to Text & Markdown | ZipStream',
    description: 'Extract selectable text layers, paragraphs, and markdown formatting from PDF documents directly in your browser.',
    h1: 'Extract Text from PDF Online',
  },
  '/pdf-to-html': {
    title: 'PDF to HTML Converter Free — Web Document Export | ZipStream',
    description: 'Convert PDF content into responsive HTML web code for easy embedding and publishing online.',
    h1: 'Convert PDF to HTML Online',
  },
  '/pdf-to-audio': {
    title: 'PDF to Audio Reader Free — Text to Speech Online | ZipStream',
    description: 'Listen to PDF documents read aloud using natural browser text-to-speech voices with adjustable speed.',
    h1: 'PDF to Audio Reader Online',
  },
  '/pdf-to-epub': {
    title: 'PDF to EPUB Converter Free — E-Book Creator | ZipStream',
    description: 'Convert PDF documents into reflowable EPUB e-books optimized for e-readers, phones, and tablets.',
    h1: 'Convert PDF to EPUB Online',
  },
  '/html-to-pdf': {
    title: 'HTML to PDF Converter Free — Webpage to PDF | ZipStream',
    description: 'Convert HTML files or raw HTML code into print-ready PDF files directly in your browser.',
    h1: 'Convert HTML to PDF Online',
  },
  '/protect-pdf': {
    title: 'Protect PDF with Password Free — Encrypt PDF Online | ZipStream',
    description: 'Add standard AES password encryption to PDF documents. Restrict unauthorized opening, copying, or printing.',
    h1: 'Protect PDF with Password Online',
  },
  '/unlock-pdf': {
    title: 'Unlock PDF Online Free — Remove Password Security | ZipStream',
    description: 'Remove password protection from authorized PDF documents to enable editing and printing.',
    h1: 'Unlock PDF Online',
  },
  '/redact-pdf': {
    title: 'Redact PDF Online Free — Blackout Sensitive PII | ZipStream',
    description: 'Detect and blackout confidential data, social security numbers, emails, and names before sharing PDF files.',
    h1: 'Redact Sensitive Information in PDF',
  },
  '/privacy-scanner': {
    title: 'Scan PDF Privacy Metadata Free — Remove Hidden Data | ZipStream',
    description: 'Audit and strip hidden metadata, author information, GPS location tags, and software history from PDF files.',
    h1: 'Scan & Clean PDF Privacy Metadata',
  },
  '/file-fingerprint': {
    title: 'File Fingerprint Generator — SHA-256 / SHA-512 Hash | ZipStream',
    description: 'Generate cryptographic SHA-256 and SHA-512 checksum fingerprints to verify document integrity and authenticity.',
    h1: 'Generate Cryptographic File Fingerprint',
  },
  '/chat-pdf': {
    title: 'Chat with PDF Online — AI Document Assistant | ZipStream',
    description: 'Ask questions, extract facts, and analyze PDF documents using on-device and sandboxed AI document intelligence.',
    h1: 'Chat with PDF Online',
  },
  '/summarize-pdf': {
    title: 'Summarize PDF Online Free — AI Executive Summary | ZipStream',
    description: 'Generate concise executive summaries, key takeaways, and action items from long PDF documents using AI.',
    h1: 'Summarize PDF Online',
  },
  '/ocr-pdf': {
    title: 'OCR PDF Online — Make Scanned PDFs Searchable | ZipStream',
    description: 'Convert scanned paper documents and image-only PDFs into searchable, selectable text with multi-language OCR and automated file deletion.',
    h1: 'OCR PDF — Make PDF Searchable',
  },
  '/compare-pdf': {
    title: 'Compare PDF Documents Free — Side-by-Side Visual Diff | ZipStream',
    description: 'Compare two PDF files side by side and highlight visual differences, edits, and modifications.',
    h1: 'Compare PDF Documents Online',
  },
  '/repair-pdf': {
    title: 'Repair PDF Online Free — Fix Corrupted PDF Files | ZipStream',
    description: 'Recover and repair damaged, corrupted, or unreadable PDF document cross-reference tables in your browser.',
    h1: 'Repair Corrupted PDF Online',
  },
  '/p2p-share': {
    title: 'P2P File Share Online — Direct, Encrypted & Zero Cloud | ZipStream',
    description: 'Transfer large files directly peer-to-peer using encrypted WebRTC data channels with instant QR pairing.',
    h1: 'P2P Encrypted File Sharing',
  },
  '/collaborative-whiteboard': {
    title: 'Collaborative Whiteboard Online Free — Real-Time Canvas | ZipStream',
    description: 'Draw, sketch, and collaborate in real time on an infinite canvas with zero account signup required.',
    h1: 'Collaborative Online Whiteboard',
  },
  '/about': {
    title: 'About ZipStream — Mission, Privacy Architecture & Features | ZipStream',
    description: 'Discover ZipStream\'s privacy-first architecture, local browser execution models, open-source stack, and complete suite of 35+ file tools.',
    h1: 'About ZipStream',
  },
};

/**
 * Injects route-specific SEO tags into HTML before serving
 */
export function injectSeoMetadata(html: string, reqPath: string, publicBaseUrl = 'https://zipstream.online'): string {
  const normalizedPath = (reqPath.split('?')[0].replace(/\/+$/, '') || '/') as string;
  const meta = SEO_TOOL_METADATA[normalizedPath];

  if (!meta) {
    return html; // Return original HTML if route is not mapped
  }

  const canonicalUrl = `${publicBaseUrl}${normalizedPath === '/' ? '/' : normalizedPath}`;

  let modified = html;

  // Replace <title>
  modified = modified.replace(/<title>.*?<\/title>/i, `<title>${meta.title}</title>`);

  // Replace <meta name="title" ...>
  modified = modified.replace(/<meta\s+name="title"\s+content=".*?"\s*\/?>/i, `<meta name="title" content="${meta.title}" />`);

  // Replace <meta name="description" ...>
  modified = modified.replace(/<meta\s+name="description"\s+content=".*?"\s*\/?>/i, `<meta name="description" content="${meta.description}" />`);

  // Replace <link rel="canonical" ...>
  modified = modified.replace(/<link\s+rel="canonical"\s+href=".*?"\s*\/?>/i, `<link rel="canonical" href="${canonicalUrl}" />`);

  // Replace OpenGraph title, description, and url
  modified = modified.replace(/<meta\s+property="og:title"\s+content=".*?"\s*\/?>/i, `<meta property="og:title" content="${meta.title}" />`);
  modified = modified.replace(/<meta\s+property="og:description"\s+content=".*?"\s*\/?>/i, `<meta property="og:description" content="${meta.description}" />`);
  modified = modified.replace(/<meta\s+property="og:url"\s+content=".*?"\s*\/?>/i, `<meta property="og:url" content="${canonicalUrl}" />`);

  // Replace Twitter title and description
  modified = modified.replace(/<meta\s+name="twitter:title"\s+content=".*?"\s*\/?>/i, `<meta name="twitter:title" content="${meta.title}" />`);
  modified = modified.replace(/<meta\s+name="twitter:description"\s+content=".*?"\s*\/?>/i, `<meta name="twitter:description" content="${meta.description}" />`);
  modified = modified.replace(/<meta\s+name="twitter:url"\s+content=".*?"\s*\/?>/i, `<meta name="twitter:url" content="${canonicalUrl}" />`);

  return modified;
}
