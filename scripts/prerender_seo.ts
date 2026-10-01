import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DIST_DIR = path.resolve(__dirname, '../dist');

interface ToolRouteMeta {
  path: string;
  toolTitle: string;
  seoTitle: string;
  description: string;
  h1: string;
  intro: string;
  keywords: string[];
  benefits: string[];
  steps: string[];
  faqs: Array<{ question: string; answer: string }>;
  related: string[];
}

export const TOOL_ROUTES: ToolRouteMeta[] = [
  {
    path: '/edit-pdf',
    toolTitle: 'Edit PDF',
    seoTitle: 'Edit PDF Online — Add Text, Images & Annotations | ZipStream',
    description: 'Edit PDF documents online for free. Add text, insert images, draw vector shapes, highlight, strikethrough, leave comments, and freehand annotate directly in your browser with zero cloud uploads.',
    h1: 'Edit PDF Online',
    intro: 'Add text, insert images, draw vector shapes, and highlight content directly on your PDF pages. Fast, secure, and 100% private in-browser editing with zero cloud uploads.',
    keywords: ['edit PDF', 'edit PDF online', 'PDF editor', 'add text to PDF', 'PDF annotation', 'draw on PDF', 'highlight PDF', 'insert image to PDF', 'online PDF editor free'],
    benefits: [
      'Add crisp text overlays with custom font, size, weight, color, alignment, and opacity',
      'Insert PNG, JPG, and WebP images with free moving, proportional scaling, and rotation',
      'Draw vector rectangles, circles, lines, arrows, and smooth freehand pen markup',
      'Translucent highlighting, underline, strikethrough, and sticky note annotations',
      'Multi-level undo/redo history, zoom, page thumbnail navigation, and keyboard shortcuts',
      '100% on-device editing via PDF.js and pdf-lib — files never leave your computer',
    ],
    steps: [
      'Upload your PDF into the private browser-based editing workspace',
      'Use the toolbar to insert text, images, shapes, highlights, or draw freehand',
      'Select any element to adjust fonts, colors, line widths, opacity, or position',
      'Click Export PDF to download your high-quality edited document with original vector pages preserved',
    ],
    faqs: [
      { question: 'Does ZipStream preserve the original quality of my PDF?', answer: 'Yes. ZipStream uses a non-destructive vector overlay architecture powered by pdf-lib. Your original vector text, embedded high-resolution graphics, and page layouts are preserved without rasterizing pages into blurry screenshots.' },
      { question: 'Are my confidential documents uploaded to any server?', answer: 'No. The entire editing process runs 100% locally in your web browser using PDF.js and pdf-lib WebAssembly/JavaScript. Your documents and annotations never leave your device.' },
      { question: 'Can I add images and logos to a PDF document?', answer: 'Yes. You can upload PNG, JPG, or WebP images, place them anywhere on any page, resize them while preserving aspect ratio, and adjust opacity.' },
      { question: 'How do I undo an accidental change or delete an annotation?', answer: 'Press Ctrl+Z (or Cmd+Z on Mac) or use the Undo button in the top toolbar. You can also select any annotation or element and press Delete or Backspace to remove it.' },
      { question: 'Can I edit password-protected or encrypted PDFs?', answer: 'Encrypted PDFs must be unlocked before editing. ZipStream automatically detects password-protected files and provides a direct shortcut to the Unlock PDF tool.' },
    ],
    related: ['/compress-pdf', '/merge-pdf', '/split-pdf', '/watermark-pdf', '/protect-pdf', '/unlock-pdf', '/ocr-pdf'],
  },
  {
    path: '/compress-pdf',
    toolTitle: 'Compress PDF',
    seoTitle: 'Compress PDF Online Free — Reduce PDF Size | ZipStream',
    description: 'Reduce PDF file size online while preserving crisp vector text and image quality. Fast, 100% private in-browser compression with no file size limits or signup.',
    h1: 'Compress PDF Online Free',
    intro: 'Make large PDF documents easier to email, upload, and store. Choose customized quality levels, preserve document structure, and download your optimized PDF directly in your browser.',
    keywords: ['compress PDF', 'compress PDF online', 'PDF compressor', 'reduce PDF size', 'reduce PDF file size', 'shrink PDF', 'compress large PDF'],
    benefits: [
      'Multi-level compression: Screen (72 DPI), eBook (150 DPI), and Print (300 DPI)',
      '100% on-device WebAssembly execution — files never leave your computer',
      'Preserves searchable text, bookmarks, vector shapes, and form fields',
    ],
    steps: [
      'Drop or upload your PDF file into the secure compression box',
      'Select your preferred compression profile or target file size',
      'Click Compress and instantly download your lightweight PDF',
    ],
    faqs: [
      { question: 'Will compressing my PDF reduce text or font quality?', answer: 'No. ZipStream preserves all vector fonts, text definitions, and outlines. Only high-resolution embedded images are intelligently downsampled according to your chosen profile.' },
      { question: 'Is there a file size limit for PDF compression?', answer: 'Because ZipStream executes locally inside your web browser via WebAssembly, you can compress files up to hundreds of megabytes without arbitrary server upload caps.' },
      { question: 'Are my private documents uploaded to an external server?', answer: 'No. Core compression runs directly on your device CPU using WebAssembly and HTML5 Canvas. Your sensitive documents never leave your browser.' },
    ],
    related: ['/merge-pdf', '/split-pdf', '/pdf-to-word', '/protect-pdf'],
  },
  {
    path: '/merge-pdf',
    toolTitle: 'Merge PDF',
    seoTitle: 'Merge PDF Files Online Free — Combine PDFs | ZipStream',
    description: 'Combine multiple PDF files into one clean, organized document. Reorder pages, assemble reports, and merge PDFs locally in your browser with zero cloud uploads.',
    h1: 'Merge PDF Files Online',
    intro: 'Join reports, invoices, assignments, presentations, or scanned receipts into a single cohesive PDF. Arrange documents visually before generating the combined file.',
    keywords: ['merge PDF', 'combine PDF', 'combine PDF files', 'merge PDFs online', 'PDF merger', 'join PDF documents'],
    benefits: [
      'Combine unlimited PDF documents with intuitive drag-and-drop reordering',
      'Zero server upload required — processed instantly on your local device',
      'Preserves internal document bookmarks, hyperlinks, and page orientations',
    ],
    steps: [
      'Select or drop two or more PDF files from your computer or phone',
      'Drag and arrange the files or pages in your preferred order',
      'Click Merge PDFs to combine and download your single organized PDF',
    ],
    faqs: [
      { question: 'Can I reorder individual pages before merging?', answer: 'Yes. You can visually inspect document pages and arrange them into your exact desired reading order before exporting.' },
      { question: 'Is there a limit on how many PDFs I can combine?', answer: 'You can merge as many files as your device memory supports. There are no artificial daily limits or subscription paywalls.' },
    ],
    related: ['/split-pdf', '/compress-pdf', '/jpg-to-pdf', '/watermark-pdf'],
  },
  {
    path: '/split-pdf',
    toolTitle: 'Split PDF',
    seoTitle: 'Split PDF Online Free — Extract PDF Pages | ZipStream',
    description: 'Split PDF pages or extract custom page ranges online for free. Separate individual sheets or export selected ranges in seconds with private on-device processing.',
    h1: 'Split PDF Online',
    intro: 'Extract only the critical pages you need from large documents. Enter custom page ranges or break an entire document into separate single-page files.',
    keywords: ['split PDF', 'split PDF online', 'extract PDF pages', 'separate PDF pages', 'PDF splitter', 'divide PDF'],
    benefits: [
      'Extract custom page intervals (e.g., 1-5, 8, 12-15) into separate files',
      'Export all pages simultaneously as a clean ZIP archive',
      'Private on-device extraction with zero cloud storage retention',
    ],
    steps: [
      'Upload the PDF you want to split or separate',
      'Specify the page numbers or page ranges you wish to extract',
      'Click Split PDF and download your extracted document pages',
    ],
    faqs: [
      { question: 'Can I extract non-consecutive pages?', answer: 'Yes. You can specify comma-separated lists and ranges such as "1-3, 7, 10-12" to extract exactly what you need.' },
      { question: 'Will the original PDF remain unchanged?', answer: 'Yes. ZipStream never modifies your original file on disk; it simply creates a new PDF containing your chosen pages.' },
    ],
    related: ['/merge-pdf', '/compress-pdf', '/pdf-to-jpg', '/protect-pdf'],
  },
  {
    path: '/pdf-to-word',
    toolTitle: 'PDF to Word',
    seoTitle: 'PDF to Word Converter Online Free (DOCX) | ZipStream',
    description: 'Convert PDF documents to editable Microsoft Word (.docx) files online. Preserve tables, paragraphs, and formatting with fast, private on-device extraction.',
    h1: 'PDF to Word Converter Online',
    intro: 'Transform static PDF files into editable Microsoft Word (.docx) documents. Preserve formatted text, tables, headers, and bullet lists without signing up.',
    keywords: ['PDF to Word', 'PDF to Word converter', 'convert PDF to Word', 'PDF to DOCX', 'convert PDF to DOCX', 'editable PDF'],
    benefits: [
      'Extracts structured text, paragraphs, and tables into editable DOCX format',
      'Dual-engine architecture: Instant client extraction with private server fallback',
      'No email address, watermark, or credit card required',
    ],
    steps: [
      'Select the PDF document you wish to convert',
      'Review the structured document preview',
      'Download your editable Microsoft Word (.docx) document',
    ],
    faqs: [
      { question: 'Can I convert scanned PDFs into Word?', answer: 'For image-only scans, run our Searchable PDF (OCR) tool first to generate a selectable text layer, then convert to Word.' },
      { question: 'Will font formatting and tables be preserved?', answer: 'Yes. ZipStream parses layout structures, paragraphs, bold/italic font stylings, and tabular grids into native Word elements.' },
    ],
    related: ['/word-to-pdf', '/pdf-to-excel', '/pdf-to-powerpoint', '/ocr-pdf'],
  },
  {
    path: '/pdf-to-excel',
    toolTitle: 'PDF to Excel',
    seoTitle: 'PDF to Excel Converter Online Free (XLSX) | ZipStream',
    description: 'Extract tables and structured data from PDF into Microsoft Excel (.xlsx) spreadsheets online. Fast, secure, and accurate table extraction with zero data tracking.',
    h1: 'PDF to Excel Converter Online',
    intro: 'Convert PDF bank statements, financial ledgers, and tabular reports into clean Microsoft Excel (.xlsx) workbooks ready for formulas and data modeling.',
    keywords: ['PDF to Excel', 'PDF to Excel converter', 'convert PDF to Excel', 'PDF to XLSX', 'extract tables from PDF'],
    benefits: [
      'Detects tabular columns, rows, and numeric values accurately',
      'Generates native XLSX workbooks compatible with Excel, Google Sheets, and LibreOffice',
      'Private on-device table extraction protects sensitive financial data',
    ],
    steps: [
      'Upload your PDF file containing data tables or spreadsheets',
      'Select the pages containing tables you want to export',
      'Download your formatted Excel (.xlsx) spreadsheet file',
    ],
    faqs: [
      { question: 'Does it work with multi-page table statements?', answer: 'Yes. Multi-page tables are extracted sequentially into structured rows in your exported Excel workbook.' },
    ],
    related: ['/excel-to-pdf', '/pdf-to-word', '/compress-pdf', '/extract-text'],
  },
  {
    path: '/pdf-to-powerpoint',
    toolTitle: 'PDF to PowerPoint',
    seoTitle: 'PDF to PowerPoint Converter Online Free (PPTX) | ZipStream',
    description: 'Convert PDF pages into editable PowerPoint (.pptx) presentation slides online. Export presentation graphics, slide decks, and vector layouts effortlessly.',
    h1: 'PDF to PowerPoint Converter Online',
    intro: 'Turn PDF slides and document briefs into presentation-ready Microsoft PowerPoint (.pptx) files for meetings, lectures, and executive reviews.',
    keywords: ['PDF to PowerPoint', 'PDF to PPTX', 'convert PDF to PowerPoint', 'PDF to slides', 'PDF presentation converter'],
    benefits: [
      'Converts each PDF page into a dedicated PowerPoint slide',
      'Exports vector typography, images, and visual graphics cleanly',
      'Free, instantaneous, and private conversion',
    ],
    steps: [
      'Drop your PDF presentation into the upload box',
      'Choose slide formatting options',
      'Download your Microsoft PowerPoint (.pptx) presentation',
    ],
    faqs: [
      { question: 'Will each page become a separate slide?', answer: 'Yes. Each page of your PDF is converted into an individual slide in the resulting PPTX presentation.' },
    ],
    related: ['/powerpoint-to-pdf', '/pdf-to-word', '/pdf-to-jpg', '/compress-pdf'],
  },
  {
    path: '/pdf-to-jpg',
    toolTitle: 'PDF to JPG',
    seoTitle: 'PDF to JPG Converter Online Free — Extract Images | ZipStream',
    description: 'Convert PDF pages into high-resolution JPG or PNG images online. Download individual page images or a complete ZIP package with zero quality loss.',
    h1: 'PDF to JPG Converter Online',
    intro: 'Export PDF pages as crisp, high-resolution JPG, PNG, or WebP images. Ideal for social media graphics, blog illustrations, presentations, and digital portfolios.',
    keywords: ['PDF to JPG', 'PDF to image', 'convert PDF to JPG', 'extract images from PDF', 'PDF to PNG'],
    benefits: [
      'Configurable rendering resolution from standard 72 DPI up to print-quality 300 DPI',
      'Download individual pages or export all pages in a single ZIP package',
      '100% on-device browser rendering protects document privacy',
    ],
    steps: [
      'Select the PDF file you want to convert to images',
      'Choose image format (JPG, PNG, WebP) and render quality',
      'Download your converted image files or ZIP archive',
    ],
    faqs: [
      { question: 'What image formats can I export?', answer: 'ZipStream supports JPG for compact file sizes, PNG for lossless transparent graphics, and modern WebP for web publishing.' },
    ],
    related: ['/jpg-to-pdf', '/scan-document', '/split-pdf', '/compress-image'],
  },
  {
    path: '/jpg-to-pdf',
    toolTitle: 'JPG to PDF',
    seoTitle: 'JPG to PDF Converter Online Free — Images to PDF | ZipStream',
    description: 'Convert JPG, PNG, and WebP images into a single professional PDF document. Reorder photos, configure page margins, and download in seconds.',
    h1: 'JPG to PDF Converter Online',
    intro: 'Combine photos, mobile screenshots, scans, and graphic designs into a standardized, shareable PDF document with customizable page sizes and margins.',
    keywords: ['JPG to PDF', 'images to PDF', 'convert JPG to PDF', 'photos to PDF', 'PNG to PDF', 'image to PDF converter'],
    benefits: [
      'Supports JPG, PNG, WebP, GIF, and BMP formats in a unified workflow',
      'Customize page size (A4, Letter, Fit to Image) and margin padding',
      'Batch reordering with instant visual drag-and-drop',
    ],
    steps: [
      'Upload one or more photos or images from your device',
      'Drag images to set the desired page order and configure margins',
      'Click Convert to PDF and download your compiled PDF document',
    ],
    faqs: [
      { question: 'Can I combine multiple images into one PDF?', answer: 'Yes! You can add dozens of images, arrange their order, and compile them into a single multi-page PDF.' },
    ],
    related: ['/pdf-to-jpg', '/scan-document', '/compress-pdf', '/merge-pdf'],
  },
  {
    path: '/word-to-pdf',
    toolTitle: 'Word to PDF',
    seoTitle: 'Word to PDF Converter Online Free (DOCX to PDF) | ZipStream',
    description: 'Convert Microsoft Word (.docx and .doc) files to PDF with complete layout fidelity, tables, and vector typography. Fast, private, and free.',
    h1: 'Word to PDF Converter Online',
    intro: 'Convert Word DOCX and DOC documents into secure, standardized PDF files. Lock font formatting, margins, and graphics so your document looks identical on all devices.',
    keywords: ['Word to PDF', 'convert Word to PDF', 'DOCX to PDF', 'DOC to PDF', 'Word to PDF converter online'],
    benefits: [
      '100% layout fidelity preserving headers, tables, footers, and page numbers',
      'Private containerized processing with automatic immediate file unlinking',
      'Creates lightweight, universally viewable PDF documents',
    ],
    steps: [
      'Upload your Microsoft Word (.docx or .doc) document',
      'Our engine converts your document layout into vector PDF format',
      'Download your clean, finalized PDF file',
    ],
    faqs: [
      { question: 'Will my fonts and margins change after conversion?', answer: 'No. The conversion renders exact font metrics, table column widths, and margins identical to Microsoft Word.' },
    ],
    related: ['/pdf-to-word', '/excel-to-pdf', '/powerpoint-to-pdf', '/compress-pdf'],
  },
  {
    path: '/protect-pdf',
    toolTitle: 'Protect PDF',
    seoTitle: 'Protect PDF Online Free — Encrypt PDF Password | ZipStream',
    description: 'Password-protect and encrypt sensitive PDF documents online with strong encryption. Prevent unauthorized viewing and copying on-device without cloud uploads.',
    h1: 'Protect PDF Online Free',
    intro: 'Add strong password protection and encryption to sensitive contracts, medical records, tax filings, and personal files before sharing them over email or chat.',
    keywords: ['protect PDF', 'encrypt PDF', 'password protect PDF', 'lock PDF', 'add password to PDF', 'secure PDF'],
    benefits: [
      'Bank-grade AES-256 and RC4 password encryption standards',
      'Prevents unauthorized opening, text copying, and document modification',
      '100% browser-based encryption — your password never transmits over the internet',
    ],
    steps: [
      'Choose the PDF document you need to protect',
      'Enter and confirm a strong password',
      'Download your newly encrypted, password-protected PDF',
    ],
    faqs: [
      { question: 'Can anyone open the PDF without the password?', answer: 'No. Standard PDF readers require entering the correct password before unlocking and displaying document contents.' },
    ],
    related: ['/unlock-pdf', '/redact-pdf', '/privacy-scanner', '/watermark-pdf'],
  },
  {
    path: '/unlock-pdf',
    toolTitle: 'Unlock PDF',
    seoTitle: 'Unlock PDF Online Free — Remove Password Security | ZipStream',
    description: 'Remove password security and encryption from authorized PDF files. Export an unlocked, printable PDF document directly in your browser.',
    h1: 'Unlock PDF Online Free',
    intro: 'Remove password security and viewing restrictions from PDF documents you have authorization to decrypt. Enjoy frictionless printing, copying, and sharing.',
    keywords: ['unlock PDF', 'remove password from PDF', 'decrypt PDF', 'remove PDF security', 'unlock PDF online'],
    benefits: [
      'Permanently removes viewing passwords and permission restrictions',
      'Instant local browser decryption with complete user privacy',
      'Exports a clean, unrestricted PDF file',
    ],
    steps: [
      'Upload your password-protected PDF document',
      'Enter the valid owner or user password to authorize decryption',
      'Download your unlocked, restriction-free PDF document',
    ],
    faqs: [
      { question: 'Do I need to know the password to unlock the file?', answer: 'Yes. To decrypt the document legitimately, you must provide the valid password once. ZipStream removes the password for future openings.' },
    ],
    related: ['/protect-pdf', '/compress-pdf', '/split-pdf', '/redact-pdf'],
  },
  {
    path: '/watermark-pdf',
    toolTitle: 'Watermark PDF',
    seoTitle: 'Watermark PDF Online Free — Stamp Text & Logos | ZipStream',
    description: 'Add custom text stamps, confidential labels, or copyright watermarks to PDF files. Control rotation, font size, opacity, and positioning with instant preview.',
    h1: 'Watermark PDF Online Free',
    intro: 'Stamp confidential notices, draft markers, author names, or copyright watermarks onto every page of your PDF document with live visual positioning.',
    keywords: ['watermark PDF', 'add watermark to PDF', 'stamp PDF', 'confidential stamp PDF', 'draft watermark PDF'],
    benefits: [
      'Full control over watermark text, opacity (10% to 100%), font size, and rotation angle',
      'Apply to all pages or selected page ranges with real-time visual preview',
      'Processed completely on-device without sending documents to external servers',
    ],
    steps: [
      'Upload the PDF you want to watermark',
      'Type your watermark text (e.g. CONFIDENTIAL, DRAFT, DO NOT COPY) and adjust angle',
      'Click Apply Watermark and download your stamped PDF',
    ],
    faqs: [
      { question: 'Will the watermark obscure my document text?', answer: 'You can adjust opacity to 15%–30% so your background text remains completely readable while protecting ownership.' },
    ],
    related: ['/protect-pdf', '/merge-pdf', '/compress-pdf', '/redact-pdf'],
  },
  {
    path: '/ocr-pdf',
    toolTitle: 'OCR PDF',
    seoTitle: 'OCR PDF Online — Make Scanned PDFs Searchable | ZipStream',
    description: 'Convert scanned paper documents and image-only PDFs into searchable, selectable text. Automatic deskew, multi-language OCR (English, Hindi, etc.), and secure temporary processing with automated file deletion.',
    h1: 'OCR PDF — Make PDF Searchable',
    intro: 'Make scanned paper documents, mobile captures, invoices, and non-selectable PDFs searchable and copyable. High-accuracy optical character recognition powered by OCRmyPDF and Tesseract.',
    keywords: ['OCR PDF', 'searchable PDF', 'make PDF searchable', 'optical character recognition PDF', 'extract text from scan', 'scanned PDF to searchable PDF'],
    benefits: [
      'Embeds an invisible searchable vector text layer over your scanned image pages',
      'Enables Ctrl+F search, text selection, and copying across all standard PDF viewers',
      'Automatic deskew and page orientation correction for crooked scans',
      'Supports English, Hindi (हिन्दी), English + Hindi, French, German, and Spanish',
      'Secure temporary server processing with automated deletion after job completion',
    ],
    steps: [
      'Upload the scanned PDF or image document into the OCR workspace',
      'Choose the document language (English, Hindi, etc.) and optional deskew settings',
      'Download your searchable PDF with full text selection and Ctrl+F enabled',
    ],
    faqs: [
      { question: 'What is OCR and how does it make a PDF searchable?', answer: 'Optical Character Recognition (OCR) analyzes the pixels in scanned document images, recognizes letter shapes, and synthesizes an invisible vector text layer behind the original scanned image so words can be selected and searched.' },
      { question: 'Can I search and copy text from the generated PDF?', answer: 'Yes. The resulting PDF contains a fully selectable text layer. You can press Ctrl+F (or Cmd+F) to search for any word, highlight sentences, and copy text directly into other applications.' },
      { question: 'Does OCR preserve the original visual appearance of my scanned pages?', answer: 'Yes. ZipStream overlays an invisible text layer directly behind your existing scans without degrading, altering, or rasterizing the original page appearance.' },
      { question: 'Which languages are supported for text recognition?', answer: 'ZipStream supports English, Hindi (Devanagari script), English+Hindi bilingual documents, French, German, and Spanish with pinned Tesseract models.' },
      { question: 'Can I OCR a password-protected PDF?', answer: 'Encrypted PDFs must be unlocked before OCR can process the pages. ZipStream automatically detects password protection and directs you to our Unlock PDF tool.' },
      { question: 'How long are uploaded files stored?', answer: 'Files submitted for OCR are processed temporarily in an isolated container sandbox and automatically deleted from the server upon job completion or within 1 hour.' },
    ],
    related: ['/compress-pdf', '/scan-document', '/edit-pdf', '/extract-text', '/pdf-to-word'],
  },
  {
    path: '/extract-text',
    toolTitle: 'Extract Text from PDF',
    seoTitle: 'Convert PDF to Text Online Free — Text Extractor | ZipStream',
    description: 'Extract selectable text and Markdown from PDF documents online. Instant extraction without formatting clutter, 100% processed locally on your device.',
    h1: 'Convert PDF to Text Online',
    intro: 'Pull clean text, sentences, paragraphs, and Markdown structures out of PDF files. Copy directly to your clipboard or download as a clean plain text (.txt) file.',
    keywords: ['PDF to text', 'extract text from PDF', 'PDF text extractor', 'copy text from PDF', 'convert PDF to TXT'],
    benefits: [
      'Extract raw text, paragraphs, and formatted Markdown',
      'One-click copy to clipboard or instant .txt file download',
      'Completely on-device processing protects sensitive business notes',
    ],
    steps: [
      'Drop your PDF document into the text extractor',
      'View the extracted text in the live editor window',
      'Copy to clipboard or download as a clean text file',
    ],
    faqs: [
      { question: 'Can I extract text from specific pages?', answer: 'Yes. You can select specific pages or extract the entire document at once.' },
    ],
    related: ['/ocr-pdf', '/pdf-to-word', '/summarize-pdf', '/chat-pdf'],
  },
  {
    path: '/repair-pdf',
    toolTitle: 'Repair PDF',
    seoTitle: 'Repair Corrupted PDF Online Free — Fix Damaged Files | ZipStream',
    description: 'Recover damaged, corrupt, or unreadable PDF files online. Rebuild internal cross-reference tables and extract surviving pages directly in your browser.',
    h1: 'Repair Corrupted PDF Online',
    intro: 'Fix damaged, broken, or unreadable PDF documents that fail to open in Acrobat or Chrome. Reconstruct internal table dictionaries and salvage content.',
    keywords: ['repair PDF', 'fix corrupted PDF', 'repair damaged PDF', 'recover broken PDF', 'PDF repair tool'],
    benefits: [
      'Reconstructs corrupted cross-reference (xref) tables and stream offsets',
      'Salvages readable pages, embedded images, and vector objects',
      'Private in-browser recovery ensures files are never exposed',
    ],
    steps: [
      'Select the corrupted or damaged PDF file from your device',
      'ZipStream scans and reconstructs missing stream dictionaries',
      'Download your recovered, readable PDF document',
    ],
    faqs: [
      { question: 'Can every damaged PDF be repaired?', answer: 'Recovery success depends on the extent of file damage. As long as internal page streams survive, ZipStream reconstructs the cross-reference tables.' },
    ],
    related: ['/compress-pdf', '/split-pdf', '/ocr-pdf', '/compare-pdf'],
  },
  {
    path: '/compare-pdf',
    toolTitle: 'Compare PDF',
    seoTitle: 'Compare PDF Documents Online Free — Visual Diff | ZipStream',
    description: 'Compare two PDF documents side by side with pixel-perfect visual difference highlighting. Spot revisions, deletions, and layout changes instantly on-device.',
    h1: 'Compare PDF Documents Online',
    intro: 'Spot contractual changes, revision tweaks, and visual layout differences between two versions of a PDF document. High-contrast color overlays highlight modifications.',
    keywords: ['compare PDF', 'compare two PDFs', 'PDF diff', 'find differences in PDF', 'visual PDF comparison'],
    benefits: [
      'Side-by-side split screen and synchronized dual-canvas scrolling',
      'Pixel-level XOR difference map highlights changes in bright contrasting colors',
      'Runs 100% on-device — confidential legal contracts never leave your RAM',
    ],
    steps: [
      'Upload the original PDF version and the modified revision',
      'ZipStream analyzes page dimensions and renders visual difference overlays',
      'Inspect additions, removals, and formatting modifications page by page',
    ],
    faqs: [
      { question: 'Does it highlight text or visual changes?', answer: 'ZipStream performs comprehensive visual pixel diffing, highlighting modified text, swapped images, moved margins, and signature additions.' },
    ],
    related: ['/repair-pdf', '/extract-text', '/merge-pdf', '/protect-pdf'],
  },
  {
    path: '/redact-pdf',
    toolTitle: 'Auto-Redact PII',
    seoTitle: 'Auto-Redact PII from PDF Online Free | ZipStream',
    description: 'Find and blackout sensitive PII data (SSN, credit cards, emails, phone numbers) before sharing. Permanent vector redaction blocks on-device.',
    h1: 'Auto-Redact PII from PDF Online',
    intro: 'Safeguard privacy by permanently blacking out sensitive personal information before sharing documents. Scan for Social Security numbers, credit cards, emails, and phone numbers.',
    keywords: ['redact PDF', 'auto redact PII', 'blackout PDF', 'remove sensitive information from PDF', 'redact SSN'],
    benefits: [
      'Automated regex pattern scanner for SSN, credit cards, emails, and phone numbers',
      'Permanent vector redaction blocks — impossible to reveal by highlighting or copying',
      '100% client-side privacy audit without transmitting text to third-party APIs',
    ],
    steps: [
      'Upload the PDF you need to redact',
      'Review automatically identified sensitive patterns or draw custom redaction boxes',
      'Confirm and export your permanently sanitized PDF file',
    ],
    faqs: [
      { question: 'Can redacted text be uncovered by selecting it?', answer: 'No! ZipStream burns permanent solid black vector rectangles onto the PDF and removes underlying text characters completely.' },
    ],
    related: ['/privacy-scanner', '/protect-pdf', '/compress-pdf', '/watermark-pdf'],
  },
  {
    path: '/privacy-scanner',
    toolTitle: 'Privacy Metadata Scanner',
    seoTitle: 'Scan & Strip PDF Privacy Metadata Online Free | ZipStream',
    description: 'Audit and remove hidden metadata, author names, software versions, creation timestamps, and GPS coordinates from PDF files before public sharing.',
    h1: 'Scan & Strip PDF Privacy Metadata',
    intro: 'Inspect and sanitize hidden metadata embedded inside your PDF documents. Remove author names, software signatures, creation dates, and GPS coordinates.',
    keywords: ['privacy scanner', 'strip PDF metadata', 'clean PDF metadata', 'remove author info from PDF', 'PDF metadata scrubber'],
    benefits: [
      'Inspects XMP metadata, document info dictionaries, and creation tools',
      'One-click removal of author names, GPS tags, dates, and software footprints',
      'Processed 100% on-device for total anonymity',
    ],
    steps: [
      'Drop your PDF into the metadata scanner',
      'Review all discovered hidden metadata tags and properties',
      'Click Clean Metadata and download your sanitized document',
    ],
    faqs: [
      { question: 'What metadata is removed?', answer: 'Author names, creator software, PDF producer, creation date, modification date, and embedded XMP schemas are completely stripped.' },
    ],
    related: ['/redact-pdf', '/protect-pdf', '/compress-pdf', '/split-pdf'],
  },
  {
    path: '/scan-document',
    toolTitle: 'Camera Document Scanner',
    seoTitle: 'Scan Documents Online Free — Camera to PDF | ZipStream',
    description: 'Use your phone or webcam to scan paper documents with real-time automatic border detection, perspective correction, contrast enhancement, and PDF export.',
    h1: 'Scan Documents Online with Camera',
    intro: 'Turn your smartphone or laptop webcam into a professional document scanner. Automatically detects page edges, squares perspective, enhances contrast, and creates clean PDFs.',
    keywords: ['scan document online', 'camera to PDF', 'document scanner', 'receipt scanner', 'auto border detection scanner'],
    benefits: [
      'Real-time automated edge detection and perspective warping',
      'Contrast enhancement filters: B&W Document, Grayscale, and Color Boost',
      'No app download or mobile installation required — works directly in web browser',
    ],
    steps: [
      'Allow camera access on your phone or computer',
      'Hold document in front of camera — edges are detected automatically',
      'Capture pages and click Export to download your clean PDF',
    ],
    faqs: [
      { question: 'Does this require installing an app?', answer: 'No. The scanner runs directly inside modern mobile and desktop browsers using WebRTC and Canvas computer vision.' },
    ],
    related: ['/jpg-to-pdf', '/ocr-pdf', '/compress-pdf', '/pdf-to-word'],
  },
  {
    path: '/images-to-pdf',
    toolTitle: 'Images to PDF',
    seoTitle: 'Images to PDF Converter Free Online | ZipStream',
    description: 'Convert JPG, PNG, and WebP images into a single multi-page PDF document online. Fast, private, and free.',
    h1: 'Convert Images to PDF Online',
    intro: 'Combine multiple image files into one professional PDF document with customizable page sizes, orientations, and margins.',
    keywords: ['images to PDF', 'convert images to PDF', 'photos to PDF', 'PNG to PDF', 'JPG to PDF'],
    benefits: ['Supports JPG, PNG, WebP, GIF, and BMP', 'Visual drag-and-drop reordering', 'Client-side processing'],
    steps: ['Select or drop images', 'Arrange page order and margins', 'Download combined PDF'],
    faqs: [{ question: 'Can I add multiple photos?', answer: 'Yes, add as many photos as needed and combine them into a single PDF.' }],
    related: ['/jpg-to-pdf', '/scan-document', '/pdf-to-jpg'],
  },
  {
    path: '/excel-to-pdf',
    toolTitle: 'Excel to PDF',
    seoTitle: 'Excel to PDF Converter Free Online (XLSX to PDF) | ZipStream',
    description: 'Convert Excel XLSX and XLS spreadsheets into clean, printable PDF documents online free.',
    h1: 'Excel to PDF Converter Online',
    intro: 'Convert spreadsheet tables, financial data, and workbooks into standard PDF documents ready for printing and distribution.',
    keywords: ['Excel to PDF', 'convert Excel to PDF', 'XLSX to PDF', 'spreadsheet to PDF'],
    benefits: ['Maintains table borders and column alignments', 'Clean printable page rendering', 'Private processing'],
    steps: ['Upload Excel workbook', 'Preview spreadsheet pages', 'Download converted PDF'],
    faqs: [{ question: 'Will formulas be evaluated?', answer: 'Yes, formulas are calculated and rendered with final values.' }],
    related: ['/pdf-to-excel', '/word-to-pdf', '/compress-pdf'],
  },
  {
    path: '/powerpoint-to-pdf',
    toolTitle: 'PowerPoint to PDF',
    seoTitle: 'PowerPoint to PDF Converter Free Online (PPTX to PDF) | ZipStream',
    description: 'Convert PowerPoint PPTX and PPT presentation slide decks to PDF online free.',
    h1: 'PowerPoint to PDF Converter Online',
    intro: 'Convert PowerPoint slide presentations into universal PDF format so your slides render identically on every device.',
    keywords: ['PowerPoint to PDF', 'convert PowerPoint to PDF', 'PPTX to PDF', 'slides to PDF'],
    benefits: ['Converts every slide with typography', 'Fixed slide layout preservation', 'Free and private'],
    steps: ['Upload PowerPoint presentation', 'Slides are compiled into pages', 'Download finalized PDF'],
    faqs: [{ question: 'Are animations preserved?', answer: 'Animations are rendered into their final visual slide states in the PDF.' }],
    related: ['/pdf-to-powerpoint', '/word-to-pdf', '/pdf-to-jpg'],
  },
  {
    path: '/html-to-pdf',
    toolTitle: 'HTML to PDF',
    seoTitle: 'HTML to PDF Converter Free Online | ZipStream',
    description: 'Convert HTML web pages, reports, and code into clean PDF documents directly in your browser.',
    h1: 'HTML to PDF Converter Online',
    intro: 'Render web HTML files or paste code snippets to generate clean vector PDFs with CSS styling and web typography.',
    keywords: ['HTML to PDF', 'convert HTML to PDF', 'webpage to PDF', 'HTML code to PDF'],
    benefits: ['Full CSS and layout rendering', 'Instant client-side rendering', 'No signup required'],
    steps: ['Paste HTML or upload .html file', 'Configure print preview', 'Download PDF document'],
    faqs: [{ question: 'Can I paste raw HTML?', answer: 'Yes, you can paste HTML code directly to render and download a PDF.' }],
    related: ['/pdf-to-html', '/word-to-pdf', '/compress-pdf'],
  },
  {
    path: '/pdf-to-html',
    toolTitle: 'PDF to HTML',
    seoTitle: 'PDF to HTML Converter Online Free — Responsive Web Pages | ZipStream',
    description: 'Convert PDF documents into clean, responsive HTML web pages online. Extract text, layout elements, and styling directly in your browser with zero uploads.',
    h1: 'PDF to HTML Converter Online',
    intro: 'Transform static PDF documents into modern, semantic HTML5 code. Preserve text formatting, headings, and images for easy website publishing.',
    keywords: ['PDF to HTML', 'convert PDF to HTML', 'PDF to web page', 'HTML from PDF', 'free PDF to HTML converter'],
    benefits: ['Semantic HTML5 markup with clean CSS', '100% in-browser on-device conversion', 'Instant live preview and code export'],
    steps: ['Select or drop your PDF document', 'Preview the rendered HTML web output', 'Copy clean HTML code or download .html package'],
    faqs: [
      { question: 'Is the generated HTML mobile-responsive?', answer: 'Yes. ZipStream compiles document layout blocks into clean, responsive HTML5 structures.' },
      { question: 'Are embedded images extracted?', answer: 'Yes, images and graphics are embedded cleanly as high-fidelity data assets.' },
    ],
    related: ['/html-to-pdf', '/pdf-to-word', '/extract-text'],
  },
  {
    path: '/pdf-to-audio',
    toolTitle: 'PDF to Audio Reader',
    seoTitle: 'PDF to Audio Reader Online Free — Text to Speech (TTS) | ZipStream',
    description: 'Listen to PDF documents read aloud online free. High-quality speech synthesis and text-to-speech directly in your browser without uploading files.',
    h1: 'PDF to Audio Reader Online',
    intro: 'Turn any PDF document into an audiobook or spoken audio track. Listen to research papers, articles, and textbooks hands-free with browser speech synthesis.',
    keywords: ['PDF to audio', 'PDF text to speech', 'read PDF aloud', 'PDF audiobook maker', 'listen to PDF'],
    benefits: ['Natural speech voices with adjustable playback speed', 'Full privacy: reads locally via browser Web Speech API', 'Supports reading long multi-page documents'],
    steps: ['Upload the PDF you want to listen to', 'Choose preferred voice and reading rate', 'Click Play to listen or generate audio readout'],
    faqs: [
      { question: 'Does PDF to audio require an internet connection?', answer: 'The speech engine utilizes your browser native speech synthesis voices locally.' },
      { question: 'Can I adjust the playback speed?', answer: 'Yes, you can speed up or slow down playback from 0.5x to 2.0x.' },
    ],
    related: ['/extract-text', '/summarize-pdf', '/pdf-to-epub'],
  },
  {
    path: '/pdf-to-epub',
    toolTitle: 'PDF to EPUB',
    seoTitle: 'PDF to EPUB Converter Online Free — Ebook Maker | ZipStream',
    description: 'Convert PDF files to reflowable EPUB ebooks online free. Read PDF books comfortably on Kindle, Apple Books, Kobo, and mobile e-readers.',
    h1: 'PDF to EPUB Converter Online',
    intro: 'Convert fixed-layout PDF books, research papers, and documents into reflowable EPUB ebooks designed for comfortable reading on all devices.',
    keywords: ['PDF to EPUB', 'convert PDF to EPUB', 'PDF to ebook', 'make EPUB from PDF', 'free EPUB converter'],
    benefits: ['Reflowable text that fits any screen size comfortably', 'Preserves chapters, headings, and font styling', 'Standard EPUB 3 format compatible with all e-readers'],
    steps: ['Select or drop your PDF document', 'Structure chapters and preview ebook contents', 'Download standardized .epub file ready for e-readers'],
    faqs: [
      { question: 'Will the EPUB work on Apple Books and Kobo?', answer: 'Yes, ZipStream generates standard, valid EPUB 3 packages compatible with Apple Books, Google Play Books, and Kobo.' },
      { question: 'Can I read the EPUB on Kindle?', answer: 'Yes, Amazon Kindle natively accepts standard EPUB files via Send-to-Kindle.' },
    ],
    related: ['/pdf-to-word', '/extract-text', '/pdf-to-audio'],
  },
  {
    path: '/compress-image',
    toolTitle: 'Compress Image',
    seoTitle: 'Compress Images Online Free — JPG, PNG, WebP | ZipStream',
    description: 'Reduce image file size online with client-side compression for JPG, PNG, WebP, and AVIF photos.',
    h1: 'Compress Images Online Free',
    intro: 'Shrink photo file sizes drastically for websites, email, and social media without visible loss of sharpness or detail.',
    keywords: ['compress image', 'compress image online', 'reduce photo size', 'JPG compressor', 'PNG compressor'],
    benefits: ['Adjustable quality slider with preview', 'Supports JPG, PNG, WebP', '100% on-device compression'],
    steps: ['Select image files', 'Adjust compression slider', 'Download optimized image'],
    faqs: [{ question: 'Is image compression lossless?', answer: 'You can choose between near-lossless and balanced compression.' }],
    related: ['/jpg-to-pdf', '/compress-pdf', '/pdf-to-jpg'],
  },
  {
    path: '/chat-pdf',
    toolTitle: 'Chat with PDF',
    seoTitle: 'Chat with PDF Online Free — AI Document Assistant | ZipStream',
    description: 'Ask questions, extract insights, and converse with PDF documents using AI document intelligence.',
    h1: 'Chat with PDF Online',
    intro: 'Interrogate research papers, legal briefs, technical manuals, and financial reports with natural language document AI.',
    keywords: ['chat with PDF', 'AI PDF reader', 'ask PDF questions', 'talk to document', 'PDF AI assistant'],
    benefits: ['Instant answers with citations', 'Summarizes complex sections', 'Private token-capped proxy'],
    steps: ['Upload your PDF document', 'Type questions in natural language', 'Receive instant cited responses'],
    faqs: [{ question: 'Is my document text kept private?', answer: 'Document queries are processed via secure ephemeral sessions.' }],
    related: ['/summarize-pdf', '/extract-text', '/ocr-pdf'],
  },
  {
    path: '/summarize-pdf',
    toolTitle: 'Summarize PDF',
    seoTitle: 'Summarize PDF Online Free — AI Document Summary | ZipStream',
    description: 'Generate concise executive summaries, key takeaways, and action items from long PDF files.',
    h1: 'Summarize PDF Online with AI',
    intro: 'Condense hundred-page reports, legal filings, and academic research papers into concise bullet points in seconds.',
    keywords: ['summarize PDF', 'PDF summarizer', 'executive summary PDF', 'AI document summary'],
    benefits: ['Key takeaways and action points', 'Executive summary generation', 'Instant processing'],
    steps: ['Upload your document', 'Choose summary depth (concise or detailed)', 'Copy or export summary'],
    faqs: [{ question: 'Does it work with long documents?', answer: 'Yes, multi-page PDFs are parsed and synthesized intelligently.' }],
    related: ['/chat-pdf', '/extract-text', '/pdf-to-word'],
  },
  {
    path: '/gst-invoice',
    toolTitle: 'GST Invoice Generator',
    seoTitle: 'Create GST Invoice Online Free — PDF Generator | ZipStream',
    description: 'Build professional, GST-compliant invoices with automatic CGST, SGST, IGST calculations and instant PDF export.',
    h1: 'Create GST Invoice Online Free',
    intro: 'Create compliant GST invoices for clients and businesses. Automatic tax rate calculations, customizable branding, and instant PDF download.',
    keywords: ['GST invoice generator', 'create GST invoice', 'free invoice maker', 'GST billing PDF'],
    benefits: ['Automatic CGST/SGST/IGST math', 'Instant PDF invoice download', 'Zero software installation'],
    steps: ['Fill in client and seller details', 'Add line items and tax rates', 'Export professional PDF invoice'],
    faqs: [{ question: 'Can I add my business logo?', answer: 'Yes, upload your logo and customize invoice color accents.' }],
    related: ['/pos-billing', '/gst-filing-prep', '/compress-pdf'],
  },
  {
    path: '/pos-billing',
    toolTitle: 'POS Billing Slip',
    seoTitle: 'Create POS Billing Slip Online Free | ZipStream',
    description: 'Generate thermal POS receipts and retail billing slips with dynamic UPI QR code payment support.',
    h1: 'Create POS Billing Slip Online',
    intro: 'Generate thermal printer-ready POS billing receipts with automatic UPI QR codes for rapid retail transactions.',
    keywords: ['POS billing slip', 'thermal receipt maker', 'retail invoice with UPI QR', 'print receipt online'],
    benefits: ['Thermal paper width formatting (58mm/80mm)', 'Dynamic UPI QR code generation', 'Fast checkout calculation'],
    steps: ['Add customer and item prices', 'Preview receipt with QR code', 'Print or save thermal receipt'],
    faqs: [{ question: 'Can I print on thermal printers?', answer: 'Yes, formatted specifically for standard 58mm and 80mm thermal receipt printers.' }],
    related: ['/gst-invoice', '/gst-filing-prep', '/scan-document'],
  },
  {
    path: '/gst-filing-prep',
    toolTitle: 'GST Filing Preparation',
    seoTitle: 'GST Filing & Return Preparation Tool Free | ZipStream',
    description: 'Prepare, organize, and summarize GST sales data, B2B invoices, and return filings easily.',
    h1: 'GST Filing & Return Preparation',
    intro: 'Organize and aggregate B2B invoices and sales registers for GSTR-1 and GSTR-3B monthly return filings.',
    keywords: ['GST filing preparation', 'GSTR return helper', 'GST sales summary', 'B2B invoice summary'],
    benefits: ['Consolidates invoice totals and tax heads', 'Export clean CSV/PDF summaries', 'Private local math'],
    steps: ['Upload invoice data or summaries', 'Review tax breakdowns by HSN', 'Download filing register'],
    faqs: [{ question: 'Are financial records kept private?', answer: 'All calculation runs completely on-device without cloud logging.' }],
    related: ['/gst-invoice', '/pos-billing', '/pdf-to-excel'],
  },
  {
    path: '/p2p-share',
    toolTitle: 'P2P File Share',
    seoTitle: 'P2P File Share Online — Direct, Encrypted & Zero Cloud | ZipStream',
    description: 'Share files directly peer-to-peer with zero cloud storage, QR pairing, end-to-end encryption, and live sync.',
    h1: 'P2P File Share Online Free',
    intro: 'Transfer documents and large files directly between two devices over an encrypted WebRTC DataChannel without uploading to cloud servers.',
    keywords: ['P2P file share', 'direct file transfer', 'share files peer to peer', 'encrypted WebRTC transfer'],
    benefits: ['Zero cloud storage — direct browser-to-browser stream', 'Fast local network speed', 'Cryptographic room security'],
    steps: ['Create a secure room or scan QR code', 'Connect second device', 'Stream files directly between peers'],
    faqs: [{ question: 'Is there a file size limit?', answer: 'No cloud storage limits apply because files stream directly between peers.' }],
    related: ['/collaborative-whiteboard', '/compress-pdf', '/file-fingerprint'],
  },
  {
    path: '/collaborative-whiteboard',
    toolTitle: 'Collaborative Whiteboard',
    seoTitle: 'Collaborative Whiteboard Online Free — Real-Time Canvas | ZipStream',
    description: 'Real-time collaborative whiteboard for sketches, architectural diagrams, notes, and visual brainstorming.',
    h1: 'Collaborative Whiteboard Online',
    intro: 'Sketch, diagram, and brainstorm collaboratively with team members on a live virtual canvas with room sharing.',
    keywords: ['collaborative whiteboard', 'online whiteboard free', 'real time canvas', 'excalidraw whiteboard'],
    benefits: ['Hand-drawn style vector graphics', 'Real-time multi-user cursor sync', 'Export to PNG, SVG, or PDF'],
    steps: ['Open collaborative whiteboard', 'Share room invite link or QR code', 'Sketch and brainstorm together'],
    faqs: [{ question: 'Can I export my whiteboard drawing?', answer: 'Yes, export your whiteboard as PNG, SVG, or embed directly into PDF.' }],
    related: ['/p2p-share', '/scan-document', '/compress-pdf'],
  },
  {
    path: '/file-fingerprint',
    toolTitle: 'File Fingerprint',
    seoTitle: 'Generate File Fingerprint Online Free — SHA-256 & SHA-512 | ZipStream',
    description: 'Generate cryptographic SHA-256 and SHA-512 checksum fingerprints for documents to verify integrity.',
    h1: 'Generate File Fingerprint Online',
    intro: 'Verify document integrity and detect tampering by calculating SHA-256 and SHA-512 cryptographic hash fingerprints.',
    keywords: ['file fingerprint', 'SHA-256 hash generator', 'document checksum', 'verify file integrity'],
    benefits: ['Instant on-device cryptographic hashing', 'Detects single-byte modifications', 'Generates SHA-256 and SHA-512'],
    steps: ['Drop file to compute hash', 'Compare with original checksum', 'Verify document authenticity'],
    faqs: [{ question: 'Does calculating hash upload my file?', answer: 'No. The Web Crypto API computes the hash directly in your browser.' }],
    related: ['/privacy-scanner', '/protect-pdf', '/compare-pdf'],
  },
  {
    path: '/about',
    toolTitle: 'About ZipStream',
    seoTitle: 'About ZipStream — Mission, Architecture & Features | ZipStream',
    description: 'Learn how ZipStream was built, our 100% client-side privacy architecture, comparison with other platforms, and our 35+ tools.',
    h1: 'About ZipStream — High-Performance Document Utilities',
    intro: 'ZipStream was architected to solve the frustrations of slow, ad-ridden, paywalled document converters through on-device WebAssembly.',
    keywords: ['about ZipStream', 'ZipStream mission', 'client side PDF architecture', 'WebAssembly PDF tools'],
    benefits: ['Zero-upload privacy guarantee', 'Unrestricted on-device utilities', 'Open, high-performance tooling'],
    steps: ['Explore the mission', 'Understand our privacy architecture', 'Browse 35+ free document tools'],
    faqs: [{ question: 'Who built ZipStream?', answer: 'ZipStream was architected and developed by Pranjal Singh.' }],
    related: ['/pdf-tools', '/compress-pdf', '/merge-pdf'],
  },
  {
    path: '/workflows',
    toolTitle: 'Workflows',
    seoTitle: 'Automated PDF Workflows Online Free — Multi-Tool Pipelines | ZipStream',
    description: 'Automate repetitive PDF tasks with reusable multi-step workflows. Chain merge, organize, compress, watermark, protect, and convert in one seamless pipeline.',
    h1: 'Automated PDF Workflows Online Free',
    intro: 'Automate repetitive PDF tasks with one reusable workflow. Upload your documents once and let ZipStream process them across multiple sequential tools automatically.',
    keywords: ['PDF workflows', 'automated PDF processing', 'chain PDF tools', 'merge and compress PDF', 'PDF batch pipeline', 'reusable PDF workflows'],
    benefits: [
      'Chain up to 4 PDF tools sequentially with zero intermediate downloads',
      'Ephemeral secure execution with instant scratch cleanup',
      'Save, duplicate, and rerun reusable workflows with 1 click',
    ],
    steps: [
      'Create a workflow and pick up to 4 sequential tools',
      'Configure settings like compression levels, watermark text, or rotation',
      'Upload your files once and download the final processed result',
    ],
    faqs: [
      { question: 'What is a PDF workflow?', answer: 'A PDF workflow is an automated pipeline that chains multiple PDF actions (such as Merge, Organize, Compress, and Watermark) together so you upload once and get the final document.' },
      { question: 'Do I have to re-upload files between steps?', answer: 'No. The ZipStream workflow execution engine pipes the output of each tool directly into the next step on the backend without any intermediate file downloads.' },
      { question: 'How many steps can I add?', answer: 'You can chain up to 4 sequential steps in each workflow.' },
    ],
    related: ['/merge-pdf', '/compress-pdf', '/watermark-pdf', '/protect-pdf'],
  },
];


