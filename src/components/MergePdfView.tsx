import React, { useState } from 'react';
import {
  FilePlus,
  ArrowUp,
  ArrowDown,
  Trash2,
  Download,
  CheckCircle2,
  Sparkles,
  RefreshCw,
  FileText,
  Layers,
} from 'lucide-react';
import { MergePdfItem } from '../types';
import { mergePdfFiles, getPdfPageCount } from '../utils/pdfTools';
import { formatBytes } from '../utils/formatters';
import confetti from 'canvas-confetti';

interface MergePdfViewProps {
  onBackToHome: () => void;
}

export const MergePdfView: React.FC<MergePdfViewProps> = ({ onBackToHome }) => {
  const [items, setItems] = useState<MergePdfItem[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [mergedResult, setMergedResult] = useState<{
    blob: Blob;
    totalPages: number;
    size: number;
    url: string;
  } | null>(null);
  const [addBlankSeparators, setAddBlankSeparators] = useState(false);
  const [mergedFileName, setMergedFileName] = useState('merged_document.pdf');
  const [isDragging, setIsDragging] = useState(false);

  // Handle file addition
  const handleFilesAdded = async (fileList: FileList | File[]) => {
    const pdfFiles = Array.from(fileList).filter(
      (f) => f.type === 'application/pdf' || f.name.toLowerCase().endsWith('.pdf')
    );

    if (pdfFiles.length === 0) return;

    const newItems: MergePdfItem[] = [];
    for (const file of pdfFiles) {
      const pageCount = await getPdfPageCount(file);
      newItems.push({
        id: `pdf-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
        file,
        name: file.name,
        size: file.size,
        pageCount,
      });
    }

    setItems((prev) => [...prev, ...newItems]);
    setMergedResult(null);
  };

  // Move item up
  const moveItem = (index: number, direction: 'up' | 'down') => {
    setItems((prev) => {
      const copy = [...prev];
      const targetIndex = direction === 'up' ? index - 1 : index + 1;
      if (targetIndex < 0 || targetIndex >= copy.length) return prev;
      const temp = copy[index];
      copy[index] = copy[targetIndex];
      copy[targetIndex] = temp;
      return copy;
    });
  };

  // Remove item
  const removeItem = (id: string) => {
    setItems((prev) => prev.filter((item) => item.id !== id));
    setMergedResult(null);
  };

  // Generate quick sample PDF documents for easy testing
  const handleLoadSamplePdfs = async () => {
    const { PDFDocument, StandardFonts, rgb } = await import('pdf-lib');

    // Create Sample 1: Report Overview
    const doc1 = await PDFDocument.create();
    const font = await doc1.embedFont(StandardFonts.HelveticaBold);
    const p1 = doc1.addPage([600, 400]);
    p1.drawText('Sample Document 1: Project Overview', { x: 50, y: 320, size: 20, font, color: rgb(0, 0.44, 0.89) });
    p1.drawText('Page 1 of Document A - Ready for merging.', { x: 50, y: 280, size: 14, font: await doc1.embedFont(StandardFonts.Helvetica), color: rgb(0.2, 0.2, 0.2) });
    const bytes1 = await doc1.save();
    const file1 = new File([bytes1], 'Sample_1_Overview.pdf', { type: 'application/pdf' });

    // Create Sample 2: Financial Summary
    const doc2 = await PDFDocument.create();
    const p2 = doc2.addPage([600, 400]);
    p2.drawText('Sample Document 2: Financial Summary', { x: 50, y: 320, size: 20, font, color: rgb(0.2, 0.7, 0.3) });
    p2.drawText('Page 1 of Document B - Merging test document.', { x: 50, y: 280, size: 14, font: await doc2.embedFont(StandardFonts.Helvetica), color: rgb(0.2, 0.2, 0.2) });
    const bytes2 = await doc2.save();
    const file2 = new File([bytes2], 'Sample_2_Financials.pdf', { type: 'application/pdf' });

    handleFilesAdded([file1, file2]);
  };

  // Merge execution
  const handleMergePdfs = async () => {
    if (items.length < 2) return;

    setIsProcessing(true);
    try {
      const files = items.map((i) => i.file);
      const result = await mergePdfFiles(files, { addBlankSeparators });
      const url = URL.createObjectURL(result.blob);

      setMergedResult({
        blob: result.blob,
        totalPages: result.totalPages,
        size: result.blob.size,
        url,
      });

      confetti({
        particleCount: 50,
        spread: 60,
        origin: { y: 0.6 },
      });
    } catch (err) {
      console.error('Merge failed:', err);
      alert('Failed to merge PDFs. Please ensure valid uncorrupted PDF documents are loaded.');
    } finally {
      setIsProcessing(false);
    }
  };

  // Trigger download
  const handleDownload = () => {
    if (!mergedResult) return;
    const a = document.createElement('a');
    a.href = mergedResult.url;
    a.download = mergedFileName.endsWith('.pdf') ? mergedFileName : `${mergedFileName}.pdf`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  const totalInputPages = items.reduce((acc, curr) => acc + curr.pageCount, 0);
  const totalInputSize = items.reduce((acc, curr) => acc + curr.size, 0);

  return (
    <div id="merge-pdf-view" className="w-full max-w-4xl mx-auto space-y-6 animate-in fade-in duration-200">
      {/* Header */}
      <div className="text-center space-y-2">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#ff3b30]/10 text-[#ff3b30] text-[12px] font-semibold">
          <FilePlus className="w-3.5 h-3.5" />
          <span>PDF Studio</span>
        </div>
        <h2 className="text-3xl font-bold tracking-tight text-[#1d1d1f] dark:text-[#f5f5f7]">Merge PDF Files</h2>
        <p className="text-[15px] text-[#6e6e73] dark:text-[#8e8e93] max-w-xl mx-auto">
          Combine multiple PDF documents into a single, unified file. Drag to rearrange pages and download instantly.
        </p>
      </div>

      {/* Main card */}
      <div className="bg-white dark:bg-[#1c1c1e] rounded-[24px] border border-black/[0.08] dark:border-white/[0.08] shadow-[0_4px_24px_rgba(0,0,0,0.04)] p-6 sm:p-8 space-y-6 transition-colors">
        {/* Drop area */}
        <div
          onDragOver={(e) => {
            e.preventDefault();
            setIsDragging(true);
          }}
          onDragLeave={() => setIsDragging(false)}
          onDrop={(e) => {
            e.preventDefault();
            setIsDragging(false);
            if (e.dataTransfer.files) {
              handleFilesAdded(e.dataTransfer.files);
            }
          }}
          className={`border-2 border-dashed rounded-[20px] p-8 text-center transition-all cursor-pointer ${
            isDragging
              ? 'border-[#0071e3] bg-[#0071e3]/5 dark:border-[#2997ff] dark:bg-[#2997ff]/10'
              : 'border-black/10 dark:border-white/10 hover:border-black/20 dark:hover:border-white/20 bg-[#fafafc] dark:bg-[#252528]'
          }`}
          onClick={() => {
            const input = document.createElement('input');
            input.type = 'file';
            input.accept = 'application/pdf';
            input.multiple = true;
            input.onchange = (e: any) => {
              if (e.target.files) handleFilesAdded(e.target.files);
            };
            input.click();
          }}
        >
          <div className="w-14 h-14 mx-auto rounded-2xl bg-white dark:bg-[#2c2c2e] border border-black/[0.06] dark:border-white/[0.08] shadow-xs flex items-center justify-center text-[#ff3b30] mb-3">
            <FilePlus className="w-7 h-7" />
          </div>
          <h3 className="text-[16px] font-semibold text-[#1d1d1f] dark:text-[#f5f5f7]">
            Drop your PDF files here, or <span className="text-[#0071e3] dark:text-[#2997ff]">browse files</span>
          </h3>
          <p className="text-[13px] text-[#86868b] dark:text-[#8e8e93] mt-1">
            Select 2 or more PDF documents to merge together
          </p>

          <div className="mt-4 flex items-center justify-center gap-3">
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                handleLoadSamplePdfs();
              }}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white dark:bg-[#2c2c2e] border border-black/[0.08] dark:border-white/[0.08] hover:bg-black/[0.03] dark:hover:bg-white/[0.05] text-[12px] font-medium text-[#1d1d1f] dark:text-[#f5f5f7] shadow-xs transition-colors cursor-pointer"
            >
              <Sparkles className="w-3.5 h-3.5 text-[#ff9500]" />
              <span>Load 2 Sample PDFs</span>
            </button>
          </div>
        </div>

        {/* Selected Files Queue */}
        {items.length > 0 && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <h4 className="text-[15px] font-semibold text-[#1d1d1f] dark:text-[#f5f5f7]">
                  Documents to Merge ({items.length})
                </h4>
                <span className="text-[12px] text-[#86868b] dark:text-[#8e8e93]">
                  • {totalInputPages} pages total • {formatBytes(totalInputSize)}
                </span>
              </div>
              <button
                onClick={() => {
                  setItems([]);
                  setMergedResult(null);
                }}
                className="text-[12px] text-[#ff3b30] hover:underline font-medium cursor-pointer"
              >
                Clear all
              </button>
            </div>

            <div className="space-y-2 max-h-[320px] overflow-y-auto pr-1">
              {items.map((item, idx) => (
                <div
                  key={item.id}
                  className="flex items-center justify-between p-3.5 rounded-2xl bg-[#f5f5f7] dark:bg-[#252528] border border-black/[0.04] dark:border-white/[0.06] gap-3"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <span className="w-6 h-6 rounded-full bg-white dark:bg-[#2c2c2e] text-[#1d1d1f] dark:text-[#f5f5f7] text-[11px] font-semibold flex items-center justify-center shadow-2xs shrink-0">
                      {idx + 1}
                    </span>
                    <FileText className="w-4 h-4 text-[#ff3b30] shrink-0" />
                    <div className="min-w-0">
                      <p className="text-[14px] font-medium text-[#1d1d1f] dark:text-[#f5f5f7] truncate">
                        {item.name}
                      </p>
                      <p className="text-[12px] text-[#86868b] dark:text-[#8e8e93]">
                        {item.pageCount} {item.pageCount === 1 ? 'page' : 'pages'} • {formatBytes(item.size)}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5 shrink-0">
                    <button
                      disabled={idx === 0}
                      onClick={() => moveItem(idx, 'up')}
                      className="p-1.5 rounded-lg bg-white dark:bg-[#2c2c2e] hover:bg-black/[0.05] dark:hover:bg-white/[0.08] disabled:opacity-30 text-[#1d1d1f] dark:text-[#f5f5f7] shadow-2xs cursor-pointer"
                      title="Move Up"
                    >
                      <ArrowUp className="w-3.5 h-3.5" />
                    </button>
                    <button
                      disabled={idx === items.length - 1}
                      onClick={() => moveItem(idx, 'down')}
                      className="p-1.5 rounded-lg bg-white dark:bg-[#2c2c2e] hover:bg-black/[0.05] dark:hover:bg-white/[0.08] disabled:opacity-30 text-[#1d1d1f] dark:text-[#f5f5f7] shadow-2xs cursor-pointer"
                      title="Move Down"
                    >
                      <ArrowDown className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => removeItem(item.id)}
                      className="p-1.5 rounded-lg bg-white dark:bg-[#2c2c2e] hover:bg-[#ff3b30]/10 text-[#86868b] hover:text-[#ff3b30] shadow-2xs cursor-pointer"
                      title="Remove"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>

            {/* Merge options & Output name */}
            <div className="p-4 rounded-2xl bg-[#fafafc] dark:bg-[#252528] border border-black/[0.06] dark:border-white/[0.08] flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <input
                  type="checkbox"
                  id="blank-separator-toggle"
                  checked={addBlankSeparators}
                  onChange={(e) => setAddBlankSeparators(e.target.checked)}
                  className="rounded border-black/20 text-[#0071e3] focus:ring-[#0071e3] w-4 h-4 cursor-pointer"
                />
                <label htmlFor="blank-separator-toggle" className="text-[13px] text-[#1d1d1f] dark:text-[#f5f5f7] cursor-pointer">
                  Add blank separator page for 2-sided booklet printing
                </label>
              </div>

              <div className="flex items-center gap-2">
                <span className="text-[12px] text-[#86868b] dark:text-[#8e8e93]">File name:</span>
                <input
                  type="text"
                  value={mergedFileName}
                  onChange={(e) => setMergedFileName(e.target.value)}
                  className="px-2.5 py-1 rounded-lg bg-white dark:bg-[#2c2c2e] border border-black/10 dark:border-white/10 text-[13px] text-[#1d1d1f] dark:text-[#f5f5f7] focus:outline-none focus:border-[#0071e3]"
                />
              </div>
            </div>

            {/* Merge Action Button */}
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
                disabled={items.length < 2 || isProcessing}
                onClick={handleMergePdfs}
                className="w-full sm:w-auto px-8 py-3 rounded-xl bg-[#0071e3] hover:bg-[#0077ed] active:bg-[#006edb] disabled:opacity-40 text-white font-medium text-[15px] shadow-sm flex items-center justify-center gap-2 transition-all cursor-pointer"
              >
                {isProcessing ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>Merging PDFs...</span>
                  </>
                ) : (
                  <>
                    <Layers className="w-4 h-4" />
                    <span>Merge {items.length} PDFs</span>
                  </>
                )}
              </button>
            </div>
          </div>
        )}

        {/* Merge Result & Download View */}
        {mergedResult && (
          <div className="p-6 rounded-[20px] bg-[#34c759]/10 dark:bg-[#34c759]/15 border border-[#34c759]/20 text-center space-y-4 animate-in zoom-in-95 duration-150">
            <div className="w-12 h-12 rounded-full bg-[#34c759] text-white mx-auto flex items-center justify-center shadow-md">
              <CheckCircle2 className="w-6 h-6" />
            </div>
            <div>
              <h4 className="text-[18px] font-bold text-[#1d1d1f] dark:text-[#f5f5f7]">PDFs Merged Successfully!</h4>
              <p className="text-[13px] text-[#6e6e73] dark:text-[#8e8e93] mt-1">
                Unified into <strong>{mergedResult.totalPages} pages</strong> ({formatBytes(mergedResult.size)})
              </p>
            </div>

            <div className="flex items-center justify-center gap-3 pt-2">
              <button
                type="button"
                onClick={handleDownload}
                className="px-6 py-2.5 rounded-xl bg-[#34c759] hover:bg-[#2fb350] text-white text-[14px] font-semibold shadow-xs flex items-center gap-2 cursor-pointer"
              >
                <Download className="w-4 h-4" />
                <span>Download Merged PDF</span>
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
