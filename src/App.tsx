/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { Navbar } from './components/Navbar';
import { DropZone } from './components/DropZone';
import { CompressionSettingsCard } from './components/CompressionSettingsCard';
import { ProcessingView } from './components/ProcessingView';
import { SuccessView } from './components/SuccessView';
import { CompressionHistory } from './components/CompressionHistory';
import { ReportIssueModal } from './components/ReportIssueModal';
import { BatchProcessingView } from './components/BatchProcessingView';
import { MergePdfView } from './components/MergePdfView';
import { ScanDocumentView } from './components/ScanDocumentView';
import { ImagesToPdfView } from './components/ImagesToPdfView';
import { SplitPdfView } from './components/SplitPdfView';
import { WatermarkPdfView } from './components/WatermarkPdfView';
import { SearchCommandPalette } from './components/SearchCommandPalette';
import { ConvertToolsView } from './components/views/ConvertToolsView';
import { SecurityToolsView } from './components/views/SecurityToolsView';
import { AiToolsView } from './components/views/AiToolsView';
import { BusinessToolsView } from './components/views/BusinessToolsView';
import { CollaborateToolsView } from './components/views/CollaborateToolsView';
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
import {
  processCompression,
  ProgressUpdate,
} from './utils/compressionEngine';
import { detectFileCategory } from './utils/formatters';
import { prepareFileInfo } from './utils/sampleFiles';
import {
  Lock,
  Shield,
} from 'lucide-react';

const DEFAULT_SETTINGS: CompressionSettings = {
  level: 'medium',
  preset: 'custom',
  outputFormat: 'original',
  scalePercent: 100,
  removeMetadata: true,
  targetDpi: 150,
  audioBitrate: 128,
};

const TOOL_PATHS: Record<string, ToolMode> = {
  '/compress-pdf': 'compress',
  '/merge-pdf': 'merge_pdf',
  '/split-pdf': 'split_pdf',
  '/images-to-pdf': 'images_to_pdf',
  '/scan-document': 'scan_document',
  '/watermark-pdf': 'watermark_pdf',
  '/pdf-to-word': 'pdf_to_word',
  '/pdf-to-excel': 'pdf_to_excel',
  '/pdf-to-powerpoint': 'pdf_to_powerpoint',
  '/pdf-to-jpg': 'pdf_to_jpg',
};

const TOOL_METADATA: Record<string, { title: string; description: string }> = {
  '/compress-pdf': { title: 'Compress PDF Online | ZipStream', description: 'Reduce PDF file size quickly with ZipStream privacy-first compression tools.' },
  '/merge-pdf': { title: 'Merge PDF Files Online | ZipStream', description: 'Combine PDF files in your browser with ZipStream.' },
  '/split-pdf': { title: 'Split PDF Online | ZipStream', description: 'Extract and split PDF pages with ZipStream.' },
  '/images-to-pdf': { title: 'Images to PDF Online | ZipStream', description: 'Convert JPG and PNG images into a PDF in your browser.' },
  '/scan-document': { title: 'Scan Documents Online | ZipStream', description: 'Scan documents with your camera and create clean PDFs.' },
  '/watermark-pdf': { title: 'Watermark PDF Online | ZipStream', description: 'Add a watermark to PDF documents in your browser.' },
  '/pdf-to-word': { title: 'PDF to Word Converter | ZipStream', description: 'Convert PDF documents to editable Word files with ZipStream.' },
  '/pdf-to-excel': { title: 'PDF to Excel Converter | ZipStream', description: 'Extract PDF tables into spreadsheet formats with ZipStream.' },
  '/pdf-to-powerpoint': { title: 'PDF to PowerPoint Converter | ZipStream', description: 'Convert PDF pages into PowerPoint presentations with ZipStream.' },
  '/pdf-to-jpg': { title: 'PDF to JPG Converter | ZipStream', description: 'Convert PDF pages into JPG images in your browser.' },
};