function generatePrerenderHtml(baseHtml: string, route: ToolRouteMeta): string {
  const canonicalUrl = `https://zipstream.online${route.path}`;

  // Structured Data (JSON-LD)
  const jsonLdData = [
    {
      '@context': 'https://schema.org',
      '@type': 'WebApplication',
      name: `${route.toolTitle} — ZipStream`,
      url: canonicalUrl,
      applicationCategory: 'UtilitiesApplication',
      operatingSystem: 'All',
      browserRequirements: 'Requires JavaScript. Requires HTML5.',
      offers: {
        '@type': 'Offer',
        price: '0',
        priceCurrency: 'USD',
      },
      description: route.description,
      featureList: route.benefits.join(', '),
    },
    {
      '@context': 'https://schema.org',
      '@type': 'BreadcrumbList',
      itemListElement: [
        {
          '@type': 'ListItem',
          position: 1,
          name: 'Home',
          item: 'https://zipstream.online',
        },
        {
          '@type': 'ListItem',
          position: 2,
          name: 'PDF Tools',
          item: 'https://zipstream.online/pdf-tools',
        },
        {
          '@type': 'ListItem',
          position: 3,
          name: route.toolTitle,
          item: canonicalUrl,
        },
      ],
    },
    {
      '@context': 'https://schema.org',
      '@type': 'HowTo',
      name: `How to use ${route.toolTitle} online`,
      description: route.intro,
      step: route.steps.map((step, idx) => ({
        '@type': 'HowToStep',
        position: idx + 1,
        name: `Step ${idx + 1}`,
        text: step,
      })),
    },
    {
      '@context': 'https://schema.org',
      '@type': 'FAQPage',
      mainEntity: route.faqs.map((faq) => ({
        '@type': 'Question',
        name: faq.question,
        acceptedAnswer: {
          '@type': 'Answer',
          text: faq.answer,
        },
      })),
    },
  ];

  // Semantic Pre-rendered HTML inside #root
  const semanticShell = `
    <article class="w-full max-w-5xl mx-auto px-4 sm:px-6 pt-6 pb-16 space-y-10" style="font-family: Inter, system-ui, -apple-system, sans-serif;">
      <!-- Breadcrumb Navigation -->
      <nav aria-label="Breadcrumb" class="flex items-center gap-2 text-xs text-[#5C6479]">
        <a href="/" class="font-semibold text-[#0C162C] hover:text-[#055EFE] transition-colors">Home</a>
        <span>/</span>
        <a href="/pdf-tools" class="font-semibold text-[#0C162C] hover:text-[#055EFE] transition-colors">PDF Tools</a>
        <span>/</span>
        <span class="font-bold text-[#055EFE]">${route.toolTitle}</span>
      </nav>

      <!-- Hero Header -->
      <header class="space-y-4 max-w-3xl">
        <div class="inline-flex items-center gap-2 rounded-full border border-[#055EFE]/20 bg-[#055EFE]/8 px-3.5 py-1.5 text-xs font-bold text-[#055EFE]">
          ZipStream Browser Tool · 100% Private
        </div>
        <h1 class="text-3xl sm:text-5xl font-black tracking-tight text-[#0C162C]">
          ${route.h1}
        </h1>
        <p class="text-base sm:text-lg text-[#5C6479] leading-relaxed">
          ${route.intro}
        </p>
        <div class="flex flex-wrap gap-2 text-xs font-semibold text-[#5C6479]">
          ${route.keywords.map((k) => `<span class="rounded-full border border-[#0C162C]/10 bg-white/70 px-3 py-1.5">${k}</span>`).join('')}
        </div>
      </header>

      <!-- Interactive Placeholder (Hydrated by React on load) -->
      <section aria-label="${route.toolTitle} Tool Workspace" class="rounded-3xl border border-[#0C162C]/10 bg-white p-6 shadow-sm min-h-[300px] flex flex-col items-center justify-center text-center space-y-4">
        <div class="w-12 h-12 rounded-2xl bg-[#055EFE]/10 text-[#055EFE] flex items-center justify-center font-bold text-xl">
          ⚡
        </div>
        <div>
          <h2 class="text-lg font-bold text-[#0C162C]">Loading ${route.toolTitle} Workspace…</h2>
          <p class="text-xs text-[#5C6479] mt-1">Direct client-side WebAssembly workspace initializing on your device.</p>
        </div>
      </section>

      <!-- Key Benefits -->
      <section aria-label="Key Benefits" class="grid gap-4 sm:grid-cols-3">
        ${route.benefits.map((benefit) => `
          <div class="rounded-2xl border border-[#0C162C]/10 bg-white p-5 shadow-xs">
            <div class="text-emerald-500 font-bold mb-2">✓ Verified Capability</div>
            <p class="text-sm font-bold text-[#0C162C]">${benefit}</p>
          </div>
        `).join('')}
      </section>

      <!-- How to Use -->
      <section aria-label="How to Use" class="rounded-2xl border border-[#0C162C]/10 bg-white p-6 shadow-xs">
        <h2 class="text-xl font-bold text-[#0C162C] mb-4">How to Use ${route.toolTitle} Online</h2>
        <ol class="space-y-3">
          ${route.steps.map((step, idx) => `
            <li class="flex gap-3 text-sm text-[#5C6479]">
              <span class="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[#055EFE] text-xs font-bold text-white">${idx + 1}</span>
              <span class="pt-0.5">${step}</span>
            </li>
          `).join('')}
        </ol>
      </section>

      <!-- Frequently Asked Questions -->
      <section aria-label="Frequently Asked Questions" class="space-y-4">
        <h2 class="text-xl font-bold text-[#0C162C]">Frequently Asked Questions</h2>
        <div class="grid gap-3">
          ${route.faqs.map((faq) => `
            <details class="rounded-2xl border border-[#0C162C]/10 bg-white p-5">
              <summary class="cursor-pointer text-sm font-bold text-[#0C162C] list-none flex justify-between items-center">
                <span>${faq.question}</span>
                <span class="text-[#055EFE]">▼</span>
              </summary>
              <p class="mt-3 text-sm text-[#5C6479] border-t border-[#0C162C]/5 pt-3">${faq.answer}</p>
            </details>
          `).join('')}
        </div>
      </section>

      <!-- Related Tools Navigation -->
      <nav aria-label="Related Tools" class="border-t border-[#0C162C]/10 pt-6 space-y-3">
        <h2 class="text-xs font-bold uppercase tracking-wider text-[#5C6479]">Related Free Tools</h2>
        <div class="flex flex-wrap gap-2.5">
          ${route.related.map((relPath) => `
            <a href="${relPath}" class="inline-flex items-center gap-1.5 rounded-full border border-[#055EFE]/20 bg-white px-4 py-2 text-xs font-bold text-[#055EFE] hover:bg-[#055EFE]/10 transition-colors">
              <span>${relPath.slice(1).replaceAll('-', ' ')}</span>
              <span>→</span>
            </a>
          `).join('')}
          <a href="/pdf-tools" class="inline-flex items-center gap-1.5 rounded-full border border-[#0C162C]/20 bg-white px-4 py-2 text-xs font-bold text-[#0C162C] hover:bg-black/5 transition-colors">
            <span>Browse All 35+ Tools →</span>
          </a>
        </div>
      </nav>
    </article>
  `;

  let html = baseHtml;

  // Replace Title
  html = html.replace(/<title>.*?<\/title>/i, `<title>${route.seoTitle}</title>`);

  // Replace or add Meta Description
  if (html.includes('name="description"')) {
    html = html.replace(/<meta\s+name="description"\s+content=".*?"\s*\/?>/i, `<meta name="description" content="${route.description}" />`);
  } else {
    html = html.replace('</head>', `<meta name="description" content="${route.description}" />\n</head>`);
  }

  // Replace or add Canonical Link
  if (html.includes('rel="canonical"')) {
    html = html.replace(/<link\s+rel="canonical"\s+href=".*?"\s*\/?>/i, `<link rel="canonical" href="${canonicalUrl}" />`);
  } else {
    html = html.replace('</head>', `<link rel="canonical" href="${canonicalUrl}" />\n</head>`);
  }

  // OpenGraph tags
  html = html.replace(/<meta\s+property="og:title"\s+content=".*?"\s*\/?>/i, `<meta property="og:title" content="${route.seoTitle}" />`);
  html = html.replace(/<meta\s+property="og:description"\s+content=".*?"\s*\/?>/i, `<meta property="og:description" content="${route.description}" />`);
  html = html.replace(/<meta\s+property="og:url"\s+content=".*?"\s*\/?>/i, `<meta property="og:url" content="${canonicalUrl}" />`);

  // Twitter tags
  html = html.replace(/<meta\s+name="twitter:title"\s+content=".*?"\s*\/?>/i, `<meta name="twitter:title" content="${route.seoTitle}" />`);
  html = html.replace(/<meta\s+name="twitter:description"\s+content=".*?"\s*\/?>/i, `<meta name="twitter:description" content="${route.description}" />`);

  // Inject JSON-LD
  const schemaScript = `\n  <script type="application/ld+json">\n${JSON.stringify(jsonLdData, null, 2)}\n  </script>\n`;
  html = html.replace('</head>', `${schemaScript}</head>`);

  // Inject semantic shell into #root
  html = html.replace(/<div id="root">[\s\S]*?<\/div>/i, `<div id="root">${semanticShell}</div>`);

  return html;
}

