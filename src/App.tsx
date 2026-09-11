/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { lazy, Suspense, useState, useEffect } from 'react';
import { Navbar } from './components/Navbar';
import { DropZone } from './components/DropZone';
import { CompressionHistory } from './components/CompressionHistory';
import { ReportIssueModal } from './components/ReportIssueModal';
import { HomePage } from './components/HomePage';
import { getToolPage, getToolPageForTool, ToolLandingPage } from './components/ToolLandingPage';
import {
  FileCategory,
  ToolMode,
  UploadedFileInfo,
  CompressionSettings,
  CompressionResult,
  BatchItem,
} from './types';
import type { ProgressUpdate } from './utils/compressionEngine';
import { detectFileCategory } from './utils/formatters';
import { prepareFileInfo } from './utils/fileInfo';
import {
  Lock,
  Shield,
} from 'lucide-react';

const BatchProcessingView = lazy(() => import('./components/BatchProcessingView').then(module => ({ default: module.BatchProcessingView })));
const CompressionSettingsCard = lazy(() => import('./components/CompressionSettingsCard').then(module => ({ default: module.CompressionSettingsCard })));
const ProcessingView = lazy(() => import('./components/ProcessingView').then(module => ({ default: module.ProcessingView })));
const SuccessView = lazy(() => import('./components/SuccessView').then(module => ({ default: module.SuccessView })));
const MergePdfView = lazy(() => import('./components/MergePdfView').then(module => ({ default: module.MergePdfView })));
const ScanDocumentView = lazy(() => import('./components/ScanDocumentView').then(module => ({ default: module.ScanDocumentView })));
const ImagesToPdfView = lazy(() => import('./components/ImagesToPdfView').then(module => ({ default: module.ImagesToPdfView })));
const SplitPdfView = lazy(() => import('./components/SplitPdfView').then(module => ({ default: module.SplitPdfView })));
const WatermarkPdfView = lazy(() => import('./components/WatermarkPdfView').then(module => ({ default: module.WatermarkPdfView })));
const SearchCommandPalette = lazy(() => import('./components/SearchCommandPalette').then(module => ({ default: module.SearchCommandPalette })));
const ConvertToolsView = lazy(() => import('./components/views/ConvertToolsView').then(module => ({ default: module.ConvertToolsView })));
const SecurityToolsView = lazy(() => import('./components/views/SecurityToolsView').then(module => ({ default: module.SecurityToolsView })));
const AiToolsView = lazy(() => import('./components/views/AiToolsView').then(module => ({ default: module.AiToolsView })));
const BusinessToolsView = lazy(() => import('./components/views/BusinessToolsView').then(module => ({ default: module.BusinessToolsView })));
const CollaborateToolsView = lazy(() => import('./components/views/CollaborateToolsView').then(module => ({ default: module.CollaborateToolsView })));
const ConvertToPdfView = lazy(() => import('./components/views/ConvertToPdfView').then(module => ({ default: module.ConvertToPdfView })));
const AboutView = lazy(() => import('./components/views/AboutView').then(module => ({ default: module.AboutView })));

const DEFAULT_SETTINGS: CompressionSettings = {
  level: 'medium',
  preset: 'custom',
  outputFormat: 'original',
  scalePercent: 100,
  removeMetadata: true,
  targetDpi: 150,
  audioBitrate: 128,
};

