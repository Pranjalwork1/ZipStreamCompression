import React from 'react';
import {
  FileText,
  Layers,
  Scissors,
  Stamp,
  Lock,
  Unlock,
  Shield,
  EyeOff,
  Search,
  Sparkles,
  GitCompare,
  Wrench,
  Camera,
  Share2,
  Receipt,
  FileSpreadsheet,
  Presentation,
  Image as ImageIcon,
  ArrowRight,
  Home,
  CheckCircle2,
} from 'lucide-react';
import { TOOL_PAGES, getToolPage } from './ToolLandingPage';
import { ToolMode, FileCategory } from '../types';

interface PdfToolsDirectoryProps {
  onSelectTool: (tool: ToolMode, targetCategory?: FileCategory) => void;
  onNavigateHome: () => void;
}

interface ToolCategoryGroup {
  name: string;
  description: string;
  tools: Array<{
    path: string;
    tool: ToolMode;
    name: string;
    description: string;
    badge?: string;
  }>;
}

export const PDF_TOOL_CATEGORIES: ToolCategoryGroup[] = [
  {
    name: 'Compress & Optimize',
    description: 'Reduce file sizes while preserving vector text and crisp image quality on-device.',
    tools: [
      { path: '/compress-pdf', tool: 'compress', name: 'Compress PDF', description: 'Drastically reduce PDF file size with adjustable quality levels.', badge: 'Popular' },
      { path: '/repair-pdf', tool: 'repair_pdf', name: 'Repair PDF', description: 'Reconstruct corrupted cross-reference tables and recover pages.' },
      { path: '/compare-pdf', tool: 'compare_pdfs', name: 'Compare PDF', description: 'Side-by-side visual and structural difference highlighting.' },
    ],
  },
  {
    name: 'Merge, Split & Organize',
    description: 'Combine multiple documents, extract custom page ranges, and rearrange pages.',
    tools: [
      { path: '/edit-pdf', tool: 'edit_pdf', name: 'Edit PDF', description: 'Add text, images, shapes, highlights, comments, and drawings online.', badge: 'New' },
      { path: '/workflows', tool: 'workflows', name: 'Automated PDF Workflows', description: 'Chain multiple tools sequentially (Merge → Compress → Convert) in one automated pipeline.', badge: 'New' },
      { path: '/merge-pdf', tool: 'merge_pdf', name: 'Merge PDF', description: 'Combine multiple PDF files into one neatly organized document.', badge: 'Popular' },
      { path: '/split-pdf', tool: 'split_pdf', name: 'Split PDF', description: 'Separate pages or extract custom page intervals into new PDFs.' },
      { path: '/scan-document', tool: 'scan_document', name: 'Camera Scanner', description: 'Capture documents with smartphone or webcam with auto-border detection.' },
    ],
  },
  {
    name: 'Convert from PDF',
    description: 'Export PDF documents into editable Office formats, high-res images, and text.',
    tools: [
      { path: '/pdf-to-word', tool: 'pdf_to_word', name: 'PDF to Word', description: 'Extract formatted text and tables into editable DOCX files.', badge: 'Popular' },
      { path: '/pdf-to-excel', tool: 'pdf_to_excel', name: 'PDF to Excel', description: 'Extract spreadsheet tables into Microsoft Excel (.xlsx) files.' },
      { path: '/pdf-to-powerpoint', tool: 'pdf_to_powerpoint', name: 'PDF to PowerPoint', description: 'Convert presentation slides into editable PPTX decks.' },
      { path: '/pdf-to-jpg', tool: 'pdf_to_jpg', name: 'PDF to JPG', description: 'Export document pages into crisp JPG and PNG image files.' },
      { path: '/extract-text', tool: 'extract_text', name: 'Extract Text', description: 'Copy selectable text and Markdown without formatting clutter.' },
    ],
  },
  {
    name: 'Convert to PDF',
    description: 'Compile photos, Word files, spreadsheets, and slides into professional PDFs.',
    tools: [
      { path: '/jpg-to-pdf', tool: 'images_to_pdf', name: 'JPG to PDF', description: 'Compile JPG, PNG, and WebP photos into a multi-page PDF.', badge: 'Popular' },
      { path: '/word-to-pdf', tool: 'word_to_pdf', name: 'Word to PDF', description: 'Convert DOCX and DOC files with full vector and layout fidelity.' },
      { path: '/excel-to-pdf', tool: 'xlsx_to_pdf', name: 'Excel to PDF', description: 'Convert XLSX spreadsheets into clean, printable PDF documents.' },
      { path: '/powerpoint-to-pdf', tool: 'pptx_to_pdf', name: 'PowerPoint to PDF', description: 'Convert PPTX slide presentations into standard PDF files.' },
      { path: '/html-to-pdf', tool: 'html_to_pdf', name: 'HTML to PDF', description: 'Convert web HTML files or raw code into PDF documents.' },
    ],
  },
  {
    name: 'Security & Privacy',
    description: 'Bank-grade encryption, privacy stripping, permanent PII blackouts, and watermarking.',
    tools: [
      { path: '/protect-pdf', tool: 'encrypt_pdf', name: 'Protect PDF', description: 'Encrypt documents with passwords and restrict unauthorized access.' },
      { path: '/unlock-pdf', tool: 'unlock_pdf', name: 'Unlock PDF', description: 'Remove password protection from authorized PDF files.' },
      { path: '/watermark-pdf', tool: 'watermark_pdf', name: 'Watermark PDF', description: 'Stamp custom text, copyright notices, and confidential marks.' },
      { path: '/redact-pdf', tool: 'auto_redact_pii', name: 'Auto-Redact PII', description: 'Automatically detect and permanently blackout SSNs, cards, and emails.' },
      { path: '/privacy-scanner', tool: 'privacy_scanner', name: 'Privacy Scanner', description: 'Inspect and remove hidden author names, GPS tags, and metadata.' },
    ],
  },
  {
    name: 'AI, OCR & Collaboration',
    description: 'Smart document intelligence, text extraction from scans, and direct P2P sharing.',
    tools: [
      { path: '/ocr-pdf', tool: 'searchable_pdf', name: 'Searchable PDF (OCR)', description: 'Synthesize selectable text layers over scanned image documents.' },
      { path: '/summarize-pdf', tool: 'ai_summarize', name: 'Summarize PDF', description: 'Generate concise executive summaries and bullet points with AI.' },
      { path: '/chat-pdf', tool: 'chat_pdf', name: 'Chat with PDF', description: 'Ask questions and converse with complex documents in natural language.' },
      { path: '/p2p-share', tool: 'p2p_share', name: 'Private P2P Share', description: 'Direct browser-to-browser encrypted file transfer with zero cloud storage.' },
      { path: '/gst-invoice', tool: 'gst_invoice', name: 'GST Invoice Generator', description: 'Create and export professional GST-compliant invoices with PDF download.' },
    ],
  },
];

