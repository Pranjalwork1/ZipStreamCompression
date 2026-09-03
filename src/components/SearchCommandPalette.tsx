import React, { useState, useEffect, useRef } from 'react';
import {
  Search,
  FileText,
  FilePlus,
  Camera,
  Layers,
  Scissors,
  Stamp,
  Music,
  Film,
  Sparkles,
  ArrowRight,
  Command,
  X,
  Check,
  FileSpreadsheet,
  Presentation,
  Image as ImageIcon,
  Code,
  Volume2,
  BookOpen,
  Lock,
  Unlock,
  EyeOff,
  Shield,
  Fingerprint,
  MessageSquare,
  GitCompare,
  Wrench,
  Receipt,
  QrCode,
  Share2,
  PenTool,
} from 'lucide-react';
import { ToolMode, FileCategory, SearchToolItem } from '../types';

interface SearchCommandPaletteProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectTool: (tool: ToolMode, category?: FileCategory) => void;
}

export const ALL_TOOLS: SearchToolItem[] = [
  // Existing Core
  {
    id: 'merge_pdf',
    name: 'Merge PDF',
    category: 'PDF Tools',
    description: 'Combine multiple PDF documents into a single, organized file.',
    badge: 'Popular',
    keywords: ['merge', 'combine', 'join', 'pdf', 'append', 'pages', 'ihatepdf', 'ilovepdf'],
    iconName: 'FilePlus',
  },
  {
    id: 'scan_document',
    name: 'Scan Document',
    category: 'Scanning & Conversion',
    description: 'Capture documents with your camera or photos, enhance text, and export as PDF.',
    badge: 'New',
    keywords: ['scan', 'scanner', 'camera', 'document', 'ocr', 'paper', 'receipt', 'photo to pdf', 'camscanner'],
    iconName: 'Camera',
  },
  {
    id: 'compress',
    name: 'Compress PDF',
    category: 'Compression',
    description: 'Reduce PDF file size while maintaining sharp text and vector graphics.',
    badge: 'Fast',
    keywords: ['compress', 'pdf', 'shrink', 'reduce size', 'optimize', 'deflate', 'email pdf'],
    iconName: 'FileText',
    targetCategory: 'pdf',
  },
  {
    id: 'images_to_pdf',
    name: 'Images to PDF (JPG to PDF)',
    category: 'Scanning & Conversion',
    description: 'Convert JPG, PNG, and WebP images into a single multi-page PDF.',
    keywords: ['jpg to pdf', 'png to pdf', 'image to pdf', 'convert photos', 'album to pdf', 'pictures'],
    iconName: 'Sparkles',
  },
  {
    id: 'split_pdf',
    name: 'Split & Extract PDF',
    category: 'PDF Tools',
    description: 'Separate pages or extract specific page ranges into new PDF files.',
    keywords: ['split', 'extract', 'cut', 'pages', 'separate', 'range', 'remove pages'],
    iconName: 'Scissors',
  },
  {
    id: 'watermark_pdf',
    name: 'Watermark PDF',
    category: 'PDF Tools',
    description: 'Stamp custom text or confidential marks across your PDF document.',
    keywords: ['watermark', 'stamp', 'confidential', 'draft', 'protect', 'logo', 'copyright'],
    iconName: 'Stamp',
  },
  {
    id: 'compress',
    name: 'Compress Images',
    category: 'Compression',
    description: 'Compress photos, PNGs, and JPEGs with bicubic scaling & WebP conversion.',
    keywords: ['compress image', 'photo', 'jpg', 'png', 'webp', 'reduce image size'],
    iconName: 'Layers',
    targetCategory: 'image',
  },
  {
    id: 'compress',
    name: 'Compress Video',
    category: 'Compression',
    description: 'Reduce MP4, WebM, and MOV video file sizes on-device with rate control.',
    keywords: ['compress video', 'video', 'mp4', 'movie', 'clip', 'reduce video'],
    iconName: 'Film',
    targetCategory: 'video',
  },
  {
    id: 'compress',
    name: 'Compress Audio',
    category: 'Compression',
    description: 'Resample MP3, WAV, and voice recordings with 16-bit PCM stereo compaction.',
    keywords: ['compress audio', 'audio', 'mp3', 'wav', 'sound', 'voice memo', 'podcast'],
    iconName: 'Music',
    targetCategory: 'audio',
  },

  // Convert -> Other
  {
    id: 'pdf_to_word',
    name: 'PDF to Word',
    category: 'Convert',
    description: 'Convert PDF files to editable Microsoft Word (.docx) documents.',
    badge: 'Popular',
    keywords: ['pdf to word', 'docx', 'doc', 'convert pdf', 'editable word', 'microsoft word'],
    iconName: 'FileText',
  },
  {
    id: 'pdf_to_jpg',
    name: 'PDF to JPG',
    category: 'Convert',
    description: 'Extract PDF pages as high-resolution JPEG and PNG images.',
    keywords: ['pdf to jpg', 'pdf to image', 'jpeg', 'extract pictures', 'photo'],
    iconName: 'ImageIcon',
  },
  {
    id: 'pdf_to_excel',
    name: 'PDF to Excel',
    category: 'Convert',
    description: 'Detect tabular data in PDFs and export to Excel XLSX/CSV spreadsheets.',
    keywords: ['pdf to excel', 'xlsx', 'csv', 'tables', 'spreadsheet', 'accounting'],
    iconName: 'FileSpreadsheet',
  },
  {
    id: 'pdf_to_powerpoint',
    name: 'PDF to PowerPoint',
    category: 'Convert',
    description: 'Turn multi-page PDF documents into editable presentation slides (.pptx).',
    keywords: ['pdf to powerpoint', 'pptx', 'presentation', 'slides', 'deck'],
    iconName: 'Presentation',
  },
  {
    id: 'extract_text',
    name: 'Extract Text',
    category: 'Convert',
    description: 'Instant clean plain text and Markdown parser from any PDF.',
    keywords: ['extract text', 'txt', 'copy text', 'markdown', 'raw text'],
    iconName: 'FileText',
  },
  {
    id: 'pdf_to_html',
    name: 'PDF to HTML',
    category: 'Convert',
    description: 'Convert PDF pages into modern responsive HTML5 web pages.',
    keywords: ['pdf to html', 'web page', 'html5', 'responsive'],
    iconName: 'Code',
  },
  {
    id: 'pdf_to_audio',
    name: 'PDF to Audio',
    category: 'Convert',
    description: 'Listen to PDF documents with natural AI speech voice synthesis.',
    badge: 'Audio',
    keywords: ['pdf to audio', 'tts', 'text to speech', 'listen', 'read aloud', 'voice', 'mp3'],
    iconName: 'Volume2',
  },
  {
    id: 'pdf_to_epub',
    name: 'PDF to EPUB',
    category: 'Convert',
    description: 'Convert documents and articles into digital e-books for e-readers.',
    keywords: ['pdf to epub', 'ebook', 'kindle', 'ereader', 'books'],
    iconName: 'BookOpen',
  },

  // Security & Privacy
  {
    id: 'encrypt_pdf',
    name: 'Encrypt PDF',
    category: 'Security & Privacy',
    description: 'Add password protection and granular printing/copying permissions.',
    keywords: ['encrypt pdf', 'password protect', 'lock pdf', 'secure', 'aes'],
    iconName: 'Lock',
  },
  {
    id: 'unlock_pdf',
    name: 'Unlock PDF',
    category: 'Security & Privacy',
    description: 'Remove passwords from protected PDFs for unrestricted printing & editing.',
    keywords: ['unlock pdf', 'remove password', 'decrypt', 'unprotect'],
    iconName: 'Unlock',
  },
  {
    id: 'auto_redact_pii',
    name: 'Auto-Redact PII',
    category: 'Security & Privacy',
    description: 'Automatically detect and blackout SSNs, credit cards, emails, and phone numbers.',
    badge: 'AI Shield',
    keywords: ['auto redact', 'pii', 'redact', 'blackout', 'privacy', 'ssn', 'credit card'],
    iconName: 'EyeOff',
  },
  {
    id: 'privacy_scanner',
    name: 'Privacy Scanner',
    category: 'Security & Privacy',
    description: 'Audit and strip hidden document metadata, author tags, and GPS coordinates.',
    keywords: ['privacy scanner', 'strip metadata', 'clean pdf', 'gps', 'author info'],
    iconName: 'Shield',
  },
  {
    id: 'fingerprint_gen',
    name: 'Fingerprint Generator',
    category: 'Security & Privacy',
    description: 'Calculate cryptographic SHA-256 and SHA-512 integrity verification hashes.',
    keywords: ['fingerprint', 'sha256', 'hash', 'checksum', 'integrity', 'md5'],
    iconName: 'Fingerprint',
  },

  // AI Tools
  {
    id: 'chat_pdf',
    name: 'Chat with PDF',
    category: 'AI Tools',
    description: 'Ask questions, extract clauses, and converse with documents using Gemini AI.',
    badge: 'Gemini AI',
    keywords: ['chat with pdf', 'ai chat', 'ask pdf', 'gemini', 'questions', 'document ai'],
    iconName: 'MessageSquare',
  },
  {
    id: 'ai_summarize',
    name: 'AI Summarizer',
    category: 'AI Tools',
    description: 'Generate instant executive briefings, bullet points, and TL;DR summaries.',
    badge: 'AI',
    keywords: ['ai summarize', 'summary', 'tldr', 'executive summary', 'bullets', 'notes'],
    iconName: 'Sparkles',
  },
  {
    id: 'searchable_pdf',
    name: 'Searchable PDF (OCR)',
    category: 'AI Tools',
    description: 'Recognize scanned text layer to make scanned PDFs searchable & selectable.',
    keywords: ['searchable pdf', 'ocr', 'text recognition', 'scanned pdf'],
    iconName: 'Search',
  },
  {
    id: 'compare_pdfs',
    name: 'Compare PDFs',
    category: 'AI Tools',
    description: 'Side-by-side visual diff slider and discrepancy highlighting between two versions.',
    keywords: ['compare pdfs', 'diff', 'compare documents', 'version comparison', 'changes'],
    iconName: 'GitCompare',
  },
  {
    id: 'repair_pdf',
    name: 'Repair PDF',
    category: 'AI Tools',
    description: 'Rebuild damaged PDF headers, broken xref tables, and corrupted stream objects.',
    keywords: ['repair pdf', 'fix corrupt pdf', 'corrupted', 'restore', 'recover'],
    iconName: 'Wrench',
  },

  // Business
  {
    id: 'gst_invoice',
    name: 'GST Tax Invoice',
    category: 'Business',
    description: 'Generate professional Indian GST tax invoices with auto tax breakdown & print.',
    badge: 'Business',
    keywords: ['gst invoice', 'tax invoice', 'billing', 'invoice generator', 'cgst', 'sgst', 'igst'],
    iconName: 'Receipt',
  },
  {
    id: 'pos_billing',
    name: 'POS Billing Slip',
    category: 'Business',
    description: 'Point-of-sale thermal receipt printer with dynamic UPI payment QR code.',
    keywords: ['pos billing', 'receipt', 'thermal print', 'upi qr', 'counter billing'],
    iconName: 'QrCode',
  },
  {
    id: 'gst_filing_prep',
    name: 'GST Filing Prep',
    category: 'Business',
    description: 'GSTR-1 and GSTR-3B monthly tax summary sheet aggregator with export.',
    keywords: ['gst filing prep', 'gstr1', 'gstr3b', 'tax filing', 'accounting'],
    iconName: 'FileSpreadsheet',
  },

  // Collaborate & Share
  {
    id: 'p2p_share',
    name: 'P2P File Share',
    category: 'Collaborate',
    description: 'Direct browser-to-browser encrypted file streaming via WebRTC with zero cloud.',
    badge: 'P2P',
    keywords: ['p2p share', 'peer to peer', 'webrtc', 'file transfer', 'direct share', 'no cloud'],
    iconName: 'Share2',
  },
  {
    id: 'collab_whiteboard',
    name: 'Collab Whiteboard',
    category: 'Collaborate',
    description: 'Interactive canvas to markup, sketch, highlight, and annotate documents.',
    keywords: ['whiteboard', 'collab', 'annotate', 'markup', 'draw', 'sketch', 'pen'],
    iconName: 'PenTool',
  },
];

