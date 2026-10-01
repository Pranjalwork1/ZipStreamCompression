/**
 * ZipStream PDF Editor — Main Application View
 * 
 * Complete browser-based PDF editing workstation.
 * Supports Text, Images, Shapes, Highlights, Underline, Strikethrough, Freehand Draw, and Notes.
 */

import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import * as pdfjsLib from 'pdfjs-dist';
import {
  FileText,
  Upload,
  Download,
  CheckCircle2,
  AlertTriangle,
  Lock,
  Layers,
  Sparkles,
  ArrowRight,
  ShieldCheck,
  ChevronLeft,
  ChevronRight,
  RefreshCw,
  X,
  Keyboard,
  Info,
  Edit3,
} from 'lucide-react';
import confetti from 'canvas-confetti';
import {
  EditorObject,
  EditorToolType,
  ActiveToolSettings,
  DEFAULT_TOOL_SETTINGS,
  ImageObject,
} from './types';
import { HistoryManager } from './HistoryManager';
import { EditorToolbar } from './EditorToolbar';
import { PageThumbnails } from './PageThumbnails';
import { PropertiesPanel } from './PropertiesPanel';
import { PdfPageRenderer } from './PdfPageRenderer';
import { exportEditedPdf } from './pdfExportService';
import { trackEvent } from '../../utils/analytics';

// Ensure PDF.js worker is initialized safely
if (typeof window !== 'undefined' && !pdfjsLib.GlobalWorkerOptions.workerSrc) {
  pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
}

interface EditPdfViewProps {
  onBackToHome: () => void;
  onNavigateToUnlock?: () => void;
  onNavigateToCompress?: () => void;
}

