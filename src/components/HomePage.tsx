import React, { useState, useMemo } from 'react';
import {
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
  Search,
  CheckCircle2,
  Lock,
  Zap,
  Shield,
  FileSpreadsheet,
  Presentation,
  Image as ImageIcon,
  Code,
  Volume2,
  BookOpen,
  Unlock,
  EyeOff,
  Fingerprint,
  MessageSquare,
  GitCompare,
  Wrench,
  Receipt,
  QrCode,
  Share2,
  PenTool,
  ChevronDown,
  ExternalLink,
  Upload,
  Cpu,
  Flame,
  Check,
  X,
} from 'lucide-react';
import { ToolMode, FileCategory, UploadedFileInfo } from '../types';
import { DropZone } from './DropZone';

export interface ToolItem {
  id: ToolMode;
  name: string;
  category: 'convert-compress' | 'split-merge' | 'view-edit' | 'security' | 'ai-business';
  categoryLabel: string;
  description: string;
  badge?: string;
  badgeColor?: string;
  colorScheme: {
    bg: string;
    border: string;
    iconBg: string;
    iconColor: string;
    badgeBg: string;
    badgeColor: string;
    hoverBorder: string;
  };
  icon: React.ReactNode;
  keywords: string[];
  targetCategory?: FileCategory;
}

export const TOOL_CANONICAL_PATHS: Record<string, string> = {
  compress: '/compress-pdf',
  merge_pdf: '/merge-pdf',
  split_pdf: '/split-pdf',
  images_to_pdf: '/images-to-pdf',
  scan_document: '/scan-document',
  watermark_pdf: '/watermark-pdf',
  pdf_to_word: '/pdf-to-word',
  pdf_to_excel: '/pdf-to-excel',
  pdf_to_powerpoint: '/pdf-to-powerpoint',
  pdf_to_jpg: '/pdf-to-jpg',
  extract_text: '/extract-text',
  pdf_to_html: '/pdf-to-html',
  pdf_to_audio: '/pdf-to-audio',
  pdf_to_epub: '/pdf-to-epub',
  encrypt_pdf: '/protect-pdf',
  unlock_pdf: '/unlock-pdf',
  auto_redact_pii: '/redact-pdf',
  privacy_scanner: '/privacy-scanner',
  fingerprint_gen: '/file-fingerprint',
  chat_pdf: '/chat-pdf',
  ai_summarize: '/summarize-pdf',
  searchable_pdf: '/ocr-pdf',
  compare_pdfs: '/compare-pdf',
  repair_pdf: '/repair-pdf',
  gst_invoice: '/gst-invoice',
  pos_billing: '/pos-billing',
  gst_filing_prep: '/gst-filing-prep',
  p2p_share: '/p2p-share',
  collab_whiteboard: '/collaborative-whiteboard',
};

interface HomePageProps {
  onSelectTool: (tool: ToolMode, targetCategory?: FileCategory) => void;
  onFileLoaded: (fileInfo: UploadedFileInfo) => void;
  onMultipleFilesLoaded: (files: UploadedFileInfo[]) => void;
  activeCategory: FileCategory;
  hoverCategory: FileCategory | null;
}