export const SearchCommandPalette: React.FC<SearchCommandPaletteProps> = ({
  isOpen,
  onClose,
  onSelectTool,
}) => {
  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  // Filter tools based on query
  const filteredTools = ALL_TOOLS.filter((tool) => {
    if (!query.trim()) return true;
    const q = query.toLowerCase().trim();
    return (
      tool.name.toLowerCase().includes(q) ||
      tool.description.toLowerCase().includes(q) ||
      tool.category.toLowerCase().includes(q) ||
      tool.keywords.some((k) => k.toLowerCase().includes(q))
    );
  });

  // Focus input on open
  useEffect(() => {
    if (isOpen) {
      setQuery('');
      setSelectedIndex(0);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [isOpen]);

  // Keyboard navigation inside palette
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isOpen) return;

      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSelectedIndex((prev) => (prev + 1) % Math.max(1, filteredTools.length));
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSelectedIndex((prev) => (prev - 1 + filteredTools.length) % Math.max(1, filteredTools.length));
      } else if (e.key === 'Enter') {
        e.preventDefault();
        if (filteredTools[selectedIndex]) {
          const item = filteredTools[selectedIndex];
          onSelectTool(item.id, item.targetCategory);
          onClose();
        }
      } else if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, filteredTools, selectedIndex, onSelectTool, onClose]);

  if (!isOpen) return null;

  const renderIcon = (iconName: string) => {
    switch (iconName) {
      case 'FilePlus':
        return <FilePlus className="w-4 h-4 text-[#ff3b30]" />;
      case 'Camera':
        return <Camera className="w-4 h-4 text-[#34c759]" />;
      case 'FileText':
        return <FileText className="w-4 h-4 text-[#0071e3]" />;
      case 'Sparkles':
        return <Sparkles className="w-4 h-4 text-[#af52de]" />;
      case 'Scissors':
        return <Scissors className="w-4 h-4 text-[#ff9500]" />;
      case 'Stamp':
        return <Stamp className="w-4 h-4 text-[#5856d6]" />;
      case 'Film':
        return <Film className="w-4 h-4 text-[#0071e3]" />;
      case 'Music':
        return <Music className="w-4 h-4 text-[#af52de]" />;
      case 'ImageIcon':
        return <ImageIcon className="w-4 h-4 text-[#ff2d55]" />;
      case 'FileSpreadsheet':
        return <FileSpreadsheet className="w-4 h-4 text-[#34c759]" />;
      case 'Presentation':
        return <Presentation className="w-4 h-4 text-[#ff9500]" />;
      case 'Code':
        return <Code className="w-4 h-4 text-[#5856d6]" />;
      case 'Volume2':
        return <Volume2 className="w-4 h-4 text-[#0071e3]" />;
      case 'BookOpen':
        return <BookOpen className="w-4 h-4 text-[#af52de]" />;
      case 'Lock':
        return <Lock className="w-4 h-4 text-[#34c759]" />;
      case 'Unlock':
        return <Unlock className="w-4 h-4 text-[#ff9500]" />;
      case 'EyeOff':
        return <EyeOff className="w-4 h-4 text-[#ff3b30]" />;
      case 'Shield':
        return <Shield className="w-4 h-4 text-[#0071e3]" />;
      case 'Fingerprint':
        return <Fingerprint className="w-4 h-4 text-[#af52de]" />;
      case 'MessageSquare':
        return <MessageSquare className="w-4 h-4 text-[#af52de]" />;
      case 'GitCompare':
        return <GitCompare className="w-4 h-4 text-[#0071e3]" />;
      case 'Wrench':
        return <Wrench className="w-4 h-4 text-[#ff9500]" />;
      case 'Receipt':
        return <Receipt className="w-4 h-4 text-[#34c759]" />;
      case 'QrCode':
        return <QrCode className="w-4 h-4 text-[#0071e3]" />;
      case 'Share2':
        return <Share2 className="w-4 h-4 text-[#5856d6]" />;
      case 'PenTool':
        return <PenTool className="w-4 h-4 text-[#ff2d55]" />;
      case 'Layers':
      default:
        return <Layers className="w-4 h-4 text-[#34c759]" />;
    }
  };

  return (
    <div
      id="search-command-palette-backdrop"
      className="fixed inset-0 z-50 flex items-start justify-center pt-16 sm:pt-24 px-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-150"
      onClick={onClose}
    >
      <div
        id="search-command-palette-modal"
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-2xl bg-[#0c0e14] rounded-xl shadow-[0_25px_70px_rgba(0,0,0,0.8)] border border-white/[0.14] overflow-hidden flex flex-col transform transition-all animate-in zoom-in-95 duration-150 terminal-inlay font-mono-tech"
      >
        {/* Search Input Bar */}
        <div className="flex items-center px-4 sm:px-5 py-3.5 border-b border-white/[0.08] bg-[#10131c]">
          <span className="text-[12px] font-mono-tech font-bold text-[#00ff87] mr-3 shrink-0">
            SYS_CMD &gt;
          </span>
          <input
            ref={inputRef}
            type="text"
            id="command-palette-search-input"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setSelectedIndex(0);
            }}
            placeholder="Execute module query (e.g. Word, Encrypt, Chat, GST, Audio)..."
            className="w-full bg-transparent text-[14px] text-white placeholder:text-white/40 focus:outline-none font-mono-tech"
          />
          {query && (
            <button
              onClick={() => setQuery('')}
              className="p-1 rounded text-white/40 hover:text-white hover:bg-white/[0.08] cursor-pointer mr-2"
            >
              <X className="w-4 h-4" />
            </button>
          )}
          <span className="hidden sm:inline-flex items-center px-2 py-0.5 rounded text-[10px] font-mono-tech text-white/50 bg-white/[0.06] border border-white/[0.08]">
            ESC
          </span>
        </div>

        {/* Tools Results List */}
        <div className="max-h-[400px] overflow-y-auto p-2 divide-y divide-white/[0.04]">
          {filteredTools.length === 0 ? (
            <div className="py-12 text-center text-white/40 text-[13px] font-mono-tech">
              NO MODULE MATCHING &ldquo;{query}&rdquo;. TRY &ldquo;WORD&rdquo;, &ldquo;ENCRYPT&rdquo;, OR &ldquo;CHAT&rdquo;.
            </div>
          ) : (
            filteredTools.map((tool, idx) => {
              const isSelected = idx === selectedIndex;
              return (
                <button
                  key={`${tool.id}-${tool.name}-${idx}`}
                  type="button"
                  id={`command-tool-item-${idx}`}
                  onMouseEnter={() => setSelectedIndex(idx)}
                  onClick={() => {
                    onSelectTool(tool.id, tool.targetCategory);
                    onClose();
                  }}
                  className={`w-full text-left p-2.5 sm:px-3.5 sm:py-2.5 rounded-lg flex items-center justify-between gap-3 transition-colors cursor-pointer ${
                    isSelected
                      ? 'bg-[#161a26] text-[#00ff87] border border-[#00ff87]/30'
                      : 'text-white/80 hover:bg-white/[0.04] border border-transparent'
                  }`}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div
                      className={`w-8 h-8 rounded-md flex items-center justify-center shrink-0 border ${
                        isSelected
                          ? 'bg-[#10131c] text-[#00ff87] border-[#00ff87]/40'
                          : 'bg-[#12151e] text-white/60 border-white/[0.08]'
                      }`}
                    >
                      {renderIcon(tool.iconName)}
                    </div>

                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span
                          className={`text-[13px] font-mono-tech font-bold truncate ${
                            isSelected ? 'text-[#00ff87]' : 'text-white'
                          }`}
                        >
                          {tool.name}
                        </span>
                        {tool.badge && (
                          <span className="px-1.5 py-0.2 rounded text-[9px] font-mono-tech uppercase bg-[#00ff87]/15 text-[#00ff87] border border-[#00ff87]/20">
                            {tool.badge}
                          </span>
                        )}
                        <span className="text-[10px] text-white/30 font-mono-tech hidden sm:inline-block">
                          // {tool.category}
                        </span>
                      </div>
                      <p className="text-[11.5px] text-white/40 truncate mt-0.5 font-sans">
                        {tool.description}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-1 text-white/40 shrink-0 font-mono-tech">
                    {isSelected && (
                      <span className="hidden sm:inline-flex items-center text-[11px] text-[#00ff87] gap-1">
                        <span>[EXEC]</span>
                        <ArrowRight className="w-3 h-3" />
                      </span>
                    )}
                  </div>
                </button>
              );
            })
          )}
        </div>

        {/* Footer */}
        <div className="px-4 py-2.5 bg-[#10131c] border-t border-white/[0.08] flex items-center justify-between text-[11px] font-mono-tech text-white/40">
          <div className="flex items-center gap-3">
            <span>
              <strong className="text-white/70">↑↓</strong> NAVIGATE
            </span>
            <span>//</span>
            <span>
              <strong className="text-white/70">ENTER</strong> EXECUTE
            </span>
          </div>
          <div className="flex items-center gap-1.5 text-[#00ff87]">
            <span className="w-1.5 h-1.5 rounded-full bg-[#00ff87] animate-pulse"></span>
            <span>TERMINAL_SYS_V3</span>
          </div>
        </div>
      </div>
    </div>
  );
};
