import React, { useState, useRef } from 'react';
import {
  Search,
  Upload,
  FileText,
  CheckCircle2,
  AlertCircle,
  Download,
  RotateCw,
  SlidersHorizontal,
  ShieldAlert,
  Clock,
  ExternalLink,
  Sparkles,
  ArrowRight,
  RefreshCw,
} from 'lucide-react';
import { formatBytes } from '../utils/formatters';
import confetti from 'canvas-confetti';
import { trackEvent } from '../utils/analytics';

interface OcrPdfViewProps {
  onBackToHome: () => void;
  onNavigate?: (path: string, tool?: string) => void;
}

type OcrStage =
  | 'idle'
  | 'uploading'
  | 'preparing'
  | 'processing'
  | 'building'
  | 'finalizing'
  | 'completed'
  | 'error';

interface OcrLanguageOption {
  code: string;
  name: string;
  nativeName: string;
}

const OCR_LANGUAGES: OcrLanguageOption[] = [
  { code: 'eng', name: 'English', nativeName: 'English (Default)' },
  { code: 'hin', name: 'Hindi', nativeName: 'हिन्दी (Hindi)' },
  { code: 'eng+hin', name: 'English + Hindi', nativeName: 'English + हिन्दी' },
  { code: 'fra', name: 'French', nativeName: 'Français' },
  { code: 'deu', name: 'German', nativeName: 'Deutsch' },
  { code: 'spa', name: 'Spanish', nativeName: 'Español' },
];

