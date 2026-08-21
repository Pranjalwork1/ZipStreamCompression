import React, { useState } from 'react';
import { X, Sliders, Check, Sparkles } from 'lucide-react';
import { CompressibleFile, CompressionSettings, OutputFormat } from '../types';

interface FileSettingsModalProps {
  item: CompressibleFile | null;
  isOpen: boolean;
  onClose: () => void;
  onSave: (id: string, updatedSettings: CompressionSettings) => void;
}

export const FileSettingsModal: React.FC<FileSettingsModalProps> = ({
  item,
  isOpen,
  onClose,
  onSave,
}) => {
  if (!isOpen || !item) return null;

  const [quality, setQuality] = useState(item.settings.quality ?? 0.75);
  const [scale, setScale] = useState(item.settings.scale ?? 1);
  const [targetFormat, setTargetFormat] = useState<OutputFormat>(item.settings.targetFormat ?? 'original');
  const [stripMetadata, setStripMetadata] = useState(item.settings.stripMetadata ?? true);

  const handleSave = () => {
    onSave(item.id, {
      ...item.settings,
      preset: 'custom',
      quality,
      scale,
      targetFormat,
      stripMetadata,
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-md animate-fade-in">
      <div className="relative w-full max-w-md rounded-3xl border border-black/[0.08] dark:border-white/[0.1] bg-white dark:bg-zinc-900 shadow-2xl p-6 sm:p-8 overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-2">
            <Sliders className="w-5 h-5 text-blue-600 dark:text-blue-400" />
            <h3 className="font-bold text-base text-zinc-900 dark:text-zinc-50">
              Compression Settings
            </h3>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-full text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <p className="text-xs text-zinc-500 mb-5 truncate font-medium">
          File: <span className="text-zinc-900 dark:text-zinc-100 font-semibold">{item.name}</span>
        </p>

        <div className="space-y-5">
          {/* Quality Slider */}
          <div>
            <div className="flex justify-between text-xs font-semibold mb-1 text-zinc-700 dark:text-zinc-300">
              <span>Quality Level</span>
              <span className="text-blue-600 dark:text-blue-400">{Math.round(quality * 100)}%</span>
            </div>
            <input
              type="range"
              min="0.1"
              max="1.0"
              step="0.05"
              value={quality}
              onChange={(e) => setQuality(parseFloat(e.target.value))}
              className="w-full accent-blue-600 cursor-pointer"
            />
            <div className="flex justify-between text-[10px] text-zinc-400 mt-1">
              <span>Smallest File (10%)</span>
              <span>Balanced (75%)</span>
              <span>High Quality (100%)</span>
            </div>
          </div>

          {/* Scale Resolution Slider (For images/videos) */}
          {(item.category === 'image' || item.category === 'video') && (
            <div>
              <div className="flex justify-between text-xs font-semibold mb-1 text-zinc-700 dark:text-zinc-300">
                <span>Resolution Scaling</span>
                <span className="text-blue-600 dark:text-blue-400">{Math.round(scale * 100)}%</span>
              </div>
              <input
                type="range"
                min="0.25"
                max="1.0"
                step="0.05"
                value={scale}
                onChange={(e) => setScale(parseFloat(e.target.value))}
                className="w-full accent-blue-600 cursor-pointer"
              />
              <div className="flex justify-between text-[10px] text-zinc-400 mt-1">
                <span>1/4 Size (25%)</span>
                <span>Half (50%)</span>
                <span>Original Dimensions (100%)</span>
              </div>
            </div>
          )}

          {/* Target Format Conversion (For images) */}
          {item.category === 'image' && (
            <div>
              <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1.5">
                Output Format
              </label>
              <div className="grid grid-cols-4 gap-2">
                {[
                  { id: 'original', label: 'Original' },
                  { id: 'webp', label: 'WebP (Best)' },
                  { id: 'jpeg', label: 'JPEG' },
                  { id: 'png', label: 'PNG' },
                ].map((fmt) => (
                  <button
                    key={fmt.id}
                    type="button"
                    onClick={() => setTargetFormat(fmt.id as OutputFormat)}
                    className={`py-1.5 rounded-xl text-xs font-medium border transition ${
                      targetFormat === fmt.id
                        ? 'border-blue-500 bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 font-semibold'
                        : 'border-zinc-200 dark:border-zinc-700 text-zinc-600 dark:text-zinc-400 hover:border-zinc-300'
                    }`}
                  >
                    {fmt.label}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Strip EXIF / Metadata Toggle */}
          <div className="flex items-center justify-between pt-2">
            <div>
              <span className="block text-xs font-semibold text-zinc-800 dark:text-zinc-200">
                Strip Metadata (EXIF, GPS, Author)
              </span>
              <span className="block text-[11px] text-zinc-500">
                Improves privacy & reduces byte payload
              </span>
            </div>
            <input
              type="checkbox"
              checked={stripMetadata}
              onChange={(e) => setStripMetadata(e.target.checked)}
              className="w-4 h-4 text-blue-600 rounded border-zinc-300 focus:ring-blue-500"
            />
          </div>
        </div>

        {/* Footer */}
        <div className="mt-6 flex justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-xs font-medium text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSave}
            className="flex items-center gap-1.5 px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-medium text-xs shadow-md shadow-blue-500/20 transition"
          >
            <Check className="w-3.5 h-3.5" />
            <span>Apply Settings</span>
          </button>
        </div>
      </div>
    </div>
  );
};