function generateDirectoryHtml(baseHtml: string): string {
  const canonicalUrl = 'https://zipstream.online/pdf-tools';
  const title = 'All Free Online PDF & Document Tools Directory | ZipStream';
  const description = 'Explore the complete directory of 35+ free, privacy-first PDF and document utilities on ZipStream. Compress, merge, split, convert, redact, encrypt, and edit online.';

  const semanticShell = `
    <article class="w-full max-w-6xl mx-auto px-4 sm:px-6 pt-6 pb-16 space-y-12" style="font-family: Inter, system-ui, -apple-system, sans-serif;">
      <nav aria-label="Breadcrumb" class="flex items-center gap-2 text-xs text-[#5C6479]">
        <a href="/" class="font-semibold text-[#0C162C]">Home</a>
        <span>/</span>
        <span class="font-bold text-[#055EFE]">PDF Tools Directory</span>
      </nav>
      <header class="space-y-4 max-w-3xl">
        <h1 class="text-3xl sm:text-5xl font-black text-[#0C162C]">All Free Online PDF & Document Tools</h1>
        <p class="text-base sm:text-lg text-[#5C6479]">Explore our complete directory of privacy-first PDF utilities. 100% on-device WebAssembly processing with zero file uploads or account required.</p>
      </header>
      <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        ${TOOL_ROUTES.map((r) => `
          <a href="${r.path}" class="p-5 rounded-2xl border border-[#0C162C]/10 bg-white hover:border-[#055EFE] transition-all block">
            <h2 class="text-base font-bold text-[#0C162C]">${r.toolTitle}</h2>
            <p class="text-xs text-[#5C6479] mt-2">${r.description}</p>
            <span class="text-xs font-bold text-[#055EFE] mt-3 inline-block">Open Tool →</span>
          </a>
        `).join('')}
      </div>
    </article>
  `;

  let html = baseHtml;
  html = html.replace(/<title>.*?<\/title>/i, `<title>${title}</title>`);
  html = html.replace(/<meta\s+name="description"\s+content=".*?"\s*\/?>/i, `<meta name="description" content="${description}" />`);
  html = html.replace(/<link\s+rel="canonical"\s+href=".*?"\s*\/?>/i, `<link rel="canonical" href="${canonicalUrl}" />`);
  html = html.replace(/<div id="root">[\s\S]*?<\/div>/i, `<div id="root">${semanticShell}</div>`);
  return html;
}

