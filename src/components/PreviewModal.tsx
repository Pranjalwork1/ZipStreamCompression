import React, { useState } from 'react';
import { X, ArrowRight, Download, Sparkles, Sliders } from 'lucide-react';
import { CompressibleFile } from '../types';
import { formatBytes } from '../utils/formatters';

interface PreviewModalProps {
  item: CompressibleFile | null;
  onClose: () => void;
  onDownload: (item: CompressibleFile) => void;
}

export const PreviewModal: React.FC<PreviewModalProps> = ({ item, onClose, onDownload }) => {
  const [sliderPosition, setSliderPosition] = useState(50);
  const [viewMode, setViewMode] = useState<'split' | 'side-by-side'>('split');

  if (!item) return null;

  const originalUrl = item.previewUrl;
  const compressedUrl = item.compressedUrl || item.previewUrl;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-md animate-fade-in">
      <div className="relative w-full max-w-4xl max-h-[90vh] flex flex-col rounded-3xl border border-black/[0.08] dark:border-white/[0.1] bg-white dark:bg-zinc-900 shadow-2xl overflow-hidden">
        {/* Modal Header */}
        <div className="p-4 sm:p-6 border-b border-black/[0.06] dark:border-white/[0.08] flex items-center justify-between">
          <div>
            <h3 className="font-bold text-base sm:text-lg text-zinc-900 dark:text-zinc-50 truncate max-w-sm sm:max-w-md">
              {item.name}
            </h3>
            <div className="flex items-center gap-3 text-xs mt-1">
              <span className="text-zinc-500">Original: {formatBytes(item.originalSize)}</span>
              {item.compressedSize && (
                <>
                  <ArrowRight className="w-3 h-3 text-zinc-400" />
                  <span className="font-semibold text-emerald-600 dark:text-emerald-400">
                    Compressed: {formatBytes(item.compressedSize)}
                  </span>
                  <span className="px-2 py-0.5 rounded-full font-bold bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300">
                    -{item.savingsPercent}%
                  </span>
                </>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* View Mode Toggle */}
            <div className="flex rounded-xl bg-zinc-100 dark:bg-zinc-800 p-1 text-xs">
              <button
                onClick={() => setViewMode('split')}
                className={`px-3 py-1 rounded-lg font-medium transition ${
                  viewMode === 'split'
                    ? 'bg-white dark:bg-zinc-700 text-blue-600 dark:text-blue-400 shadow-xs'
                    : 'text-zinc-500 hover:text-zinc-900 dark:hover:text-white'
                }`}
              >
                Split Slider
              </button>
              <button
                onClick={() => setViewMode('side-by-side')}
                className={`px-3 py-1 rounded-lg font-medium transition ${
                  viewMode === 'side-by-side'
                    ? 'bg-white dark:bg-zinc-700 text-blue-600 dark:text-blue-400 shadow-xs'
                    : 'text-zinc-500 hover:text-zinc-900 dark:hover:text-white'
                }`}
              >
                Side by Side
              </button>
            </div>

            <button
              onClick={onClose}
              className="p-2 rounded-full text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Modal Body: Comparison */}
        <div className="flex-1 overflow-auto p-4 sm:p-6 flex items-center justify-center bg-zinc-100 dark:bg-zinc-950/50 min-h-[350px]">
          {viewMode === 'split' ? (
            <div className="relative max-h-[60vh] max-w-full rounded-2xl overflow-hidden shadow-lg border border-black/[0.08] dark:border-white/[0.08] select-none">
              {/* Compressed Image (Background) */}
              <img
                src={compressedUrl}
                alt="Compressed"
                className="max-h-[60vh] object-contain block"
              />
              <div className="absolute top-3 right-3 px-2 py-1 rounded-md bg-black/60 backdrop-blur-md text-[10px] font-bold text-white uppercase tracking-wider">
                Compressed
              </div>

              {/* Original Image (Clipped Overlay) */}
              <div
                className="absolute inset-0 overflow-hidden"
                style={{ width: `${sliderPosition}%` }}
              >
                <img
                  src={originalUrl}
                  alt="Original"
                  className="max-h-[60vh] object-contain block max-w-none"
                />
                <div className="absolute top-3 left-3 px-2 py-1 rounded-md bg-black/60 backdrop-blur-md text-[10px] font-bold text-white uppercase tracking-wider">
                  Original
                </div>
              </div>

              {/* Slider Divider Bar */}
              <div
                className="absolute top-0 bottom-0 w-0.5 bg-white shadow-xl pointer-events-none"
                style={{ left: `${sliderPosition}%` }}
              >
                <div className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-7 h-7 rounded-full bg-white text-zinc-800 shadow-xl flex items-center justify-center border border-zinc-200">
                  <Sliders className="w-3.5 h-3.5 rotate-90" />
                </div>
              </div>

              {/* Interactive Range Input overlay */}
              <input
                type="range"
                min="0"
                max="100"
                value={sliderPosition}
                onChange={(e) => setSliderPosition(Number(e.target.value))}
                className="absolute inset-0 opacity-0 cursor-ew-resize w-full h-full"
              />
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 w-full h-full max-h-[60vh]">
              {/* Original Card */}
              <div className="flex flex-col items-center justify-center rounded-2xl bg-white dark:bg-zinc-900 border border-black/[0.06] dark:border-white/[0.08] p-3">
                <span className="text-xs font-semibold text-zinc-500 mb-2">Original</span>
                <img
                  src={originalUrl}
                  alt="Original"
                  className="max-h-[40vh] object-contain rounded-lg"
                />
              </div>

              {/* Compressed Card */}
              <div className="flex flex-col items-center justify-center rounded-2xl bg-white dark:bg-zinc-900 border border-black/[0.06] dark:border-white/[0.08] p-3">
                <span className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 mb-2">
                  Compressed ({item.savingsPercent}% saved)
                </span>
                <img
                  src={compressedUrl}
                  alt="Compressed"
                  className="max-h-[40vh] object-contain rounded-lg"
                />
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="p-4 sm:p-6 border-t border-black/[0.06] dark:border-white/[0.08] flex items-center justify-between">
          <span className="text-xs text-zinc-500">
            {viewMode === 'split' ? 'Drag slider left/right to compare pixel clarity.' : 'Side-by-side visual inspection.'}
          </span>
          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-xs font-medium text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition"
            >
              Close
            </button>
            {item.status === 'completed' && (
              <button
                onClick={() => onDownload(item)}
                className="flex items-center gap-1.5 px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-medium text-xs shadow-md shadow-blue-500/20 transition"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Save Compressed File</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
