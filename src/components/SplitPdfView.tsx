import React, { useState } from 'react';
import {
  Scissors,
  Download,
  CheckCircle2,
  RefreshCw,
  FileText,
  Layers,
  Sparkles,
} from 'lucide-react';
import { SplitPdfSettings } from '../types';
import { splitPdfFile, getPdfPageCount } from '../utils/pdfTools';
import { formatBytes } from '../utils/formatters';
import confetti from 'canvas-confetti';

interface SplitPdfViewProps {
  onBackToHome: () => void;
}

export const SplitPdfView: React.FC<SplitPdfViewProps> = ({ onBackToHome }) => {
  const [file, setFile] = useState<File | null>(null);
  const [pageCount, setPageCount] = useState<number>(0);
  const [settings, setSettings] = useState<SplitPdfSettings>({
    mode: 'ranges',
    pageRanges: '1',
  });
  const [isProcessing, setIsProcessing] = useState(false);
  const [result, setResult] = useState<{
    singleBlob?: Blob;
    zipBlob?: Blob;
    totalPagesExtracted: number;
    url: string;
  } | null>(null);

  const handleFileSelected = async (selectedFile: File) => {
    setFile(selectedFile);
    const count = await getPdfPageCount(selectedFile);
    setPageCount(count);
    setSettings((prev) => ({
      ...prev,
      pageRanges: count > 1 ? `1-${Math.min(count, 3)}` : '1',
    }));
    setResult(null);
  };

  const handleSplit = async () => {
    if (!file) return;
    setIsProcessing(true);

    try {
      const res = await splitPdfFile(file, settings);
      const activeBlob = res.singleBlob || res.zipBlob;
      if (!activeBlob) throw new Error('No output generated');

      const url = URL.createObjectURL(activeBlob);
      setResult({
        singleBlob: res.singleBlob,
        zipBlob: res.zipBlob,
        totalPagesExtracted: res.totalPagesExtracted,
        url,
      });

      confetti({
        particleCount: 50,
        spread: 60,
        origin: { y: 0.6 },
      });
    } catch (err: any) {
      console.error('Split failed:', err);
      alert(err.message || 'Failed to split PDF. Check page ranges.');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleDownload = () => {
    if (!result || !file) return;
    const a = document.createElement('a');
    a.href = result.url;
    const baseName = file.name.replace(/\.[^/.]+$/, '');
    a.download = result.zipBlob ? `${baseName}_split_pages.zip` : `${baseName}_extracted.pdf`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  // Sample multi-page PDF loader
  const handleLoadSample = async () => {
    const { PDFDocument, StandardFonts, rgb } = await import('pdf-lib');
    const doc = await PDFDocument.create();
    const font = await doc.embedFont(StandardFonts.HelveticaBold);

    for (let i = 1; i <= 5; i++) {
      const page = doc.addPage([600, 400]);
      page.drawText(`Sample Document - Page ${i} of 5`, {
        x: 50,
        y: 300,
        size: 24,
        font,
        color: rgb(0, 0.44, 0.89),
      });
      page.drawText('This is a 5-page sample document for testing PDF splitting and extraction.', {
        x: 50,
        y: 240,
        size: 14,
        font: await doc.embedFont(StandardFonts.Helvetica),
        color: rgb(0.3, 0.3, 0.3),
      });
    }

    const bytes = await doc.save();
    const sampleFile = new File([bytes], 'Sample_5_Pages_Document.pdf', { type: 'application/pdf' });
    handleFileSelected(sampleFile);
  };

  return (
    <div id="split-pdf-view" className="w-full max-w-4xl mx-auto space-y-6 animate-in fade-in duration-200">
      <div className="text-center space-y-2">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#ff9500]/10 text-[#ff9500] text-[12px] font-semibold">
          <Scissors className="w-3.5 h-3.5" />
          <span>PDF Splitter</span>
        </div>
        <h2 className="text-3xl font-bold tracking-tight text-[#1d1d1f] dark:text-[#f5f5f7]">Split & Extract PDF Pages</h2>
        <p className="text-[15px] text-[#6e6e73] dark:text-[#8e8e93] max-w-xl mx-auto">
          Extract specific page ranges into a new PDF or split all pages into separate single-page files.
        </p>
      </div>

      <div className="bg-white dark:bg-[#1c1c1e] rounded-[24px] border border-black/[0.08] dark:border-white/[0.08] shadow-[0_4px_24px_rgba(0,0,0,0.04)] p-6 sm:p-8 space-y-6 transition-colors">
        {!file ? (
          <div
            onClick={() => {
              const input = document.createElement('input');
              input.type = 'file';
              input.accept = 'application/pdf';
              input.onchange = (e: any) => {
                if (e.target.files?.[0]) handleFileSelected(e.target.files[0]);
              };
              input.click();
            }}
            className="border-2 border-dashed border-black/10 dark:border-white/10 hover:border-[#ff9500] bg-[#fafafc] dark:bg-[#252528] hover:bg-[#ff9500]/5 dark:hover:bg-[#ff9500]/10 rounded-[20px] p-8 text-center cursor-pointer transition-all"
          >
            <div className="w-14 h-14 mx-auto rounded-2xl bg-white dark:bg-[#2c2c2e] border border-black/10 dark:border-white/10 shadow-xs flex items-center justify-center text-[#ff9500] mb-3">
              <Scissors className="w-7 h-7" />
            </div>
            <h3 className="text-[16px] font-semibold text-[#1d1d1f] dark:text-[#f5f5f7]">
              Choose a PDF file to split, or <span className="text-[#ff9500]">browse</span>
            </h3>
            <p className="text-[13px] text-[#86868b] dark:text-[#8e8e93] mt-1">Supports multi-page PDF documents</p>

            <div className="mt-4">
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  handleLoadSample();
                }}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white dark:bg-[#2c2c2e] border border-black/[0.08] dark:border-white/[0.08] text-[12px] font-medium text-[#1d1d1f] dark:text-[#f5f5f7] shadow-xs cursor-pointer hover:bg-black/[0.03] dark:hover:bg-white/[0.05]"
              >
                <Sparkles className="w-3.5 h-3.5 text-[#ff9500]" />
                <span>Load 5-Page Sample PDF</span>
              </button>
            </div>
          </div>
        ) : (
          <div className="space-y-6">
            {/* File info card */}
            <div className="flex items-center justify-between p-4 rounded-2xl bg-[#f5f5f7] dark:bg-[#252528] border border-black/[0.04] dark:border-white/[0.06]">
              <div className="flex items-center gap-3">
                <FileText className="w-6 h-6 text-[#ff9500]" />
                <div>
                  <h4 className="text-[14px] font-semibold text-[#1d1d1f] dark:text-[#f5f5f7]">{file.name}</h4>
                  <p className="text-[12px] text-[#86868b] dark:text-[#8e8e93]">
                    {pageCount} total pages • {formatBytes(file.size)}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setFile(null)}
                className="text-[12px] text-[#6e6e73] dark:text-[#8e8e93] hover:text-[#1d1d1f] dark:hover:text-[#f5f5f7] underline cursor-pointer"
              >
                Change file
              </button>
            </div>

            {/* Split Mode Options */}
            <div className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setSettings({ ...settings, mode: 'ranges' })}
                  className={`p-4 rounded-2xl text-left border transition-all cursor-pointer ${
                    settings.mode === 'ranges'
                      ? 'border-[#ff9500] bg-[#ff9500]/5 dark:bg-[#ff9500]/10 ring-2 ring-[#ff9500]/20'
                      : 'border-black/10 dark:border-white/10 hover:border-black/20 dark:hover:border-white/20 bg-white dark:bg-[#252528]'
                  }`}
                >
                  <h5 className="text-[14px] font-semibold text-[#1d1d1f] dark:text-[#f5f5f7]">Extract Custom Pages</h5>
                  <p className="text-[12px] text-[#86868b] dark:text-[#8e8e93] mt-0.5">
                    Combine selected pages (e.g. 1-3, 5) into one PDF
                  </p>
                </button>

                <button
                  type="button"
                  onClick={() => setSettings({ ...settings, mode: 'all_pages' })}
                  className={`p-4 rounded-2xl text-left border transition-all cursor-pointer ${
                    settings.mode === 'all_pages'
                      ? 'border-[#ff9500] bg-[#ff9500]/5 dark:bg-[#ff9500]/10 ring-2 ring-[#ff9500]/20'
                      : 'border-black/10 dark:border-white/10 hover:border-black/20 dark:hover:border-white/20 bg-white dark:bg-[#252528]'
                  }`}
                >
                  <h5 className="text-[14px] font-semibold text-[#1d1d1f] dark:text-[#f5f5f7]">Split into Individual Pages</h5>
                  <p className="text-[12px] text-[#86868b] dark:text-[#8e8e93] mt-0.5">
                    Save every page as a separate PDF in a ZIP file
                  </p>
                </button>
              </div>

              {settings.mode === 'ranges' && (
                <div className="p-4 rounded-2xl bg-[#fafafc] dark:bg-[#252528] border border-black/[0.06] dark:border-white/[0.06] space-y-2">
                  <label className="text-[13px] font-semibold text-[#1d1d1f] dark:text-[#f5f5f7] block">
                    Pages to Extract:
                  </label>
                  <input
                    type="text"
                    value={settings.pageRanges}
                    onChange={(e) => setSettings({ ...settings, pageRanges: e.target.value })}
                    placeholder={`e.g. 1, 3-${Math.min(pageCount, 5)}`}
                    className="w-full px-3.5 py-2 rounded-xl bg-white dark:bg-[#2c2c2e] border border-black/10 dark:border-white/10 text-[14px] text-[#1d1d1f] dark:text-[#f5f5f7] focus:outline-none focus:border-[#ff9500]"
                  />
                  <p className="text-[11px] text-[#86868b] dark:text-[#8e8e93]">
                    Enter comma-separated page numbers or ranges (available 1 to {pageCount}).
                  </p>
                </div>
              )}
            </div>

            {/* Actions */}
            <div className="pt-2 flex flex-col sm:flex-row items-center justify-between gap-3">
              <button
                type="button"
                onClick={onBackToHome}
                className="w-full sm:w-auto px-5 py-2.5 rounded-xl border border-black/10 dark:border-white/10 text-[14px] font-medium text-[#1d1d1f] dark:text-[#f5f5f7] hover:bg-black/[0.03] dark:hover:bg-white/[0.05] cursor-pointer"
              >
                Back to Tools
              </button>

              <button
                type="button"
                disabled={isProcessing}
                onClick={handleSplit}
                className="w-full sm:w-auto px-8 py-3 rounded-xl bg-[#ff9500] hover:bg-[#eb8a00] active:bg-[#d47d00] text-white font-semibold text-[15px] shadow-sm flex items-center justify-center gap-2 transition-all cursor-pointer"
              >
                {isProcessing ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>Splitting PDF...</span>
                  </>
                ) : (
                  <>
                    <Scissors className="w-4 h-4" />
                    <span>
                      {settings.mode === 'all_pages'
                        ? `Split all ${pageCount} pages`
                        : 'Extract Selected Pages'}
                    </span>
                  </>
                )}
              </button>
            </div>
          </div>
        )}

        {/* Result */}
        {result && (
          <div className="p-6 rounded-[20px] bg-[#ff9500]/10 dark:bg-[#ff9500]/15 border border-[#ff9500]/20 text-center space-y-4 animate-in zoom-in-95 duration-150">
            <div className="w-12 h-12 rounded-full bg-[#ff9500] text-white mx-auto flex items-center justify-center shadow-md">
              <CheckCircle2 className="w-6 h-6" />
            </div>
            <div>
              <h4 className="text-[18px] font-bold text-[#1d1d1f] dark:text-[#f5f5f7]">PDF Split Completed!</h4>
              <p className="text-[13px] text-[#6e6e73] dark:text-[#8e8e93] mt-1">
                Extracted <strong>{result.totalPagesExtracted} pages</strong> (
                {formatBytes((result.singleBlob || result.zipBlob)?.size || 0)})
              </p>
            </div>

            <div className="flex items-center justify-center gap-3 pt-2">
              <button
                type="button"
                onClick={handleDownload}
                className="px-6 py-2.5 rounded-xl bg-[#ff9500] hover:bg-[#eb8a00] text-white text-[14px] font-semibold shadow-xs flex items-center gap-2 cursor-pointer"
              >
                <Download className="w-4 h-4" />
                <span>Download {result.zipBlob ? 'Split Pages (ZIP)' : 'Extracted PDF'}</span>
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
