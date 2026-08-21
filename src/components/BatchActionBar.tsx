import React from 'react';
import { Download, Zap, RefreshCw, Archive, Sparkles, CheckCircle2 } from 'lucide-react';
import { CompressibleFile } from '../types';
import { formatBytes } from '../utils/formatters';

interface BatchActionBarProps {
  files: CompressibleFile[];
  isProcessing: boolean;
  onCompressAll: () => void;
  onDownloadAllZip: () => void;
  totalSavedBytes: number;
}

export const BatchActionBar: React.FC<BatchActionBarProps> = ({
  files,
  isProcessing,
  onCompressAll,
  onDownloadAllZip,
  totalSavedBytes,
}) => {
  if (files.length === 0) return null;

  const completedCount = files.filter((f) => f.status === 'completed').length;
  const pendingCount = files.filter((f) => f.status === 'pending' || f.status === 'failed').length;
  const allCompleted = files.length > 0 && completedCount === files.length;

  const totalOriginalSize = files.reduce((acc, f) => acc + f.originalSize, 0);
  const totalCompressedSize = files.reduce((acc, f) => acc + (f.compressedSize ?? f.originalSize), 0);
  const overallSavingsPercent =
    totalOriginalSize > 0 && totalSavedBytes > 0
      ? Math.round((totalSavedBytes / totalOriginalSize) * 100)
      : 0;

  return (
    <div className="sticky bottom-6 z-20 w-full max-w-4xl mx-auto px-4">
      <div className="rounded-3xl border border-black/[0.08] dark:border-white/[0.1] bg-white/80 dark:bg-zinc-900/80 backdrop-blur-2xl p-4 sm:p-5 shadow-2xl shadow-black/10 dark:shadow-black/40 flex flex-col sm:flex-row items-center justify-between gap-4">
        {/* Left: Summary Stats */}
        <div className="flex items-center gap-4 w-full sm:w-auto justify-between sm:justify-start">
          <div>
            <div className="flex items-center gap-2">
              <span className="font-bold text-base sm:text-lg text-zinc-900 dark:text-zinc-50">
                {formatBytes(totalCompressedSize)}
              </span>
              <span className="text-xs text-zinc-400 line-through">
                {formatBytes(totalOriginalSize)}
              </span>
              {overallSavingsPercent > 0 && (
                <span className="inline-flex items-center gap-0.5 px-2 py-0.5 rounded-full text-xs font-bold bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300">
                  <Sparkles className="w-3 h-3" />
                  -{overallSavingsPercent}%
                </span>
              )}
            </div>
            <p className="text-xs text-zinc-500 dark:text-zinc-400">
              {completedCount} of {files.length} compressed (Saved {formatBytes(totalSavedBytes)})
            </p>
          </div>
        </div>

        {/* Right: Action Buttons */}
        <div className="flex items-center gap-3 w-full sm:w-auto justify-end">
          {pendingCount > 0 && (
            <button
              onClick={onCompressAll}
              disabled={isProcessing}
              className="flex-1 sm:flex-initial flex items-center justify-center gap-2 px-5 py-2.5 rounded-2xl bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-medium text-sm shadow-md shadow-blue-500/25 transition"
            >
              {isProcessing ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span>Compressing...</span>
                </>
              ) : (
                <>
                  <Zap className="w-4 h-4" />
                  <span>Compress All</span>
                </>
              )}
            </button>
          )}

          {completedCount > 0 && (
            <button
              onClick={onDownloadAllZip}
              className="flex-1 sm:flex-initial flex items-center justify-center gap-2 px-5 py-2.5 rounded-2xl bg-zinc-900 hover:bg-black dark:bg-zinc-100 dark:hover:bg-white text-white dark:text-zinc-900 font-medium text-sm shadow-md transition"
            >
              <Archive className="w-4 h-4" />
              <span>Download ZIP ({completedCount})</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
