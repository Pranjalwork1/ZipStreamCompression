import React, { useState, useEffect, useRef } from 'react';
import {
  Search,
  FileText,
  FilePlus,
  Camera,
  Layers,
  Scissors,
  Stamp,
  Music,
  Film,
  Sparkles,
  ArrowRight,
  Command,
  X,
  Check,
} from 'lucide-react';
import { ToolMode, FileCategory, SearchToolItem } from '../types';

interface SearchCommandPaletteProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectTool: (tool: ToolMode, category?: FileCategory) => void;
}

export const ALL_TOOLS: SearchToolItem[] = [
  {
    id: 'merge_pdf',
    name: 'Merge PDF',
    category: 'PDF Tools',
    description: 'Combine multiple PDF documents into a single, organized file.',
    badge: 'Popular',
    keywords: ['merge', 'combine', 'join', 'pdf', 'append', 'pages', 'ihatepdf', 'ilovepdf'],
    iconName: 'FilePlus',
  },
  {
    id: 'scan_document',
    name: 'Scan Document',
    category: 'Scanning & Conversion',
    description: 'Capture documents with your camera or photos, enhance text, and export as PDF.',
    badge: 'New',
    keywords: ['scan', 'scanner', 'camera', 'document', 'ocr', 'paper', 'receipt', 'photo to pdf', 'camscanner'],
    iconName: 'Camera',
  },
  {
    id: 'compress',
    name: 'Compress PDF',
    category: 'Compression',
    description: 'Reduce PDF file size while maintaining sharp text and vector graphics.',
    badge: 'Fast',
    keywords: ['compress', 'pdf', 'shrink', 'reduce size', 'optimize', 'deflate', 'email pdf'],
    iconName: 'FileText',
    targetCategory: 'pdf',
  },
  {
    id: 'images_to_pdf',
    name: 'Images to PDF (JPG to PDF)',
    category: 'Scanning & Conversion',
    description: 'Convert JPG, PNG, and WebP images into a single multi-page PDF.',
    keywords: ['jpg to pdf', 'png to pdf', 'image to pdf', 'convert photos', 'album to pdf', 'pictures'],
    iconName: 'Sparkles',
  },
  {
    id: 'split_pdf',
    name: 'Split & Extract PDF',
    category: 'PDF Tools',
    description: 'Separate pages or extract specific page ranges into new PDF files.',
    keywords: ['split', 'extract', 'cut', 'pages', 'separate', 'range', 'remove pages'],
    iconName: 'Scissors',
  },
  {
    id: 'watermark_pdf',
    name: 'Watermark PDF',
    category: 'PDF Tools',
    description: 'Stamp custom text or confidential marks across your PDF document.',
    keywords: ['watermark', 'stamp', 'confidential', 'draft', 'protect', 'logo', 'copyright'],
    iconName: 'Stamp',
  },
  {
    id: 'compress',
    name: 'Compress Images',
    category: 'Compression',
    description: 'Compress photos, PNGs, and JPEGs with bicubic scaling & WebP conversion.',
    keywords: ['compress image', 'photo', 'jpg', 'png', 'webp', 'reduce image size'],
    iconName: 'Layers',
    targetCategory: 'image',
  },
  {
    id: 'compress',
    name: 'Compress Video',
    category: 'Compression',
    description: 'Reduce MP4, WebM, and MOV video file sizes on-device with rate control.',
    keywords: ['compress video', 'video', 'mp4', 'movie', 'clip', 'reduce video'],
    iconName: 'Film',
    targetCategory: 'video',
  },
  {
    id: 'compress',
    name: 'Compress Audio',
    category: 'Compression',
    description: 'Resample MP3, WAV, and voice recordings with 16-bit PCM stereo compaction.',
    keywords: ['compress audio', 'audio', 'mp3', 'wav', 'sound', 'voice memo', 'podcast'],
    iconName: 'Music',
    targetCategory: 'audio',
  },
];

