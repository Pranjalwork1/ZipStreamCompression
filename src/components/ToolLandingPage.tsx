import React from 'react';
import {
  ArrowRight,
  ArrowLeft,
  CheckCircle2,
  Lock,
  ShieldCheck,
  Zap,
  Home,
  ChevronRight,
} from 'lucide-react';
import type { ToolMode } from '../types';

export interface ToolPageDefinition {
  path: string;
  tool: ToolMode;
  title: string;
  description: string;
  intro: string;
  keywords: string[];
  benefits: string[];
  steps: string[];
  related: string[];
  faqs: Array<{ question: string; answer: string }>;
}

export const TOOL_PAGES: ToolPageDefinition[] = [
  {
    path: '/compress-pdf', tool: 'compress', title: 'Compress PDF Online',
    description: 'Reduce PDF file size online with fast, privacy-first compression in your browser.',
    intro: 'Make large PDF documents easier to email, upload, and share. Choose a quality level and download the optimized file without creating an account.',
    keywords: ['compress PDF online', 'reduce PDF size', 'PDF compressor', 'shrink PDF'],
    benefits: ['Adjust quality and target size', 'Preview the result before downloading', 'Process supported files locally in your browser'],
    steps: ['Choose a PDF from your device', 'Select compression quality and options', 'Download the compressed PDF'],
    related: ['/merge-pdf', '/split-pdf', '/watermark-pdf'],
    faqs: [
      { question: 'Can I compress a PDF for email?', answer: 'Yes. Use the email or target-size settings to reduce a large PDF before attaching it.' },
      { question: 'Are my compression files uploaded?', answer: 'Core compression runs in the browser. P2P sharing is a separate session feature that uses the active signaling service.' },
    ],
  },
  {
    path: '/merge-pdf', tool: 'merge_pdf', title: 'Merge PDF Files Online',
    description: 'Combine multiple PDF files into one organized document in your browser.',
    intro: 'Join reports, invoices, assignments, or scanned pages into a single PDF. Arrange documents before exporting the final file.',
    keywords: ['merge PDF', 'combine PDF files', 'join PDF documents'],
    benefits: ['Combine multiple documents', 'Keep page order under your control', 'Export one clean PDF'],
    steps: ['Select two or more PDF files', 'Arrange the files in the desired order', 'Merge and download the result'],
    related: ['/compress-pdf', '/split-pdf', '/images-to-pdf'],
    faqs: [{ question: 'How many PDFs can I merge?', answer: 'The practical limit depends on available browser memory and the size of the selected documents.' }],
  },
  {
    path: '/split-pdf', tool: 'split_pdf', title: 'Split PDF Online',
    description: 'Split a PDF into page ranges or extract individual pages with ZipStream.',
    intro: 'Extract only the pages you need from a large PDF. Enter page ranges or create separate page files for sharing and archiving.',
    keywords: ['split PDF', 'extract PDF pages', 'PDF page extractor'],
    benefits: ['Extract custom page ranges', 'Create separate pages in a ZIP', 'Keep processing in your browser'],
    steps: ['Choose a PDF', 'Enter page numbers or select all pages', 'Export the extracted pages'],
    related: ['/compress-pdf', '/merge-pdf', '/pdf-to-jpg'],
    faqs: [{ question: 'Can I extract selected pages?', answer: 'Yes. Use ranges such as 1-3, 5, or 8-10.' }],
  },
  {
    path: '/images-to-pdf', tool: 'images_to_pdf', title: 'JPG and PNG Images to PDF',
    description: 'Convert JPG, PNG, and WebP images into a multi-page PDF online.',
    intro: 'Turn photos, receipts, screenshots, and scanned images into a neatly ordered PDF with page-size and quality controls.',
    keywords: ['JPG to PDF', 'PNG to PDF', 'images to PDF', 'photos to PDF'],
    benefits: ['Combine many images into one PDF', 'Choose page size and orientation', 'Adjust image quality before export'],
    steps: ['Select or drop your images', 'Arrange images and choose page settings', 'Create and download your PDF'],
    related: ['/compress-pdf', '/merge-pdf', '/scan-document'],
    faqs: [{ question: 'Can I convert phone photos to PDF?', answer: 'Yes. Select JPG, PNG, or WebP photos from your phone or computer.' }],
  },
  {
    path: '/scan-document', tool: 'scan_document', title: 'Scan Documents Online',
    description: 'Use your device camera to scan documents and export clean PDFs.',
    intro: 'Capture receipts, notes, forms, and paperwork with your camera. Enhance contrast and export a shareable PDF without installing an app.',
    keywords: ['scan document online', 'camera PDF scanner', 'receipt scanner'],
    benefits: ['Use a phone or laptop camera', 'Enhance contrast and grayscale', 'Export scanned pages as PDF'],
    steps: ['Allow camera access', 'Capture and review each page', 'Export the scanned document'],
    related: ['/images-to-pdf', '/compress-pdf', '/split-pdf'],
    faqs: [{ question: 'Does scanning require an app?', answer: 'No. The scanner runs in a compatible modern browser with camera permission.' }],
  },
  {
    path: '/watermark-pdf', tool: 'watermark_pdf', title: 'Watermark PDF Online',
    description: 'Add confidential, copyright, draft, or custom watermarks to PDF files.',
    intro: 'Protect and label documents before sharing them. Customize watermark text, position, color, opacity, size, and rotation.',
    keywords: ['watermark PDF', 'add stamp to PDF', 'confidential PDF'],
    benefits: ['Customize text and placement', 'Set opacity and rotation', 'Download a new watermarked PDF'],
    steps: ['Select a PDF', 'Configure the watermark style', 'Apply and download the PDF'],
    related: ['/compress-pdf', '/merge-pdf', '/split-pdf'],
    faqs: [{ question: 'Can I add a confidential stamp?', answer: 'Yes. Enter CONFIDENTIAL or any custom text and choose its placement.' }],
  },
  {
    path: '/pdf-to-word', tool: 'pdf_to_word', title: 'PDF to Word Converter',
    description: 'Convert PDF text into an editable Word document directly in your browser.',
    intro: 'Extract text from a PDF and download an editable DOCX document. Results depend on the structure and text layer of the source PDF.',
    keywords: ['PDF to Word', 'convert PDF to DOCX', 'editable PDF text'],
    benefits: ['Extract selectable PDF text', 'Download DOCX output', 'Keep files in your browser for this conversion'],
    steps: ['Select a PDF with a text layer', 'Review the extracted content', 'Download the Word document'],
    related: ['/compress-pdf', '/pdf-to-excel', '/pdf-to-jpg'],
    faqs: [{ question: 'Will scanned PDFs convert perfectly?', answer: 'Image-only scans need OCR first; text extraction works best when the PDF contains selectable text.' }],
  },
  {
    path: '/pdf-to-excel', tool: 'pdf_to_excel', title: 'PDF to Excel Converter',
    description: 'Extract structured PDF content into spreadsheet-friendly Excel files.',
    intro: 'Turn supported PDF tables and document content into spreadsheet output for analysis and editing.',
    keywords: ['PDF to Excel', 'convert PDF to XLSX', 'extract PDF tables'],
    benefits: ['Create spreadsheet output', 'Useful for supported tables and reports', 'Download results locally'],
    steps: ['Select a PDF', 'Choose the spreadsheet conversion tool', 'Review and download the output'],
    related: ['/pdf-to-word', '/compress-pdf', '/merge-pdf'],
    faqs: [{ question: 'Does every PDF table convert exactly?', answer: 'Conversion quality depends on the source layout, text layer, and table structure.' }],
  },
  {
    path: '/pdf-to-jpg', tool: 'pdf_to_jpg', title: 'PDF to JPG Converter',
    description: 'Convert PDF pages into JPG or PNG images for sharing and reuse.',
    intro: 'Render PDF pages as image files with convenient export options for presentations, websites, and social sharing.',
    keywords: ['PDF to JPG', 'PDF to PNG', 'convert PDF pages to images'],
    benefits: ['Render individual PDF pages', 'Choose image output options', 'Package multiple pages for download'],
    steps: ['Select a PDF', 'Choose image format and quality', 'Download the converted pages'],
    related: ['/images-to-pdf', '/compress-pdf', '/split-pdf'],
    faqs: [{ question: 'Can I convert only selected pages?', answer: 'Use the page selection controls in the converter when available for the chosen output.' }],
  },
  {
    path: '/pdf-to-powerpoint', tool: 'pdf_to_powerpoint', title: 'PDF to PowerPoint Converter',
    description: 'Convert PDF pages into PowerPoint presentations with ZipStream.',
    intro: 'Turn supported PDF pages into editable presentation slides for meetings, teaching, and project reviews.',
    keywords: ['PDF to PowerPoint', 'PDF to PPTX', 'convert PDF to slides'],
    benefits: ['Create PPTX presentation output', 'Convert supported PDF pages', 'Download the result without an account'],
    steps: ['Select a PDF', 'Choose the PowerPoint conversion tool', 'Review and download the presentation'],
    related: ['/pdf-to-word', '/pdf-to-jpg', '/compress-pdf'],
    faqs: [{ question: 'Will complex PDF layouts convert exactly?', answer: 'Output quality depends on the source PDF layout, fonts, graphics, and text structure.' }],
  },
];