export const HOME_TOOLS: ToolItem[] = [
  // 1. CONVERT & COMPRESS
  {
    id: 'compress',
    name: 'Compress PDF',
    category: 'convert-compress',
    categoryLabel: 'Convert & Compress',
    description: 'Reduce PDF file size drastically while preserving crisp vector text and image quality.',
    badge: 'Popular',
    targetCategory: 'pdf',
    colorScheme: {
      bg: 'bg-red-500/5 dark:bg-red-500/10',
      border: 'border-red-500/20 dark:border-red-500/30',
      iconBg: 'bg-red-500/15 dark:bg-red-500/25',
      iconColor: 'text-[#ff3b30]',
      badgeBg: 'bg-red-500/15 text-red-600 dark:text-red-400',
      badgeColor: 'text-[#ff3b30]',
      hoverBorder: 'hover:border-red-500/50',
    },
    icon: <FileText className="w-5 h-5 text-[#ff3b30]" />,
    keywords: ['compress', 'pdf', 'shrink', 'optimize', 'deflate', 'reduce size'],
  },
  {
    id: 'pdf_to_word',
    name: 'PDF to Word',
    category: 'convert-compress',
    categoryLabel: 'Convert & Compress',
    description: 'Convert PDF documents into editable Microsoft Word (.docx) files with formatted layout.',
    badge: 'Popular',
    colorScheme: {
      bg: 'bg-blue-500/5 dark:bg-blue-500/10',
      border: 'border-blue-500/20 dark:border-blue-500/30',
      iconBg: 'bg-blue-500/15 dark:bg-blue-500/25',
      iconColor: 'text-[#0071e3]',
      badgeBg: 'bg-blue-500/15 text-blue-600 dark:text-blue-400',
      badgeColor: 'text-[#0071e3]',
      hoverBorder: 'hover:border-blue-500/50',
    },
    icon: <FileText className="w-5 h-5 text-[#0071e3]" />,
    keywords: ['word', 'docx', 'doc', 'convert to word', 'editable'],
  },
  {
    id: 'pdf_to_excel',
    name: 'PDF to Excel',
    category: 'convert-compress',
    categoryLabel: 'Convert & Compress',
    description: 'Extract tables and financial statements from PDF into spreadsheet XLSX and CSV format.',
    badge: 'New',
    colorScheme: {
      bg: 'bg-emerald-500/5 dark:bg-emerald-500/10',
      border: 'border-emerald-500/20 dark:border-emerald-500/30',
      iconBg: 'bg-emerald-500/15 dark:bg-emerald-500/25',
      iconColor: 'text-[#34c759]',
      badgeBg: 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400',
      badgeColor: 'text-[#34c759]',
      hoverBorder: 'hover:border-emerald-500/50',
    },
    icon: <FileSpreadsheet className="w-5 h-5 text-[#34c759]" />,
    keywords: ['excel', 'xlsx', 'csv', 'tables', 'accounting', 'spreadsheet'],
  },
  {
    id: 'pdf_to_powerpoint',
    name: 'PDF to PowerPoint',
    category: 'convert-compress',
    categoryLabel: 'Convert & Compress',
    description: 'Transform multi-page documents into clean presentation slide decks (.pptx).',
    colorScheme: {
      bg: 'bg-amber-500/5 dark:bg-amber-500/10',
      border: 'border-amber-500/20 dark:border-amber-500/30',
      iconBg: 'bg-amber-500/15 dark:bg-amber-500/25',
      iconColor: 'text-[#ff9500]',
      badgeBg: 'bg-amber-500/15 text-amber-600 dark:text-amber-400',
      badgeColor: 'text-[#ff9500]',
      hoverBorder: 'hover:border-amber-500/50',
    },
    icon: <Presentation className="w-5 h-5 text-[#ff9500]" />,
    keywords: ['powerpoint', 'pptx', 'presentation', 'slides', 'deck'],
  },
  {
    id: 'pdf_to_jpg',
    name: 'PDF to JPG',
    category: 'convert-compress',
    categoryLabel: 'Convert & Compress',
    description: 'Extract individual PDF pages into high-resolution JPG and PNG picture files.',
    colorScheme: {
      bg: 'bg-pink-500/5 dark:bg-pink-500/10',
      border: 'border-pink-500/20 dark:border-pink-500/30',
      iconBg: 'bg-pink-500/15 dark:bg-pink-500/25',
      iconColor: 'text-[#ff2d55]',
      badgeBg: 'bg-pink-500/15 text-pink-600 dark:text-pink-400',
      badgeColor: 'text-[#ff2d55]',
      hoverBorder: 'hover:border-pink-500/50',
    },
    icon: <ImageIcon className="w-5 h-5 text-[#ff2d55]" />,
    keywords: ['jpg', 'png', 'image', 'picture', 'extract photo'],
  },
  {
    id: 'extract_text',
    name: 'Extract Text & Markdown',
    category: 'convert-compress',
    categoryLabel: 'Convert & Compress',
    description: 'Fast plain text and Markdown parser from any PDF with one-click copy.',
    colorScheme: {
      bg: 'bg-indigo-500/5 dark:bg-indigo-500/10',
      border: 'border-indigo-500/20 dark:border-indigo-500/30',
      iconBg: 'bg-indigo-500/15 dark:bg-indigo-500/25',
      iconColor: 'text-[#5856d6]',
      badgeBg: 'bg-indigo-500/15 text-indigo-600 dark:text-indigo-400',
      badgeColor: 'text-[#5856d6]',
      hoverBorder: 'hover:border-indigo-500/50',
    },
    icon: <FileText className="w-5 h-5 text-[#5856d6]" />,
    keywords: ['extract text', 'txt', 'markdown', 'raw text', 'copy'],
  },
  {
    id: 'pdf_to_audio',
    name: 'PDF to Audio (Speech)',
    category: 'convert-compress',
    categoryLabel: 'Convert & Compress',
    description: 'Listen to articles and documents read aloud with natural AI speech synthesis.',
    badge: 'Audio',
    colorScheme: {
      bg: 'bg-purple-500/5 dark:bg-purple-500/10',
      border: 'border-purple-500/20 dark:border-purple-500/30',
      iconBg: 'bg-purple-500/15 dark:bg-purple-500/25',
      iconColor: 'text-[#af52de]',
      badgeBg: 'bg-purple-500/15 text-purple-600 dark:text-purple-400',
      badgeColor: 'text-[#af52de]',
      hoverBorder: 'hover:border-purple-500/50',
    },
    icon: <Volume2 className="w-5 h-5 text-[#af52de]" />,
    keywords: ['audio', 'tts', 'speech', 'read aloud', 'voice', 'podcast'],
  },
  {
    id: 'pdf_to_html',
    name: 'PDF to HTML',
    category: 'convert-compress',
    categoryLabel: 'Convert & Compress',
    description: 'Convert PDF pages into clean, responsive HTML5 code for web publishing.',
    colorScheme: {
      bg: 'bg-cyan-500/5 dark:bg-cyan-500/10',
      border: 'border-cyan-500/20 dark:border-cyan-500/30',
      iconBg: 'bg-cyan-500/15 dark:bg-cyan-500/25',
      iconColor: 'text-[#00c7be]',
      badgeBg: 'bg-cyan-500/15 text-cyan-600 dark:text-cyan-400',
      badgeColor: 'text-[#00c7be]',
      hoverBorder: 'hover:border-cyan-500/50',
    },
    icon: <Code className="w-5 h-5 text-[#00c7be]" />,
    keywords: ['html', 'web page', 'html5', 'code'],
  },
  {
    id: 'pdf_to_epub',
    name: 'PDF to EPUB',
    category: 'convert-compress',
    categoryLabel: 'Convert & Compress',
    description: 'Format documents and books for e-readers like Kindle and Apple Books.',
    colorScheme: {
      bg: 'bg-rose-500/5 dark:bg-rose-500/10',
      border: 'border-rose-500/20 dark:border-rose-500/30',
      iconBg: 'bg-rose-500/15 dark:bg-rose-500/25',
      iconColor: 'text-[#ff2d55]',
      badgeBg: 'bg-rose-500/15 text-rose-600 dark:text-rose-400',
      badgeColor: 'text-[#ff2d55]',
      hoverBorder: 'hover:border-rose-500/50',
    },
    icon: <BookOpen className="w-5 h-5 text-[#ff2d55]" />,
    keywords: ['epub', 'ebook', 'kindle', 'reader'],
  },
  {
    id: 'compress',
    name: 'Compress Photos & Images',
    category: 'convert-compress',
    categoryLabel: 'Convert & Compress',
    description: 'Bicubic scaling, palette quantization, and WebP conversion for JPG and PNG photos.',
    targetCategory: 'image',
    colorScheme: {
      bg: 'bg-emerald-500/5 dark:bg-emerald-500/10',
      border: 'border-emerald-500/20 dark:border-emerald-500/30',
      iconBg: 'bg-emerald-500/15 dark:bg-emerald-500/25',
      iconColor: 'text-[#34c759]',
      badgeBg: 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400',
      badgeColor: 'text-[#34c759]',
      hoverBorder: 'hover:border-emerald-500/50',
    },
    icon: <Layers className="w-5 h-5 text-[#34c759]" />,
    keywords: ['compress photo', 'image', 'jpg', 'png', 'webp'],
  },
  {
    id: 'compress',
    name: 'Compress Video & Audio',
    category: 'convert-compress',
    categoryLabel: 'Convert & Compress',
    description: 'Client-side bitrate and resolution downsampling for MP4, WebM, MP3, and WAV.',
    targetCategory: 'video',
    colorScheme: {
      bg: 'bg-blue-500/5 dark:bg-blue-500/10',
      border: 'border-blue-500/20 dark:border-blue-500/30',
      iconBg: 'bg-blue-500/15 dark:bg-blue-500/25',
      iconColor: 'text-[#0071e3]',
      badgeBg: 'bg-blue-500/15 text-blue-600 dark:text-blue-400',
      badgeColor: 'text-[#0071e3]',
      hoverBorder: 'hover:border-blue-500/50',
    },
    icon: <Film className="w-5 h-5 text-[#0071e3]" />,
    keywords: ['compress video', 'audio', 'mp4', 'mp3', 'shrink video'],
  },

  // 2. SPLIT & MERGE
  {
    id: 'merge_pdf',
    name: 'Merge PDF',
    category: 'split-merge',
    categoryLabel: 'Split & Merge',
    description: 'Combine multiple PDF files into one clean, well-ordered document with page drag & drop.',
    badge: 'Popular',
    colorScheme: {
      bg: 'bg-red-500/5 dark:bg-red-500/10',
      border: 'border-red-500/20 dark:border-red-500/30',
      iconBg: 'bg-red-500/15 dark:bg-red-500/25',
      iconColor: 'text-[#ff3b30]',
      badgeBg: 'bg-red-500/15 text-red-600 dark:text-red-400',
      badgeColor: 'text-[#ff3b30]',
      hoverBorder: 'hover:border-red-500/50',
    },
    icon: <FilePlus className="w-5 h-5 text-[#ff3b30]" />,
    keywords: ['merge', 'combine', 'join', 'append', 'pages'],
  },
  {
    id: 'split_pdf',
    name: 'Split & Extract PDF',
    category: 'split-merge',
    categoryLabel: 'Split & Merge',
    description: 'Separate single pages or extract customized page ranges into separate PDF documents.',
    badge: 'Fast',
    colorScheme: {
      bg: 'bg-amber-500/5 dark:bg-amber-500/10',
      border: 'border-amber-500/20 dark:border-amber-500/30',
      iconBg: 'bg-amber-500/15 dark:bg-amber-500/25',
      iconColor: 'text-[#ff9500]',
      badgeBg: 'bg-amber-500/15 text-amber-600 dark:text-amber-400',
      badgeColor: 'text-[#ff9500]',
      hoverBorder: 'hover:border-amber-500/50',
    },
    icon: <Scissors className="w-5 h-5 text-[#ff9500]" />,
    keywords: ['split', 'cut', 'extract pages', 'separate', 'range'],
  },
  {
    id: 'scan_document',
    name: 'Scan Document (CamScanner)',
    category: 'split-merge',
    categoryLabel: 'Split & Merge',
    description: 'Capture documents with your device camera, enhance text contrast, and export clean PDF.',
    badge: 'New',
    colorScheme: {
      bg: 'bg-emerald-500/5 dark:bg-emerald-500/10',
      border: 'border-emerald-500/20 dark:border-emerald-500/30',
      iconBg: 'bg-emerald-500/15 dark:bg-emerald-500/25',
      iconColor: 'text-[#34c759]',
      badgeBg: 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400',
      badgeColor: 'text-[#34c759]',
      hoverBorder: 'hover:border-emerald-500/50',
    },
    icon: <Camera className="w-5 h-5 text-[#34c759]" />,
    keywords: ['scan', 'scanner', 'camera', 'ocr', 'receipt', 'camscanner'],
  },
  {
    id: 'images_to_pdf',
    name: 'Images to PDF (JPG to PDF)',
    category: 'split-merge',
    categoryLabel: 'Split & Merge',
    description: 'Convert collections of photos, receipts, or screenshots into a single multi-page PDF.',
    colorScheme: {
      bg: 'bg-purple-500/5 dark:bg-purple-500/10',
      border: 'border-purple-500/20 dark:border-purple-500/30',
      iconBg: 'bg-purple-500/15 dark:bg-purple-500/25',
      iconColor: 'text-[#af52de]',
      badgeBg: 'bg-purple-500/15 text-purple-600 dark:text-purple-400',
      badgeColor: 'text-[#af52de]',
      hoverBorder: 'hover:border-purple-500/50',
    },
    icon: <Sparkles className="w-5 h-5 text-[#af52de]" />,
    keywords: ['jpg to pdf', 'images to pdf', 'photo album', 'convert pictures'],
  },

  // 3. VIEW & EDIT
  {
    id: 'watermark_pdf',
    name: 'Watermark PDF',
    category: 'view-edit',
    categoryLabel: 'View & Edit',
    description: 'Stamp custom confidential notices, copyright marks, or branding across pages.',
    colorScheme: {
      bg: 'bg-indigo-500/5 dark:bg-indigo-500/10',
      border: 'border-indigo-500/20 dark:border-indigo-500/30',
      iconBg: 'bg-indigo-500/15 dark:bg-indigo-500/25',
      iconColor: 'text-[#5856d6]',
      badgeBg: 'bg-indigo-500/15 text-indigo-600 dark:text-indigo-400',
      badgeColor: 'text-[#5856d6]',
      hoverBorder: 'hover:border-indigo-500/50',
    },
    icon: <Stamp className="w-5 h-5 text-[#5856d6]" />,
    keywords: ['watermark', 'stamp', 'confidential', 'branding', 'draft'],
  },
  {
    id: 'collab_whiteboard',
    name: 'Collab Whiteboard & Markup',
    category: 'view-edit',
    categoryLabel: 'View & Edit',
    description: 'Draw, sketch, highlight, and annotate documents with a high-precision digital canvas.',
    colorScheme: {
      bg: 'bg-pink-500/5 dark:bg-pink-500/10',
      border: 'border-pink-500/20 dark:border-pink-500/30',
      iconBg: 'bg-pink-500/15 dark:bg-pink-500/25',
      iconColor: 'text-[#ff2d55]',
      badgeBg: 'bg-pink-500/15 text-pink-600 dark:text-pink-400',
      badgeColor: 'text-[#ff2d55]',
      hoverBorder: 'hover:border-pink-500/50',
    },
    icon: <PenTool className="w-5 h-5 text-[#ff2d55]" />,
    keywords: ['draw', 'annotate', 'markup', 'canvas', 'sketch'],
  },
  {
    id: 'compare_pdfs',
    name: 'Compare Documents (Diff)',
    category: 'view-edit',
    categoryLabel: 'View & Edit',
    description: 'Side-by-side visual diff slider and discrepancy highlighter between two document versions.',
    colorScheme: {
      bg: 'bg-blue-500/5 dark:bg-blue-500/10',
      border: 'border-blue-500/20 dark:border-blue-500/30',
      iconBg: 'bg-blue-500/15 dark:bg-blue-500/25',
      iconColor: 'text-[#0071e3]',
      badgeBg: 'bg-blue-500/15 text-blue-600 dark:text-blue-400',
      badgeColor: 'text-[#0071e3]',
      hoverBorder: 'hover:border-blue-500/50',
    },
    icon: <GitCompare className="w-5 h-5 text-[#0071e3]" />,
    keywords: ['compare', 'diff', 'versions', 'discrepancy', 'changes'],
  },
  {
    id: 'repair_pdf',
    name: 'Repair Corrupted PDF',
    category: 'view-edit',
    categoryLabel: 'View & Edit',
    description: 'Rebuild damaged PDF headers, broken xref tables, and corrupted stream objects.',
    colorScheme: {
      bg: 'bg-amber-500/5 dark:bg-amber-500/10',
      border: 'border-amber-500/20 dark:border-amber-500/30',
      iconBg: 'bg-amber-500/15 dark:bg-amber-500/25',
      iconColor: 'text-[#ff9500]',
      badgeBg: 'bg-amber-500/15 text-amber-600 dark:text-amber-400',
      badgeColor: 'text-[#ff9500]',
      hoverBorder: 'hover:border-amber-500/50',
    },
    icon: <Wrench className="w-5 h-5 text-[#ff9500]" />,
    keywords: ['repair', 'fix', 'corrupt', 'damaged', 'recover'],
  },

  // 4. SIGN & SECURITY
  {
    id: 'encrypt_pdf',
    name: 'Protect & Encrypt PDF',
    category: 'security',
    categoryLabel: 'Sign & Security',
    description: 'Add robust password encryption and granular permissions for printing, editing, and copying.',
    badge: 'Security',
    colorScheme: {
      bg: 'bg-emerald-500/5 dark:bg-emerald-500/10',
      border: 'border-emerald-500/20 dark:border-emerald-500/30',
      iconBg: 'bg-emerald-500/15 dark:bg-emerald-500/25',
      iconColor: 'text-[#34c759]',
      badgeBg: 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400',
      badgeColor: 'text-[#34c759]',
      hoverBorder: 'hover:border-emerald-500/50',
    },
    icon: <Lock className="w-5 h-5 text-[#34c759]" />,
    keywords: ['encrypt', 'password', 'lock', 'protect', 'aes'],
  },
  {
    id: 'unlock_pdf',
    name: 'Unlock PDF Password',
    category: 'security',
    categoryLabel: 'Sign & Security',
    description: 'Remove passwords from protected PDFs for unrestricted printing and editing.',
    colorScheme: {
      bg: 'bg-amber-500/5 dark:bg-amber-500/10',
      border: 'border-amber-500/20 dark:border-amber-500/30',
      iconBg: 'bg-amber-500/15 dark:bg-amber-500/25',
      iconColor: 'text-[#ff9500]',
      badgeBg: 'bg-amber-500/15 text-amber-600 dark:text-amber-400',
      badgeColor: 'text-[#ff9500]',
      hoverBorder: 'hover:border-amber-500/50',
    },
    icon: <Unlock className="w-5 h-5 text-[#ff9500]" />,
    keywords: ['unlock', 'remove password', 'decrypt', 'unprotect'],
  },
  {
    id: 'auto_redact_pii',
    name: 'Auto-Redact PII & Privacy',
    category: 'security',
    categoryLabel: 'Sign & Security',
    description: 'Blackout SSNs, credit cards, emails, and phone numbers before sharing documents.',
    badge: 'AI Shield',
    colorScheme: {
      bg: 'bg-red-500/5 dark:bg-red-500/10',
      border: 'border-red-500/20 dark:border-red-500/30',
      iconBg: 'bg-red-500/15 dark:bg-red-500/25',
      iconColor: 'text-[#ff3b30]',
      badgeBg: 'bg-red-500/15 text-red-600 dark:text-red-400',
      badgeColor: 'text-[#ff3b30]',
      hoverBorder: 'hover:border-red-500/50',
    },
    icon: <EyeOff className="w-5 h-5 text-[#ff3b30]" />,
    keywords: ['redact', 'blackout', 'pii', 'privacy', 'ssn', 'credit card'],
  },
  {
    id: 'privacy_scanner',
    name: 'Privacy & Metadata Strip',
    category: 'security',
    categoryLabel: 'Sign & Security',
    description: 'Inspect and remove author tags, creation timestamps, edit history, and GPS location tags.',
    colorScheme: {
      bg: 'bg-blue-500/5 dark:bg-blue-500/10',
      border: 'border-blue-500/20 dark:border-blue-500/30',
      iconBg: 'bg-blue-500/15 dark:bg-blue-500/25',
      iconColor: 'text-[#0071e3]',
      badgeBg: 'bg-blue-500/15 text-blue-600 dark:text-blue-400',
      badgeColor: 'text-[#0071e3]',
      hoverBorder: 'hover:border-blue-500/50',
    },
    icon: <Shield className="w-5 h-5 text-[#0071e3]" />,
    keywords: ['metadata', 'privacy', 'clean tags', 'gps', 'author info'],
  },
  {
    id: 'fingerprint_gen',
    name: 'Cryptographic SHA Fingerprint',
    category: 'security',
    categoryLabel: 'Sign & Security',
    description: 'Calculate cryptographic SHA-256 and SHA-512 integrity hashes to verify document authenticity.',
    colorScheme: {
      bg: 'bg-purple-500/5 dark:bg-purple-500/10',
      border: 'border-purple-500/20 dark:border-purple-500/30',
      iconBg: 'bg-purple-500/15 dark:bg-purple-500/25',
      iconColor: 'text-[#af52de]',
      badgeBg: 'bg-purple-500/15 text-purple-600 dark:text-purple-400',
      badgeColor: 'text-[#af52de]',
      hoverBorder: 'hover:border-purple-500/50',
    },
    icon: <Fingerprint className="w-5 h-5 text-[#af52de]" />,
    keywords: ['sha256', 'hash', 'fingerprint', 'checksum', 'integrity'],
  },

  // 5. AI & BUSINESS
  {
    id: 'chat_pdf',
    name: 'Chat with PDF (Gemini AI)',
    category: 'ai-business',
    categoryLabel: 'AI & Business',
    description: 'Ask questions, extract clauses, and converse with documents using advanced Gemini AI.',
    badge: 'Gemini AI',
    colorScheme: {
      bg: 'bg-purple-500/5 dark:bg-purple-500/10',
      border: 'border-purple-500/20 dark:border-purple-500/30',
      iconBg: 'bg-purple-500/15 dark:bg-purple-500/25',
      iconColor: 'text-[#af52de]',
      badgeBg: 'bg-purple-500/15 text-purple-600 dark:text-purple-400',
      badgeColor: 'text-[#af52de]',
      hoverBorder: 'hover:border-purple-500/50',
    },
    icon: <MessageSquare className="w-5 h-5 text-[#af52de]" />,
    keywords: ['chat with pdf', 'ai chat', 'gemini', 'ask questions', 'document ai'],
  },
  {
    id: 'ai_summarize',
    name: 'AI Document Summarizer',
    category: 'ai-business',
    categoryLabel: 'AI & Business',
    description: 'Generate executive briefings, action items, and TL;DR summaries in seconds.',
    badge: 'AI',
    colorScheme: {
      bg: 'bg-blue-500/5 dark:bg-blue-500/10',
      border: 'border-blue-500/20 dark:border-blue-500/30',
      iconBg: 'bg-blue-500/15 dark:bg-blue-500/25',
      iconColor: 'text-[#0071e3]',
      badgeBg: 'bg-blue-500/15 text-blue-600 dark:text-blue-400',
      badgeColor: 'text-[#0071e3]',
      hoverBorder: 'hover:border-blue-500/50',
    },
    icon: <Sparkles className="w-5 h-5 text-[#0071e3]" />,
    keywords: ['summarize', 'summary', 'tldr', 'executive summary', 'bullets'],
  },
  {
    id: 'searchable_pdf',
    name: 'Searchable PDF (OCR)',
    category: 'ai-business',
    categoryLabel: 'AI & Business',
    description: 'Index scanned documents with a hidden selectable text layer using optical character recognition.',
    colorScheme: {
      bg: 'bg-indigo-500/5 dark:bg-indigo-500/10',
      border: 'border-indigo-500/20 dark:border-indigo-500/30',
      iconBg: 'bg-indigo-500/15 dark:bg-indigo-500/25',
      iconColor: 'text-[#5856d6]',
      badgeBg: 'bg-indigo-500/15 text-indigo-600 dark:text-indigo-400',
      badgeColor: 'text-[#5856d6]',
      hoverBorder: 'hover:border-indigo-500/50',
    },
    icon: <Search className="w-5 h-5 text-[#5856d6]" />,
    keywords: ['ocr', 'searchable pdf', 'text recognition', 'scanned'],
  },
  {
    id: 'gst_invoice',
    name: 'GST Tax Invoice Generator',
    category: 'ai-business',
    categoryLabel: 'AI & Business',
    description: 'Generate professional GST invoices with CGST, SGST, IGST calculations and print-ready PDF.',
    badge: 'Business',
    colorScheme: {
      bg: 'bg-emerald-500/5 dark:bg-emerald-500/10',
      border: 'border-emerald-500/20 dark:border-emerald-500/30',
      iconBg: 'bg-emerald-500/15 dark:bg-emerald-500/25',
      iconColor: 'text-[#34c759]',
      badgeBg: 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400',
      badgeColor: 'text-[#34c759]',
      hoverBorder: 'hover:border-emerald-500/50',
    },
    icon: <Receipt className="w-5 h-5 text-[#34c759]" />,
    keywords: ['gst invoice', 'tax invoice', 'billing', 'accounting', 'cgst', 'sgst'],
  },
  {
    id: 'pos_billing',
    name: 'POS Thermal Billing & UPI',
    category: 'ai-business',
    categoryLabel: 'AI & Business',
    description: 'Quick counter billing slip with dynamic UPI payment QR code and thermal printer formatting.',
    colorScheme: {
      bg: 'bg-cyan-500/5 dark:bg-cyan-500/10',
      border: 'border-cyan-500/20 dark:border-cyan-500/30',
      iconBg: 'bg-cyan-500/15 dark:bg-cyan-500/25',
      iconColor: 'text-[#00c7be]',
      badgeBg: 'bg-cyan-500/15 text-cyan-600 dark:text-cyan-400',
      badgeColor: 'text-[#00c7be]',
      hoverBorder: 'hover:border-cyan-500/50',
    },
    icon: <QrCode className="w-5 h-5 text-[#00c7be]" />,
    keywords: ['pos billing', 'receipt', 'thermal print', 'upi qr'],
  },
  {
    id: 'gst_filing_prep',
    name: 'GST Filing Summary (GSTR)',
    category: 'ai-business',
    categoryLabel: 'AI & Business',
    description: 'GSTR-1 and GSTR-3B tax liability aggregator with summary totals and Excel export.',
    colorScheme: {
      bg: 'bg-blue-500/5 dark:bg-blue-500/10',
      border: 'border-blue-500/20 dark:border-blue-500/30',
      iconBg: 'bg-blue-500/15 dark:bg-blue-500/25',
      iconColor: 'text-[#0071e3]',
      badgeBg: 'bg-blue-500/15 text-blue-600 dark:text-blue-400',
      badgeColor: 'text-[#0071e3]',
      hoverBorder: 'hover:border-blue-500/50',
    },
    icon: <FileSpreadsheet className="w-5 h-5 text-[#0071e3]" />,
    keywords: ['gst filing', 'gstr1', 'gstr3b', 'tax returns'],
  },
  {
    id: 'p2p_share',
    name: 'P2P Encrypted File Share',
    category: 'ai-business',
    categoryLabel: 'AI & Business',
    description: 'Direct browser-to-browser encrypted file streaming via WebRTC with zero cloud storage.',
    badge: 'WebRTC',
    colorScheme: {
      bg: 'bg-indigo-500/5 dark:bg-indigo-500/10',
      border: 'border-indigo-500/20 dark:border-indigo-500/30',
      iconBg: 'bg-indigo-500/15 dark:bg-indigo-500/25',
      iconColor: 'text-[#5856d6]',
      badgeBg: 'bg-indigo-500/15 text-indigo-600 dark:text-indigo-400',
      badgeColor: 'text-[#5856d6]',
      hoverBorder: 'hover:border-indigo-500/50',
    },
    icon: <Share2 className="w-5 h-5 text-[#5856d6]" />,
    keywords: ['p2p share', 'webrtc', 'file transfer', 'direct share', 'no cloud'],
  },
];

