import React from 'react';
import { CompressibleFile } from '../types';
import { FileCard } from './FileCard';
import { Layers, Trash2, Zap } from 'lucide-react';

interface FileListProps {
  files: CompressibleFile[];
  onRemove: (id: string) => void;
  onClearAll: () => void;
  onDownload: (item: CompressibleFile) => void;
  onPreview: (item: CompressibleFile) => void;
  onOpenSettings: (item: CompressibleFile) => void;
}

export const FileList: React.FC<FileListProps> = ({
  files,
  onRemove,
  onClearAll,
  onDownload,
  onPreview,
  onOpenSettings,
}) => {
  if (files.length === 0) return null;

  return (
    <div className="w-full space-y-4">
      {/* List Header */}
      <div className="flex items-center justify-between px-1">
        <div className="flex items-center gap-2">
          <Layers className="w-4 h-4 text-zinc-500" />
          <h3 className="font-semibold text-sm text-zinc-900 dark:text-zinc-100">
            Queue ({files.length} {files.length === 1 ? 'file' : 'files'})
          </h3>
        </div>

        <button
          onClick={onClearAll}
          className="flex items-center gap-1 text-xs font-medium text-zinc-500 hover:text-rose-500 dark:text-zinc-400 dark:hover:text-rose-400 transition"
        >
          <Trash2 className="w-3.5 h-3.5" />
          <span>Clear all</span>
        </button>
      </div>

      {/* Grid of File Cards */}
      <div className="space-y-3">
        {files.map((item) => (
          <FileCard
            key={item.id}
            item={item}
            onRemove={onRemove}
            onDownload={onDownload}
            onPreview={onPreview}
            onOpenSettings={onOpenSettings}
          />
        ))}
      </div>
    </div>
  );
};