const ADDITIONAL_TOOL_PAGES: ToolPageDefinition[] = [
  ['extract-text', 'extract_text', 'Extract Text from PDF', 'Extract selectable text from PDF documents online.'],
  ['pdf-to-html', 'pdf_to_html', 'PDF to HTML Converter', 'Convert PDF content into responsive HTML for web publishing.'],
  ['pdf-to-audio', 'pdf_to_audio', 'PDF to Audio Reader', 'Listen to PDF text with browser speech tools.'],
  ['pdf-to-epub', 'pdf_to_epub', 'PDF to EPUB Converter', 'Prepare supported PDF content for ebook readers.'],
  ['protect-pdf', 'encrypt_pdf', 'Protect PDF with a Password', 'Add password protection to supported PDF documents.'],
  ['unlock-pdf', 'unlock_pdf', 'Unlock PDF Online', 'Remove protection from PDFs when you have authorization.'],
  ['redact-pdf', 'auto_redact_pii', 'Redact Sensitive PDF Information', 'Find and cover sensitive information before sharing a PDF.'],
  ['privacy-scanner', 'privacy_scanner', 'Scan PDF Privacy Metadata', 'Inspect and remove supported PDF metadata before sharing.'],
  ['file-fingerprint', 'fingerprint_gen', 'Generate a File Fingerprint', 'Create a SHA integrity fingerprint for a document.'],
  ['chat-pdf', 'chat_pdf', 'Chat with a PDF', 'Ask questions about a PDF using the ZipStream document assistant.'],
  ['summarize-pdf', 'ai_summarize', 'Summarize a PDF', 'Create a concise summary of supported PDF content.'],
  ['ocr-pdf', 'searchable_pdf', 'Create a Searchable PDF', 'Add searchable text to supported scanned documents with OCR.'],
  ['compare-pdf', 'compare_pdfs', 'Compare PDF Documents', 'Review differences between two document versions.'],
  ['repair-pdf', 'repair_pdf', 'Repair a PDF', 'Try to recover supported damaged PDF structures in your browser.'],
  ['gst-invoice', 'gst_invoice', 'Create a GST Invoice', 'Build a professional GST invoice with tax calculations and PDF export.'],
  ['pos-billing', 'pos_billing', 'Create a POS Billing Slip', 'Create a practical POS receipt with UPI QR support.'],
  ['gst-filing-prep', 'gst_filing_prep', 'GST Filing & Return Preparation', 'Prepare and organize GST sales summaries, B2B invoices, and return files.'],
  ['p2p-share', 'p2p_share', 'Share a File with P2P', 'Create a browser-based session for direct document sharing.'],
  ['collaborative-whiteboard', 'collab_whiteboard', 'Collaborative Whiteboard', 'Open a browser-based collaborative whiteboard for visual work.'],
  // Convert to PDF
  ['jpg-to-pdf', 'images_to_pdf', 'JPG to PDF Converter', 'Convert JPG, PNG, WebP and other images into a PDF online. Free and private — no upload needed.'],
  ['word-to-pdf', 'word_to_pdf', 'Word to PDF Converter', 'Convert Word DOCX and DOC files to PDF with full layout fidelity, vector text, tables, and images. Private containerized conversion.'],
  ['powerpoint-to-pdf', 'pptx_to_pdf', 'PowerPoint to PDF Converter', 'Convert PowerPoint PPTX presentations to PDF online. Every slide exported — no signup required.'],
  ['excel-to-pdf', 'xlsx_to_pdf', 'Excel to PDF Converter', 'Convert Excel XLSX spreadsheets to PDF free online. Clean, printable PDF from any spreadsheet data.'],
  ['html-to-pdf', 'html_to_pdf', 'HTML to PDF Converter', 'Convert any HTML file or paste HTML code to PDF free. 100% browser-based with instant download.'],
].map(([slug, tool, title, description]) => ({

  path: `/${slug}`,
  tool: tool as ToolMode,
  title,
  description,
  intro: `${description} Use the existing ZipStream tool interface below to get started without a forced account.`,
  keywords: [title, 'online document tool', 'ZipStream'],
  benefits: ['No forced signup', 'Clear browser-based workflow', 'Download your result locally'],
  steps: ['Choose the tool and select your file', 'Review the available settings', 'Process and download the result'],
  related: ['/compress-pdf', '/merge-pdf', '/split-pdf'],
  faqs: [{ question: `What does ${title.toLowerCase()} support?`, answer: description }],
}));