export const PdfToolsDirectory: React.FC<PdfToolsDirectoryProps> = ({
  onSelectTool,
  onNavigateHome,
}) => {
  return (
    <div className="w-full max-w-6xl mx-auto space-y-12 pb-16 animate-fadeIn">
      {/* Breadcrumb Navigation */}
      <nav aria-label="Breadcrumb" className="flex items-center gap-2 text-xs text-[#5C6479] dark:text-white/60">
        <a
          href="/"
          onClick={(e) => {
            e.preventDefault();
            onNavigateHome();
          }}
          className="inline-flex items-center gap-1.5 font-semibold text-[#0C162C] dark:text-white hover:text-[#055EFE] transition-colors"
        >
          <Home className="w-3.5 h-3.5" />
          <span>Home</span>
        </a>
        <span>/</span>
        <span className="font-semibold text-[#055EFE] dark:text-[#528BFF]">PDF Tools Directory</span>
      </nav>

      {/* Directory Hero Header */}
      <header className="space-y-4 max-w-3xl">
        <div className="inline-flex items-center gap-2 rounded-full border border-[#055EFE]/20 bg-[#055EFE]/8 px-3.5 py-1.5 text-xs font-bold text-[#055EFE] dark:text-[#528BFF]">
          <Sparkles className="w-3.5 h-3.5" /> Complete Platform Catalog
        </div>
        <h1 className="text-3xl sm:text-5xl font-black tracking-tight text-[#0C162C] dark:text-white">
          All Free Online PDF &amp; Document Tools
        </h1>
        <p className="text-base sm:text-lg text-[#5C6479] dark:text-white/70 leading-relaxed font-normal">
          Explore our complete directory of privacy-first PDF and document utilities. Compress, merge, convert, redact, encrypt, and analyze documents directly inside your web browser with zero file uploads or account required.
        </p>
      </header>

      {/* Categorized Tools Grid */}
      <div className="space-y-12">
        {PDF_TOOL_CATEGORIES.map((category) => (
          <section key={category.name} aria-labelledby={`cat-${category.name.toLowerCase().replace(/\s+/g, '-')}`} className="space-y-5">
            <div className="border-b border-[#0C162C]/10 dark:border-white/10 pb-3">
              <h2
                id={`cat-${category.name.toLowerCase().replace(/\s+/g, '-')}`}
                className="text-xl sm:text-2xl font-bold text-[#0C162C] dark:text-white flex items-center gap-2"
              >
                <span>{category.name}</span>
              </h2>
              <p className="text-xs sm:text-sm text-[#5C6479] dark:text-white/60 mt-1">
                {category.description}
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {category.tools.map((item) => (
                <a
                  key={item.path}
                  href={item.path}
                  onClick={(e) => {
                    e.preventDefault();
                    window.history.pushState({}, '', item.path);
                    window.dispatchEvent(new PopStateEvent('popstate'));
                    onSelectTool(item.tool);
                  }}
                  className="group flex flex-col justify-between p-5 rounded-2xl bg-white dark:bg-[#111C38] border border-[#0C162C]/10 dark:border-white/10 hover:border-[#055EFE]/50 dark:hover:border-[#528BFF]/50 hover:shadow-md transition-all cursor-pointer"
                >
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-base font-bold text-[#0C162C] dark:text-white group-hover:text-[#055EFE] dark:group-hover:text-[#528BFF] transition-colors">
                        {item.name}
                      </span>
                      {item.badge && (
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-[#055EFE]/10 text-[#055EFE] dark:text-[#528BFF]">
                          {item.badge}
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-[#5C6479] dark:text-white/60 leading-relaxed">
                      {item.description}
                    </p>
                  </div>
                  <div className="pt-4 flex items-center text-xs font-bold text-[#055EFE] dark:text-[#528BFF] gap-1 group-hover:gap-2 transition-all">
                    <span>Open tool</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </div>
                </a>
              ))}
            </div>
          </section>
        ))}
      </div>
    </div>
  );
};
