import React, { useState, useEffect } from 'react';
import {
  Archive,
  Download,
  Check,
  RotateCcw,
  Loader2,
  FileText,
  Image as ImageIcon,
  Film,
  Music,
  FileCode,
  Plus,
  Play,
} from 'lucide-react';
import { BatchItem, CompressionSettings } from '../types';
import { formatBytes, downloadBlob, downloadBatchZip } from '../utils/formatters';
import { processCompression } from '../utils/compressionEngine';

interface BatchProcessingViewProps {
  initialItems: BatchItem[];
  settings: CompressionSettings;
  onReset: () => void;
  onAddMoreFiles: (files: FileList | File[]) => void;
}

export const BatchProcessingView: React.FC<BatchProcessingViewProps> = ({
  initialItems,
  settings,
  onReset,
  onAddMoreFiles,
}) => {
  const [items, setItems] = useState<BatchItem[]>(initialItems);
  const [isProcessingAll, setIsProcessingAll] = useState(false);
  const [isZipping, setIsZipping] = useState(false);
  const [downloadedZip, setDownloadedZip] = useState(false);
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  useEffect(() => {
    setItems(initialItems);
  }, [initialItems]);

  const getFileIcon = (category: string) => {
    switch (category) {
      case 'pdf':
        return <FileText className="w-5 h-5 text-[#ff3b30]" />;
      case 'image':
        return <ImageIcon className="w-5 h-5 text-[#34c759]" />;
      case 'video':
        return <Film className="w-5 h-5 text-[#0071e3]" />;
      case 'audio':
        return <Music className="w-5 h-5 text-[#af52de]" />;
      default:
        return <FileCode className="w-5 h-5 text-[#86868b]" />;
    }
  };

  const handleStartBatch = async () => {
    setIsProcessingAll(true);

    for (let i = 0; i < items.length; i++) {
      const currentItem = items[i];
      if (currentItem.status === 'completed') continue;

      // Set status to compressing
      setItems((prev) =>
        prev.map((item, idx) =>
          idx === i ? { ...item, status: 'compressing', progress: 0 } : item
        )
      );

      try {
        const result = await processCompression(
          currentItem.fileInfo,
          settings,
          (prog) => {
            setItems((prev) =>
              prev.map((item, idx) =>
                idx === i ? { ...item, progress: prog.percentage } : item
              )
            );
          }
        );

        setItems((prev) =>
          prev.map((item, idx) =>
            idx === i
              ? {
                  ...item,
                  status: 'completed',
                  progress: 100,
                  result,
                }
              : item
          )
        );
      } catch (err) {
        console.error('Batch item error:', err);
        setItems((prev) =>
          prev.map((item, idx) =>
            idx === i ? { ...item, status: 'error', progress: 0 } : item
          )
        );
      }
    }

    setIsProcessingAll(false);
  };

  const handleDownloadSingle = (item: BatchItem) => {
    if (item.result) {
      downloadBlob(item.result.compressedBlob, item.result.compressedName);
    }
  };

  const handleDownloadAllZip = async () => {
    setIsZipping(true);
    try {
      await downloadBatchZip(items, `compressed_files_${Date.now()}.zip`);
      setDownloadedZip(true);
      setTimeout(() => setDownloadedZip(false), 3000);
    } catch (err) {
      console.error('ZIP creation failed:', err);
    } finally {
      setIsZipping(false);
    }
  };

  const completedCount = items.filter((i) => i.status === 'completed').length;
  const totalOriginalBytes = items.reduce((acc, curr) => acc + curr.fileInfo.size, 0);
  const totalCompressedBytes = items.reduce((acc, curr) => {
    return acc + (curr.result ? curr.result.compressedSize : curr.fileInfo.size);
  }, 0);
  const totalSavedBytes = Math.max(0, totalOriginalBytes - totalCompressedBytes);
  const totalReductionPct = totalOriginalBytes > 0
    ? Math.round((totalSavedBytes / totalOriginalBytes) * 100)
    : 0;

  return (
    <div
      id="batch-processing-view"
      className="w-full max-w-4xl mx-auto rounded-[28px] bg-white dark:bg-[#1c1c1e] border border-black/[0.08] dark:border-white/[0.08] shadow-[0_4px_24px_rgba(0,0,0,0.06)] overflow-hidden animate-in fade-in duration-200 transition-colors"
    >
      {/* Header Bar */}
      <div className="p-6 sm:p-7 bg-[#fafafc] dark:bg-[#252528] border-b border-black/[0.06] dark:border-white/[0.08] flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <h2 className="text-[20px] font-semibold text-[#1d1d1f] dark:text-[#f5f5f7]">
              Batch Compression Queue
            </h2>
            <span className="px-2.5 py-0.5 rounded-full bg-[#0071e3]/10 dark:bg-[#2997ff]/20 text-[#0071e3] dark:text-[#2997ff] font-semibold text-[12px]">
              {items.length} Files
            </span>
          </div>
          <p className="text-[13px] text-[#86868b] dark:text-[#8e8e93] mt-0.5">
            Compress multiple documents, photos, videos, and audio in one batch.
          </p>
        </div>

        <div className="flex items-center gap-2 self-end sm:self-center">
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="px-3.5 py-2 rounded-full bg-white dark:bg-[#2c2c2e] hover:bg-[#f5f5f7] dark:hover:bg-[#3a3a3c] text-[#1d1d1f] dark:text-[#f5f5f7] text-[13px] font-medium border border-black/[0.08] dark:border-white/[0.08] shadow-xs flex items-center gap-1.5 transition-colors cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5 text-[#0071e3] dark:text-[#2997ff]" />
            <span>Add Files</span>
          </button>
          <button
            type="button"
            onClick={onReset}
            className="px-3.5 py-2 rounded-full bg-white dark:bg-[#2c2c2e] hover:bg-[#f5f5f7] dark:hover:bg-[#3a3a3c] text-[#1d1d1f] dark:text-[#f5f5f7] text-[13px] font-medium border border-black/[0.08] dark:border-white/[0.08] shadow-xs flex items-center gap-1.5 transition-colors cursor-pointer"
          >
            <RotateCcw className="w-3.5 h-3.5 text-[#86868b] dark:text-[#8e8e93]" />
            <span>Clear</span>
          </button>
          <input
            ref={fileInputRef}
            type="file"
            multiple
            className="hidden"
            onChange={(e) => {
              if (e.target.files && e.target.files.length > 0) {
                onAddMoreFiles(e.target.files);
              }
              if (e.target) e.target.value = '';
            }}
          />
        </div>
      </div>

      {/* Overview Stats (if completed items exist) */}
      {completedCount > 0 && (
        <div className="px-6 py-4 bg-[#f0f6ff]/60 dark:bg-[#182635]/80 border-b border-[#0071e3]/10 dark:border-[#2997ff]/20 flex flex-wrap items-center justify-between gap-3 text-[13px]">
          <div className="flex items-center gap-3">
            <span className="font-semibold text-[#0071e3] dark:text-[#2997ff]">
              {completedCount} / {items.length} Processed
            </span>
            <span className="text-black/20 dark:text-white/20">•</span>
            <span className="text-[#1d1d1f] dark:text-[#f5f5f7]">
              Saved <strong className="text-[#34c759]">{formatBytes(totalSavedBytes)}</strong> ({totalReductionPct}% reduction)
            </span>
          </div>
          {completedCount === items.length && (
            <button
              type="button"
              id="download-all-zip-btn"
              onClick={handleDownloadAllZip}
              disabled={isZipping}
              className="px-4 py-1.5 rounded-full bg-[#0071e3] hover:bg-[#0077ed] text-white text-[13px] font-medium shadow-xs flex items-center gap-1.5 transition-all cursor-pointer"
            >
              {isZipping ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>Packaging ZIP…</span>
                </>
              ) : downloadedZip ? (
                <>
                  <Check className="w-3.5 h-3.5" />
                  <span>Downloaded ZIP</span>
                </>
              ) : (
                <>
                  <Archive className="w-3.5 h-3.5" />
                  <span>Download All as ZIP</span>
                </>
              )}
            </button>
          )}
        </div>
      )}

      {/* Items List */}
      <div className="divide-y divide-black/[0.06] dark:divide-white/[0.06] max-h-[420px] overflow-y-auto">
        {items.map((item) => (
          <div
            key={item.id}
            className="p-4 sm:p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 hover:bg-[#fafafc] dark:hover:bg-[#252528] transition-colors"
          >
            {/* File Info */}
            <div className="flex items-center gap-3.5 min-w-0 flex-1">
              <div className="w-10 h-10 rounded-xl bg-[#f5f5f7] dark:bg-[#2c2c2e] border border-black/[0.04] dark:border-white/[0.06] flex items-center justify-center shrink-0">
                {getFileIcon(item.fileInfo.category)}
              </div>
              <div className="min-w-0 flex-1">
                <h4 className="text-[14px] font-medium text-[#1d1d1f] dark:text-[#f5f5f7] truncate">
                  {item.fileInfo.name}
                </h4>
                <div className="flex items-center gap-2 text-[12px] text-[#86868b] dark:text-[#8e8e93] mt-0.5">
                  <span>{formatBytes(item.fileInfo.size)}</span>
                  {item.result && (
                    <>
                      <span>→</span>
                      <span className="font-semibold text-[#0071e3] dark:text-[#2997ff]">
                        {formatBytes(item.result.compressedSize)}
                      </span>
                      <span className="px-1.5 py-0.2 rounded bg-[#34c759]/10 dark:bg-[#34c759]/20 text-[#34c759] font-medium text-[11px]">
                        -{item.result.savedPercentage}%
                      </span>
                    </>
                  )}
                </div>

                {/* Progress bar when compressing */}
                {item.status === 'compressing' && (
                  <div className="w-full bg-[#e5e5ea] dark:bg-[#2c2c2e] h-1.5 rounded-full mt-2 overflow-hidden">
                    <div
                      className="bg-[#0071e3] dark:bg-[#2997ff] h-full transition-all duration-100 rounded-full"
                      style={{ width: `${item.progress}%` }}
                    />
                  </div>
                )}
              </div>
            </div>

            {/* Status & Actions */}
            <div className="flex items-center gap-2 self-end sm:self-center shrink-0">
              {item.status === 'pending' && (
                <span className="text-[12px] text-[#86868b] dark:text-[#8e8e93] px-2.5 py-1 rounded-full bg-black/[0.04] dark:bg-white/[0.08]">
                  Queued
                </span>
              )}
              {item.status === 'compressing' && (
                <span className="text-[12px] text-[#0071e3] dark:text-[#2997ff] font-medium flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-[#0071e3]/10 dark:bg-[#2997ff]/20">
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>{item.progress}%</span>
                </span>
              )}
              {item.status === 'completed' && (
                <div className="flex items-center gap-2">
                  <span className="text-[12px] text-[#34c759] font-medium flex items-center gap-1">
                    <Check className="w-3.5 h-3.5" />
                    <span>Done</span>
                  </span>
                  <button
                    type="button"
                    onClick={() => handleDownloadSingle(item)}
                    className="p-1.5 rounded-lg bg-black/[0.04] dark:bg-white/[0.08] hover:bg-black/[0.08] dark:hover:bg-white/[0.12] text-[#1d1d1f] dark:text-[#f5f5f7] transition-colors cursor-pointer"
                    title="Download this file"
                  >
                    <Download className="w-4 h-4" />
                  </button>
                </div>
              )}
              {item.status === 'error' && (
                <span className="text-[12px] text-[#ff3b30] font-medium">Failed</span>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Footer Actions */}
      <div className="p-6 bg-[#fafafc] dark:bg-[#252528] border-t border-black/[0.06] dark:border-white/[0.08] flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="text-[13px] text-[#86868b] dark:text-[#8e8e93]">
          Compression level: <strong className="text-[#1d1d1f] dark:text-[#f5f5f7] capitalize">{settings.level}</strong>
        </div>

        <div className="flex items-center gap-3 w-full sm:w-auto">
          {completedCount < items.length && (
            <button
              type="button"
              id="start-batch-compression-btn"
              onClick={handleStartBatch}
              disabled={isProcessingAll}
              className="w-full sm:w-auto px-8 py-3 rounded-full bg-[#0071e3] hover:bg-[#0077ed] active:bg-[#0062c4] text-white font-medium text-[14px] shadow-sm transition-all flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer"
            >
              {isProcessingAll ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Compressing Batch…</span>
                </>
              ) : (
                <>
                  <Play className="w-4 h-4 fill-white" />
                  <span>Compress All ({items.length} files)</span>
                </>
              )}
            </button>
          )}

          {completedCount === items.length && (
            <button
              type="button"
              id="batch-download-zip-bottom-btn"
              onClick={handleDownloadAllZip}
              disabled={isZipping}
              className="w-full sm:w-auto px-8 py-3 rounded-full bg-[#0071e3] hover:bg-[#0077ed] text-white font-medium text-[14px] shadow-sm transition-all flex items-center justify-center gap-2 cursor-pointer"
            >
              {isZipping ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Packaging ZIP…</span>
                </>
              ) : (
                <>
                  <Archive className="w-4 h-4" />
                  <span>Download All as ZIP ({formatBytes(totalCompressedBytes)})</span>
                </>
              )}
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
