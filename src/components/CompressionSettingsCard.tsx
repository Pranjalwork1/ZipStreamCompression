import React, { useState } from 'react';
import {
  FileText,
  Image as ImageIcon,
  Film,
  Music,
  FileCode,
  SlidersHorizontal,
  ChevronDown,
  Check,
  Info,
  Globe,
  Mail,
  Share2,
  Archive,
  Sparkles,
} from 'lucide-react';
import {
  UploadedFileInfo,
  CompressionSettings,
  CompressionLevel,
  CompressionPreset,
} from '../types';
import { formatBytes } from '../utils/formatters';
import { estimateCompressedSize, getPresetSettings } from '../utils/compressionEngine';

interface CompressionSettingsCardProps {
  fileInfo: UploadedFileInfo;
  settings: CompressionSettings;
  onUpdateSettings: (newSettings: CompressionSettings) => void;
  onStartCompress: () => void;
  onResetFile: () => void;
}

export const CompressionSettingsCard: React.FC<CompressionSettingsCardProps> = ({
  fileInfo,
  settings,
  onUpdateSettings,
  onStartCompress,
  onResetFile,
}) => {
  const [showAdvanced, setShowAdvanced] = useState(false);

  const getFileCategoryIcon = () => {
    switch (fileInfo.category) {
      case 'pdf':
        return <FileText className="w-8 h-8 text-[#ff3b30]" />;
      case 'image':
        return <ImageIcon className="w-8 h-8 text-[#34c759]" />;
      case 'video':
        return <Film className="w-8 h-8 text-[#0071e3]" />;
      case 'audio':
        return <Music className="w-8 h-8 text-[#af52de]" />;
      default:
        return <FileCode className="w-8 h-8 text-[#86868b]" />;
    }
  };

  const getCategoryBadge = () => {
    switch (fileInfo.category) {
      case 'pdf':
        return 'PDF Document';
      case 'image':
        return 'Photo / Image';
      case 'video':
        return 'Video';
      case 'audio':
        return 'Audio & Voice';
      default:
        return 'File';
    }
  };

  const estimation = estimateCompressedSize(fileInfo.size, fileInfo.category, settings);

  const presets: {
    id: CompressionPreset;
    title: string;
    icon: React.ReactNode;
    desc: string;
  }[] = [
    {
      id: 'web',
      title: 'Web & SEO',
      icon: <Globe className="w-3.5 h-3.5" />,
      desc: 'Optimized for web loading & fast page speed',
    },
    {
      id: 'email',
      title: 'Email Friendly',
      icon: <Mail className="w-3.5 h-3.5" />,
      desc: 'Fits under 5MB / 10MB email attachment quotas',
    },
    {
      id: 'social',
      title: 'WhatsApp & Discord',
      icon: <Share2 className="w-3.5 h-3.5" />,
      desc: 'Ultra-fast sharing across messengers',
    },
    {
      id: 'archive',
      title: 'Max Compression',
      icon: <Archive className="w-3.5 h-3.5" />,
      desc: 'Maximum storage savings for archival',
    },
    {
      id: 'max_quality',
      title: 'Highest Quality',
      icon: <Sparkles className="w-3.5 h-3.5" />,
      desc: 'Preserves sharpest detail with subtle reduction',
    },
  ];

  const levels: {
    id: CompressionLevel;
    title: string;
    description: string;
    savings: string;
  }[] = [
    {
      id: 'high',
      title: 'Smallest File',
      description: 'Maximum reduction. Great for quick email attachments and messaging.',
      savings: '~75% smaller',
    },
    {
      id: 'medium',
      title: 'Balanced',
      description: 'Recommended for most files. Substantial savings with excellent clarity.',
      savings: '~55% smaller',
    },
    {
      id: 'low',
      title: 'Best Quality',
      description: 'Preserves the highest resolution and original fidelity.',
      savings: '~35% smaller',
    },
  ];

  const handleApplyPreset = (preset: CompressionPreset) => {
    const newSettings = getPresetSettings(preset, fileInfo.category);
    onUpdateSettings(newSettings);
  };

  const handleLevelChange = (level: CompressionLevel) => {
    onUpdateSettings({
      ...settings,
      preset: 'custom',
      level,
    });
  };

  return (
    <div
      id="compression-settings-card"
      className="w-full max-w-3xl mx-auto rounded-[28px] bg-white dark:bg-[#1c1c1e] border border-black/[0.08] dark:border-white/[0.08] shadow-[0_4px_24px_rgba(0,0,0,0.04)] overflow-hidden animate-in fade-in duration-200 transition-colors"
    >
      {/* File Header */}
      <div className="p-6 sm:p-7 border-b border-black/[0.06] dark:border-white/[0.08] bg-[#fafafc] dark:bg-[#252528] flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center gap-4 min-w-0">
          {/* File Thumbnail or Icon */}
          <div className="w-14 h-14 rounded-[16px] bg-white dark:bg-[#2c2c2e] border border-black/[0.08] dark:border-white/[0.08] flex items-center justify-center shrink-0 overflow-hidden shadow-xs">
            {fileInfo.previewUrl && fileInfo.category === 'image' ? (
              <img
                src={fileInfo.previewUrl}
                alt={`Document preview for ${fileInfo.name}`}
                className="w-full h-full object-cover"
              />
            ) : fileInfo.previewUrl && fileInfo.category === 'video' ? (
              <video
                src={fileInfo.previewUrl}
                className="w-full h-full object-cover"
              />
            ) : (
              getFileCategoryIcon()
            )}
          </div>

          {/* File Title & Info */}
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <h3 className="text-[16px] font-semibold text-[#1d1d1f] dark:text-[#f5f5f7] truncate">
                {fileInfo.name}
              </h3>
              <span className="text-[11px] font-medium px-2 py-0.5 rounded-full bg-black/[0.05] dark:bg-white/[0.08] text-[#6e6e73] dark:text-[#a1a1a6]">
                {getCategoryBadge()}
              </span>
            </div>
            <p className="text-[13px] text-[#86868b] dark:text-[#8e8e93] mt-0.5">
              Original: <span className="text-[#1d1d1f] dark:text-[#f5f5f7] font-medium">{formatBytes(fileInfo.size)}</span>
            </p>
          </div>
        </div>

        {/* Change File Button */}
        <button
          id="change-file-btn"
          type="button"
          onClick={onResetFile}
          className="px-3.5 py-1.5 rounded-lg bg-white dark:bg-[#2c2c2e] hover:bg-[#f5f5f7] dark:hover:bg-[#3a3a3c] text-[#1d1d1f] dark:text-[#f5f5f7] text-[13px] font-medium border border-black/[0.08] dark:border-white/[0.08] shadow-xs transition-colors shrink-0 self-end sm:self-center cursor-pointer"
        >
          Change File
        </button>
      </div>

      {/* Main Settings Body */}
      <div className="p-6 sm:p-7 space-y-6">
        {/* Quick Presets Bar */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <label className="text-[12px] font-medium text-[#6e6e73] dark:text-[#a1a1a6] uppercase tracking-wider block">
              Quick Target Presets & Size Limits
            </label>
            {settings.targetSizeBytes && (
              <span className="text-[11px] font-semibold text-[#0071e3] dark:text-[#2997ff] bg-[#0071e3]/10 dark:bg-[#2997ff]/20 px-2 py-0.5 rounded-md">
                Target Cap: {formatBytes(settings.targetSizeBytes)}
              </span>
            )}
          </div>
          <div className="flex flex-wrap gap-2">
            {presets.map((p) => {
              const isSelected = settings.preset === p.id && !settings.targetSizeBytes;
              return (
                <button
                  key={p.id}
                  type="button"
                  id={`preset-btn-${p.id}`}
                  onClick={() => handleApplyPreset(p.id)}
                  title={p.desc}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[12px] font-medium transition-all cursor-pointer ${
                    isSelected
                      ? 'bg-[#0071e3] text-white shadow-xs'
                      : 'bg-black/[0.04] dark:bg-white/[0.06] text-[#1d1d1f] dark:text-[#f5f5f7] hover:bg-black/[0.08] dark:hover:bg-white/[0.12]'
                  }`}
                >
                  <span>{p.icon}</span>
                  <span>{p.title}</span>
                </button>
              );
            })}
          </div>

          {/* Quick Target Size Buttons (e.g. 2MB, 4MB, 8MB) */}
          <div className="pt-2 flex flex-wrap items-center gap-2">
            <span className="text-[11px] text-[#86868b] dark:text-[#8e8e93] font-medium mr-1">Target Exact Max:</span>
            {[
              { label: 'Under 2 MB', bytes: 2 * 1024 * 1024 },
              { label: 'Under 4 MB (Email)', bytes: 4 * 1024 * 1024 },
              { label: 'Under 8 MB (Discord)', bytes: 8 * 1024 * 1024 },
              { label: 'Under 16 MB', bytes: 16 * 1024 * 1024 },
            ].map((target) => {
              const isCapSelected = settings.targetSizeBytes === target.bytes;
              return (
                <button
                  key={target.label}
                  type="button"
                  onClick={() =>
                    onUpdateSettings({
                      ...settings,
                      preset: 'custom',
                      targetSizeBytes: isCapSelected ? undefined : target.bytes,
                    })
                  }
                  className={`px-2.5 py-1 rounded-lg text-[11px] font-medium border transition-all cursor-pointer ${
                    isCapSelected
                      ? 'bg-[#0071e3] text-white border-[#0071e3] shadow-xs'
                      : 'bg-white dark:bg-[#2c2c2e] text-[#1d1d1f] dark:text-[#f5f5f7] border-black/[0.1] dark:border-white/[0.1] hover:border-black/[0.2] dark:hover:border-white/[0.2] hover:bg-[#f5f5f7] dark:hover:bg-[#38383a]'
                  }`}
                >
                  {target.label}
                </button>
              );
            })}
            {settings.targetSizeBytes && (
              <button
                type="button"
                onClick={() => onUpdateSettings({ ...settings, targetSizeBytes: undefined })}
                className="text-[11px] text-[#ff3b30] hover:underline font-medium ml-1 cursor-pointer"
              >
                Clear Target Cap
              </button>
            )}
          </div>
        </div>

        {/* Quality Selector */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <label className="text-[13px] font-medium text-[#6e6e73] dark:text-[#a1a1a6]">
              Compression Level
            </label>
            <span className="text-[12px] text-[#86868b] dark:text-[#8e8e93]">
              Adjust compression intensity
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {levels.map((lvl) => {
              const isSelected = settings.level === lvl.id;
              return (
                <button
                  key={lvl.id}
                  id={`compression-level-option-${lvl.id}`}
                  type="button"
                  onClick={() => handleLevelChange(lvl.id)}
                  className={`p-4 rounded-2xl text-left transition-all border flex flex-col justify-between cursor-pointer ${
                    isSelected
                      ? 'bg-[#f0f6ff] dark:bg-[#1a2838] border-[#0071e3] dark:border-[#2997ff] shadow-xs ring-1 ring-[#0071e3] dark:ring-[#2997ff]'
                      : 'bg-white dark:bg-[#252528] border-black/[0.08] dark:border-white/[0.08] hover:border-black/[0.16] dark:hover:border-white/[0.16] hover:bg-[#fafafc] dark:hover:bg-[#2c2c30]'
                  }`}
                >
                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <h4 className="text-[14px] font-semibold text-[#1d1d1f] dark:text-[#f5f5f7]">
                        {lvl.title}
                      </h4>
                      {isSelected && (
                        <div className="w-4 h-4 rounded-full bg-[#0071e3] dark:bg-[#2997ff] text-white flex items-center justify-center">
                          <Check className="w-2.5 h-2.5 stroke-[3]" />
                        </div>
                      )}
                    </div>
                    <p className="text-[12px] text-[#86868b] dark:text-[#8e8e93] leading-relaxed">
                      {lvl.description}
                    </p>
                  </div>
                  <div className="mt-3 pt-2.5 border-t border-black/[0.04] dark:border-white/[0.06] text-[11px] font-medium text-[#0071e3] dark:text-[#2997ff]">
                    {lvl.savings}
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Live Estimation Bar */}
        <div className="p-4 sm:p-5 rounded-2xl bg-[#f5f5f7] dark:bg-[#252528] border border-black/[0.04] dark:border-white/[0.06] flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div>
            <div className="text-[11px] font-medium text-[#86868b] dark:text-[#8e8e93] uppercase tracking-wider">
              Estimated Output
            </div>
            <div className="flex items-baseline gap-2 mt-0.5">
              <span className="text-[20px] font-semibold text-[#1d1d1f] dark:text-[#f5f5f7]">
                ~{formatBytes(estimation.estimatedBytes)}
              </span>
              <span className="text-[13px] text-[#86868b] dark:text-[#8e8e93]">
                (Save ~{estimation.savedPercentage}%)
              </span>
            </div>
          </div>
          <div className="text-[12px] text-[#34c759] font-medium px-3 py-1 rounded-full bg-[#34c759]/10 dark:bg-[#34c759]/20">
            Saves ~{formatBytes(fileInfo.size - estimation.estimatedBytes)} space
          </div>
        </div>

        {/* Advanced Options Accordion */}
        <div className="border border-black/[0.06] dark:border-white/[0.08] rounded-2xl overflow-hidden bg-white dark:bg-[#1c1c1e]">
          <button
            type="button"
            id="toggle-advanced-options-btn"
            onClick={() => setShowAdvanced(!showAdvanced)}
            className="w-full px-4 py-3 flex items-center justify-between text-[13px] font-medium text-[#1d1d1f] dark:text-[#f5f5f7] hover:bg-[#f5f5f7] dark:hover:bg-[#252528] transition-colors cursor-pointer"
          >
            <div className="flex items-center gap-2">
              <SlidersHorizontal className="w-3.5 h-3.5 text-[#6e6e73] dark:text-[#a1a1a6]" />
              <span>Advanced Fine-Tuning</span>
            </div>
            <ChevronDown
              className={`w-4 h-4 text-[#86868b] dark:text-[#8e8e93] transition-transform duration-200 ${
                showAdvanced ? 'rotate-180' : ''
              }`}
            />
          </button>

          {showAdvanced && (
            <div className="p-4 sm:p-5 border-t border-black/[0.06] dark:border-white/[0.08] space-y-4 text-[13px] bg-[#fafafc] dark:bg-[#202024]">
              {/* Image specific options */}
              {fileInfo.category === 'image' && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[#1d1d1f] dark:text-[#f5f5f7] font-medium mb-1.5">
                      Output Format
                    </label>
                    <select
                      id="image-target-format-select"
                      value={settings.outputFormat}
                      onChange={(e) =>
                        onUpdateSettings({ ...settings, preset: 'custom', outputFormat: e.target.value })
                      }
                      className="w-full px-3 py-2 rounded-xl bg-white dark:bg-[#2c2c2e] border border-black/[0.12] dark:border-white/[0.12] text-[#1d1d1f] dark:text-[#f5f5f7] text-[13px] focus:outline-none focus:ring-2 focus:ring-[#0071e3]"
                    >
                      <option value="original">Keep Original Format</option>
                      <option value="image/webp">Convert to WebP (Recommended for Web)</option>
                      <option value="image/jpeg">Convert to JPEG</option>
                      <option value="image/png">Preserve PNG Transparencies</option>
                    </select>
                  </div>

                  <div>
                    <div className="flex justify-between items-center mb-1.5">
                      <label className="text-[#1d1d1f] dark:text-[#f5f5f7] font-medium">
                        Resolution Scale
                      </label>
                      <span className="text-[#0071e3] dark:text-[#2997ff] font-semibold text-[12px]">
                        {settings.scalePercent}%
                      </span>
                    </div>
                    <input
                      type="range"
                      min="50"
                      max="100"
                      step="5"
                      id="image-scale-slider"
                      value={settings.scalePercent}
                      onChange={(e) =>
                        onUpdateSettings({
                          ...settings,
                          preset: 'custom',
                          scalePercent: parseInt(e.target.value, 10),
                        })
                      }
                      className="w-full accent-[#0071e3] bg-[#e5e5ea] dark:bg-[#3a3a3c] rounded-lg h-1.5"
                    />
                    <div className="flex justify-between text-[11px] text-[#86868b] dark:text-[#8e8e93] mt-1">
                      <span>50% (Compact)</span>
                      <span>75%</span>
                      <span>100% (Original)</span>
                    </div>
                  </div>
                </div>
              )}

              {/* PDF Specific options */}
              {fileInfo.category === 'pdf' && (
                <div className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-[#1d1d1f] dark:text-[#f5f5f7] font-medium mb-1.5">
                        Target Raster DPI
                      </label>
                      <select
                        id="pdf-dpi-select"
                        value={settings.targetDpi || 140}
                        onChange={(e) =>
                          onUpdateSettings({
                            ...settings,
                            preset: 'custom',
                            targetDpi: parseInt(e.target.value, 10),
                          })
                        }
                        className="w-full px-3 py-2 rounded-xl bg-white dark:bg-[#2c2c2e] border border-black/[0.12] dark:border-white/[0.12] text-[#1d1d1f] dark:text-[#f5f5f7] text-[13px] focus:outline-none focus:ring-2 focus:ring-[#0071e3]"
                      >
                        <option value={72}>72 DPI (Extreme — Email & Chat)</option>
                        <option value={96}>96 DPI (Web Standard — High Savings)</option>
                        <option value={140}>140 DPI (Balanced — Crisp Documents)</option>
                        <option value={200}>200 DPI (High Resolution — Fine Details)</option>
                        <option value={300}>300 DPI (Print Grade — Archival)</option>
                      </select>
                    </div>

                    <div>
                      <div className="flex justify-between items-center mb-1.5">
                        <label className="text-[#1d1d1f] dark:text-[#f5f5f7] font-medium">
                          Image Quality Level
                        </label>
                        <span className="text-[#0071e3] dark:text-[#2997ff] font-semibold text-[12px]">
                          {settings.imageQuality || (settings.level === 'low' ? 85 : settings.level === 'medium' ? 65 : 40)}%
                        </span>
                      </div>
                      <input
                        type="range"
                        min="25"
                        max="95"
                        step="5"
                        id="pdf-quality-slider"
                        value={settings.imageQuality || (settings.level === 'low' ? 85 : settings.level === 'medium' ? 65 : 40)}
                        onChange={(e) =>
                          onUpdateSettings({
                            ...settings,
                            preset: 'custom',
                            imageQuality: parseInt(e.target.value, 10),
                          })
                        }
                        className="w-full accent-[#0071e3] bg-[#e5e5ea] dark:bg-[#3a3a3c] rounded-lg h-1.5"
                      />
                      <div className="flex justify-between text-[11px] text-[#86868b] dark:text-[#8e8e93] mt-1">
                        <span>25% (Max Reduction)</span>
                        <span>65% (Balanced)</span>
                        <span>95% (Near Lossless)</span>
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
                    <div>
                      <div className="flex justify-between items-center mb-1.5">
                        <label className="text-[#1d1d1f] dark:text-[#f5f5f7] font-medium">
                          Page Dimension Scale
                        </label>
                        <span className="text-[#0071e3] dark:text-[#2997ff] font-semibold text-[12px]">
                          {settings.scalePercent}%
                        </span>
                      </div>
                      <input
                        type="range"
                        min="50"
                        max="100"
                        step="5"
                        id="pdf-scale-slider"
                        value={settings.scalePercent}
                        onChange={(e) =>
                          onUpdateSettings({
                            ...settings,
                            preset: 'custom',
                            scalePercent: parseInt(e.target.value, 10),
                          })
                        }
                        className="w-full accent-[#0071e3] bg-[#e5e5ea] dark:bg-[#3a3a3c] rounded-lg h-1.5"
                      />
                      <div className="flex justify-between text-[11px] text-[#86868b] dark:text-[#8e8e93] mt-1">
                        <span>50% (Compact View)</span>
                        <span>75%</span>
                        <span>100% (Original Dimensions)</span>
                      </div>
                    </div>

                    <div className="space-y-2.5 pt-1">
                      <label className="flex items-center gap-2.5 cursor-pointer">
                        <input
                          type="checkbox"
                          id="pdf-grayscale-check"
                          checked={!!settings.grayscale}
                          onChange={(e) =>
                            onUpdateSettings({
                              ...settings,
                              preset: 'custom',
                              grayscale: e.target.checked,
                            })
                          }
                          className="w-4 h-4 accent-[#0071e3] rounded"
                        />
                        <span className="text-[#1d1d1f] dark:text-[#f5f5f7] font-medium text-[13px]">
                          Convert to Grayscale (Extra ~25-30% reduction)
                        </span>
                      </label>

                      <label className="flex items-center gap-2.5 cursor-pointer">
                        <input
                          type="checkbox"
                          id="remove-metadata-check"
                          checked={settings.removeMetadata}
                          onChange={(e) =>
                            onUpdateSettings({
                              ...settings,
                              preset: 'custom',
                              removeMetadata: e.target.checked,
                            })
                          }
                          className="w-4 h-4 accent-[#0071e3] rounded"
                        />
                        <span className="text-[#1d1d1f] dark:text-[#f5f5f7] font-medium text-[13px]">
                          Remove unnecessary metadata & xref overhead
                        </span>
                      </label>
                    </div>
                  </div>
                </div>
              )}

              {/* Audio Specific options */}
              {fileInfo.category === 'audio' && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[#1d1d1f] dark:text-[#f5f5f7] font-medium mb-1.5">
                      Target Audio Bitrate
                    </label>
                    <select
                      id="audio-bitrate-select"
                      value={settings.audioBitrate || 128}
                      onChange={(e) =>
                        onUpdateSettings({
                          ...settings,
                          preset: 'custom',
                          audioBitrate: parseInt(e.target.value, 10),
                        })
                      }
                      className="w-full px-3 py-2 rounded-xl bg-white dark:bg-[#2c2c2e] border border-black/[0.12] dark:border-white/[0.12] text-[#1d1d1f] dark:text-[#f5f5f7] text-[13px] focus:outline-none focus:ring-2 focus:ring-[#0071e3]"
                    >
                      <option value={64}>64 kbps (Voice & Speech Notes)</option>
                      <option value={96}>96 kbps (Podcasts & Radio)</option>
                      <option value={128}>128 kbps (Standard High Quality)</option>
                      <option value={192}>192 kbps (Studio Fidelity)</option>
                    </select>
                  </div>
                  <div className="flex items-center gap-2.5 pt-4">
                    <p className="text-[12px] text-[#6e6e73] dark:text-[#a1a1a6]">
                      Resamples to compact 16-bit PCM stereo with perceptual audio envelope preservation.
                    </p>
                  </div>
                </div>
              )}

              {/* Video Specific options */}
              {fileInfo.category === 'video' && (
                <div className="p-3 rounded-xl bg-white dark:bg-[#2c2c2e] border border-black/[0.08] dark:border-white/[0.08] text-[#1d1d1f] dark:text-[#f5f5f7] flex items-start gap-2.5">
                  <Info className="w-4 h-4 text-[#0071e3] dark:text-[#2997ff] shrink-0 mt-0.5" />
                  <p className="text-[12px] text-[#6e6e73] dark:text-[#a1a1a6] leading-relaxed">
                    Video compression uses adaptive H.264 rate-control and optimizes audio streams to 128 kbps AAC stereo for universal playback.
                  </p>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Action Button */}
        <div className="pt-2 flex justify-center">
          <button
            type="button"
            id="start-compression-action-btn"
            onClick={onStartCompress}
            className="w-full sm:w-auto px-10 py-3.5 rounded-full bg-[#0071e3] hover:bg-[#0077ed] active:bg-[#0062c4] text-white font-medium text-[15px] shadow-sm transition-all active:scale-[0.98] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#0071e3] cursor-pointer"
          >
            Compress File ({formatBytes(fileInfo.size)} → ~{formatBytes(estimation.estimatedBytes)})
          </button>
        </div>
      </div>
    </div>
  );
};
