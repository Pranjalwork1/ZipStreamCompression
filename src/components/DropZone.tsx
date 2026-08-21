import React, { useRef, useState } from 'react';
import { UploadCloud, Image, FileText, Music, Video, Zap, Check, Sliders, Sparkles } from 'lucide-react';
import { CompressionPreset } from '../types';

interface DropZoneProps {
  onFilesSelected: (files: FileList | File[]) => void;
  selectedPreset: CompressionPreset;
  onPresetChange: (preset: CompressionPreset) => void;
}

export const DropZone: React.FC<DropZoneProps> = ({
  onFilesSelected,
  selectedPreset,
  onPresetChange,
}) => {
  const [isDragOver, setIsDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleDragEnter = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      onFilesSelected(e.dataTransfer.files);
    }
  };

  const handleClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      onFilesSelected(e.target.files);
      e.target.value = '';
    }
  };

  const presets: { id: CompressionPreset; label: string; desc: string; icon: any }[] = [
    {
      id: 'balanced',
      label: 'Balanced',
      desc: 'Optimal 70% quality, fast compression',
      icon: Zap,
    },
    {
      id: 'maximum',
      label: 'Max Savings',
      desc: 'Aggressive compression (smaller file)',
      icon: Sparkles,
    },
    {
      id: 'high_quality',
      label: 'Lossless / HQ',
      desc: 'Visual preservation (90% quality)',
      icon: Sliders,
    },
    {
      id: 'email',
      label: 'Email Friendly',
      desc: 'Scaled to fit under 25MB limits',
      icon: Check,
    },
  ];

  return (
    <div className="w-full space-y-4">
      {/* Preset Selector Bar */}
      <div className="flex flex-wrap items-center justify-between gap-2 p-1.5 rounded-2xl bg-zinc-200/60 dark:bg-zinc-800/60 backdrop-blur-md border border-black/[0.04] dark:border-white/[0.04]">
        <span className="text-xs font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400 pl-3 hidden sm:inline">
          Preset Mode:
        </span>
        <div className="flex flex-wrap gap-1.5 flex-1 sm:flex-initial">
          {presets.map((p) => {
            const Icon = p.icon;
            const active = selectedPreset === p.id;
            return (
              <button
                key={p.id}
                onClick={() => onPresetChange(p.id)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium transition-all ${
                  active
                    ? 'bg-white dark:bg-zinc-700 text-blue-600 dark:text-blue-400 shadow-sm'
                    : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white'
                }`}
                title={p.desc}
              >
                <Icon className={`w-3.5 h-3.5 ${active ? 'text-blue-500' : 'text-zinc-400'}`} />
                <span>{p.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Main Drag-Drop Target */}
      <div
        onDragEnter={handleDragEnter}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={handleClick}
        className={`relative group cursor-pointer overflow-hidden rounded-3xl border-2 border-dashed transition-all duration-300 ${
          isDragOver
            ? 'border-blue-500 bg-blue-500/10 scale-[1.01] shadow-2xl shadow-blue-500/20'
            : 'border-zinc-300 dark:border-zinc-700/80 bg-white/50 dark:bg-zinc-900/50 hover:border-blue-400 dark:hover:border-blue-500/60 hover:bg-white/80 dark:hover:bg-zinc-900/80 shadow-sm'
        } backdrop-blur-xl p-8 sm:p-12 text-center flex flex-col items-center justify-center`}
      >
        <input
          ref={fileInputRef}
          type="file"
          multiple
          className="hidden"
          onChange={handleFileChange}
        />

        {/* Ambient Gradient Glow */}
        <div className="absolute -top-24 -left-24 w-48 h-48 bg-blue-500/15 rounded-full blur-3xl pointer-events-none group-hover:scale-150 transition-transform duration-700" />
        <div className="absolute -bottom-24 -right-24 w-48 h-48 bg-indigo-500/15 rounded-full blur-3xl pointer-events-none group-hover:scale-150 transition-transform duration-700" />

        {/* Cloud Upload Icon */}
        <div className="relative mb-4 w-16 h-16 rounded-2xl bg-gradient-to-b from-blue-500/20 to-indigo-500/20 border border-blue-400/30 flex items-center justify-center text-blue-600 dark:text-blue-400 group-hover:scale-110 transition-transform duration-300 shadow-md">
          <UploadCloud className="w-8 h-8" />
        </div>

        <h3 className="text-xl sm:text-2xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50 mb-1">
          Drop your files here to compress
        </h3>
        <p className="text-sm text-zinc-500 dark:text-zinc-400 max-w-md mb-6">
          Supports multi-file batching. Instant client-side compression without uploading anything to a server.
        </p>

        {/* Supported Format Pills */}
        <div className="flex flex-wrap items-center justify-center gap-2 text-xs font-medium text-zinc-600 dark:text-zinc-400">
          <div className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-zinc-100 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700">
            <Image className="w-3.5 h-3.5 text-purple-500" />
            <span>Images (PNG, JPG, WebP)</span>
          </div>
          <div className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-zinc-100 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700">
            <FileText className="w-3.5 h-3.5 text-rose-500" />
            <span>PDF Documents</span>
          </div>
          <div className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-zinc-100 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700">
            <Video className="w-3.5 h-3.5 text-amber-500" />
            <span>Videos (MP4, WebM)</span>
          </div>
          <div className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-zinc-100 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700">
            <Music className="w-3.5 h-3.5 text-emerald-500" />
            <span>Audio (MP3, WAV)</span>
          </div>
        </div>

        {/* Browse button CTA */}
        <div className="mt-6">
          <span className="inline-flex items-center gap-2 px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-medium text-sm shadow-md shadow-blue-500/25 transition">
            Choose Files
          </span>
        </div>
      </div>
    </div>
  );
};