TOOL_PAGES.push(...ADDITIONAL_TOOL_PAGES);

export function getToolPage(pathname: string): ToolPageDefinition | undefined {
  const normalized = pathname.replace(/\/$/, '') || '/';
  if (normalized === '/') return undefined;
  return TOOL_PAGES.find((page) => page.path === normalized);
}

export function getToolPageForTool(tool: ToolMode): ToolPageDefinition | undefined {
  return TOOL_PAGES.find((page) => page.tool === tool);
}

export function isToolPath(pathname: string): boolean {
  const normalized = pathname.replace(/\/$/, '') || '/';
  if (normalized === '/') return false;
  return TOOL_PAGES.some((page) => page.path === normalized);
}

interface ToolLandingPageProps {
  page?: ToolPageDefinition;
  onBackToHome?: () => void;
  onNavigate?: (path: string, tool?: ToolMode) => void;
  children: React.ReactNode;
}

export const ToolLandingPage: React.FC<ToolLandingPageProps> = ({
  page,
  onBackToHome,
  onNavigate,
  children,
}) => {
  if (!page) return <>{children}</>;

  const handleToolClick = (path: string) => {
    if (onNavigate) {
      const targetPage = getToolPage(path);
      onNavigate(path, targetPage?.tool);
    } else if (onBackToHome) {
      window.history.pushState({}, '', path);
      window.dispatchEvent(new PopStateEvent('popstate'));
    }
  };

  return (
    <article className="w-full space-y-8 animate-fadeIn">
      {/* Top Breadcrumb & Navigation Bar */}
      <div className="flex items-center justify-between gap-4 pb-3 border-b border-[#0C162C]/8 dark:border-white/10 text-xs">
        <div className="flex items-center gap-2 text-[#5C6479] dark:text-white/60">
          <button
            type="button"
            onClick={onBackToHome}
            className="inline-flex items-center gap-1.5 font-semibold text-[#0C162C] dark:text-white hover:text-[#055EFE] dark:hover:text-[#528BFF] transition-colors cursor-pointer"
          >
            <Home className="w-3.5 h-3.5" />
            <span>Home</span>
          </button>
          <ChevronRight className="w-3.5 h-3.5 text-[#5C6479]/40 dark:text-white/30" />
          <span className="font-semibold text-[#055EFE] dark:text-[#528BFF] truncate max-w-[200px] sm:max-w-md">
            {page.title}
          </span>
        </div>
        <button
          type="button"
          onClick={onBackToHome}
          className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-black/5 dark:bg-white/10 hover:bg-black/10 dark:hover:bg-white/15 text-xs font-bold text-[#0C162C] dark:text-white transition-all cursor-pointer shadow-xs shrink-0"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Back to All Tools</span>
        </button>
      </div>

      {/* Hero Header */}
      <header className="max-w-3xl space-y-4">
        <div className="inline-flex items-center gap-2 rounded-full border border-[#055EFE]/20 bg-[#055EFE]/8 px-3.5 py-1.5 text-xs font-bold text-[#055EFE] dark:text-[#528BFF]">
          <Zap className="h-3.5 w-3.5 text-[#055EFE]" /> ZipStream browser tool
        </div>
        <h1 className="text-3xl font-black tracking-tight text-[#0C162C] dark:text-white sm:text-4xl lg:text-5xl">
          {page.title}
        </h1>
        <p className="max-w-2xl text-base sm:text-lg leading-relaxed text-[#5C6479] dark:text-white/70">
          {page.intro}
        </p>
        <div className="flex flex-wrap gap-2 text-xs font-semibold text-[#5C6479] dark:text-white/65 pt-1">
          {page.keywords.map((keyword) => (
            <span
              key={keyword}
              className="rounded-full border border-[#0C162C]/10 bg-white/70 px-3 py-1.5 dark:border-white/10 dark:bg-white/5"
            >
              {keyword}
            </span>
          ))}
        </div>
      </header>

      {/* Main Interactive Tool Workbench */}
      <section aria-label={`${page.title} tool`} className="scroll-mt-24 pt-2">
        <div className="rounded-3xl border border-[#0C162C]/10 bg-white/90 p-4 sm:p-6 shadow-sm dark:border-white/10 dark:bg-[#111C38]/90 backdrop-blur-sm">
          {children}
        </div>
      </section>

      {/* Value Proposition / Benefits */}
      <section className="grid gap-4 sm:grid-cols-3" aria-label="Benefits">
        {page.benefits.map((benefit) => (
          <div
            key={benefit}
            className="rounded-2xl border border-[#0C162C]/10 bg-white/80 p-5 shadow-xs dark:border-white/10 dark:bg-[#111C38]"
          >
            <CheckCircle2 className="mb-3 h-5 w-5 text-emerald-500" />
            <p className="text-sm font-bold text-[#0C162C] dark:text-white">{benefit}</p>
          </div>
        ))}
      </section>

      {/* How to Use & Privacy Guarantee */}
      <section className="grid gap-6 lg:grid-cols-2">
        <div className="rounded-2xl border border-[#0C162C]/10 bg-white/80 p-6 shadow-xs dark:border-white/10 dark:bg-[#111C38]">
          <h2 className="mb-4 text-xl font-bold text-[#0C162C] dark:text-white">
            How to use {page.title.toLowerCase()}
          </h2>
          <ol className="space-y-3">
            {page.steps.map((step, index) => (
              <li key={step} className="flex gap-3 text-sm text-[#5C6479] dark:text-white/70">
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-gradient-to-b from-[#0077ff] to-[#055efe] text-xs font-bold text-white shadow-xs">
                  {index + 1}
                </span>
                <span className="pt-0.5">{step}</span>
              </li>
            ))}
          </ol>
        </div>
        <div className="rounded-2xl border border-emerald-500/20 bg-emerald-500/5 p-6 dark:bg-emerald-500/10 flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-2 text-base font-bold text-emerald-700 dark:text-emerald-300">
              <ShieldCheck className="h-5 w-5" /> Privacy-first processing
            </div>
            <p className="mt-3 text-sm leading-relaxed text-[#5C6479] dark:text-white/70">
              ZipStream processes your files directly inside your web browser using HTML5 Canvas, WebAssembly, and local workers where possible. Your documents stay safe on your device.
            </p>
          </div>
          <div className="mt-5 flex items-center gap-2 text-xs font-bold text-[#0C162C] dark:text-white/80">
            <Lock className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
            <span>No account or forced signup required</span>
          </div>
        </div>
      </section>

      {/* Frequently Asked Questions */}
      {page.faqs.length > 0 && (
        <section className="space-y-4">
          <h2 className="text-xl font-bold text-[#0C162C] dark:text-white">
            Frequently asked questions
          </h2>
          <div className="grid gap-3">
            {page.faqs.map((faq) => (
              <details
                key={faq.question}
                className="group rounded-2xl border border-[#0C162C]/10 bg-white/70 p-5 dark:border-white/10 dark:bg-[#111C38] transition-all"
              >
                <summary className="cursor-pointer text-sm font-bold text-[#0C162C] dark:text-white flex items-center justify-between list-none">
                  <span>{faq.question}</span>
                  <span className="text-[#055EFE] group-open:rotate-180 transition-transform text-lg">▼</span>
                </summary>
                <p className="mt-3 text-sm leading-relaxed text-[#5C6479] dark:text-white/70 border-t border-[#0C162C]/5 dark:border-white/5 pt-3">
                  {faq.answer}
                </p>
              </details>
            ))}
          </div>
        </section>
      )}

      {/* Related Tools navigation */}
      {page.related.length > 0 && (
        <nav aria-label="Related tools" className="border-t border-[#0C162C]/10 pt-6 dark:border-white/10 space-y-3">
          <h2 className="text-xs font-bold uppercase tracking-wider text-[#5C6479] dark:text-white/60">
            Related tools
          </h2>
          <div className="flex flex-wrap gap-2.5">
            {page.related.map((path) => (
              <button
                key={path}
                type="button"
                onClick={() => handleToolClick(path)}
                className="inline-flex items-center gap-1.5 rounded-full border border-[#055EFE]/20 bg-white/70 dark:bg-white/5 px-4 py-2 text-xs font-bold text-[#055EFE] hover:bg-[#055EFE]/10 dark:text-[#528BFF] transition-colors cursor-pointer"
              >
                <span>{path.slice(1).replaceAll('-', ' ')}</span>
                <ArrowRight className="h-3 w-3" />
              </button>
            ))}
          </div>
        </nav>
      )}
    </article>
  );
};