export const EditPdfView: React.FC<EditPdfViewProps> = ({
  onBackToHome,
  onNavigateToUnlock,
  onNavigateToCompress,
}) => {
  // Document state
  const [file, setFile] = useState<File | null>(null);
  const [pdfDoc, setPdfDoc] = useState<pdfjsLib.PDFDocumentProxy | null>(null);
  const [totalPages, setTotalPages] = useState<number>(0);
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [isLoadingPdf, setIsLoadingPdf] = useState(false);
  const [pdfError, setPdfError] = useState<string | null>(null);
  const [isEncrypted, setIsEncrypted] = useState(false);

  // Editor interaction state
  const [activeTool, setActiveTool] = useState<EditorToolType>('select');
  const [toolSettings, setToolSettings] = useState<ActiveToolSettings>(DEFAULT_TOOL_SETTINGS);
  const [objects, setObjects] = useState<EditorObject[]>([]);
  const [selectedObjectId, setSelectedObjectId] = useState<string | null>(null);
  const [zoomScale, setZoomScale] = useState<number>(1.0);
  const [isThumbnailsOpen, setIsThumbnailsOpen] = useState<boolean>(true);
  const [isShortcutsOpen, setIsShortcutsOpen] = useState<boolean>(false);
  const [copiedObject, setCopiedObject] = useState<EditorObject | null>(null);

  // Export state
  const [isExporting, setIsExporting] = useState<boolean>(false);
  const [exportStep, setExportStep] = useState<string>('');
  const [exportProgress, setExportProgress] = useState<number>(0);
  const [exportedResult, setExportedResult] = useState<{ blob: Blob; filename: string; url: string } | null>(null);

  // Undo / Redo history manager
  const historyRef = useRef<HistoryManager>(new HistoryManager([]));
  const fileInputRef = useRef<HTMLInputElement>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);

  // Clean up object URLs on unmount
  useEffect(() => {
    return () => {
      if (exportedResult?.url) {
        try { URL.revokeObjectURL(exportedResult.url); } catch (_) {}
      }
    };
  }, [exportedResult]);

  // Track initial load
  useEffect(() => {
    trackEvent('edit_pdf_opened');
  }, []);

  // ─── 1. Load and parse PDF with PDF.js ────────────────────────────────────
  const loadPdfFile = async (pdfFile: File) => {
    setIsLoadingPdf(true);
    setPdfError(null);
    setIsEncrypted(false);
    setFile(pdfFile);
    setObjects([]);
    setSelectedObjectId(null);
    setExportedResult(null);
    historyRef.current = new HistoryManager([]);

    try {
      const buffer = await pdfFile.arrayBuffer();
      const doc = await pdfjsLib.getDocument({
        data: new Uint8Array(buffer),
        useSystemFonts: true,
        cMapUrl: 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/cmaps/',
        cMapPacked: true,
      }).promise;

      setPdfDoc(doc);
      setTotalPages(doc.numPages);
      setCurrentPage(1);
      setZoomScale(1.0);
      setIsLoadingPdf(false);
      trackEvent('edit_pdf_document_loaded', { pages: doc.numPages });
    } catch (err: any) {
      setIsLoadingPdf(false);
      if (err?.name === 'PasswordException' || err?.message?.toLowerCase().includes('password')) {
        setIsEncrypted(true);
        setPdfError('This PDF document is encrypted with a password.');
      } else {
        setPdfError("We couldn't open this PDF file. It may be corrupted or unsupported.");
      }
      console.error('PDF parse failed:', err);
    }
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    const droppedFile = e.dataTransfer.files?.[0];
    if (droppedFile && droppedFile.type === 'application/pdf') {
      loadPdfFile(droppedFile);
    } else {
      setPdfError('Please drop a valid PDF document.');
    }
  };

  // ─── 2. Object State Management (with Undo/Redo) ──────────────────────────
  const updateObjectsWithHistory = useCallback((newObjects: EditorObject[], actionDesc = 'Edit') => {
    setObjects(newObjects);
    historyRef.current.push(newObjects, actionDesc);
  }, []);

  const handleAddObject = useCallback((newObj: EditorObject) => {
    setObjects((prev) => {
      const updated = [...prev, newObj];
      historyRef.current.push(updated, `Add ${newObj.type}`);
      return updated;
    });
    trackEvent('edit_pdf_tool_used', { tool: newObj.type });
  }, []);

  const handleUpdateObject = useCallback((id: string, updatedPartial: Partial<EditorObject>) => {
    setObjects((prev) => {
      const updated = prev.map((obj) => (obj.id === id ? ({ ...obj, ...updatedPartial } as EditorObject) : obj));
      historyRef.current.push(updated, 'Update object');
      return updated;
    });
  }, []);

  const handleDeleteObject = useCallback((id: string) => {
    setObjects((prev) => {
      const updated = prev.filter((obj) => obj.id !== id);
      historyRef.current.push(updated, 'Delete object');
      return updated;
    });
    if (selectedObjectId === id) {
      setSelectedObjectId(null);
    }
  }, [selectedObjectId]);

  const handleDuplicateObject = useCallback((id: string) => {
    const target = objects.find((o) => o.id === id);
    if (!target) return;

    const duplicate: EditorObject = {
      ...JSON.parse(JSON.stringify(target)),
      id: `${target.type}-${Date.now()}`,
      x: target.x + 20,
      y: target.y + 20,
    };

    setObjects((prev) => {
      const updated = [...prev, duplicate];
      historyRef.current.push(updated, 'Duplicate object');
      return updated;
    });
    setSelectedObjectId(duplicate.id);
  }, [objects]);

  const handleUndo = useCallback(() => {
    const previous = historyRef.current.undo();
    if (previous) {
      setObjects(previous);
      setSelectedObjectId(null);
    }
  }, []);

  const handleRedo = useCallback(() => {
    const next = historyRef.current.redo();
    if (next) {
      setObjects(next);
      setSelectedObjectId(null);
    }
  }, []);

  // ─── 3. Image Insertion ──────────────────────────────────────────────────
  const handleImageFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const imageFile = e.target.files?.[0];
    if (!imageFile) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const dataUrl = event.target?.result as string;
      const img = new Image();
      img.onload = () => {
        const aspect = img.naturalWidth / img.naturalHeight;
        const targetWidth = Math.min(240, img.naturalWidth);
        const targetHeight = targetWidth / aspect;

        const newImageObj: ImageObject = {
          id: `image-${Date.now()}`,
          type: 'image',
          page: currentPage,
          x: 100,
          y: 100,
          width: Math.round(targetWidth),
          height: Math.round(targetHeight),
          dataUrl,
          mimeType: (imageFile.type as any) || 'image/png',
          originalWidth: img.naturalWidth,
          originalHeight: img.naturalHeight,
          aspectRatio: aspect,
          opacity: 1,
        };

        handleAddObject(newImageObj);
        setSelectedObjectId(newImageObj.id);
        setActiveTool('select');
      };
      img.src = dataUrl;
    };
    reader.readAsDataURL(imageFile);
    e.target.value = ''; // reset input
  };

  // ─── 4. Keyboard Shortcuts Listener ──────────────────────────────────────
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ignore if user is currently typing in an input or textarea
      const target = e.target as HTMLElement;
      const isInput = target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable;
      if (isInput) return;

      const isMac = navigator.platform.toUpperCase().indexOf('MAC') >= 0;
      const cmdOrCtrl = isMac ? e.metaKey : e.ctrlKey;

      // Undo / Redo
      if (cmdOrCtrl && e.key.toLowerCase() === 'z') {
        e.preventDefault();
        if (e.shiftKey) handleRedo();
        else handleUndo();
        return;
      }
      if (cmdOrCtrl && e.key.toLowerCase() === 'y') {
        e.preventDefault();
        handleRedo();
        return;
      }

      // Copy
      if (cmdOrCtrl && e.key.toLowerCase() === 'c' && selectedObjectId) {
        const targetObj = objects.find((o) => o.id === selectedObjectId);
        if (targetObj) setCopiedObject(targetObj);
        return;
      }

      // Paste
      if (cmdOrCtrl && e.key.toLowerCase() === 'v' && copiedObject) {
        const pasted: EditorObject = {
          ...JSON.parse(JSON.stringify(copiedObject)),
          id: `${copiedObject.type}-${Date.now()}`,
          page: currentPage,
          x: copiedObject.x + 24,
          y: copiedObject.y + 24,
        };
        handleAddObject(pasted);
        setSelectedObjectId(pasted.id);
        return;
      }

      // Delete
      if (e.key === 'Delete' || e.key === 'Backspace') {
        if (selectedObjectId) {
          e.preventDefault();
          handleDeleteObject(selectedObjectId);
        }
        return;
      }

      // Tool Switching Shortcuts
      switch (e.key.toLowerCase()) {
        case 'v': setActiveTool('select'); break;
        case 't': setActiveTool('text'); break;
        case 'i': imageInputRef.current?.click(); break;
        case 's': setActiveTool('rectangle'); break;
        case 'h': setActiveTool('highlight'); break;
        case 'd': setActiveTool('draw'); break;
        case 'u': setActiveTool('underline'); break;
        case 'k': setActiveTool('strikethrough'); break;
        case 'n': setActiveTool('comment'); break;
        case '?': setIsShortcutsOpen(true); break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedObjectId, objects, copiedObject, currentPage, handleUndo, handleRedo, handleAddObject, handleDeleteObject]);

  // ─── 5. Export Edited PDF ────────────────────────────────────────────────
  const handleExportPdf = async () => {
    if (!file) return;
    setIsExporting(true);
    setExportProgress(10);
    setExportStep('Initializing export pipeline…');

    try {
      const result = await exportEditedPdf(file, objects, (step, pct) => {
        setExportStep(step);
        setExportProgress(pct);
      });

      const url = URL.createObjectURL(result.blob);
      setExportedResult({ blob: result.blob, filename: result.filename, url });
      setIsExporting(false);

      confetti({
        particleCount: 60,
        spread: 70,
        origin: { y: 0.6 },
      });

      trackEvent('edit_pdf_exported', {
        objectsCount: objects.length,
        sizeBytes: result.blob.size,
      });
    } catch (err: any) {
      console.error('Export failed:', err);
      setIsExporting(false);
      alert('Export failed. Your edits are still safely available in the workspace. Please try again.');
      trackEvent('edit_pdf_export_failed', { error: err?.message });
    }
  };

  // Objects belonging to the current active page
  const currentPageObjects = useMemo(() => {
    return objects.filter((o) => o.page === currentPage);
  }, [objects, currentPage]);

  const selectedObject = useMemo(() => {
    return objects.find((o) => o.id === selectedObjectId) || null;
  }, [objects, selectedObjectId]);

  // ─── STAGE 1: Upload Dropzone Hero View ──────────────────────────────────
  if (!file || !pdfDoc) {
    return (
      <div className="w-full max-w-4xl mx-auto space-y-8 animate-in fade-in duration-200">
        {/* Back Link */}
        <button
          onClick={onBackToHome}
          className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl bg-black/[0.04] dark:bg-white/[0.06] hover:bg-black/[0.08] dark:hover:bg-white/[0.1] text-xs font-medium text-slate-700 dark:text-slate-300 transition-colors cursor-pointer"
        >
          <span>← Back to All Tools</span>
        </button>

        {/* Hero Header */}
        <div className="text-center space-y-3">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-[#055EFE]/10 border border-[#055EFE]/20 text-[#055EFE] text-xs font-bold uppercase tracking-wider">
            <Edit3 className="w-3.5 h-3.5" />
            <span>Browser-Based PDF Studio</span>
          </div>
          <h1 className="text-3xl sm:text-4xl font-extrabold text-[#0C162C] dark:text-white tracking-tight">
            Edit PDF Online Free
          </h1>
          <p className="text-sm sm:text-base text-slate-600 dark:text-slate-400 max-w-xl mx-auto">
            Add editable text, shapes, signatures, images, highlighters, and annotation notes directly onto your PDF documents with 100% on-device privacy.
          </p>
        </div>

        {/* Drag & Drop Upload Container */}
        <div
          onDragOver={(e) => e.preventDefault()}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
          className="border-2 border-dashed border-[#055EFE]/30 hover:border-[#055EFE] dark:border-white/20 dark:hover:border-[#055EFE] bg-[#F8FAFC] dark:bg-[#11192E]/70 rounded-3xl p-8 sm:p-12 text-center transition-all cursor-pointer group shadow-sm hover:shadow-md"
        >
          <input
            ref={fileInputRef}
            type="file"
            accept="application/pdf"
            onChange={(e) => {
              const selected = e.target.files?.[0];
              if (selected) loadPdfFile(selected);
            }}
            className="hidden"
          />

          <div className="w-16 h-16 rounded-2xl bg-[#055EFE]/10 text-[#055EFE] flex items-center justify-center mx-auto mb-4 group-hover:scale-105 transition-transform">
            <Upload className="w-8 h-8" />
          </div>

          <h3 className="text-base sm:text-lg font-bold text-[#0C162C] dark:text-white mb-1">
            Choose a PDF document or drop it here
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 max-w-sm mx-auto mb-4">
            Supports multi-page invoices, agreements, coursework, and contracts up to 200 MB.
          </p>

          <span className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full bg-[#055EFE] text-white text-xs font-bold shadow-xs">
            <span>Select PDF File</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </span>
        </div>

        {/* Encrypted / Password Alert */}
        {isEncrypted && (
          <div className="p-4 rounded-2xl bg-amber-50 dark:bg-amber-950/40 border border-amber-300 dark:border-amber-700/60 flex items-start gap-3 text-amber-900 dark:text-amber-200">
            <Lock className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
            <div className="flex-1 space-y-1">
              <h4 className="text-sm font-bold">This PDF is Password Protected</h4>
              <p className="text-xs text-amber-700 dark:text-amber-300">
                Encrypted documents must be unlocked before editing. You can remove security first using our Unlock PDF tool.
              </p>
              {onNavigateToUnlock && (
                <button
                  type="button"
                  onClick={onNavigateToUnlock}
                  className="mt-2 inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold cursor-pointer transition-colors"
                >
                  <span>Go to Unlock PDF</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>
        )}

        {/* General Error Notice */}
        {pdfError && !isEncrypted && (
          <div className="p-4 rounded-2xl bg-rose-50 dark:bg-rose-950/40 border border-rose-300 dark:border-rose-700/60 flex items-center gap-3 text-rose-800 dark:text-rose-200 text-xs font-medium">
            <AlertTriangle className="w-5 h-5 text-rose-500 shrink-0" />
            <span>{pdfError}</span>
          </div>
        )}

        {/* Feature Highlights Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-4">
          <div className="p-5 rounded-2xl bg-white dark:bg-[#11192E] border border-black/[0.06] dark:border-white/[0.08] space-y-2">
            <div className="w-8 h-8 rounded-xl bg-blue-500/10 text-blue-600 flex items-center justify-center font-bold">
              T
            </div>
            <h4 className="text-sm font-bold text-slate-800 dark:text-slate-100">Add Text &amp; Type</h4>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Type custom text anywhere, adjust font size, family, colors, and text alignment sharply.
            </p>
          </div>

          <div className="p-5 rounded-2xl bg-white dark:bg-[#11192E] border border-black/[0.06] dark:border-white/[0.08] space-y-2">
            <div className="w-8 h-8 rounded-xl bg-amber-500/10 text-amber-600 flex items-center justify-center font-bold">
              ✎
            </div>
            <h4 className="text-sm font-bold text-slate-800 dark:text-slate-100">Highlight &amp; Markup</h4>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Translucent color highlighting, underline, strikethrough, and smooth freehand drawing.
            </p>
          </div>

          <div className="p-5 rounded-2xl bg-white dark:bg-[#11192E] border border-black/[0.06] dark:border-white/[0.08] space-y-2">
            <div className="w-8 h-8 rounded-xl bg-emerald-500/10 text-emerald-600 flex items-center justify-center">
              <ShieldCheck className="w-4 h-4" />
            </div>
            <h4 className="text-sm font-bold text-slate-800 dark:text-slate-100">100% Private &amp; Client-Side</h4>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Your sensitive documents never leave your browser. Zero cloud retention or data collection.
            </p>
          </div>
        </div>
      </div>
    );
  }

  // ─── STAGE 2: Exported Success View ──────────────────────────────────────
  if (exportedResult) {
    return (
      <div className="w-full max-w-xl mx-auto text-center py-10 px-4 space-y-6 animate-in fade-in duration-200">
        <div className="w-16 h-16 rounded-full bg-emerald-500/10 text-emerald-600 flex items-center justify-center mx-auto mb-2">
          <CheckCircle2 className="w-8 h-8" />
        </div>

        <div className="space-y-2">
          <h2 className="text-2xl sm:text-3xl font-extrabold text-[#0C162C] dark:text-white">
            PDF Edited Successfully!
          </h2>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400">
            {exportedResult.filename} is ready with all vector annotations, text, and images applied.
          </p>
        </div>

        {/* Primary Download Button */}
        <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-3">
          <a
            href={exportedResult.url}
            download={exportedResult.filename}
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3 rounded-full bg-gradient-to-b from-[#0077ff] to-[#055efe] hover:from-[#006ee6] hover:to-[#0452e0] text-white font-bold text-sm shadow-md shadow-[#055efe]/25 cursor-pointer transition-all"
          >
            <Download className="w-4 h-4" />
            <span>Download Edited PDF</span>
          </a>

          <button
            type="button"
            onClick={() => setExportedResult(null)}
            className="w-full sm:w-auto inline-flex items-center justify-center gap-1.5 px-5 py-3 rounded-full bg-black/5 dark:bg-white/10 hover:bg-black/10 dark:hover:bg-white/15 text-slate-700 dark:text-slate-200 text-xs font-bold cursor-pointer transition-colors"
          >
            <span>Back to Editor</span>
          </button>
        </div>

        {/* Optional "Edit then Compress" Action */}
        {onNavigateToCompress && (
          <div className="pt-6 border-t border-black/10 dark:border-white/10 flex flex-col items-center gap-2">
            <span className="text-xs text-slate-500 dark:text-slate-400">
              Want to reduce the file size of your new document?
            </span>
            <button
              type="button"
              onClick={onNavigateToCompress}
              className="inline-flex items-center gap-1.5 text-xs font-bold text-[#055EFE] hover:underline cursor-pointer"
            >
              <span>Compress this edited PDF with ZipStream Engine →</span>
            </button>
          </div>
        )}
      </div>
    );
  }

  // ─── STAGE 3: Full Screen Editor Workspace ───────────────────────────────
  return (
    <div
      id="pdf-editor-workspace"
      className="flex flex-col h-[calc(100vh-80px)] min-h-[500px] w-full bg-slate-100/70 dark:bg-[#070D1E] rounded-2xl border border-black/10 dark:border-white/10 overflow-hidden relative"
    >
      {/* Hidden file input for image uploads */}
      <input
        ref={imageInputRef}
        type="file"
        accept="image/png,image/jpeg,image/webp"
        onChange={handleImageFileChange}
        className="hidden"
      />

      {/* ─── Top Main Action Toolbar ─── */}
      <EditorToolbar
        activeTool={activeTool}
        onSelectTool={(tool) => {
          setActiveTool(tool);
          if (tool !== 'select') setSelectedObjectId(null);
        }}
        canUndo={historyRef.current.canUndo()}
        canRedo={historyRef.current.canRedo()}
        onUndo={handleUndo}
        onRedo={handleRedo}
        zoom={zoomScale}
        onZoomIn={() => setZoomScale((prev) => Math.min(2.5, Math.round((prev + 0.15) * 100) / 100))}
        onZoomOut={() => setZoomScale((prev) => Math.max(0.4, Math.round((prev - 0.15) * 100) / 100))}
        onResetZoom={() => setZoomScale(1.0)}
        onFitWidth={() => setZoomScale(1.2)}
        onExport={handleExportPdf}
        isExporting={isExporting}
        onOpenHelp={() => setIsShortcutsOpen(true)}
        onSelectImage={() => imageInputRef.current?.click()}
      />

      {/* ─── Workspace Center Body ─── */}
      <div className="flex-1 flex overflow-hidden relative">
        {/* Left Thumbnails Sidebar */}
        <PageThumbnails
          pdfDoc={pdfDoc}
          totalPages={totalPages}
          currentPage={currentPage}
          onSelectPage={(p) => {
            setCurrentPage(p);
            setSelectedObjectId(null);
          }}
          isOpen={isThumbnailsOpen}
          onToggle={() => setIsThumbnailsOpen((prev) => !prev)}
        />

        {/* Scrollable Center Canvas Area */}
        <main
          className="flex-1 overflow-auto flex flex-col items-center justify-start relative p-2 sm:p-4 bg-slate-200/50 dark:bg-[#060B19]"
        >
          {/* Floating Contextual Properties Panel */}
          <div className="sticky top-2 z-30 mb-2">
            <PropertiesPanel
              selectedObject={selectedObject}
              activeTool={activeTool}
              toolSettings={toolSettings}
              onUpdateSelected={(updated) => {
                if (selectedObjectId) handleUpdateObject(selectedObjectId, updated);
              }}
              onUpdateToolSettings={(newSettings) => {
                setToolSettings((prev) => ({ ...prev, ...newSettings }));
              }}
            />
          </div>

          {/* Interactive Multi-Layer PDF Page */}
          <PdfPageRenderer
            pdfDoc={pdfDoc}
            pageNum={currentPage}
            zoomScale={zoomScale}
            activeTool={activeTool}
            toolSettings={toolSettings}
            pageObjects={currentPageObjects}
            selectedObjectId={selectedObjectId}
            onSelectObject={setSelectedObjectId}
            onAddObject={handleAddObject}
            onUpdateObject={handleUpdateObject}
            onDeleteObject={handleDeleteObject}
            onDuplicateObject={handleDuplicateObject}
          />
        </main>
      </div>

      {/* ─── Bottom Status & Page Navigation Bar ─── */}
      <footer className="bg-white/95 dark:bg-[#0B132B]/95 border-t border-black/[0.08] dark:border-white/[0.08] px-4 py-2 flex items-center justify-between text-xs text-slate-600 dark:text-slate-400 select-none z-20">
        <div className="flex items-center gap-2">
          <span className="font-semibold text-slate-800 dark:text-slate-200 truncate max-w-[200px] sm:max-w-xs">
            {file.name}
          </span>
          <span className="text-[10px] bg-slate-100 dark:bg-white/10 px-1.5 py-0.5 rounded font-mono">
            {objects.length} edit{objects.length !== 1 ? 's' : ''}
          </span>
        </div>

        {/* Page Switcher */}
        <div className="flex items-center gap-2">
          <button
            type="button"
            disabled={currentPage <= 1}
            onClick={() => {
              setCurrentPage((p) => Math.max(1, p - 1));
              setSelectedObjectId(null);
            }}
            className="p-1 rounded-lg hover:bg-black/5 dark:hover:bg-white/10 disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer"
            title="Previous Page"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <span className="font-mono text-xs font-bold text-slate-800 dark:text-slate-200">
            Page {currentPage} of {totalPages}
          </span>
          <button
            type="button"
            disabled={currentPage >= totalPages}
            onClick={() => {
              setCurrentPage((p) => Math.min(totalPages, p + 1));
              setSelectedObjectId(null);
            }}
            className="p-1 rounded-lg hover:bg-black/5 dark:hover:bg-white/10 disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer"
            title="Next Page"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>

        {/* Change Document / Reset */}
        <button
          type="button"
          onClick={() => {
            if (confirm('Are you sure you want to load another PDF? Unsaved changes will be discarded.')) {
              setFile(null);
              setPdfDoc(null);
              setObjects([]);
            }
          }}
          className="text-xs text-slate-500 hover:text-slate-800 dark:hover:text-white cursor-pointer"
        >
          Close Document
        </button>
      </footer>

      {/* ─── Export Modal Overlay ─── */}
      {isExporting && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-[#111C38] rounded-3xl p-6 sm:p-8 max-w-sm w-full text-center space-y-4 shadow-2xl border border-black/10 dark:border-white/10 animate-in fade-in zoom-in-95 duration-150">
            <RefreshCw className="w-8 h-8 text-[#055EFE] animate-spin mx-auto" />
            <div className="space-y-1">
              <h3 className="text-base font-bold text-slate-800 dark:text-slate-100">
                Generating Edited PDF
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                {exportStep}
              </p>
            </div>
            {/* Progress Bar */}
            <div className="w-full bg-slate-100 dark:bg-white/10 rounded-full h-2 overflow-hidden">
              <div
                className="bg-[#055EFE] h-full transition-all duration-300"
                style={{ width: `${exportProgress}%` }}
              />
            </div>
          </div>
        </div>
      )}

      {/* ─── Keyboard Shortcuts Modal ─── */}
      {isShortcutsOpen && (
        <div
          onClick={() => setIsShortcutsOpen(false)}
          className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="bg-white dark:bg-[#111C38] rounded-3xl p-6 max-w-md w-full shadow-2xl border border-black/10 dark:border-white/10 space-y-4 animate-in fade-in zoom-in-95 duration-150"
          >
            <div className="flex items-center justify-between pb-3 border-b border-black/10 dark:border-white/10">
              <div className="flex items-center gap-2">
                <Keyboard className="w-4 h-4 text-[#055EFE]" />
                <h3 className="text-sm font-bold text-slate-800 dark:text-slate-100">
                  Keyboard Shortcuts
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setIsShortcutsOpen(false)}
                className="p-1 rounded-lg hover:bg-black/5 dark:hover:bg-white/10 text-slate-500"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="grid grid-cols-2 gap-2 text-xs">
              <div className="flex items-center justify-between p-2 rounded-xl bg-slate-50 dark:bg-white/5">
                <span>Select Tool</span>
                <kbd className="px-1.5 py-0.5 rounded bg-slate-200 dark:bg-white/10 font-mono text-[10px]">V</kbd>
              </div>
              <div className="flex items-center justify-between p-2 rounded-xl bg-slate-50 dark:bg-white/5">
                <span>Add Text</span>
                <kbd className="px-1.5 py-0.5 rounded bg-slate-200 dark:bg-white/10 font-mono text-[10px]">T</kbd>
              </div>
              <div className="flex items-center justify-between p-2 rounded-xl bg-slate-50 dark:bg-white/5">
                <span>Insert Image</span>
                <kbd className="px-1.5 py-0.5 rounded bg-slate-200 dark:bg-white/10 font-mono text-[10px]">I</kbd>
              </div>
              <div className="flex items-center justify-between p-2 rounded-xl bg-slate-50 dark:bg-white/5">
                <span>Add Shape</span>
                <kbd className="px-1.5 py-0.5 rounded bg-slate-200 dark:bg-white/10 font-mono text-[10px]">S</kbd>
              </div>
              <div className="flex items-center justify-between p-2 rounded-xl bg-slate-50 dark:bg-white/5">
                <span>Highlight</span>
                <kbd className="px-1.5 py-0.5 rounded bg-slate-200 dark:bg-white/10 font-mono text-[10px]">H</kbd>
              </div>
              <div className="flex items-center justify-between p-2 rounded-xl bg-slate-50 dark:bg-white/5">
                <span>Freehand Draw</span>
                <kbd className="px-1.5 py-0.5 rounded bg-slate-200 dark:bg-white/10 font-mono text-[10px]">D</kbd>
              </div>
              <div className="flex items-center justify-between p-2 rounded-xl bg-slate-50 dark:bg-white/5">
                <span>Undo</span>
                <kbd className="px-1.5 py-0.5 rounded bg-slate-200 dark:bg-white/10 font-mono text-[10px]">Ctrl+Z</kbd>
              </div>
              <div className="flex items-center justify-between p-2 rounded-xl bg-slate-50 dark:bg-white/5">
                <span>Redo</span>
                <kbd className="px-1.5 py-0.5 rounded bg-slate-200 dark:bg-white/10 font-mono text-[10px]">Ctrl+Y</kbd>
              </div>
              <div className="flex items-center justify-between p-2 rounded-xl bg-slate-50 dark:bg-white/5">
                <span>Copy</span>
                <kbd className="px-1.5 py-0.5 rounded bg-slate-200 dark:bg-white/10 font-mono text-[10px]">Ctrl+C</kbd>
              </div>
              <div className="flex items-center justify-between p-2 rounded-xl bg-slate-50 dark:bg-white/5">
                <span>Paste</span>
                <kbd className="px-1.5 py-0.5 rounded bg-slate-200 dark:bg-white/10 font-mono text-[10px]">Ctrl+V</kbd>
              </div>
              <div className="flex items-center justify-between p-2 rounded-xl bg-slate-50 dark:bg-white/5">
                <span>Delete</span>
                <kbd className="px-1.5 py-0.5 rounded bg-slate-200 dark:bg-white/10 font-mono text-[10px]">Del</kbd>
              </div>
              <div className="flex items-center justify-between p-2 rounded-xl bg-slate-50 dark:bg-white/5">
                <span>Duplicate</span>
                <kbd className="px-1.5 py-0.5 rounded bg-slate-200 dark:bg-white/10 font-mono text-[10px]">Ctrl+D</kbd>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