export const SearchCommandPalette: React.FC<SearchCommandPaletteProps> = ({
  isOpen,
  onClose,
  onSelectTool,
}) => {
  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  // Filter tools based on query
  const filteredTools = ALL_TOOLS.filter((tool) => {
    if (!query.trim()) return true;
    const q = query.toLowerCase().trim();
    return (
      tool.name.toLowerCase().includes(q) ||
      tool.description.toLowerCase().includes(q) ||
      tool.category.toLowerCase().includes(q) ||
      tool.keywords.some((k) => k.toLowerCase().includes(q))
    );
  });

  // Focus input on open
  useEffect(() => {
    if (isOpen) {
      setQuery('');
      setSelectedIndex(0);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [isOpen]);

  // Keyboard navigation inside palette
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isOpen) return;

      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSelectedIndex((prev) => (prev + 1) % Math.max(1, filteredTools.length));
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSelectedIndex((prev) => (prev - 1 + filteredTools.length) % Math.max(1, filteredTools.length));
      } else if (e.key === 'Enter') {
        e.preventDefault();
        if (filteredTools[selectedIndex]) {
          const item = filteredTools[selectedIndex];
          onSelectTool(item.id, item.targetCategory);
          onClose();
        }
      } else if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, filteredTools, selectedIndex, onSelectTool, onClose]);

  if (!isOpen) return null;

  const renderIcon = (iconName: string) => {
    switch (iconName) {
      case 'FilePlus':
        return <FilePlus className="w-4 h-4 text-[#ff3b30]" />;
      case 'Camera':
        return <Camera className="w-4 h-4 text-[#34c759]" />;
      case 'FileText':
        return <FileText className="w-4 h-4 text-[#0071e3]" />;
      case 'Sparkles':
        return <Sparkles className="w-4 h-4 text-[#af52de]" />;
      case 'Scissors':
        return <Scissors className="w-4 h-4 text-[#ff9500]" />;
      case 'Stamp':
        return <Stamp className="w-4 h-4 text-[#5856d6]" />;
      case 'Film':
        return <Film className="w-4 h-4 text-[#0071e3]" />;
      case 'Music':
        return <Music className="w-4 h-4 text-[#af52de]" />;
      case 'Layers':
      default:
        return <Layers className="w-4 h-4 text-[#34c759]" />;
    }
  };

  return (
    <div
      id="search-command-palette-backdrop"
      className="fixed inset-0 z-50 flex items-start justify-center pt-16 sm:pt-24 px-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-150"
      onClick={onClose}
    >
      <div
        id="search-command-palette-modal"
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-2xl bg-white dark:bg-[#1c1c1e] rounded-[24px] shadow-[0_20px_60px_rgba(0,0,0,0.3)] border border-black/[0.08] dark:border-white/[0.12] overflow-hidden flex flex-col transform transition-all animate-in zoom-in-95 duration-150"
      >
        {/* Search Input Bar */}
        <div className="flex items-center px-4 sm:px-5 py-3.5 border-b border-black/[0.06] dark:border-white/[0.08] bg-[#fafafc] dark:bg-[#252528]">
          <Search className="w-5 h-5 text-[#86868b] dark:text-[#a1a1a6] shrink-0 mr-3" />
          <input
            ref={inputRef}
            type="text"
            id="command-palette-search-input"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setSelectedIndex(0);
            }}
            placeholder="Search tools & features (e.g. Merge, Scan, Compress, Split)..."
            className="w-full bg-transparent text-[16px] text-[#1d1d1f] dark:text-[#f5f5f7] placeholder:text-[#86868b] dark:placeholder:text-[#8e8e93] focus:outline-none"
          />
          {query && (
            <button
              onClick={() => setQuery('')}
              className="p-1 rounded-full text-[#86868b] hover:text-[#1d1d1f] dark:hover:text-[#f5f5f7] hover:bg-black/[0.05] dark:hover:bg-white/[0.08] cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          )}
          <span className="hidden sm:inline-flex items-center gap-0.5 px-2 py-0.5 rounded text-[11px] font-mono font-medium text-[#86868b] dark:text-[#a1a1a6] bg-black/[0.04] dark:bg-white/[0.08] ml-2">
            ESC
          </span>
        </div>

        {/* Tools Results List */}
        <div className="max-h-[380px] overflow-y-auto p-2 divide-y divide-black/[0.03] dark:divide-white/[0.04]">
          {filteredTools.length === 0 ? (
            <div className="py-12 text-center text-[#86868b] dark:text-[#8e8e93] text-[14px]">
              No tools matching &ldquo;{query}&rdquo; found. Try searching for &ldquo;merge&rdquo;, &ldquo;scan&rdquo;, or &ldquo;compress&rdquo;.
            </div>
          ) : (
            filteredTools.map((tool, idx) => {
              const isSelected = idx === selectedIndex;
              return (
                <button
                  key={`${tool.id}-${tool.name}-${idx}`}
                  type="button"
                  id={`command-tool-item-${idx}`}
                  onMouseEnter={() => setSelectedIndex(idx)}
                  onClick={() => {
                    onSelectTool(tool.id, tool.targetCategory);
                    onClose();
                  }}
                  className={`w-full text-left p-3 sm:px-4 sm:py-3 rounded-2xl flex items-center justify-between gap-3 transition-colors cursor-pointer ${
                    isSelected
                      ? 'bg-[#0071e3]/10 dark:bg-[#2997ff]/20 text-[#0071e3] dark:text-[#2997ff]'
                      : 'text-[#1d1d1f] dark:text-[#f5f5f7] hover:bg-black/[0.03] dark:hover:bg-white/[0.05]'
                  }`}
                >
                  <div className="flex items-center gap-3.5 min-w-0">
                    <div
                      className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 border ${
                        isSelected
                          ? 'bg-white dark:bg-[#2c2c2e] border-[#0071e3]/20 dark:border-[#2997ff]/30 shadow-xs'
                          : 'bg-[#f5f5f7] dark:bg-[#2c2c2e] border-black/[0.04] dark:border-white/[0.06]'
                      }`}
                    >
                      {renderIcon(tool.iconName)}
                    </div>

                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span
                          className={`text-[14px] font-semibold truncate ${
                            isSelected ? 'text-[#0071e3] dark:text-[#2997ff]' : 'text-[#1d1d1f] dark:text-[#f5f5f7]'
                          }`}
                        >
                          {tool.name}
                        </span>
                        {tool.badge && (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-[#0071e3]/15 dark:bg-[#2997ff]/25 text-[#0071e3] dark:text-[#2997ff]">
                            {tool.badge}
                          </span>
                        )}
                        <span className="text-[11px] text-[#86868b] dark:text-[#8e8e93] font-medium hidden sm:inline-block">
                          • {tool.category}
                        </span>
                      </div>
                      <p className="text-[12px] text-[#86868b] dark:text-[#8e8e93] truncate mt-0.5">
                        {tool.description}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-1 text-[#86868b] dark:text-[#8e8e93] shrink-0">
                    {isSelected && (
                      <span className="hidden sm:inline-flex items-center text-[12px] text-[#0071e3] dark:text-[#2997ff] font-medium gap-1">
                        <span>Open</span>
                        <ArrowRight className="w-3.5 h-3.5" />
                      </span>
                    )}
                  </div>
                </button>
              );
            })
          )}
        </div>

        {/* Footer shortcuts hint */}
        <div className="px-4 py-2.5 bg-[#f5f5f7] dark:bg-[#252528] border-t border-black/[0.06] dark:border-white/[0.08] flex items-center justify-between text-[11px] text-[#86868b] dark:text-[#8e8e93]">
          <div className="flex items-center gap-3">
            <span>
              Use <strong className="text-[#1d1d1f] dark:text-[#f5f5f7]">↑</strong> <strong className="text-[#1d1d1f] dark:text-[#f5f5f7]">↓</strong> to navigate
            </span>
            <span>•</span>
            <span>
              <strong className="text-[#1d1d1f] dark:text-[#f5f5f7]">ENTER</strong> to select
            </span>
          </div>
          <div className="flex items-center gap-1">
            <span>ZipStream Tool Suite</span>
          </div>
        </div>
      </div>
    </div>
  );
};