export function prerenderAllRoutes() {
  const indexHtmlPath = path.join(DIST_DIR, 'index.html');
  if (!fs.existsSync(indexHtmlPath)) {
    console.error('Error: dist/index.html not found. Run vite build first.');
    return;
  }

  const baseHtml = fs.readFileSync(indexHtmlPath, 'utf-8');
  console.log('⚡ Prerendering SEO static routes with full HTML, H1, FAQ, schema & internal links...');

  // Prerender Tool Routes
  for (const route of TOOL_ROUTES) {
    const routeDir = path.join(DIST_DIR, route.path.replace(/^\//, ''));
    if (!fs.existsSync(routeDir)) {
      fs.mkdirSync(routeDir, { recursive: true });
    }
    const routeHtml = generatePrerenderHtml(baseHtml, route);
    fs.writeFileSync(path.join(routeDir, 'index.html'), routeHtml, 'utf-8');
    console.log(`  ✓ Prerendered ${route.path}/index.html`);
  }

  // Prerender /pdf-tools directory
  const dirPath = path.join(DIST_DIR, 'pdf-tools');
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
  }
  const dirHtml = generateDirectoryHtml(baseHtml);
  fs.writeFileSync(path.join(dirPath, 'index.html'), dirHtml, 'utf-8');
  console.log('  ✓ Prerendered /pdf-tools/index.html');

  // Verify and update sitemap.xml in dist/
  const sitemapPath = path.join(DIST_DIR, 'sitemap.xml');
  const allUrls = [
    { loc: 'https://zipstream.online/', priority: '1.0', changefreq: 'daily' },
    { loc: 'https://zipstream.online/pdf-tools', priority: '0.9', changefreq: 'daily' },
    { loc: 'https://zipstream.online/about', priority: '0.7', changefreq: 'monthly' },
    ...TOOL_ROUTES.map((r) => ({
      loc: `https://zipstream.online${r.path}`,
      priority: '0.9',
      changefreq: 'weekly',
    })),
  ];

  const sitemapXml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${allUrls.map((u) => `  <url>
    <loc>${u.loc}</loc>
    <lastmod>${new Date().toISOString().split('T')[0]}</lastmod>
    <changefreq>${u.changefreq}</changefreq>
    <priority>${u.priority}</priority>
  </url>`).join('\n')}
</urlset>`;

  fs.writeFileSync(sitemapPath, sitemapXml, 'utf-8');
  console.log(`  ✓ Generated updated sitemap.xml with ${allUrls.length} canonical URLs.`);
  console.log('🎉 Prerendering complete! All routes are indexable static HTML for Googlebot.');
}

// Execute when run directly
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  prerenderAllRoutes();
}