export const HomePage: React.FC<HomePageProps> = ({
  onSelectTool,
  onFileLoaded,
  onMultipleFilesLoaded,
  activeCategory,
  hoverCategory,
}) => {
  const [selectedCategoryTab, setSelectedCategoryTab] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [activeFaq, setActiveFaq] = useState<number | null>(null);

  // Filter tools based on tab & live search query
  const filteredTools = useMemo(() => {
    return HOME_TOOLS.filter((tool) => {
      // Category Tab Filter
      if (selectedCategoryTab !== 'all' && tool.category !== selectedCategoryTab) {
        return false;
      }
      // Search Query Filter
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchName = tool.name.toLowerCase().includes(q);
        const matchDesc = tool.description.toLowerCase().includes(q);
        const matchKeywords = tool.keywords.some((k) => k.toLowerCase().includes(q));
        const matchCategory = tool.categoryLabel.toLowerCase().includes(q);
        return matchName || matchDesc || matchKeywords || matchCategory;
      }
      return true;
    });
  }, [selectedCategoryTab, searchQuery]);

  const categories = [
    { id: 'all', label: 'All Tools', count: HOME_TOOLS.length },
    { id: 'convert-compress', label: 'Convert & Compress', count: 11 },
    { id: 'split-merge', label: 'Split & Merge', count: 4 },
    { id: 'view-edit', label: 'View & Edit', count: 4 },
    { id: 'security', label: 'Sign & Security', count: 5 },
    { id: 'ai-business', label: 'AI & Business', count: 8 },
  ];

  const faqs = [
    {
      q: 'How does ZipStream process my files without uploading them?',
      a: 'ZipStream runs completely inside your web browser using WebAssembly (Wasm) and HTML5 Canvas technology. When you open a PDF, photo, video, or audio file, our client-side engine executes local algorithms directly on your device CPU. Your private documents never leave your computer or touch an external server.',
    },
    {
      q: 'Are there any hidden file size or daily usage limits?',
      a: 'No! Unlike traditional online PDF services that enforce 2-file daily limits or require paid subscription upgrades for large documents, ZipStream offers unrestricted on-device processing with zero subscription paywalls.',
    },
    {
      q: 'Can I convert scanned PDFs to Word or Excel?',
      a: 'Yes. Our PDF to Word and PDF to Excel tools extract text, tables, and structures directly. For image-only scans, our Searchable PDF (OCR) and Camera Document Scanner enhance contrast and synthesize searchable text layers.',
    },
    {
      q: 'How secure is the Auto-Redact PII tool?',
      a: 'The Auto-Redact tool scans document text on-device for sensitive patterns like Social Security Numbers, Credit Card numbers, email addresses, and phone numbers. Once confirmed, it draws permanent solid black redaction blocks directly onto the document canvas before saving.',
    },
    {
      q: 'Does ZipStream work offline without an active internet connection?',
      a: 'Yes! Once the web application is loaded in your browser, all core compression, merging, splitting, watermarking, encryption, and conversion tools operate seamlessly offline.',
    },
  ];

  return (
    <div id="home-page-container" className="w-full flex flex-col space-y-16 pb-12 animate-in fade-in duration-300">
      {/* 1. NOMU STOREFRONT HERO */}
      <section aria-labelledby="hero-title" className="text-center max-w-4xl mx-auto space-y-6 pt-4 sm:pt-6">
        {/* Nomu Pill Badge */}
        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-white dark:bg-[#111C38] border border-[#0C162C]/10 dark:border-white/10 shadow-xs text-xs font-semibold text-[#0C162C] dark:text-white">
          <span className="flex h-2 w-2 relative">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#FF5722] opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-[#FF5722]"></span>
          </span>
          <span className="text-[#FF5722] font-bold">100% PRIVATE</span>
          <span className="text-black/20 dark:text-white/20">•</span>
          <span>ON-DEVICE PROCESSING</span>
          <span className="text-black/20 dark:text-white/20">•</span>
          <span className="text-[#5C6479] dark:text-white/60">ZERO CLOUD UPLOADS</span>
        </div>

        {/* Hero Title & Value Proposition */}
        <div className="space-y-4">
          <h1
            id="hero-title"
            className="text-4xl sm:text-6xl lg:text-[62px] font-extrabold tracking-tight text-[#0C162C] dark:text-white leading-[1.08]"
          >
            Compress PDF Online Free{' '}
            <span className="block text-[#FF5722]">
              Fast, Secure &amp; 100% Private
            </span>
          </h1>
          <p className="text-base sm:text-lg text-[#5C6479] dark:text-white/70 leading-relaxed max-w-2xl mx-auto font-normal">
            Reduce PDF file size without losing quality. Merge, split, convert to Word and Excel, sign, and redact documents directly in your browser. No file upload or signup needed.
          </p>

          {/* Value Highlights */}
          <div className="flex items-center justify-center gap-2.5 flex-wrap pt-2 text-xs font-semibold text-[#0C162C] dark:text-white/80">
            <span className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-white dark:bg-[#111C38] border border-[#0C162C]/10 dark:border-white/10 shadow-xs">
              <Zap className="w-3.5 h-3.5 text-[#FF5722]" /> WebAssembly Speed
            </span>
            <span className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-white dark:bg-[#111C38] border border-[#0C162C]/10 dark:border-white/10 shadow-xs">
              <Lock className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" /> Air-Gapped Privacy
            </span>
            <span className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-white dark:bg-[#111C38] border border-[#0C162C]/10 dark:border-white/10 shadow-xs">
              <Sparkles className="w-3.5 h-3.5 text-[#FFCB70]" /> 25+ Built-in Tools
            </span>
          </div>
        </div>

        {/* Nomu Friendly Search Input */}
        <div className="max-w-2xl mx-auto pt-2">
          <div className="relative flex items-center rounded-full bg-white dark:bg-[#111C38] border-2 border-[#0C162C]/10 dark:border-white/10 transition-all focus-within:border-[#FF5722] focus-within:shadow-[0_8px_30px_rgba(255,87,34,0.15)] shadow-sm">
            <Search className="w-4 h-4 text-[#0C162C]/40 dark:text-white/40 shrink-0 ml-4" />
            <input
              type="text"
              id="home-search-input"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search 25+ tools (e.g. Word, Excel, Compress, Redact, Sign)..."
              className="w-full px-3.5 py-3.5 bg-transparent text-sm text-[#0C162C] dark:text-white placeholder:text-[#5C6479]/60 dark:placeholder:text-white/35 focus:outline-none font-medium"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="p-1.5 mr-2 rounded-full text-black/40 hover:text-black dark:text-white/40 dark:hover:text-white hover:bg-black/5 dark:hover:bg-white/10 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            )}
            <span className="hidden sm:inline-flex items-center text-xs font-bold text-[#FF5722] px-4 shrink-0 border-l border-[#0C162C]/10 dark:border-white/10">
              {filteredTools.length} tools
            </span>
          </div>
        </div>
      </section>

      {/* 2. INSTANT DROPZONE & COMPRESSION STUDIO */}
      <section aria-labelledby="quick-compress-title" className="w-full max-w-4xl mx-auto space-y-4">
        <div className="flex items-center justify-between px-2">
          <div className="flex items-center gap-2">
            <Flame className="w-4 h-4 text-[#FF5722]" />
            <h2 id="quick-compress-title" className="text-sm font-bold text-[#0C162C] dark:text-white uppercase tracking-wider">
              Quick File Drop
            </h2>
          </div>
          <span className="text-xs text-[#5C6479] dark:text-white/50 font-medium">
            Drag files directly to start
          </span>
        </div>

        <DropZone
          activeCategory={activeCategory}
          hoverCategory={hoverCategory}
          onFileLoaded={onFileLoaded}
          onMultipleFilesLoaded={onMultipleFilesLoaded}
        />
      </section>

      {/* 3. NOMU STOREFRONT TOOLS GRID */}
      <section aria-labelledby="all-tools-title" className="w-full space-y-6">
        {/* Section Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-[#0C162C]/8 dark:border-white/8 pb-4">
          <div>
            <h2 id="all-tools-title" className="text-2xl sm:text-3xl font-extrabold tracking-tight text-[#0C162C] dark:text-white">
              All File Tools
            </h2>
            <p className="text-sm text-[#5C6479] dark:text-white/60 mt-1">
              Select any tool below for instant, private on-device processing.
            </p>
          </div>

          {/* Category Filter Pills */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 max-w-full scrollbar-none">
            {categories.map((cat) => {
              const isSelected = selectedCategoryTab === cat.id;
              return (
                <button
                  key={cat.id}
                  id={`home-category-tab-${cat.id}`}
                  onClick={() => setSelectedCategoryTab(cat.id)}
                  className={`px-3.5 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-all cursor-pointer ${
                    isSelected
                      ? 'bg-[#0C162C] dark:bg-white text-white dark:text-[#0C162C] shadow-sm'
                      : 'bg-black/5 dark:bg-white/10 text-[#0C162C]/70 dark:text-white/70 hover:text-[#0C162C] dark:hover:text-white hover:bg-black/10 dark:hover:bg-white/15'
                  }`}
                >
                  <span>{cat.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Tools Bento Grid */}
        {filteredTools.length === 0 ? (
          <div className="py-16 text-center bg-white dark:bg-[#111C38] rounded-3xl border border-[#0C162C]/8 dark:border-white/8 space-y-3 shadow-sm">
            <Search className="w-8 h-8 text-[#5C6479]/40 mx-auto" />
            <h3 className="text-base font-bold text-[#0C162C] dark:text-white">
              No tools matching &ldquo;{searchQuery}&rdquo;
            </h3>
            <p className="text-xs text-[#5C6479] dark:text-white/60">
              Try searching: &ldquo;word&rdquo;, &ldquo;excel&rdquo;, &ldquo;compress&rdquo;, or &ldquo;redact&rdquo;.
            </p>
            <button
              onClick={() => {
                setSearchQuery('');
                setSelectedCategoryTab('all');
              }}
              className="px-5 py-2 rounded-full bg-[#FF5722] text-white text-xs font-bold hover:bg-[#FF6838] transition-colors cursor-pointer shadow-sm"
            >
              Reset Search Filter
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {filteredTools.map((tool) => {
              const toolHref = TOOL_CANONICAL_PATHS[tool.id] || `/${tool.id.replace(/_/g, '-')}`;
              return (
                <a
                  key={`${tool.id}-${tool.name}`}
                  id={`home-tool-card-${tool.id}-${tool.name.toLowerCase().replace(/\s+/g, '-')}`}
                  href={toolHref}
                  onClick={(e) => {
                    e.preventDefault();
                    onSelectTool(tool.id, tool.targetCategory);
                  }}
                  className="group relative p-5 rounded-2xl bg-white dark:bg-[#111C38] border border-[#0C162C]/8 dark:border-white/8 hover:border-[#FF5722]/40 shadow-sm hover:shadow-[0_12px_32px_rgba(255,87,34,0.12)] transition-all duration-200 flex flex-col justify-between cursor-pointer"
                >
                <div>
                  {/* Top Bar: Icon & Badge */}
                  <div className="flex items-center justify-between mb-3.5">
                    <div className="w-10 h-10 rounded-xl bg-[#FFF4EE] dark:bg-[#FF5722]/15 text-[#FF5722] flex items-center justify-center transition-all duration-200 group-hover:scale-110">
                      {tool.icon}
                    </div>

                    <div className="flex items-center gap-1.5">
                      {tool.badge && (
                        <span className="px-2.5 py-0.5 rounded-full bg-[#FF5722]/10 text-[11px] font-bold text-[#FF5722]">
                          {tool.badge}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Title & Description */}
                  <h3 className="text-base font-bold text-[#0C162C] dark:text-white group-hover:text-[#FF5722] transition-colors leading-snug">
                    {tool.name}
                  </h3>
                  <p className="text-xs text-[#5C6479] dark:text-white/60 leading-relaxed mt-1.5 line-clamp-2">
                    {tool.description}
                  </p>
                </div>

                {/* Bottom Action Link */}
                <div className="pt-3.5 mt-3.5 border-t border-[#0C162C]/5 dark:border-white/5 flex items-center justify-between text-xs font-bold text-[#FF5722] transition-colors">
                  <span>Open tool</span>
                  <ArrowRight className="w-3.5 h-3.5 transform group-hover:translate-x-1 transition-transform" />
                </div>
              </a>
            );
          })}
          </div>
        )}
      </section>

      {/* 4. "HOW IT WORKS" 3-STEP PROCESS - NOMU CLEAN DESIGN */}
      <section aria-labelledby="how-it-works-title" className="py-8 border-t border-[#0C162C]/8 dark:border-white/8">
        <div className="text-center max-w-2xl mx-auto space-y-2 mb-10">
          <span className="text-xs font-bold text-[#FF5722] uppercase tracking-wider">
            Simple & Transparent
          </span>
          <h2 id="how-it-works-title" className="text-2xl sm:text-3xl font-extrabold tracking-tight text-[#0C162C] dark:text-white">
            How it works in 3 steps
          </h2>
          <p className="text-sm text-[#5C6479] dark:text-white/60">
            No signup required. No wait queues. No server data transfers.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          <div className="p-6 rounded-2xl bg-white dark:bg-[#111C38] border border-[#0C162C]/8 dark:border-white/8 shadow-sm space-y-3">
            <div className="w-10 h-10 rounded-2xl bg-[#FFF4EE] dark:bg-[#FF5722]/15 text-[#FF5722] flex items-center justify-center font-bold text-sm">
              01
            </div>
            <h3 className="text-base font-bold text-[#0C162C] dark:text-white">
              Choose or Drop Files
            </h3>
            <p className="text-xs text-[#5C6479] dark:text-white/60 leading-relaxed">
              Select any tool or drop single files and bulk batches into the local browser sandbox.
            </p>
          </div>

          <div className="p-6 rounded-2xl bg-white dark:bg-[#111C38] border border-[#0C162C]/8 dark:border-white/8 shadow-sm space-y-3">
            <div className="w-10 h-10 rounded-2xl bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 flex items-center justify-center font-bold text-sm">
              02
            </div>
            <h3 className="text-base font-bold text-[#0C162C] dark:text-white">
              Instant Local Processing
            </h3>
            <p className="text-xs text-[#5C6479] dark:text-white/60 leading-relaxed">
              Native WebAssembly and client worker threads handle conversion and compression directly in RAM.
            </p>
          </div>

          <div className="p-6 rounded-2xl bg-white dark:bg-[#111C38] border border-[#0C162C]/8 dark:border-white/8 shadow-sm space-y-3">
            <div className="w-10 h-10 rounded-2xl bg-purple-50 dark:bg-purple-950/40 text-purple-600 dark:text-purple-400 flex items-center justify-center font-bold text-sm">
              03
            </div>
            <h3 className="text-base font-bold text-[#0C162C] dark:text-white">
              Save or Share Instantly
            </h3>
            <p className="text-xs text-[#5C6479] dark:text-white/60 leading-relaxed">
              Download your output files instantly to device storage or stream securely via encrypted P2P.
            </p>
          </div>
        </div>
      </section>

      {/* 5. WHY CHOOSE ZIPSTREAM */}
      <section aria-labelledby="why-zipstream-title" className="p-6 sm:p-10 rounded-3xl bg-white dark:bg-[#111C38] border border-[#0C162C]/8 dark:border-white/8 shadow-sm space-y-8">
        <div className="text-center max-w-2xl mx-auto space-y-2">
          <span className="text-xs font-bold text-[#FF5722] uppercase tracking-wider">
            Why Zipstream
          </span>
          <h2 id="why-zipstream-title" className="text-2xl sm:text-3xl font-extrabold tracking-tight text-[#0C162C] dark:text-white">
            Built for speed, privacy, and simplicity
          </h2>
          <p className="text-sm text-[#5C6479] dark:text-white/60">
            Engineered for sensitive contracts, business invoices, and personal files.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="p-5 rounded-2xl bg-[#FAF7F2] dark:bg-[#162244] border border-[#0C162C]/5 dark:border-white/5 space-y-2.5">
            <div className="w-8 h-8 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
              <Lock className="w-4 h-4" />
            </div>
            <h3 className="text-sm font-bold text-[#0C162C] dark:text-white">
              100% Client-Side
            </h3>
            <p className="text-xs text-[#5C6479] dark:text-white/60 leading-relaxed">
              Your files never upload to any remote server or third-party cloud. Complete peace of mind.
            </p>
          </div>

          <div className="p-5 rounded-2xl bg-[#FAF7F2] dark:bg-[#162244] border border-[#0C162C]/5 dark:border-white/5 space-y-2.5">
            <div className="w-8 h-8 rounded-xl bg-orange-500/10 text-[#FF5722] flex items-center justify-center">
              <Zap className="w-4 h-4" />
            </div>
            <h3 className="text-sm font-bold text-[#0C162C] dark:text-white">
              Zero Queue Latency
            </h3>
            <p className="text-xs text-[#5C6479] dark:text-white/60 leading-relaxed">
              No subscription gates or artificial waiting lines. Turnaround is bounded only by your device speed.
            </p>
          </div>

          <div className="p-5 rounded-2xl bg-[#FAF7F2] dark:bg-[#162244] border border-[#0C162C]/5 dark:border-white/5 space-y-2.5">
            <div className="w-8 h-8 rounded-xl bg-purple-500/10 text-[#af52de] flex items-center justify-center">
              <Sparkles className="w-4 h-4" />
            </div>
            <h3 className="text-sm font-bold text-[#0C162C] dark:text-white">
              Smart AI Summaries
            </h3>
            <p className="text-xs text-[#5C6479] dark:text-white/60 leading-relaxed">
              Integrated Gemini AI for instant document Q&A, clause discovery, and key takeaways.
            </p>
          </div>

          <div className="p-5 rounded-2xl bg-[#FAF7F2] dark:bg-[#162244] border border-[#0C162C]/5 dark:border-white/5 space-y-2.5">
            <div className="w-8 h-8 rounded-xl bg-amber-500/10 text-[#FFCB70] flex items-center justify-center">
              <Receipt className="w-4 h-4" />
            </div>
            <h3 className="text-sm font-bold text-[#0C162C] dark:text-white">
              Invoice & Billing Suite
            </h3>
            <p className="text-xs text-[#5C6479] dark:text-white/60 leading-relaxed">
              Create compliant tax invoices with automatic CGST/SGST math and live UPI payment QR codes.
            </p>
          </div>
        </div>
      </section>

      {/* 6. FAQ ACCORDION SECTION */}
      <section aria-labelledby="faq-title" className="max-w-3xl mx-auto w-full space-y-6 pt-4">
        <div className="text-center space-y-2">
          <span className="text-xs font-bold text-[#FF5722] uppercase tracking-wider">
            Questions & Answers
          </span>
          <h2 id="faq-title" className="text-2xl sm:text-3xl font-extrabold tracking-tight text-[#0C162C] dark:text-white">
            Frequently Asked Questions
          </h2>
          <p className="text-sm text-[#5C6479] dark:text-white/60">
            Everything you need to know about our private on-device document tools
          </p>
        </div>

        <div className="divide-y divide-[#0C162C]/10 dark:divide-white/10 border-y border-[#0C162C]/10 dark:border-white/10">
          {faqs.map((faq, idx) => {
            const isOpen = activeFaq === idx;
            return (
              <div key={idx} className="py-4">
                <button
                  id={`home-faq-toggle-${idx}`}
                  onClick={() => setActiveFaq(isOpen ? null : idx)}
                  className="w-full flex items-center justify-between text-left gap-4 text-sm font-bold text-[#0C162C] dark:text-white hover:text-[#FF5722] dark:hover:text-[#FF5722] transition-colors cursor-pointer"
                >
                  <span className="flex items-center gap-3">
                    <span className="text-xs font-bold text-[#FF5722]">0{idx + 1}</span>
                    {faq.q}
                  </span>
                  <ChevronDown
                    className={`w-4 h-4 text-[#5C6479] transition-transform duration-200 shrink-0 ${
                      isOpen ? 'rotate-180 text-[#FF5722]' : ''
                    }`}
                  />
                </button>
                {isOpen && (
                  <p className="text-xs text-[#5C6479] dark:text-white/70 leading-relaxed mt-2.5 pl-7 pr-4 animate-in fade-in duration-150">
                    {faq.a}
                  </p>
                )}
              </div>
            );
          })}
        </div>
      </section>

      {/* 7. STRUCTURED DIRECTORY WITH DIRECT HYPERLINKS TO EVERY TOOL */}
      <section aria-labelledby="all-tools-footer-nav" className="pt-12 border-t border-[#0C162C]/8 dark:border-white/8 space-y-6">
        <div>
          <h2 id="all-tools-footer-nav" className="text-xl sm:text-2xl font-extrabold tracking-tight text-[#0C162C] dark:text-white">
            Explore Free Online PDF &amp; Document Tools
          </h2>
          <p className="text-xs sm:text-sm text-[#5C6479] dark:text-white/60 mt-1">
            Browse our full suite of fast, privacy-first document utilities running 100% in your browser.
          </p>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-4 gap-8">
          {/* Column 1: Convert & Compress */}
          <div className="space-y-3">
            <h3 className="text-xs font-bold text-[#FF5722] uppercase tracking-wider">
              Convert &amp; Compress
            </h3>
            <ul className="space-y-2 text-xs">
              <li>
                <a
                  href="/compress-pdf"
                  onClick={(e) => {
                    e.preventDefault();
                    onSelectTool('compress', 'pdf');
                  }}
                  className="text-[#5C6479] dark:text-white/60 hover:text-[#FF5722] transition-colors"
                >
                  Compress PDF
                </a>
              </li>
              <li>
                <a
                  href="/pdf-to-word"
                  onClick={(e) => {
                    e.preventDefault();
                    onSelectTool('pdf_to_word');
                  }}
                  className="text-[#5C6479] dark:text-white/60 hover:text-[#FF5722] transition-colors"
                >
                  PDF to Word
                </a>
              </li>
              <li>
                <a
                  href="/pdf-to-excel"
                  onClick={(e) => {
                    e.preventDefault();
                    onSelectTool('pdf_to_excel');
                  }}
                  className="text-[#5C6479] dark:text-white/60 hover:text-[#FF5722] transition-colors"
                >
                  PDF to Excel
                </a>
              </li>
              <li>
                <a
                  href="/pdf-to-powerpoint"
                  onClick={(e) => {
                    e.preventDefault();
                    onSelectTool('pdf_to_powerpoint');
                  }}
                  className="text-[#5C6479] dark:text-white/60 hover:text-[#FF5722] transition-colors"
                >
                  PDF to PowerPoint
                </a>
              </li>
              <li>
                <a
                  href="/pdf-to-jpg"
                  onClick={(e) => {
                    e.preventDefault();
                    onSelectTool('pdf_to_jpg');
                  }}
                  className="text-[#5C6479] dark:text-white/60 hover:text-[#FF5722] transition-colors"
                >
                  PDF to JPG
                </a>
              </li>
              <li>
                <a
                  href="/pdf-to-audio"
                  onClick={(e) => {
                    e.preventDefault();
                    onSelectTool('pdf_to_audio');
                  }}
                  className="text-[#5C6479] dark:text-white/60 hover:text-[#FF5722] transition-colors"
                >
                  PDF to Audio (TTS)
                </a>
              </li>
              <li>
                <a
                  href="/extract-text"
                  onClick={(e) => {
                    e.preventDefault();
                    onSelectTool('extract_text');
                  }}
                  className="text-[#5C6479] dark:text-white/60 hover:text-[#FF5722] transition-colors"
                >
                  Extract Text &amp; Markdown
                </a>
              </li>
            </ul>
          </div>

          {/* Column 2: Split & Merge */}
          <div className="space-y-3">
            <h3 className="text-xs font-bold text-[#FF5722] uppercase tracking-wider">
              Split &amp; Merge
            </h3>
            <ul className="space-y-2 text-xs">
              <li>
                <a
                  href="/merge-pdf"
                  onClick={(e) => {
                    e.preventDefault();
                    onSelectTool('merge_pdf');
                  }}
                  className="text-[#5C6479] dark:text-white/60 hover:text-[#FF5722] transition-colors"
                >
                  Merge PDF
                </a>
              </li>
              <li>
                <a
                  href="/split-pdf"
                  onClick={(e) => {
                    e.preventDefault();
                    onSelectTool('split_pdf');
                  }}
                  className="text-[#5C6479] dark:text-white/60 hover:text-[#FF5722] transition-colors"
                >
                  Split &amp; Extract PDF
                </a>
              </li>
              <li>
                <a
                  href="/scan-document"
                  onClick={(e) => {
                    e.preventDefault();
                    onSelectTool('scan_document');
                  }}
                  className="text-[#5C6479] dark:text-white/60 hover:text-[#FF5722] transition-colors"
                >
                  Scan Document (Camera)
                </a>
              </li>
              <li>
                <a
                  href="/images-to-pdf"
                  onClick={(e) => {
                    e.preventDefault();
                    onSelectTool('images_to_pdf');
                  }}
                  className="text-[#5C6479] dark:text-white/60 hover:text-[#FF5722] transition-colors"
                >
                  Images to PDF
                </a>
              </li>
              <li>
                <a
                  href="/watermark-pdf"
                  onClick={(e) => {
                    e.preventDefault();
                    onSelectTool('watermark_pdf');
                  }}
                  className="text-[#5C6479] dark:text-white/60 hover:text-[#FF5722] transition-colors"
                >
                  Watermark PDF
                </a>
              </li>
              <li>
                <a
                  href="/collaborative-whiteboard"
                  onClick={(e) => {
                    e.preventDefault();
                    onSelectTool('collab_whiteboard');
                  }}
                  className="text-[#5C6479] dark:text-white/60 hover:text-[#FF5722] transition-colors"
                >
                  Collab Whiteboard
                </a>
              </li>
            </ul>
          </div>

          {/* Column 3: Sign & Security */}
          <div className="space-y-3">
            <h3 className="text-xs font-bold text-[#FF5722] uppercase tracking-wider">
              Sign &amp; Security
            </h3>
            <ul className="space-y-2 text-xs">
              <li>
                <a
                  href="/protect-pdf"
                  onClick={(e) => {
                    e.preventDefault();
                    onSelectTool('encrypt_pdf');
                  }}
                  className="text-[#5C6479] dark:text-white/60 hover:text-[#FF5722] transition-colors"
                >
                  Protect &amp; Encrypt PDF
                </a>
              </li>
              <li>
                <a
                  href="/unlock-pdf"
                  onClick={(e) => {
                    e.preventDefault();
                    onSelectTool('unlock_pdf');
                  }}
                  className="text-[#5C6479] dark:text-white/60 hover:text-[#FF5722] transition-colors"
                >
                  Unlock PDF
                </a>
              </li>
              <li>
                <a
                  href="/redact-pdf"
                  onClick={(e) => {
                    e.preventDefault();
                    onSelectTool('auto_redact_pii');
                  }}
                  className="text-[#5C6479] dark:text-white/60 hover:text-[#FF5722] transition-colors"
                >
                  Auto-Redact Sensitive PII
                </a>
              </li>
              <li>
                <a
                  href="/privacy-scanner"
                  onClick={(e) => {
                    e.preventDefault();
                    onSelectTool('privacy_scanner');
                  }}
                  className="text-[#5C6479] dark:text-white/60 hover:text-[#FF5722] transition-colors"
                >
                  Privacy &amp; Metadata Strip
                </a>
              </li>
              <li>
                <a
                  href="/file-fingerprint"
                  onClick={(e) => {
                    e.preventDefault();
                    onSelectTool('fingerprint_gen');
                  }}
                  className="text-[#5C6479] dark:text-white/60 hover:text-[#FF5722] transition-colors"
                >
                  SHA-256 Fingerprint Generator
                </a>
              </li>
              <li>
                <a
                  href="/repair-pdf"
                  onClick={(e) => {
                    e.preventDefault();
                    onSelectTool('repair_pdf');
                  }}
                  className="text-[#5C6479] dark:text-white/60 hover:text-[#FF5722] transition-colors"
                >
                  Repair Damaged PDF
                </a>
              </li>
            </ul>
          </div>

          {/* Column 4: AI & Business */}
          <div className="space-y-3">
            <h3 className="text-xs font-bold text-[#FF5722] uppercase tracking-wider">
              AI &amp; Business
            </h3>
            <ul className="space-y-2 text-xs">
              <li>
                <a
                  href="/chat-pdf"
                  onClick={(e) => {
                    e.preventDefault();
                    onSelectTool('chat_pdf');
                  }}
                  className="text-[#5C6479] dark:text-white/60 hover:text-[#FF5722] transition-colors"
                >
                  Chat with PDF (Gemini AI)
                </a>
              </li>
              <li>
                <a
                  href="/summarize-pdf"
                  onClick={(e) => {
                    e.preventDefault();
                    onSelectTool('ai_summarize');
                  }}
                  className="text-[#5C6479] dark:text-white/60 hover:text-[#FF5722] transition-colors"
                >
                  AI Document Summarizer
                </a>
              </li>
              <li>
                <a
                  href="/ocr-pdf"
                  onClick={(e) => {
                    e.preventDefault();
                    onSelectTool('searchable_pdf');
                  }}
                  className="text-[#5C6479] dark:text-white/60 hover:text-[#FF5722] transition-colors"
                >
                  Searchable PDF (OCR)
                </a>
              </li>
              <li>
                <a
                  href="/gst-invoice"
                  onClick={(e) => {
                    e.preventDefault();
                    onSelectTool('gst_invoice');
                  }}
                  className="text-[#5C6479] dark:text-white/60 hover:text-[#FF5722] transition-colors"
                >
                  GST Tax Invoice Generator
                </a>
              </li>
              <li>
                <a
                  href="/pos-billing"
                  onClick={(e) => {
                    e.preventDefault();
                    onSelectTool('pos_billing');
                  }}
                  className="text-[#5C6479] dark:text-white/60 hover:text-[#FF5722] transition-colors"
                >
                  POS Billing Slip &amp; UPI QR
                </a>
              </li>
              <li>
                <a
                  href="/p2p-share"
                  onClick={(e) => {
                    e.preventDefault();
                    onSelectTool('p2p_share');
                  }}
                  className="text-[#5C6479] dark:text-white/60 hover:text-[#FF5722] transition-colors"
                >
                  P2P Encrypted File Share
                </a>
              </li>
            </ul>
          </div>
        </div>
      </section>
    </div>
  );
};