export const OcrPdfView: React.FC<OcrPdfViewProps> = ({ onBackToHome, onNavigate }) => {
  const [file, setFile] = useState<File | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [language, setLanguage] = useState('eng');
  const [ocrMode, setOcrMode] = useState<'auto' | 'force' | 'skip'>('auto');
  const [autoRotate, setAutoRotate] = useState(true);
  const [deskew, setDeskew] = useState(true);

  const [stage, setStage] = useState<OcrStage>('idle');
  const [stageMessage, setStageMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isEncrypted, setIsEncrypted] = useState(false);

  const [resultBlob, setResultBlob] = useState<Blob | null>(null);
  const [resultUrl, setResultUrl] = useState<string | null>(null);
  const [outputSize, setOutputSize] = useState<number>(0);
  const [durationSec, setDurationSec] = useState<number>(0);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleSelectedFile(e.dataTransfer.files[0]);
    }
  };

  const handleSelectedFile = (selected: File) => {
    if (!selected.name.toLowerCase().endsWith('.pdf') && selected.type !== 'application/pdf') {
      setErrorMessage('Please select a valid PDF document.');
      return;
    }

    if (selected.size > 50 * 1024 * 1024) {
      setErrorMessage('This PDF exceeds the 50MB maximum OCR size limit.');
      return;
    }

    setFile(selected);
    setErrorMessage(null);
    setIsEncrypted(false);
    setStage('idle');
    setResultBlob(null);
    if (resultUrl) {
      URL.revokeObjectURL(resultUrl);
      setResultUrl(null);
    }
  };

  const startOcr = async () => {
    if (!file) return;

    setStage('uploading');
    setStageMessage('Uploading document to secure sandbox...');
    setErrorMessage(null);
    setIsEncrypted(false);

    try {
      trackEvent('OCR Started', {
        language,
        mode: ocrMode,
        deskew,
        rotate: autoRotate,
        fileSize: file.size,
      });

      // Realistic progress stage orchestration
      const progressTimer1 = setTimeout(() => {
        setStage('preparing');
        setStageMessage('Preparing PDF and analyzing scanned raster pages...');
      }, 1200);

      const progressTimer2 = setTimeout(() => {
        setStage('processing');
        setStageMessage(`Running Tesseract OCR engine (${OCR_LANGUAGES.find((l) => l.code === language)?.name || language})...`);
      }, 3500);

      const progressTimer3 = setTimeout(() => {
        setStage('building');
        setStageMessage('Synthesizing invisible vector text layer & deskewing...');
      }, 8000);

      const progressTimer4 = setTimeout(() => {
        setStage('finalizing');
        setStageMessage('Validating searchable PDF output and document integrity...');
      }, 14000);

      const response = await fetch('/api/ocr', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/pdf',
          'X-File-Name': encodeURIComponent(file.name),
          'X-OCR-Language': language,
          'X-OCR-Mode': ocrMode,
          'X-OCR-Deskew': String(deskew),
          'X-OCR-Rotate': String(autoRotate),
        },
        body: file,
      });

      clearTimeout(progressTimer1);
      clearTimeout(progressTimer2);
      clearTimeout(progressTimer3);
      clearTimeout(progressTimer4);

      if (!response.ok) {
        const errorJson = (await response.json().catch(() => ({}))) as any;
        if (response.status === 422 || errorJson.code === 'ENCRYPTED_PDF') {
          setIsEncrypted(true);
          throw new Error('This PDF is password protected or encrypted. Please unlock it first.');
        }
        throw new Error(errorJson.error || errorJson.message || `Server responded with status ${response.status}`);
      }

      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const duration = Number(response.headers.get('X-OCR-Duration-Sec') || 0);

      setResultBlob(blob);
      setResultUrl(url);
      setOutputSize(blob.size);
      setDurationSec(duration);
      setStage('completed');

      confetti({
        particleCount: 50,
        spread: 60,
        origin: { y: 0.6 },
      });

      trackEvent('OCR Succeeded', {
        language,
        duration,
        outputSize: blob.size,
      });
    } catch (err: any) {
      setStage('error');
      setErrorMessage(err.message || 'We could not create a searchable PDF from this file.');
      trackEvent('OCR Failed', { error: err.message });
    }
  };

  const handleDownload = () => {
    if (!resultUrl || !file) return;
    const link = document.createElement('a');
    link.href = resultUrl;
    const baseName = file.name.replace(/\.[^/.]+$/, '');
    link.download = `${baseName}_searchable.pdf`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    trackEvent('OCR Downloaded');
  };

  const resetAll = () => {
    setFile(null);
    setStage('idle');
    setErrorMessage(null);
    setIsEncrypted(false);
    setResultBlob(null);
    if (resultUrl) {
      URL.revokeObjectURL(resultUrl);
      setResultUrl(null);
    }
  };

  return (
    <div className="w-full max-w-4xl mx-auto space-y-6 animate-in fade-in duration-200">
      {/* 1. Header with Breadcrumbs & Processing Badge */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-black/[0.06] dark:border-white/[0.08]">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onBackToHome}
              className="text-xs font-semibold text-slate-500 hover:text-[#055EFE] transition-colors cursor-pointer"
            >
              All Tools
            </button>
            <span className="text-slate-400">/</span>
            <span className="text-xs font-semibold text-[#0C162C] dark:text-white">OCR PDF</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-[#0C162C] dark:text-white tracking-tight flex items-center gap-2.5">
            <span>OCR PDF — Make PDF Searchable</span>
          </h1>
          <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400">
            Convert scanned paper documents and image-only PDFs into searchable, selectable text.
          </p>
        </div>

        {/* Temporary Server Processing Badge */}
        <div className="self-start sm:self-center shrink-0">
          <div
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-amber-500/10 border border-amber-500/25 text-amber-700 dark:text-amber-400 text-xs font-medium"
            title="Your PDF is securely processed in an isolated container to synthesize the OCR text layer, and automatically deleted afterwards."
          >
            <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse"></span>
            <span>Temporary server processing</span>
          </div>
        </div>
      </div>

      {/* 2. Privacy Disclosure Alert */}
      <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-white/[0.02] border border-black/[0.06] dark:border-white/[0.08] text-xs text-slate-600 dark:text-slate-400 flex items-start gap-2.5">
        <Clock className="w-4 h-4 text-slate-400 shrink-0 mt-0.5" />
        <span>
          Your PDF is securely processed temporarily on ZipStream&apos;s isolated infrastructure to synthesize the searchable text layer. Processing files are automatically deleted according to our strict retention policy.
        </span>
      </div>

      {/* 3. Upload & Dropzone Area */}
      {!file && (
        <div
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
          className={`relative border-2 border-dashed rounded-3xl p-8 sm:p-12 text-center cursor-pointer transition-all duration-200 ${
            isDragging
              ? 'border-[#055EFE] bg-[#055EFE]/5 scale-[0.99]'
              : 'border-slate-300 dark:border-white/15 bg-white dark:bg-[#11192E] hover:border-[#055EFE]/60 hover:shadow-lg'
          }`}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept=".pdf,application/pdf"
            onChange={(e) => {
              if (e.target.files && e.target.files[0]) {
                handleSelectedFile(e.target.files[0]);
              }
            }}
            className="hidden"
          />

          <div className="flex flex-col items-center justify-center space-y-4 max-w-md mx-auto">
            <div className="w-16 h-16 rounded-2xl bg-[#055EFE]/10 text-[#055EFE] flex items-center justify-center shadow-inner">
              <Search className="w-8 h-8" />
            </div>
            <div className="space-y-1.5">
              <h2 className="text-base sm:text-lg font-bold text-[#0C162C] dark:text-white">
                Select or drop scanned PDF
              </h2>
              <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400">
                Works with scanned documents, invoices, receipts, books, and mobile photos (Up to 50MB)
              </p>
            </div>
            <button
              type="button"
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-b from-[#0077ff] to-[#055efe] text-white text-xs sm:text-sm font-semibold shadow-md shadow-[#055efe]/25 hover:from-[#006ee6] hover:to-[#0452e0] transition-all"
            >
              <Upload className="w-4 h-4" />
              <span>Choose PDF Document</span>
            </button>
          </div>
        </div>
      )}

      {/* 4. Active File Configuration & Execution */}
      {file && stage !== 'completed' && (
        <div className="space-y-6">
          {/* File Overview Card */}
          <div className="p-4 sm:p-5 rounded-2xl bg-white dark:bg-[#11192E] border border-black/[0.06] dark:border-white/[0.08] shadow-sm flex items-center justify-between gap-4">
            <div className="flex items-center gap-3.5 min-w-0">
              <div className="w-11 h-11 rounded-xl bg-[#055EFE]/10 text-[#055EFE] flex items-center justify-center shrink-0">
                <FileText className="w-6 h-6" />
              </div>
              <div className="min-w-0 space-y-0.5">
                <p className="text-sm font-bold text-[#0C162C] dark:text-white truncate">
                  {file.name}
                </p>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  {formatBytes(file.size)} • Scanned Document
                </p>
              </div>
            </div>

            {stage === 'idle' && (
              <button
                type="button"
                onClick={resetAll}
                className="text-xs font-semibold text-slate-500 hover:text-red-600 transition-colors cursor-pointer shrink-0"
              >
                Change File
              </button>
            )}
          </div>

          {/* Configuration Form (Visible when idle or error) */}
          {(stage === 'idle' || stage === 'error') && (
            <div className="p-5 sm:p-6 rounded-2xl bg-white dark:bg-[#11192E] border border-black/[0.06] dark:border-white/[0.08] shadow-sm space-y-5">
              <div className="flex items-center gap-2 pb-3 border-b border-black/[0.06] dark:border-white/[0.08]">
                <SlidersHorizontal className="w-4 h-4 text-[#055EFE]" />
                <h3 className="text-sm font-bold text-[#0C162C] dark:text-white">
                  OCR Engine Settings
                </h3>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Language Picker */}
                <div className="space-y-1.5">
                  <label htmlFor="ocr-lang-select" className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                    Primary Recognition Language
                  </label>
                  <select
                    id="ocr-lang-select"
                    value={language}
                    onChange={(e) => setLanguage(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-white/[0.05] border border-slate-200 dark:border-white/10 text-xs sm:text-sm font-medium text-[#0C162C] dark:text-white focus:outline-none focus:border-[#055EFE]"
                  >
                    {OCR_LANGUAGES.map((l) => (
                      <option key={l.code} value={l.code} className="bg-white dark:bg-[#11192E]">
                        {l.nativeName}
                      </option>
                    ))}
                  </select>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">
                    Select English + Hindi for bilingual and mixed-script Indian documents.
                  </p>
                </div>

                {/* OCR Mode Picker */}
                <div className="space-y-1.5">
                  <label htmlFor="ocr-mode-select" className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                    OCR Mode
                  </label>
                  <select
                    id="ocr-mode-select"
                    value={ocrMode}
                    onChange={(e) => setOcrMode(e.target.value as any)}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-white/[0.05] border border-slate-200 dark:border-white/10 text-xs sm:text-sm font-medium text-[#0C162C] dark:text-white focus:outline-none focus:border-[#055EFE]"
                  >
                    <option value="auto" className="bg-white dark:bg-[#11192E]">
                      Auto (Detect scanned pages)
                    </option>
                    <option value="force" className="bg-white dark:bg-[#11192E]">
                      Force OCR (Redo all pages)
                    </option>
                    <option value="skip" className="bg-white dark:bg-[#11192E]">
                      Skip pages with existing text
                    </option>
                  </select>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">
                    Auto analyzes every page and synthesizes text only where needed.
                  </p>
                </div>
              </div>

              {/* Toggles */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                <label className="flex items-center gap-3 p-3 rounded-xl bg-slate-50/70 dark:bg-white/[0.03] border border-black/[0.04] dark:border-white/[0.06] cursor-pointer">
                  <input
                    type="checkbox"
                    checked={deskew}
                    onChange={(e) => setDeskew(e.target.checked)}
                    className="w-4 h-4 rounded text-[#055EFE] focus:ring-[#055EFE]"
                  />
                  <div className="text-xs">
                    <span className="font-semibold text-[#0C162C] dark:text-white block">
                      Auto Deskew Pages
                    </span>
                    <span className="text-slate-500 dark:text-slate-400">
                      Straightens tilted and crooked scans
                    </span>
                  </div>
                </label>

                <label className="flex items-center gap-3 p-3 rounded-xl bg-slate-50/70 dark:bg-white/[0.03] border border-black/[0.04] dark:border-white/[0.06] cursor-pointer">
                  <input
                    type="checkbox"
                    checked={autoRotate}
                    onChange={(e) => setAutoRotate(e.target.checked)}
                    className="w-4 h-4 rounded text-[#055EFE] focus:ring-[#055EFE]"
                  />
                  <div className="text-xs">
                    <span className="font-semibold text-[#0C162C] dark:text-white block">
                      Auto-Rotate Orientation
                    </span>
                    <span className="text-slate-500 dark:text-slate-400">
                      Detects and fixes upside-down scans (OSD)
                    </span>
                  </div>
                </label>
              </div>

              {/* Action Button */}
              <div className="pt-2">
                <button
                  type="button"
                  onClick={startOcr}
                  className="w-full py-3.5 rounded-xl bg-gradient-to-b from-[#0077ff] to-[#055efe] hover:from-[#006ee6] hover:to-[#0452e0] text-white font-bold text-sm shadow-md shadow-[#055efe]/25 transition-all flex items-center justify-center gap-2 cursor-pointer"
                >
                  <Search className="w-4 h-4" />
                  <span>Start OCR &amp; Make Searchable</span>
                </button>
              </div>
            </div>
          )}

          {/* Staged Realistic Progress Indicator */}
          {stage !== 'idle' && stage !== 'error' && (
            <div
              className="p-6 rounded-2xl bg-white dark:bg-[#11192E] border border-black/[0.06] dark:border-white/[0.08] shadow-sm text-center space-y-5"
              aria-live="polite"
            >
              <div className="w-14 h-14 rounded-2xl bg-[#055EFE]/10 text-[#055EFE] flex items-center justify-center mx-auto animate-spin">
                <RefreshCw className="w-7 h-7" />
              </div>
              <div className="space-y-1.5">
                <h3 className="text-base font-bold text-[#0C162C] dark:text-white">
                  Creating Searchable PDF
                </h3>
                <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 font-medium">
                  {stageMessage}
                </p>
              </div>

              {/* Progress Stage Tracker */}
              <div className="grid grid-cols-4 gap-2 pt-2 max-w-lg mx-auto text-[11px] font-semibold text-slate-500">
                <div className={`p-2 rounded-lg ${stage === 'uploading' ? 'bg-[#055EFE]/15 text-[#055EFE] font-bold' : 'bg-slate-100 dark:bg-white/5'}`}>
                  1. Upload
                </div>
                <div className={`p-2 rounded-lg ${stage === 'preparing' ? 'bg-[#055EFE]/15 text-[#055EFE] font-bold' : 'bg-slate-100 dark:bg-white/5'}`}>
                  2. Prepare
                </div>
                <div className={`p-2 rounded-lg ${stage === 'processing' ? 'bg-[#055EFE]/15 text-[#055EFE] font-bold' : 'bg-slate-100 dark:bg-white/5'}`}>
                  3. OCR
                </div>
                <div className={`p-2 rounded-lg ${stage === 'building' || stage === 'finalizing' ? 'bg-[#055EFE]/15 text-[#055EFE] font-bold' : 'bg-slate-100 dark:bg-white/5'}`}>
                  4. Layer
                </div>
              </div>

              <p className="text-xs text-slate-400 pt-2">
                Processing duration depends on page count and scan resolution. Please keep this tab open.
              </p>
            </div>
          )}

          {/* Error Message & Recovery */}
          {errorMessage && (
            <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-600 dark:text-red-400 text-xs sm:text-sm space-y-3">
              <div className="flex items-start gap-2.5">
                <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
                <div className="space-y-1">
                  <span className="font-bold block">OCR Processing Failed</span>
                  <p>{errorMessage}</p>
                </div>
              </div>

              {isEncrypted && (
                <div className="pt-2">
                  <button
                    type="button"
                    onClick={() => onNavigate ? onNavigate('/unlock-pdf', 'unlock_pdf') : window.location.assign('/unlock-pdf')}
                    className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-red-600 text-white font-semibold text-xs shadow-xs hover:bg-red-700 transition-colors cursor-pointer"
                  >
                    <span>Go to Unlock PDF Tool →</span>
                  </button>
                </div>
              )}

              <div className="pt-1 flex items-center gap-3">
                <button
                  type="button"
                  onClick={startOcr}
                  className="px-3.5 py-1.5 rounded-lg bg-red-600/15 hover:bg-red-600/25 font-semibold text-xs text-red-700 dark:text-red-300 transition-colors cursor-pointer"
                >
                  Try Again
                </button>
                <button
                  type="button"
                  onClick={resetAll}
                  className="text-xs underline text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 cursor-pointer"
                >
                  Select Another PDF
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* 5. Completion State */}
      {stage === 'completed' && file && (
        <div className="p-6 sm:p-8 rounded-2xl bg-white dark:bg-[#11192E] border border-black/[0.06] dark:border-white/[0.08] shadow-sm text-center space-y-6 animate-in zoom-in-95 duration-200">
          <div className="w-16 h-16 rounded-2xl bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mx-auto shadow-inner">
            <CheckCircle2 className="w-9 h-9" />
          </div>

          <div className="space-y-2">
            <h2 className="text-xl sm:text-2xl font-extrabold text-[#0C162C] dark:text-white">
              Searchable PDF Ready!
            </h2>
            <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 max-w-md mx-auto">
              Your scanned document now contains an invisible, high-accuracy text layer. You can search words with <kbd className="font-mono bg-slate-100 dark:bg-white/10 px-1.5 py-0.5 rounded text-[11px]">Ctrl+F</kbd> and copy text freely.
            </p>
          </div>

          {/* Metrics Card */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 max-w-lg mx-auto p-4 rounded-xl bg-slate-50 dark:bg-white/[0.03] border border-black/[0.04] dark:border-white/[0.06] text-xs">
            <div>
              <span className="text-slate-400 block">Original Size</span>
              <span className="font-semibold text-slate-700 dark:text-slate-200">
                {formatBytes(file.size)}
              </span>
            </div>
            <div>
              <span className="text-slate-400 block">Searchable Size</span>
              <span className="font-semibold text-slate-700 dark:text-slate-200">
                {formatBytes(outputSize)}
              </span>
            </div>
            <div className="col-span-2 sm:col-span-1">
              <span className="text-slate-400 block">OCR Language</span>
              <span className="font-semibold text-slate-700 dark:text-slate-200">
                {OCR_LANGUAGES.find((l) => l.code === language)?.name || language}
              </span>
            </div>
          </div>

          {/* Action CTAs */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
            <button
              type="button"
              onClick={handleDownload}
              className="w-full sm:w-auto px-6 py-3.5 rounded-xl bg-gradient-to-b from-[#0077ff] to-[#055efe] hover:from-[#006ee6] hover:to-[#0452e0] text-white font-bold text-sm shadow-md shadow-[#055efe]/25 transition-all flex items-center justify-center gap-2 cursor-pointer"
            >
              <Download className="w-4 h-4" />
              <span>Download Searchable PDF</span>
            </button>

            <button
              type="button"
              onClick={resetAll}
              className="w-full sm:w-auto px-5 py-3.5 rounded-xl bg-slate-100 dark:bg-white/10 hover:bg-slate-200 dark:hover:bg-white/15 text-[#0C162C] dark:text-white font-semibold text-sm transition-all cursor-pointer"
            >
              OCR Another PDF
            </button>
          </div>

          {/* Related Actions */}
          <div className="pt-6 border-t border-black/[0.06] dark:border-white/[0.08] flex items-center justify-center gap-4 text-xs">
            <span className="text-slate-400">Next step:</span>
            <button
              type="button"
              onClick={() => onNavigate ? onNavigate('/compress-pdf', 'compress') : window.location.assign('/compress-pdf')}
              className="font-semibold text-[#055EFE] hover:underline cursor-pointer"
            >
              Compress Searchable PDF →
            </button>
            <span className="text-slate-300 dark:text-white/20">•</span>
            <button
              type="button"
              onClick={() => onNavigate ? onNavigate('/pdf-to-word', 'pdf_to_word') : window.location.assign('/pdf-to-word')}
              className="font-semibold text-[#055EFE] hover:underline cursor-pointer"
            >
              Convert to Word →
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
