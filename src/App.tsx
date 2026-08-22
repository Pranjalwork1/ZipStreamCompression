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
  FilePlus,
  Camera,
  Sparkles,
  Scissors,
  Stamp,
  Layers,
  ArrowRight,
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

export default function App() {
  const [theme, setTheme] = useState<'light' | 'dark'>(() => {
    try {
      const saved = localStorage.getItem('zipstream-theme');
      if (saved === 'dark' || saved === 'light') return saved;
      if (typeof window !== 'undefined' && window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
        return 'dark';
      }
    } catch {
      // fallback
    }
    return 'light';
  });

  const [activeTool, setActiveTool] = useState<ToolMode>('compress');
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

  // Sync theme with HTML document class & localStorage
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
    setActiveTool('compress');
    setActiveCategory(cat);
    if (stage !== 'upload') {
      handleReset();
      setActiveCategory(cat);
    }
  };

  // Tool selection handler from Search or Navbar
  const handleSelectTool = (tool: ToolMode, category?: FileCategory) => {
    setActiveTool(tool);
    if (tool === 'compress') {
      if (category) setActiveCategory(category);
    }
    handleReset();
  };

  // Reset back to upload dropzone
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

      // Brief smooth transition to allow 100% completion state to render
      await new Promise((res) => setTimeout(res, 180));

      setResult(compressionResult);
      setHistory((prev) => [compressionResult, ...prev.slice(0, 9)]);
      setStage('success');
    } catch (err) {
      console.error('Compression failed:', err);
      setStage('settings');
    }
  };

  return (
    <div className="min-h-screen bg-[#f5f5f7] dark:bg-[#121214] text-[#1d1d1f] dark:text-[#f5f5f7] flex flex-col font-sans selection:bg-[#0071e3] selection:text-white transition-colors duration-200">
      {/* 1. macOS Window Toolbar / Navbar with 3 colored dots & Search trigger & Theme toggle */}
      <Navbar
        activeTool={activeTool}
        onSelectTool={setActiveTool}
        activeCategory={activeCategory}
        onSelectCategory={handleSelectCategory}
        onHoverCategory={setHoverCategory}
        onReset={() => {
          setActiveTool('compress');
          handleReset();
        }}
        hasActiveFile={stage !== 'upload'}
        onOpenReportIssue={() => setIsReportModalOpen(true)}
        onOpenSearch={() => setIsSearchOpen(true)}
        theme={theme}
        onToggleTheme={toggleTheme}
      />

      {/* Main Content Area */}
      <main className="flex-1 max-w-5xl w-full mx-auto px-4 sm:px-6 py-8 sm:py-12 flex flex-col justify-center">
        {/* Render PDF Studio & Scanner Tools */}
        {activeTool === 'merge_pdf' && (
          <MergePdfView onBackToHome={() => setActiveTool('compress')} />
        )}

        {activeTool === 'scan_document' && (
          <ScanDocumentView onBackToHome={() => setActiveTool('compress')} />
        )}

        {activeTool === 'images_to_pdf' && (
          <ImagesToPdfView onBackToHome={() => setActiveTool('compress')} />
        )}

        {activeTool === 'split_pdf' && (
          <SplitPdfView onBackToHome={() => setActiveTool('compress')} />
        )}

        {activeTool === 'watermark_pdf' && (
          <WatermarkPdfView onBackToHome={() => setActiveTool('compress')} />
        )}

        {/* Compression Studio (Core Engine) */}
        {activeTool === 'compress' && (
          <>
            {/* Header when in upload view */}
            {stage === 'upload' && (
              <div className="text-center max-w-2xl mx-auto mb-9 space-y-2.5 animate-in fade-in duration-200">
                <h1 className="text-3xl sm:text-[40px] font-bold tracking-tight text-[#1d1d1f] dark:text-[#f5f5f7] leading-tight">
                  Compress documents, photos, audio & video.
                </h1>
                <p className="text-[15px] sm:text-[17px] text-[#6e6e73] dark:text-[#a1a1a6] leading-relaxed max-w-xl mx-auto">
                  Reduce file sizes instantly in your browser. All processing happens 100% on your device — your files are never uploaded to a remote server.
                </p>
              </div>
            )}

            {/* View Switcher */}
            <div className="w-full flex flex-col items-center justify-center">
              {stage === 'upload' && (
                <DropZone
                  activeCategory={activeCategory}
                  hoverCategory={hoverCategory}
                  onFileLoaded={handleFileLoaded}
                  onMultipleFilesLoaded={handleMultipleFilesLoaded}
                />
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

            {/* Quick Tools Tray (ihatepdf style tools quick launcher) */}
            {stage === 'upload' && (
              <div className="w-full max-w-3xl mx-auto mt-10 space-y-3 animate-in fade-in duration-300">
                <div className="flex items-center justify-between px-2">
                  <span className="text-[13px] font-semibold text-[#86868b] dark:text-[#8e8e93] uppercase tracking-wider">
                    Popular PDF & Document Tools
                  </span>
                  <button
                    onClick={() => setIsSearchOpen(true)}
                    className="text-[12px] text-[#0071e3] dark:text-[#2997ff] font-medium hover:underline flex items-center gap-1 cursor-pointer"
                  >
                    <span>View all tools (⌘K)</span>
                    <ArrowRight className="w-3 h-3" />
                  </button>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <button
                    onClick={() => setActiveTool('merge_pdf')}
                    className="p-4 rounded-2xl bg-white dark:bg-[#1c1c1e] border border-black/[0.06] dark:border-white/[0.08] hover:border-[#ff3b30]/40 dark:hover:border-[#ff3b30]/60 hover:shadow-sm text-left transition-all group cursor-pointer"
                  >
                    <div className="w-8 h-8 rounded-xl bg-[#ff3b30]/10 dark:bg-[#ff3b30]/20 text-[#ff3b30] flex items-center justify-center mb-2.5 group-hover:scale-105 transition-transform">
                      <FilePlus className="w-4 h-4" />
                    </div>
                    <h4 className="text-[13px] font-semibold text-[#1d1d1f] dark:text-[#f5f5f7] group-hover:text-[#ff3b30] transition-colors">
                      Merge PDF
                    </h4>
                    <p className="text-[11px] text-[#86868b] dark:text-[#8e8e93] mt-0.5 line-clamp-2">
                      Combine multiple PDFs into one
                    </p>
                  </button>

                  <button
                    onClick={() => setActiveTool('scan_document')}
                    className="p-4 rounded-2xl bg-white dark:bg-[#1c1c1e] border border-black/[0.06] dark:border-white/[0.08] hover:border-[#34c759]/40 dark:hover:border-[#34c759]/60 hover:shadow-sm text-left transition-all group cursor-pointer"
                  >
                    <div className="w-8 h-8 rounded-xl bg-[#34c759]/10 dark:bg-[#34c759]/20 text-[#34c759] flex items-center justify-center mb-2.5 group-hover:scale-105 transition-transform">
                      <Camera className="w-4 h-4" />
                    </div>
                    <h4 className="text-[13px] font-semibold text-[#1d1d1f] dark:text-[#f5f5f7] group-hover:text-[#34c759] transition-colors">
                      Scan Document
                    </h4>
                    <p className="text-[11px] text-[#86868b] dark:text-[#8e8e93] mt-0.5 line-clamp-2">
                      Camera scan & B&W enhancement
                    </p>
                  </button>

                  <button
                    onClick={() => setActiveTool('images_to_pdf')}
                    className="p-4 rounded-2xl bg-white dark:bg-[#1c1c1e] border border-black/[0.06] dark:border-white/[0.08] hover:border-[#af52de]/40 dark:hover:border-[#af52de]/60 hover:shadow-sm text-left transition-all group cursor-pointer"
                  >
                    <div className="w-8 h-8 rounded-xl bg-[#af52de]/10 dark:bg-[#af52de]/20 text-[#af52de] flex items-center justify-center mb-2.5 group-hover:scale-105 transition-transform">
                      <Sparkles className="w-4 h-4" />
                    </div>
                    <h4 className="text-[13px] font-semibold text-[#1d1d1f] dark:text-[#f5f5f7] group-hover:text-[#af52de] transition-colors">
                      Images to PDF
                    </h4>
                    <p className="text-[11px] text-[#86868b] dark:text-[#8e8e93] mt-0.5 line-clamp-2">
                      Convert JPG / PNG into clean PDF
                    </p>
                  </button>

                  <button
                    onClick={() => setActiveTool('split_pdf')}
                    className="p-4 rounded-2xl bg-white dark:bg-[#1c1c1e] border border-black/[0.06] dark:border-white/[0.08] hover:border-[#ff9500]/40 dark:hover:border-[#ff9500]/60 hover:shadow-sm text-left transition-all group cursor-pointer"
                  >
                    <div className="w-8 h-8 rounded-xl bg-[#ff9500]/10 dark:bg-[#ff9500]/20 text-[#ff9500] flex items-center justify-center mb-2.5 group-hover:scale-105 transition-transform">
                      <Scissors className="w-4 h-4" />
                    </div>
                    <h4 className="text-[13px] font-semibold text-[#1d1d1f] dark:text-[#f5f5f7] group-hover:text-[#ff9500] transition-colors">
                      Split PDF
                    </h4>
                    <p className="text-[11px] text-[#86868b] dark:text-[#8e8e93] mt-0.5 line-clamp-2">
                      Extract pages or burst to ZIP
                    </p>
                  </button>
                </div>
              </div>
            )}

            {/* History */}
            {history.length > 0 && stage !== 'processing' && stage !== 'batch' && (
              <CompressionHistory
                history={history}
                onClearHistory={() => setHistory([])}
                onSelectResult={(item) => {
                  setResult(item);
                  setStage('success');
                }}
              />
            )}
          </>
        )}
      </main>

      {/* Clean Apple-style Footer */}
      <footer className="border-t border-black/[0.06] dark:border-white/[0.08] bg-transparent py-5 text-[12px] text-[#86868b] dark:text-[#8e8e93] transition-colors">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-[#1d1d1f] dark:text-[#f5f5f7]">ZipStream</span>
            <span>•</span>
            <span>Client-side PDF Studio & Compression utility for Mac and Web</span>
          </div>
          <div className="flex items-center gap-4 text-[#6e6e73] dark:text-[#a1a1a6]">
            <span className="flex items-center gap-1">
              <Lock className="w-3 h-3 text-[#34c759]" />
              On-Device Processing
            </span>
            <span>•</span>
            <span className="flex items-center gap-1">
              <Shield className="w-3 h-3 text-[#0071e3] dark:text-[#2997ff]" />
              100% Private
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