function toolFromPath(path: string): ToolMode | null {
  const normalized = path.replace(/\/$/, '') || '/';
  if (normalized === '/') return 'compress';
  return getToolPage(normalized)?.tool || TOOL_PATHS[normalized] || null;
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
      return window.location.pathname.replace(/\/$/, '') || '/';
    }
    return '/';
  });

  const [activeTool, setActiveTool] = useState<ToolMode>(() => {
    if (typeof window !== 'undefined') {
      const path = window.location.pathname.replace(/\/$/, '') || '/';
      const pathTool = toolFromPath(path);
      if (pathTool) return pathTool;
      const hash = window.location.hash;
      if (hash.includes('/room/') || path.includes('/room/')) {
        return 'p2p_share';
      }
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

    if (normalized === '/') {
      document.title = 'ZipStream — Fast, Private PDF and File Tools';
    } else if (metadata?.title) {
      document.title = metadata.title;
    } else if (page?.title) {
      document.title = `${page.title} | ZipStream`;
    } else {
      document.title = 'ZipStream — Fast, Private PDF and File Tools';
    }

    let description = document.querySelector('meta[name="description"]');
    if (!description) {
      description = document.createElement('meta');
      description.setAttribute('name', 'description');
      document.head.appendChild(description);
    }
    description.setAttribute(
      'content',
      metadata?.description || page?.description || 'Compress, merge, split and convert PDF and files online with ZipStream.'
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
      const path = window.location.pathname;
      if (hash.includes('/room/') || path.includes('/room/')) {
        setActiveTool('p2p_share');
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
      if (category) setActiveCategory(category);
      navigateTo('/compress-pdf', 'compress');
      return;
    }
    const page = getToolPageForTool(tool);
    if (page) {
      navigateTo(page.path, tool);
    } else {
      setActiveTool(tool);
    }
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

  const activeFeaturePage = getToolPage(currentPath) || getToolPageForTool(activeTool);

  return (
    <div className="min-h-screen relative bg-[#FAF7F2] dark:bg-[#0B132B] text-[#0C162C] dark:text-[#F3F4F6] flex flex-col font-sans selection:bg-[#FF5722] selection:text-white transition-colors duration-200">
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
        theme={theme}
        onToggleTheme={toggleTheme}
      />

      {/* Main Content Area */}
      <main className="relative z-10 flex-1 max-w-5xl w-full mx-auto px-4 sm:px-6 py-8 sm:py-12 flex flex-col justify-center">
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

      {/* Nomu Storefront Inspired Clean Footer */}
      <footer className="border-t border-[#0C162C]/10 dark:border-white/10 bg-white/70 dark:bg-[#080E1E]/90 backdrop-blur-md py-6 text-[13px] text-[#5C6479] dark:text-white/60 transition-colors">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <button
              onClick={() => navigateTo('/')}
              className="flex items-center gap-3 cursor-pointer group text-left"
            >
              <div className="relative w-6 h-6 rounded-md bg-[#11141a] border border-white/[0.12] text-white flex items-center justify-center shrink-0 shadow-xs group-hover:border-[#00ff87]/60">
                <span className="text-[10px] font-mono font-bold text-[#00ff87]">⇲</span>
              </div>
              <span className="font-extrabold text-[#0C162C] dark:text-white tracking-tight text-sm">
                zipstream<span className="text-[#FF5722]">.</span>
              </span>
            </button>
            <span className="text-black/20 dark:text-white/20">•</span>
            <span className="text-xs">Private on-device file studio</span>
          </div>
          <div className="flex items-center gap-4 text-xs">
            <span className="flex items-center gap-1.5 font-medium text-[#0C162C] dark:text-white/90">
              <Lock className="w-3.5 h-3.5 text-[#FF5722]" />
              100% Client-Side
            </span>
            <span className="text-black/20 dark:text-white/20">•</span>
            <span className="flex items-center gap-1.5 font-medium text-[#0C162C] dark:text-white/90">
              <Shield className="w-3.5 h-3.5 text-[#FFCB70]" />
              Zero Cloud Ingress
            </span>
          </div>
        </div>
      </footer>

      {/* Search Command Palette (Ctrl+K / Cmd+K) */}
      <SearchCommandPalette
        isOpen={isSearchOpen}
        onClose={() => setIsSearchOpen(false)}
        onSelectTool={handleSelectTool}
      />

      {/* Report Issue Dialog Modal */}
      <ReportIssueModal
        isOpen={isReportModalOpen}
        onClose={() => setIsReportModalOpen(false)}
        activeFile={activeFile}
      />
    </div>
  );
}