export const TOOL_CANONICAL_PATHS: Record<ToolMode, string> = {
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
  // Convert to PDF
  word_to_pdf: '/word-to-pdf',
  pptx_to_pdf: '/powerpoint-to-pdf',
  xlsx_to_pdf: '/excel-to-pdf',
  html_to_pdf: '/html-to-pdf',
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

export const TOOL_PATHS: Record<string, ToolMode> = {
  '/compress-pdf': 'compress',
  '/merge-pdf': 'merge_pdf',
  '/split-pdf': 'split_pdf',
  '/images-to-pdf': 'images_to_pdf',
  '/jpg-to-pdf': 'images_to_pdf',  // alias
  '/scan-document': 'scan_document',
  '/watermark-pdf': 'watermark_pdf',
  '/pdf-to-word': 'pdf_to_word',
  '/pdf-to-excel': 'pdf_to_excel',
  '/pdf-to-powerpoint': 'pdf_to_powerpoint',
  '/pdf-to-jpg': 'pdf_to_jpg',
  '/extract-text': 'extract_text',
  '/pdf-to-html': 'pdf_to_html',
  '/pdf-to-audio': 'pdf_to_audio',
  '/pdf-to-epub': 'pdf_to_epub',
  // Convert to PDF
  '/word-to-pdf': 'word_to_pdf',
  '/powerpoint-to-pdf': 'pptx_to_pdf',
  '/excel-to-pdf': 'xlsx_to_pdf',
  '/html-to-pdf': 'html_to_pdf',
  '/protect-pdf': 'encrypt_pdf',
  '/unlock-pdf': 'unlock_pdf',
  '/redact-pdf': 'auto_redact_pii',
  '/privacy-scanner': 'privacy_scanner',
  '/file-fingerprint': 'fingerprint_gen',
  '/chat-pdf': 'chat_pdf',
  '/summarize-pdf': 'ai_summarize',
  '/ocr-pdf': 'searchable_pdf',
  '/compare-pdf': 'compare_pdfs',
  '/repair-pdf': 'repair_pdf',
  '/gst-invoice': 'gst_invoice',
  '/pos-billing': 'pos_billing',
  '/gst-filing-prep': 'gst_filing_prep',
  '/p2p-share': 'p2p_share',
  '/collaborative-whiteboard': 'collab_whiteboard',
};

const TOOL_METADATA: Record<string, { title: string; description: string }> = {
  '/compress-pdf': { title: 'Compress PDF Online | ZipStream', description: 'Reduce PDF file size quickly with ZipStream privacy-first compression tools.' },
  '/merge-pdf': { title: 'Merge PDF Files Online | ZipStream', description: 'Combine PDF files in your browser with ZipStream.' },
  '/split-pdf': { title: 'Split PDF Online | ZipStream', description: 'Extract and split PDF pages with ZipStream.' },
  '/images-to-pdf': { title: 'Images to PDF Online | ZipStream', description: 'Convert JPG and PNG images into a PDF in your browser.' },
  '/jpg-to-pdf': { title: 'JPG to PDF Converter Free Online | ZipStream', description: 'Convert JPG, PNG, WebP and other images to PDF online free. Fast, private, no upload required.' },
  '/scan-document': { title: 'Scan Documents Online | ZipStream', description: 'Scan documents with your camera and create clean PDFs.' },
  '/watermark-pdf': { title: 'Watermark PDF Online | ZipStream', description: 'Add a watermark to PDF documents in your browser.' },
  '/pdf-to-word': { title: 'PDF to Word Converter | ZipStream', description: 'Convert PDF documents to editable Word files with ZipStream.' },
  '/pdf-to-excel': { title: 'PDF to Excel Converter | ZipStream', description: 'Extract PDF tables into spreadsheet formats with ZipStream.' },
  '/pdf-to-powerpoint': { title: 'PDF to PowerPoint Converter | ZipStream', description: 'Convert PDF pages into PowerPoint presentations with ZipStream.' },
  '/pdf-to-jpg': { title: 'PDF to JPG Converter | ZipStream', description: 'Convert PDF pages into JPG images in your browser.' },
  '/extract-text': { title: 'Extract Text from PDF | ZipStream', description: 'Extract selectable text and Markdown from PDF documents online.' },
  '/pdf-to-html': { title: 'PDF to HTML Converter | ZipStream', description: 'Convert PDF content into responsive HTML for web publishing.' },
  '/pdf-to-audio': { title: 'PDF to Audio Reader | ZipStream', description: 'Listen to PDF text read aloud with browser speech tools.' },
  '/pdf-to-epub': { title: 'PDF to EPUB Converter | ZipStream', description: 'Convert documents into digital ebooks for e-readers.' },
  // Convert to PDF
  '/word-to-pdf': { title: 'Word to PDF Converter Free Online | ZipStream', description: 'Convert Word DOCX and DOC files to PDF with full layout fidelity, vector text, and tables. Processed in an isolated container and automatically deleted.' },
  '/powerpoint-to-pdf': { title: 'PowerPoint to PDF Converter Free Online | ZipStream', description: 'Convert PowerPoint PPTX presentations to PDF online free. All slides exported, no signup required.' },
  '/excel-to-pdf': { title: 'Excel to PDF Converter Free Online | ZipStream', description: 'Convert Excel XLSX spreadsheets to PDF free online. Clean, printable PDF from any spreadsheet.' },
  '/html-to-pdf': { title: 'HTML to PDF Converter Free Online | ZipStream', description: 'Convert HTML files or paste HTML code to PDF free. 100% browser-based, instant download.' },
  '/protect-pdf': { title: 'Protect PDF with Password | ZipStream', description: 'Add password protection and encryption to PDF documents.' },
  '/unlock-pdf': { title: 'Unlock PDF Online | ZipStream', description: 'Remove password security from authorized PDF documents.' },
  '/redact-pdf': { title: 'Redact Sensitive PDF Information | ZipStream', description: 'Find and blackout sensitive PII data before sharing a PDF.' },
  '/privacy-scanner': { title: 'Scan PDF Privacy Metadata | ZipStream', description: 'Audit and remove hidden metadata, authors, and GPS coordinates.' },
  '/file-fingerprint': { title: 'Generate File Fingerprint | ZipStream', description: 'Generate cryptographic SHA-256 and SHA-512 hashes for documents.' },
  '/chat-pdf': { title: 'Chat with PDF | ZipStream', description: 'Ask questions and converse with PDF documents using document AI.' },
  '/summarize-pdf': { title: 'Summarize PDF Online | ZipStream', description: 'Generate concise executive summaries and bullet points from PDFs.' },
  '/ocr-pdf': { title: 'Searchable PDF (OCR) | ZipStream', description: 'Add searchable OCR text layers to scanned document pages.' },
  '/compare-pdf': { title: 'Compare PDF Documents | ZipStream', description: 'Review side-by-side visual differences between two PDF versions.' },
  '/repair-pdf': { title: 'Repair PDF Online | ZipStream', description: 'Recover and repair damaged or corrupted PDF documents.' },
  '/gst-invoice': { title: 'Create GST Invoice Online | ZipStream', description: 'Build professional GST invoices with tax calculations and PDF export.' },
  '/pos-billing': { title: 'Create POS Billing Slip | ZipStream', description: 'Generate thermal POS receipts with dynamic UPI QR payment support.' },
  '/gst-filing-prep': { title: 'GST Filing & Return Preparation | ZipStream', description: 'Prepare and organize GST sales summaries and return files.' },
  '/p2p-share': { title: 'P2P File Share Online — Direct, Encrypted & Zero Cloud | ZipStream', description: 'Share files directly peer-to-peer with zero cloud storage, QR pairing, and live sync.' },
  '/collaborative-whiteboard': { title: 'Collaborative Whiteboard Online | ZipStream', description: 'Real-time collaborative whiteboard for sketches, diagrams, and visual brainstorming.' },
  '/about': { title: 'About ZipStream — Mission, Architecture & Features | ZipStream', description: 'Learn how ZipStream was built, our 100% client-side privacy architecture, comparison with other platforms, and our 35+ tools.' },
};

function toolFromPath(path: string): ToolMode | null {
  const normalized = path.replace(/\/$/, '') || '/';
  if (normalized === '/') return 'compress';
  return TOOL_PATHS[normalized] || getToolPage(normalized)?.tool || null;
}

export default function App() {
  const [theme, setTheme] = useState<'light' | 'dark'>(() => {
    try {
      const saved = localStorage.getItem('zipstream-theme');
      if (saved === 'dark' || saved === 'light') return saved;
      if (typeof window !== 'undefined' && window.matchMedia && window.matchMedia('(prefers-color-scheme: light)').matches) {
        return 'light';
      }
    } catch {
      // fallback
    }
    return 'dark';
  });

  const [currentPath, setCurrentPath] = useState<string>(() => {
    if (typeof window !== 'undefined') {
      const hash = window.location.hash;
      const path = window.location.pathname.replace(/\/$/, '') || '/';
      if (hash.includes('/room/') || path.startsWith('/room/')) {
        return '/p2p-share';
      }
      return path;
    }
    return '/';
  });

  const [activeTool, setActiveTool] = useState<ToolMode>(() => {
    if (typeof window !== 'undefined') {
      const hash = window.location.hash;
      const path = window.location.pathname.replace(/\/$/, '') || '/';
      if (hash.includes('/room/') || path.startsWith('/room/')) {
        return 'p2p_share';
      }
      const pathTool = toolFromPath(path);
      if (pathTool) return pathTool;
    }
    return 'compress';
  });
  const [activeCategory, setActiveCategory] = useState<FileCategory>('all');
  const [hoverCategory, setHoverCategory] = useState<FileCategory | null>(null);
  const [stage, setStage] = useState<'upload' | 'settings' | 'processing' | 'success' | 'batch'>('upload');
  const [activeFile, setActiveFile] = useState<UploadedFileInfo | null>(null);
  const [batchItems, setBatchItems] = useState<BatchItem[]>([]);
  const [settings, setSettings] = useState<CompressionSettings>(DEFAULT_SETTINGS);
  const [progress, setProgress] = useState<ProgressUpdate>({
    percentage: 0,
    currentStep: 'Starting…',
    stepIndex: 1,
    totalSteps: 5,
    elapsedMs: 0,
    speedMBps: 0,
  });
  const [result, setResult] = useState<CompressionResult | null>(null);
  const [history, setHistory] = useState<CompressionResult[]>([]);
  const [isReportModalOpen, setIsReportModalOpen] = useState(false);
  const [isSearchOpen, setIsSearchOpen] = useState(false);

  // SEO & Meta tags synchronizer
  const updateSeo = (path: string, tool?: ToolMode) => {
    const normalized = path.replace(/\/$/, '') || '/';
    const canonicalUrl = `https://zipstream.online${normalized === '/' ? '/' : normalized}`;
    const page = getToolPage(normalized) || (tool && tool !== 'compress' ? getToolPageForTool(tool) : undefined);
    const metadata = TOOL_METADATA[normalized];

    const isUnknownRoute =
      normalized !== '/' &&
      normalized !== '/about' &&
      normalized !== '/p2p-share' &&
      !getToolPage(normalized) &&
      !TOOL_PATHS[normalized] &&
      !normalized.startsWith('/room/');

    if (normalized === '/') {
      document.title = 'Compress PDF Online Free — Fast & Private | ZipStream';
    } else if (normalized === '/about') {
      document.title = 'About ZipStream — Mission, Architecture & Features | ZipStream';
    } else if (isUnknownRoute) {
      document.title = '404 — Page Not Found | ZipStream';
    } else if (metadata?.title) {
      document.title = metadata.title;
    } else if (page?.title) {
      document.title = `${page.title} | ZipStream`;
    } else {
      document.title = 'Compress PDF Online Free — Fast & Private | ZipStream';
    }

    let description = document.querySelector('meta[name="description"]');
    if (!description) {
      description = document.createElement('meta');
      description.setAttribute('name', 'description');
      document.head.appendChild(description);
    }
    description.setAttribute(
      'content',
      isUnknownRoute
        ? 'The requested page or tool could not be found. Explore 35+ free online PDF and file tools on ZipStream.'
        : metadata?.description || page?.description || 'ZipStream is a free, privacy-first online tool to compress, merge, split, and convert PDFs and files directly in your browser. No file upload or signup needed.'
    );

    const canonical = document.querySelector('link[rel="canonical"]');
    canonical?.setAttribute('href', canonicalUrl);
  };

  // Sync theme with HTML document class & localStorage
  useEffect(() => {
    updateSeo(currentPath, activeTool);
  }, []);

  useEffect(() => {
    try {
      if (theme === 'dark') {
        document.documentElement.classList.add('dark');
      } else {
        document.documentElement.classList.remove('dark');
      }
      localStorage.setItem('zipstream-theme', theme);
    } catch {
      // ignore storage error
    }
  }, [theme]);

  const toggleTheme = () => {
    setTheme((prev) => (prev === 'dark' ? 'light' : 'dark'));
  };

  // Centralized SPA navigation function
  const navigateTo = (path: string, tool?: ToolMode) => {
    const normalized = path.replace(/\/$/, '') || '/';
    try {
      window.history.pushState({}, '', normalized);
    } catch {
      // ignore
    }
    setCurrentPath(normalized);

    const targetTool = tool || toolFromPath(normalized) || 'compress';
    setActiveTool(targetTool);

    if (normalized === '/') {
      setStage('upload');
      if (activeFile?.previewUrl && activeFile.previewUrl.startsWith('blob:')) {
        try {
          URL.revokeObjectURL(activeFile.previewUrl);
        } catch {
          // ignore
        }
      }
      setActiveFile(null);
      setResult(null);
      setBatchItems([]);
      setSettings(DEFAULT_SETTINGS);
    }

    updateSeo(normalized, targetTool);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Handle direct P2P Room links (/room/xyz or #/room/xyz)
  useEffect(() => {
    const checkRoom = () => {
      const hash = window.location.hash;
      const path = window.location.pathname.replace(/\/$/, '') || '/';
      if (hash.includes('/room/') || path.startsWith('/room/')) {
        setActiveTool('p2p_share');
        setCurrentPath('/p2p-share');
      }
    };
    checkRoom();
    window.addEventListener('hashchange', checkRoom);
    return () => window.removeEventListener('hashchange', checkRoom);
  }, []);

  // Listen for browser Back & Forward button events (popstate)
  useEffect(() => {
    const handlePopState = () => {
      const path = window.location.pathname.replace(/\/$/, '') || '/';
      setCurrentPath(path);
      const routeTool = toolFromPath(path) || 'compress';
      setActiveTool(routeTool);
      if (path === '/') {
        setStage('upload');
      }
      updateSeo(path, routeTool);
    };

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  // Global keyboard shortcut for Search Command Palette (Ctrl+K or Cmd+K)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setIsSearchOpen((prev) => !prev);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Category selection handler from navbar
  const handleSelectCategory = (cat: FileCategory) => {
    setActiveCategory(cat);
    if (currentPath !== '/') {
      navigateTo('/');
    } else {
      if (stage !== 'upload') {
        handleReset();
      }
    }
  };

  // Tool selection handler from Search or Navbar or Homepage
  const handleSelectTool = (tool: ToolMode, category?: FileCategory) => {
    if (tool === 'compress') {
      if (category && category !== 'all' && category !== 'pdf') {
        setActiveCategory(category);
        if (currentPath !== '/') {
          navigateTo('/');
        } else {
          setStage('upload');
          window.scrollTo({ top: 0, behavior: 'smooth' });
        }
        return;
      }
      setActiveCategory('pdf');
      navigateTo('/compress-pdf', 'compress');
      return;
    }

    const targetPath = TOOL_CANONICAL_PATHS[tool] || getToolPageForTool(tool)?.path || `/${tool.replace(/_/g, '-')}`;
    navigateTo(targetPath, tool);
  };

  // Reset back to upload dropzone / homepage
  const handleReset = () => {
    if (activeFile?.previewUrl && activeFile.previewUrl.startsWith('blob:')) {
      try {
        URL.revokeObjectURL(activeFile.previewUrl);
      } catch {
        // ignore
      }
    }
    setActiveFile(null);
    setResult(null);
    setBatchItems([]);
    setSettings(DEFAULT_SETTINGS);
    setStage('upload');
    navigateTo('/');
  };

  // Single file loaded
  const handleFileLoaded = (fileInfo: UploadedFileInfo) => {
    setActiveFile(fileInfo);
    if (activeCategory === 'all') {
      setActiveCategory(fileInfo.category);
    }
    setStage('settings');
  };

  // Multiple files loaded for batch mode
  const handleMultipleFilesLoaded = (files: UploadedFileInfo[]) => {
    const items: BatchItem[] = files.map((fileInfo, index) => ({
      id: `batch-${Date.now()}-${index}`,
      fileInfo,
      settings,
      status: 'pending',
      progress: 0,
    }));
    setBatchItems(items);
    setStage('batch');
  };

  // Add more files to existing batch
  const handleAddMoreToBatch = (fileList: FileList | File[]) => {
    const newItems: BatchItem[] = [];
    Array.from(fileList).forEach((file, idx) => {
      const category = detectFileCategory(file);
      if (category) {
        const info = prepareFileInfo(file, category);
        newItems.push({
          id: `batch-${Date.now()}-${idx}`,
          fileInfo: info,
          settings,
          status: 'pending',
          progress: 0,
        });
      }
    });
    setBatchItems((prev) => [...prev, ...newItems]);
  };

  // Start Compression Pipeline
  const handleStartCompress = async () => {
    if (!activeFile) return;

    setStage('processing');
    setProgress({
      percentage: 0,
      currentStep: 'Preparing file…',
      stepIndex: 1,
      totalSteps: 5,
      elapsedMs: 0,
      speedMBps: 4.5,
    });

    try {
      const { processCompression } = await import('./utils/compressionEngine');
      const compressionResult = await processCompression(
        activeFile,
        settings,
        (progressUpdate) => {
          setProgress(progressUpdate);
        }
      );

      await new Promise((res) => setTimeout(res, 180));

      setResult(compressionResult);
      setHistory((prev) => [compressionResult, ...prev.slice(0, 9)]);
      setStage('success');
    } catch (err) {
      console.error('Compression failed:', err);
      setStage('settings');
    }
  };

  // Helper check for tool category routing
  const isConvertTool = [
    'pdf_to_word',
    'pdf_to_jpg',
    'pdf_to_excel',
    'pdf_to_powerpoint',
    'extract_text',
    'pdf_to_html',
    'pdf_to_audio',
    'pdf_to_epub',
  ].includes(activeTool);

  const isConvertToPdfTool = [
    'word_to_pdf',
    'pptx_to_pdf',
    'xlsx_to_pdf',
    'html_to_pdf',
  ].includes(activeTool);

  const isSecurityTool = [
    'encrypt_pdf',
    'unlock_pdf',
    'auto_redact_pii',
    'privacy_scanner',
    'fingerprint_gen',
  ].includes(activeTool);

  const isAiTool = [
    'chat_pdf',
    'ai_summarize',
    'searchable_pdf',
    'compare_pdfs',
    'repair_pdf',
  ].includes(activeTool);

  const isBusinessTool = [
    'gst_invoice',
    'pos_billing',
    'gst_filing_prep',
  ].includes(activeTool);

  const isCollabTool = [
    'p2p_share',
    'collab_whiteboard',
  ].includes(activeTool);

  const isNotFound =
    currentPath !== '/' &&
    currentPath !== '/about' &&
    currentPath !== '/p2p-share' &&
    !getToolPage(currentPath) &&
    !TOOL_PATHS[currentPath] &&
    !currentPath.startsWith('/room/');

  const activeFeaturePage = getToolPage(currentPath) || getToolPageForTool(activeTool);

  return (
    <div className="min-h-screen relative bg-white dark:bg-[#0B132B] text-[#0F172A] dark:text-[#F3F4F6] flex flex-col font-sans selection:bg-[#FF5722] selection:text-white transition-colors duration-200">
      {/* Background Subtle Texture */}
      <div className="fixed inset-0 nomu-dot-grid pointer-events-none opacity-60 z-0"></div>

      {/* 1. Nomu Storefront Header / Navbar */}
      <Navbar
        activeTool={currentPath === '/' ? 'compress' : activeTool}
        onSelectTool={handleSelectTool}
        activeCategory={activeCategory}
        onSelectCategory={handleSelectCategory}
        onHoverCategory={setHoverCategory}
        onReset={() => navigateTo('/')}
        hasActiveFile={stage !== 'upload'}
        onOpenReportIssue={() => setIsReportModalOpen(true)}
        onOpenSearch={() => setIsSearchOpen(true)}
        onOpenAbout={() => navigateTo('/about')}
        isAboutPage={currentPath === '/about'}
        theme={theme}
        onToggleTheme={toggleTheme}
      />

      {/* Main Content Area */}
      <Suspense fallback={<div className="min-h-[240px]" aria-busy="true" aria-label="Loading selected tool" />}>
      <main className="relative z-10 flex-1 max-w-5xl w-full mx-auto px-4 sm:px-6 pt-2 sm:pt-4 pb-8 sm:pb-12 flex flex-col justify-center">
        {currentPath === '/' ? (
          /* HOMEPAGE - PURE, NEVER WRAPPED IN TOOL LANDING PAGE */
          stage === 'upload' ? (
            <HomePage
              onSelectTool={handleSelectTool}
              onFileLoaded={handleFileLoaded}
              onMultipleFilesLoaded={handleMultipleFilesLoaded}
              activeCategory={activeCategory}
              hoverCategory={hoverCategory}
            />
          ) : (
            /* In-flight Compression Views when user drops a file on the homepage */
            <div className="w-full flex flex-col items-center justify-center space-y-6">
              <button
                onClick={handleReset}
                className="self-start flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-black/[0.04] dark:bg-white/[0.06] hover:bg-black/[0.08] dark:hover:bg-white/[0.1] text-[13px] font-medium text-[#1d1d1f] dark:text-[#f5f5f7] transition-colors cursor-pointer"
              >
                <span>← Back to All Tools</span>
              </button>

              {stage === 'batch' && (
                <BatchProcessingView
                  initialItems={batchItems}
                  settings={settings}
                  onReset={handleReset}
                  onAddMoreFiles={handleAddMoreToBatch}
                />
              )}

              {stage === 'settings' && activeFile && (
                <CompressionSettingsCard
                  fileInfo={activeFile}
                  settings={settings}
                  onUpdateSettings={setSettings}
                  onStartCompress={handleStartCompress}
                  onResetFile={handleReset}
                />
              )}

              {stage === 'processing' && activeFile && (
                <ProcessingView
                  fileInfo={activeFile}
                  settings={settings}
                  progress={progress}
                />
              )}

              {stage === 'success' && result && (
                <SuccessView
                  result={result}
                  onCompressAnother={handleReset}
                />
              )}
            </div>
          )
        ) : currentPath === '/about' ? (
          /* DEDICATED ABOUT VIEW (AccessGrid Inspired) */
          <AboutView
            onBackToHome={() => navigateTo('/')}
            onSelectTool={handleSelectTool}
          />
        ) : isNotFound ? (
          /* CUSTOM IN-APP 404 PAGE NOT FOUND */
          <div className="w-full max-w-2xl mx-auto text-center py-12 px-4 space-y-6 animate-in fade-in duration-200">
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-[#FF5722]/10 border border-[#FF5722]/20 text-[#FF5722] text-xs font-bold uppercase tracking-wider">
              <span className="font-mono text-[#00ff87]">⇲</span> Error 404
            </div>
            <h1 className="text-3xl sm:text-4xl font-extrabold text-[#0C162C] dark:text-white tracking-tight">
              Page or Tool Not Found
            </h1>
            <p className="text-sm sm:text-base text-[#5C6479] dark:text-white/60 max-w-md mx-auto">
              The document tool or page you are looking for might have been moved, renamed, or doesn't exist.
            </p>
            <div className="pt-2">
              <button
                type="button"
                onClick={() => navigateTo('/')}
                className="inline-flex items-center gap-2 px-6 py-3 rounded-full bg-[#FF5722] hover:bg-[#f4511e] text-white font-bold text-sm shadow-md transition-all cursor-pointer"
              >
                <span>← Return to ZipStream Home</span>
              </button>
            </div>
            <div className="pt-8 border-t border-[#0C162C]/10 dark:border-white/10 space-y-3">
              <span className="text-xs font-semibold uppercase tracking-wider text-[#5C6479] dark:text-white/40 block">
                Popular Free PDF Tools
              </span>
              <div className="flex flex-wrap items-center justify-center gap-2">
                {[
                  { name: 'Compress PDF', path: '/compress-pdf', tool: 'compress' },
                  { name: 'Merge PDF', path: '/merge-pdf', tool: 'merge_pdf' },
                  { name: 'Split PDF', path: '/split-pdf', tool: 'split_pdf' },
                  { name: 'PDF to Word', path: '/pdf-to-word', tool: 'pdf_to_word' },
                  { name: 'PDF to JPG', path: '/pdf-to-jpg', tool: 'pdf_to_jpg' },
                  { name: 'Images to PDF', path: '/images-to-pdf', tool: 'images_to_pdf' },
                  { name: 'Scan Document', path: '/scan-document', tool: 'scan_document' },
                  { name: 'GST Invoice', path: '/gst-invoice', tool: 'gst_invoice' },
                ].map((item) => (
                  <button
                    key={item.path}
                    type="button"
                    onClick={() => navigateTo(item.path, item.tool as ToolMode)}
                    className="px-3.5 py-1.5 rounded-xl bg-white dark:bg-[#131E3A] border border-[#0C162C]/10 dark:border-white/10 hover:border-[#FF5722]/50 text-xs font-semibold text-[#0C162C] dark:text-white transition-all cursor-pointer shadow-2xs"
                  >
                    {item.name}
                  </button>
                ))}
              </div>
            </div>
          </div>
        ) : (
          /* DEDICATED INDIVIDUAL FEATURE PAGE */
          <ToolLandingPage
            page={activeFeaturePage}
            onBackToHome={() => navigateTo('/')}
            onNavigate={(path, tool) => navigateTo(path, tool)}
          >
            {/* 1. PDF Tools (Core) */}
            {activeTool === 'merge_pdf' && (
              <MergePdfView
                key="merge_pdf"
                onBackToHome={() => navigateTo('/')}
              />
            )}

            {activeTool === 'scan_document' && (
              <ScanDocumentView
                key="scan_document"
                onBackToHome={() => navigateTo('/')}
              />
            )}

            {activeTool === 'images_to_pdf' && (
              <ImagesToPdfView
                key="images_to_pdf"
                onBackToHome={() => navigateTo('/')}
              />
            )}

            {activeTool === 'split_pdf' && (
              <SplitPdfView
                key="split_pdf"
                onBackToHome={() => navigateTo('/')}
              />
            )}

            {activeTool === 'watermark_pdf' && (
              <WatermarkPdfView
                key="watermark_pdf"
                onBackToHome={() => navigateTo('/')}
              />
            )}

            {/* 2. Convert -> Other Tools */}
            {isConvertTool && (
              <ConvertToolsView
                key={activeTool}
                initialTool={activeTool}
                onBackToHome={() => navigateTo('/')}
              />
            )}

            {/* 2b. Convert to PDF Tools */}
            {isConvertToPdfTool && (
              <ConvertToPdfView
                key={activeTool}
                initialTool={activeTool}
                onBackToHome={() => navigateTo('/')}
              />
            )}

            {/* 3. Security & Privacy Tools */}
            {isSecurityTool && (
              <SecurityToolsView
                key={activeTool}
                initialTool={activeTool}
                onBackToHome={() => navigateTo('/')}
              />
            )}

            {/* 4. AI Tools */}
            {isAiTool && (
              <AiToolsView
                key={activeTool}
                initialTool={activeTool}
                onBackToHome={() => navigateTo('/')}
              />
            )}

            {/* 5. Business Tools */}
            {isBusinessTool && (
              <BusinessToolsView
                key={activeTool}
                initialTool={activeTool}
                onBackToHome={() => navigateTo('/')}
              />
            )}

            {/* 6. Collaborate & Share */}
            {isCollabTool && (
              <CollaborateToolsView
                key={activeTool}
                initialTool={activeTool}
                onBackToHome={() => navigateTo('/')}
              />
            )}

            {/* 7. Dedicated Compress PDF Page (/compress-pdf) */}
            {activeTool === 'compress' && (
              <div className="w-full flex flex-col items-center justify-center space-y-6">
                {stage === 'upload' && (
                  <div className="w-full space-y-4">
                    <DropZone
                      onFileLoaded={handleFileLoaded}
                      onMultipleFilesLoaded={handleMultipleFilesLoaded}
                      activeCategory="pdf"
                      isHighlighted={false}
                    />
                  </div>
                )}

                {stage === 'batch' && (
                  <BatchProcessingView
                    initialItems={batchItems}
                    settings={settings}
                    onReset={handleReset}
                    onAddMoreFiles={handleAddMoreToBatch}
                  />
                )}

                {stage === 'settings' && activeFile && (
                  <CompressionSettingsCard
                    fileInfo={activeFile}
                    settings={settings}
                    onUpdateSettings={setSettings}
                    onStartCompress={handleStartCompress}
                    onResetFile={handleReset}
                  />
                )}

                {stage === 'processing' && activeFile && (
                  <ProcessingView
                    fileInfo={activeFile}
                    settings={settings}
                    progress={progress}
                  />
                )}

                {stage === 'success' && result && (
                  <SuccessView
                    result={result}
                    onCompressAnother={handleReset}
                  />
                )}
              </div>
            )}
          </ToolLandingPage>
        )}

        {/* Compression History for Homepage */}
        {currentPath === '/' && history.length > 0 && stage !== 'processing' && stage !== 'batch' && (
          <div className="mt-8">
            <CompressionHistory
              history={history}
              onClearHistory={() => setHistory([])}
              onSelectResult={(item) => {
                setResult(item);
                setStage('success');
              }}
            />
          </div>
        )}
      </main>
      </Suspense>

      {/* Nomu Storefront Inspired Comprehensive SEO Footer */}
      <footer className="border-t border-[#0C162C]/10 dark:border-white/10 bg-white/80 dark:bg-[#080E1E]/95 backdrop-blur-md pt-12 pb-8 text-[13px] text-[#5C6479] dark:text-white/60 transition-colors">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-10">
          {/* Top Multi-Column Internal Links Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-8">
            {/* Brand Information */}
            <div className="col-span-2 sm:col-span-2 md:col-span-3 lg:col-span-1 space-y-3.5">
              <button
                type="button"
                onClick={() => navigateTo('/')}
                className="flex items-center gap-2 cursor-pointer group text-left"
              >
                <div className="relative w-7 h-7 rounded-lg bg-[#11141a] border border-white/[0.12] text-white flex items-center justify-center shrink-0 shadow-xs group-hover:border-[#00ff87]/60 transition-colors">
                  <span className="text-[11px] font-mono font-bold text-[#00ff87]">⇲</span>
                </div>
                <span className="font-extrabold text-[#0C162C] dark:text-white tracking-tight text-base">
                  zipstream<span className="text-[#FF5722]">.</span>
                </span>
              </button>
              <p className="text-xs text-[#5C6479] dark:text-white/65 leading-relaxed">
                Free, privacy-first online PDF and document processing. Files are handled directly in your browser using client-side WebAssembly — zero cloud uploads.
              </p>
              <div className="pt-1 text-xs text-[#5C6479] dark:text-white/50 space-y-1">
                <div>
                  Created by <a href="https://www.linkedin.com/in/pranjal-singh-02aba0363/" target="_blank" rel="noopener noreferrer" className="font-semibold text-[#0C162C] dark:text-white hover:text-[#FF5722] underline underline-offset-2 transition-colors">Pranjal Singh</a>
                </div>
                <div>
                  <a
                    href="/about"
                    onClick={(e) => { e.preventDefault(); navigateTo('/about'); }}
                    className="text-[#FF5722] hover:underline font-medium inline-flex items-center gap-1"
                  >
                    <span>About ZipStream &amp; Architecture →</span>
                  </a>
                </div>
              </div>
            </div>

            {/* Column 1: Compress & Convert */}
            <div className="space-y-3">
              <span className="text-xs font-bold text-[#FF5722] uppercase tracking-wider block">
                Compress &amp; Convert
              </span>
              <ul className="space-y-2 text-xs">
                <li>
                  <a
                    href="/compress-pdf"
                    onClick={(e) => { e.preventDefault(); navigateTo('/compress-pdf', 'compress'); }}
                    className="hover:text-[#FF5722] transition-colors"
                  >
                    Compress PDF Online
                  </a>
                </li>
                <li>
                  <a
                    href="/pdf-to-word"
                    onClick={(e) => { e.preventDefault(); navigateTo('/pdf-to-word', 'pdf_to_word'); }}
                    className="hover:text-[#FF5722] transition-colors"
                  >
                    PDF to Word (.docx)
                  </a>
                </li>
                <li>
                  <a
                    href="/pdf-to-excel"
                    onClick={(e) => { e.preventDefault(); navigateTo('/pdf-to-excel', 'pdf_to_excel'); }}
                    className="hover:text-[#FF5722] transition-colors"
                  >
                    PDF to Excel (.xlsx)
                  </a>
                </li>
                <li>
                  <a
                    href="/pdf-to-powerpoint"
                    onClick={(e) => { e.preventDefault(); navigateTo('/pdf-to-powerpoint', 'pdf_to_powerpoint'); }}
                    className="hover:text-[#FF5722] transition-colors"
                  >
                    PDF to PowerPoint
                  </a>
                </li>
                <li>
                  <a
                    href="/pdf-to-jpg"
                    onClick={(e) => { e.preventDefault(); navigateTo('/pdf-to-jpg', 'pdf_to_jpg'); }}
                    className="hover:text-[#FF5722] transition-colors"
                  >
                    PDF to JPG Images
                  </a>
                </li>
                <li>
                  <a
                    href="/images-to-pdf"
                    onClick={(e) => { e.preventDefault(); navigateTo('/images-to-pdf', 'images_to_pdf'); }}
                    className="hover:text-[#FF5722] transition-colors"
                  >
                    Images to PDF
                  </a>
                </li>
                {/* Convert to PDF links */}
                <li>
                  <a
                    href="/jpg-to-pdf"
                    onClick={(e) => { e.preventDefault(); navigateTo('/jpg-to-pdf', 'images_to_pdf'); }}
                    className="hover:text-[#FF5722] transition-colors"
                  >
                    JPG to PDF
                  </a>
                </li>
                <li>
                  <a
                    href="/word-to-pdf"
                    onClick={(e) => { e.preventDefault(); navigateTo('/word-to-pdf', 'word_to_pdf'); }}
                    className="hover:text-[#FF5722] transition-colors"
                  >
                    Word to PDF
                  </a>
                </li>
                <li>
                  <a
                    href="/powerpoint-to-pdf"
                    onClick={(e) => { e.preventDefault(); navigateTo('/powerpoint-to-pdf', 'pptx_to_pdf'); }}
                    className="hover:text-[#FF5722] transition-colors"
                  >
                    PowerPoint to PDF
                  </a>
                </li>
                <li>
                  <a
                    href="/excel-to-pdf"
                    onClick={(e) => { e.preventDefault(); navigateTo('/excel-to-pdf', 'xlsx_to_pdf'); }}
                    className="hover:text-[#FF5722] transition-colors"
                  >
                    Excel to PDF
                  </a>
                </li>
                <li>
                  <a
                    href="/html-to-pdf"
                    onClick={(e) => { e.preventDefault(); navigateTo('/html-to-pdf', 'html_to_pdf'); }}
                    className="hover:text-[#FF5722] transition-colors"
                  >
                    HTML to PDF
                  </a>
                </li>
                <li>
                  <a
                    href="/extract-text"
                    onClick={(e) => { e.preventDefault(); navigateTo('/extract-text', 'extract_text'); }}
                    className="hover:text-[#FF5722] transition-colors"
                  >
                    Extract Text
                  </a>
                </li>
              </ul>
            </div>

            {/* Column 2: Organize & Edit */}
            <div className="space-y-3">
              <span className="text-xs font-bold text-[#FF5722] uppercase tracking-wider block">
                Organize &amp; Edit
              </span>
              <ul className="space-y-2 text-xs">
                <li>
                  <a
                    href="/merge-pdf"
                    onClick={(e) => { e.preventDefault(); navigateTo('/merge-pdf', 'merge_pdf'); }}
                    className="hover:text-[#FF5722] transition-colors"
                  >
                    Merge PDF Files
                  </a>
                </li>
                <li>
                  <a
                    href="/split-pdf"
                    onClick={(e) => { e.preventDefault(); navigateTo('/split-pdf', 'split_pdf'); }}
                    className="hover:text-[#FF5722] transition-colors"
                  >
                    Split &amp; Extract PDF
                  </a>
                </li>
                <li>
                  <a
                    href="/scan-document"
                    onClick={(e) => { e.preventDefault(); navigateTo('/scan-document', 'scan_document'); }}
                    className="hover:text-[#FF5722] transition-colors"
                  >
                    Scan Documents (Camera)
                  </a>
                </li>
                <li>
                  <a
                    href="/watermark-pdf"
                    onClick={(e) => { e.preventDefault(); navigateTo('/watermark-pdf', 'watermark_pdf'); }}
                    className="hover:text-[#FF5722] transition-colors"
                  >
                    Watermark PDF
                  </a>
                </li>
                <li>
                  <a
                    href="/compare-pdf"
                    onClick={(e) => { e.preventDefault(); navigateTo('/compare-pdf', 'compare_pdfs'); }}
                    className="hover:text-[#FF5722] transition-colors"
                  >
                    Compare PDF Files
                  </a>
                </li>
                <li>
                  <a
                    href="/repair-pdf"
                    onClick={(e) => { e.preventDefault(); navigateTo('/repair-pdf', 'repair_pdf'); }}
                    className="hover:text-[#FF5722] transition-colors"
                  >
                    Repair Damaged PDF
                  </a>
                </li>
                <li>
                  <a
                    href="/collaborative-whiteboard"
                    onClick={(e) => { e.preventDefault(); navigateTo('/collaborative-whiteboard', 'collab_whiteboard'); }}
                    className="hover:text-[#FF5722] transition-colors"
                  >
                    Collab Whiteboard
                  </a>
                </li>
              </ul>
            </div>

            {/* Column 3: Security & Privacy */}
            <div className="space-y-3">
              <span className="text-xs font-bold text-[#FF5722] uppercase tracking-wider block">
                Security &amp; Privacy
              </span>
              <ul className="space-y-2 text-xs">
                <li>
                  <a
                    href="/protect-pdf"
                    onClick={(e) => { e.preventDefault(); navigateTo('/protect-pdf', 'encrypt_pdf'); }}
                    className="hover:text-[#FF5722] transition-colors"
                  >
                    Protect PDF (Password)
                  </a>
                </li>
                <li>
                  <a
                    href="/unlock-pdf"
                    onClick={(e) => { e.preventDefault(); navigateTo('/unlock-pdf', 'unlock_pdf'); }}
                    className="hover:text-[#FF5722] transition-colors"
                  >
                    Unlock Protected PDF
                  </a>
                </li>
                <li>
                  <a
                    href="/redact-pdf"
                    onClick={(e) => { e.preventDefault(); navigateTo('/redact-pdf', 'auto_redact_pii'); }}
                    className="hover:text-[#FF5722] transition-colors"
                  >
                    Auto-Redact Sensitive PII
                  </a>
                </li>
                <li>
                  <a
                    href="/privacy-scanner"
                    onClick={(e) => { e.preventDefault(); navigateTo('/privacy-scanner', 'privacy_scanner'); }}
                    className="hover:text-[#FF5722] transition-colors"
                  >
                    Privacy Metadata Scanner
                  </a>
                </li>
                <li>
                  <a
                    href="/file-fingerprint"
                    onClick={(e) => { e.preventDefault(); navigateTo('/file-fingerprint', 'fingerprint_gen'); }}
                    className="hover:text-[#FF5722] transition-colors"
                  >
                    SHA-256 Fingerprint
                  </a>
                </li>
                <li>
                  <a
                    href="/p2p-share"
                    onClick={(e) => { e.preventDefault(); navigateTo('/p2p-share', 'p2p_share'); }}
                    className="hover:text-[#FF5722] transition-colors"
                  >
                    P2P Encrypted File Share
                  </a>
                </li>
              </ul>
            </div>

            {/* Column 4: AI & Business */}
            <div className="space-y-3">
              <span className="text-xs font-bold text-[#FF5722] uppercase tracking-wider block">
                AI &amp; Business
              </span>
              <ul className="space-y-2 text-xs">
                <li>
                  <a
                    href="/chat-pdf"
                    onClick={(e) => { e.preventDefault(); navigateTo('/chat-pdf', 'chat_pdf'); }}
                    className="hover:text-[#FF5722] transition-colors"
                  >
                    Chat with PDF (Gemini AI)
                  </a>
                </li>
                <li>
                  <a
                    href="/summarize-pdf"
                    onClick={(e) => { e.preventDefault(); navigateTo('/summarize-pdf', 'ai_summarize'); }}
                    className="hover:text-[#FF5722] transition-colors"
                  >
                    AI Document Summarizer
                  </a>
                </li>
                <li>
                  <a
                    href="/ocr-pdf"
                    onClick={(e) => { e.preventDefault(); navigateTo('/ocr-pdf', 'searchable_pdf'); }}
                    className="hover:text-[#FF5722] transition-colors"
                  >
                    Searchable PDF (OCR)
                  </a>
                </li>
                <li>
                  <a
                    href="/gst-invoice"
                    onClick={(e) => { e.preventDefault(); navigateTo('/gst-invoice', 'gst_invoice'); }}
                    className="hover:text-[#FF5722] transition-colors"
                  >
                    GST Tax Invoice Generator
                  </a>
                </li>
                <li>
                  <a
                    href="/pos-billing"
                    onClick={(e) => { e.preventDefault(); navigateTo('/pos-billing', 'pos_billing'); }}
                    className="hover:text-[#FF5722] transition-colors"
                  >
                    POS Thermal Billing &amp; UPI
                  </a>
                </li>
                <li>
                  <a
                    href="/gst-filing-prep"
                    onClick={(e) => { e.preventDefault(); navigateTo('/gst-filing-prep', 'gst_filing_prep'); }}
                    className="hover:text-[#FF5722] transition-colors"
                  >
                    GSTR Filing Preparation
                  </a>
                </li>
                <li>
                  <a
                    href="/sitemap.xml"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="hover:text-[#FF5722] transition-colors"
                  >
                    XML Site Map
                  </a>
                </li>
              </ul>
            </div>
          </div>

          {/* Bottom Bar */}
          <div className="pt-8 border-t border-[#0C162C]/8 dark:border-white/8 flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="flex flex-wrap items-center justify-center md:justify-start gap-3 text-xs text-[#5C6479] dark:text-white/60">
              <span>&copy; {new Date().getFullYear()} ZipStream. All rights reserved.</span>
              <span className="text-black/20 dark:text-white/20 hidden sm:inline">&bull;</span>
              <a href="mailto:Pranjalsinghwork1@gmail.com" className="hover:text-[#FF5722] transition-colors">
                Pranjalsinghwork1@gmail.com
              </a>
              <span className="text-black/20 dark:text-white/20 hidden sm:inline">&bull;</span>
              <button
                type="button"
                onClick={() => setIsReportModalOpen(true)}
                className="hover:text-[#FF5722] transition-colors cursor-pointer"
              >
                Report an Issue
              </button>
            </div>

            <div className="flex items-center gap-4 text-xs">
              <span className="flex items-center gap-1.5 font-medium text-[#0C162C] dark:text-white/90">
                <Lock className="w-3.5 h-3.5 text-[#FF5722]" />
                100% Client-Side
              </span>
              <span className="text-black/20 dark:text-white/20">&bull;</span>
              <span className="flex items-center gap-1.5 font-medium text-[#0C162C] dark:text-white/90">
                <Shield className="w-3.5 h-3.5 text-[#FFCB70]" />
                Zero Cloud Ingress
              </span>
            </div>

            {/* Social Media Links */}
            <div className="flex items-center gap-2" aria-label="Social Media Links">
              <a
                href="https://x.com/Pranjalwork"
                target="_blank"
                rel="noopener noreferrer"
                aria-label="X (Twitter) profile"
                className="w-7 h-7 flex items-center justify-center rounded-full bg-black/5 dark:bg-white/10 hover:bg-[#FF5722]/10 hover:text-[#FF5722] text-[#0C162C] dark:text-white transition-all duration-150"
                title="Follow on X"
              >
                <svg className="w-3.5 h-3.5 fill-current" viewBox="0 0 24 24">
                  <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
                </svg>
              </a>

              <a
                href="https://www.linkedin.com/in/pranjal-singh-02aba0363/"
                target="_blank"
                rel="noopener noreferrer"
                aria-label="LinkedIn profile"
                className="w-7 h-7 flex items-center justify-center rounded-full bg-black/5 dark:bg-white/10 hover:bg-[#0077B5]/10 hover:text-[#0077B5] text-[#0C162C] dark:text-white transition-all duration-150"
                title="Connect on LinkedIn"
              >
                <svg className="w-3.5 h-3.5 fill-current" viewBox="0 0 24 24">
                  <path d="M19 0h-14c-2.761 0-5 2.239-5 5v14c0 2.761 2.239 5 5 5h14c2.762 0 5-2.239 5-5v-14c0-2.761-2.238-5-5-5zm-11 19h-3v-11h3v11zm-1.5-12.268c-.966 0-1.75-.79-1.75-1.764s.784-1.764 1.75-1.764 1.75.79 1.75 1.764-.783 1.764-1.75 1.764zm13.5 12.268h-3v-5.604c0-3.368-4-3.113-4 0v5.604h-3v-11h3v1.765c1.396-2.586 7-2.777 7 2.476v6.759z"/>
                </svg>
              </a>

              <a
                href="https://www.instagram.com/officialpranjal1111?igsi=MTliZzVnODd1dWZzZw=="
                target="_blank"
                rel="noopener noreferrer"
                aria-label="Instagram profile"
                className="w-7 h-7 flex items-center justify-center rounded-full bg-black/5 dark:bg-white/10 hover:bg-[#E1306C]/10 hover:text-[#E1306C] text-[#0C162C] dark:text-white transition-all duration-150"
                title="Follow on Instagram"
              >
                <svg className="w-3.5 h-3.5 fill-current" viewBox="0 0 24 24">
                  <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/>
                </svg>
              </a>

              <a
                href="https://www.youtube.com/@DecodingPranjalSingh"
                target="_blank"
                rel="noopener noreferrer"
                aria-label="Decoding Pranjal Singh YouTube channel"
                className="w-7 h-7 flex items-center justify-center rounded-full bg-black/5 dark:bg-white/10 hover:bg-[#FF0000]/10 hover:text-[#FF0000] text-[#0C162C] dark:text-white transition-all duration-150"
                title="Decoding Pranjal Singh on YouTube"
              >
                <svg className="w-3.5 h-3.5 fill-current" viewBox="0 0 24 24">
                  <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/>
                </svg>
              </a>
            </div>
          </div>
        </div>
      </footer>

    {/* Search Command Palette (Ctrl+K / Cmd+K) */}
    {isSearchOpen && (
      <Suspense fallback={null}>
        <SearchCommandPalette
          isOpen={isSearchOpen}
          onClose={() => setIsSearchOpen(false)}
          onSelectTool={handleSelectTool}
        />
      </Suspense>
    )}

    {/* Report Issue Dialog Modal */}
    <ReportIssueModal
      isOpen={isReportModalOpen}
      onClose={() => setIsReportModalOpen(false)}
      activeFile={activeFile}
    />
  </div>
);
}
