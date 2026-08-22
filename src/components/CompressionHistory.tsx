import React from 'react';
import { Download, Trash2, FileText, Image as ImageIcon, Film, FileCode } from 'lucide-react';
import { CompressionResult } from '../types';
import { formatBytes, downloadBlob } from '../utils/formatters';

interface CompressionHistoryProps {
  history: CompressionResult[];
  onClearHistory: () => void;
  onSelectResult: (result: CompressionResult) => void;
}

export const CompressionHistory: React.FC<CompressionHistoryProps> = ({
  history,
  onClearHistory,
  onSelectResult,
}) => {
  if (history.length === 0) return null;

  const totalSavedBytes = history.reduce((acc, item) => acc + item.savedBytes, 0);

  const getIcon = (category: string) => {
    switch (category) {
      case 'pdf':
        return <FileText className="w-4 h-4 text-[#ff3b30]" />;
      case 'image':
        return <ImageIcon className="w-4 h-4 text-[#34c759]" />;
      case 'video':
        return <Film className="w-4 h-4 text-[#0071e3]" />;
      default:
        return <FileCode className="w-4 h-4 text-[#86868b]" />;
    }
  };

  return (
    <div
      id="session-history-container"
      className="w-full max-w-3xl mx-auto mt-8 rounded-[24px] bg-white dark:bg-[#1c1c1e] border border-black/[0.08] dark:border-white/[0.08] shadow-[0_2px_12px_rgba(0,0,0,0.03)] p-5 sm:p-6 transition-colors"
    >
      <div className="flex items-center justify-between pb-3.5 border-b border-black/[0.06] dark:border-white/[0.08] mb-3">
        <div className="flex items-center gap-2.5">
          <h3 className="text-[14px] font-semibold text-[#1d1d1f] dark:text-[#f5f5f7]">
            Recent Compressions
          </h3>
          <span className="text-[11px] font-medium px-2 py-0.5 rounded-full bg-[#34c759]/10 dark:bg-[#34c759]/20 text-[#34c759]">
            Saved {formatBytes(totalSavedBytes)}
          </span>
        </div>
        <button
          onClick={onClearHistory}
          className="text-[12px] text-[#86868b] dark:text-[#8e8e93] hover:text-[#ff3b30] dark:hover:text-[#ff453a] transition-colors flex items-center gap-1 font-medium cursor-pointer"
        >
          <Trash2 className="w-3.5 h-3.5" />
          <span>Clear</span>
        </button>
      </div>

      <div className="divide-y divide-black/[0.04] dark:divide-white/[0.04] max-h-56 overflow-y-auto">
        {history.map((item) => (
          <div
            key={item.id}
            className="py-2.5 flex items-center justify-between gap-3 group hover:bg-[#fafafc] dark:hover:bg-[#252528] px-2 rounded-xl transition-colors"
          >
            <div
              className="flex items-center gap-3 min-w-0 flex-1 cursor-pointer"
              onClick={() => onSelectResult(item)}
            >
              <div className="w-8 h-8 rounded-lg bg-[#f5f5f7] dark:bg-[#2c2c2e] border border-black/[0.06] dark:border-white/[0.08] flex items-center justify-center shrink-0">
                {getIcon(item.originalFile.category)}
              </div>
              <div className="min-w-0">
                <p className="text-[13px] font-medium text-[#1d1d1f] dark:text-[#f5f5f7] truncate group-hover:text-[#0071e3] dark:group-hover:text-[#2997ff]">
                  {item.compressedName}
                </p>
                <p className="text-[11px] text-[#86868b] dark:text-[#8e8e93]">
                  {formatBytes(item.originalFile.size)} → <span className="text-[#34c759] font-medium">{formatBytes(item.compressedSize)} (-{item.savedPercentage}%)</span>
                </p>
              </div>
            </div>

            <button
              onClick={() => downloadBlob(item.compressedBlob, item.compressedName)}
              className="p-1.5 rounded-lg text-[#6e6e73] dark:text-[#a1a1a6] hover:text-[#0071e3] dark:hover:text-[#2997ff] hover:bg-[#f0f6ff] dark:hover:bg-[#2997ff]/20 transition-colors cursor-pointer"
              title="Save to Device"
            >
              <Download className="w-4 h-4" />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
};

