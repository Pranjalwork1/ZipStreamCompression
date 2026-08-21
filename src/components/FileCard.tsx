import React from 'react';
import {
  Image as ImageIcon,
  FileText,
  Music,
  Video,
  FileArchive,
  File as FileGenericIcon,
  Download,
  Trash2,
  Eye,
  Settings2,
  CheckCircle2,
  AlertCircle,
  Loader2,
  ArrowRight,
  Sparkles,
} from 'lucide-react';
import { CompressibleFile } from '../types';
import { formatBytes } from '../utils/formatters';

interface FileCardProps {
  item: CompressibleFile;
  onRemove: (id: string) => void;
  onDownload: (item: CompressibleFile) => void;
  onPreview: (item: CompressibleFile) => void;
  onOpenSettings: (item: CompressibleFile) => void;
}

export const FileCard: React.FC<FileCardProps> = ({
  item,
  onRemove,
  onDownload,
  onPreview,
  onOpenSettings,
}) => {
  const getCategoryIcon = () => {
    switch (item.category) {
      case 'image':
        return <ImageIcon className="w-5 h-5 text-purple-500" />;
      case 'pdf':
        return <FileText className="w-5 h-5 text-rose-500" />;
      case 'audio':
        return <Music className="w-5 h-5 text-emerald-500" />;
      case 'video':
        return <Video className="w-5 h-5 text-amber-500" />;
      case 'archive':
        return <FileArchive className="w-5 h-5 text-blue-500" />;
      default:
        return <FileGenericIcon className="w-5 h-5 text-zinc-500" />;
    }
  };

  const isCompleted = item.status === 'completed';
  const isCompressing = item.status === 'compressing';
  const isFailed = item.status === 'failed';

  return (
    <div className="group relative overflow-hidden rounded-2xl border border-black/[0.06] dark:border-white/[0.08] bg-white/70 dark:bg-zinc-900/70 backdrop-blur-xl p-4 shadow-sm hover:shadow-md transition-all">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        {/* Left: Icon & File Meta */}
        <div className="flex items-center gap-3.5 min-w-0 flex-1">
          {/* Thumbnail / Category Icon */}
          <div className="relative w-12 h-12 rounded-xl bg-zinc-100 dark:bg-zinc-800 border border-black/[0.04] dark:border-white/[0.06] flex items-center justify-center shrink-0 overflow-hidden">
            {item.previewUrl && item.category === 'image' ? (
              <img
                src={item.previewUrl}
                alt={item.name}
                className="w-full h-full object-cover"
              />
            ) : (
              getCategoryIcon()
            )}
          </div>

          {/* Name & Details */}
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <h4 className="font-semibold text-sm text-zinc-900 dark:text-zinc-100 truncate max-w-xs sm:max-w-md">
                {item.name}
              </h4>
              <span className="text-[10px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 border border-black/[0.04] dark:border-white/[0.06]">
                {item.category}
              </span>
            </div>

            {/* Size & Savings Information */}
            <div className="flex items-center gap-2 mt-1 text-xs">
              <span className="text-zinc-500 dark:text-zinc-400 font-medium">
                {formatBytes(item.originalSize)}
              </span>

              {isCompleted && item.compressedSize !== undefined && (
                <>
                  <ArrowRight className="w-3 h-3 text-zinc-400" />
                  <span className="font-semibold text-emerald-600 dark:text-emerald-400">
                    {formatBytes(item.compressedSize)}
                  </span>
                  <span className="inline-flex items-center gap-0.5 px-2 py-0.5 rounded-full text-[11px] font-bold bg-emerald-100 dark:bg-emerald-950/70 text-emerald-700 dark:text-emerald-300">
                    <Sparkles className="w-2.5 h-2.5" />
                    -{item.savingsPercent ?? 0}%
                  </span>
                </>
              )}

              {isFailed && (
                <span className="text-rose-500 font-medium flex items-center gap-1">
                  <AlertCircle className="w-3 h-3" />
                  {item.error || 'Compression failed'}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Right: Actions & Status */}
        <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
          {/* Progress bar or State indicator */}
          {isCompressing && (
            <div className="flex items-center gap-2 text-xs font-medium text-blue-600 dark:text-blue-400">
              <Loader2 className="w-4 h-4 animate-spin" />
              <span>{item.progress}%</span>
            </div>
          )}

          {/* Quick Preview Button (For images) */}
          {item.category === 'image' && (
            <button
              onClick={() => onPreview(item)}
              aria-label="Preview image"
              className="p-2 rounded-xl text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white hover:bg-zinc-100 dark:hover:bg-zinc-800 transition"
              title="Preview / Compare"
            >
              <Eye className="w-4 h-4" />
            </button>
          )}

          {/* Settings / Compression Option Button */}
          <button
            onClick={() => onOpenSettings(item)}
            aria-label="Customize settings"
            className="p-2 rounded-xl text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white hover:bg-zinc-100 dark:hover:bg-zinc-800 transition"
            title="Adjust Quality & Scale"
          >
            <Settings2 className="w-4 h-4" />
          </button>

          {/* Download Button (If completed) */}
          {isCompleted && (
            <button
              onClick={() => onDownload(item)}
              aria-label="Download compressed file"
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-medium text-xs shadow-sm shadow-blue-500/20 transition"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Save</span>
            </button>
          )}

          {/* Remove Button */}
          <button
            onClick={() => onRemove(item.id)}
            aria-label="Remove file"
            className="p-2 rounded-xl text-zinc-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/30 transition"
            title="Remove from queue"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Embedded Progress Bar */}
      {isCompressing && (
        <div className="absolute bottom-0 left-0 right-0 h-1 bg-blue-100 dark:bg-blue-950 overflow-hidden">
          <div
            className="h-full bg-blue-600 transition-all duration-200"
            style={{ width: `${item.progress}%` }}
          />
        </div>
      )}
    </div>
  );
};
