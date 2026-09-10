import React from 'react';
import {
  Layers,
  FileText,
  Image as ImageIcon,
  Film,
  Music,
  Lock,
  AlertCircle,
  Search,
  Sun,
  Moon,
} from 'lucide-react';
import { FileCategory, ToolMode } from '../types';
import { ALL_TOOLS } from './SearchCommandPalette';

interface NavbarProps {
  activeTool: ToolMode;
  onSelectTool: (tool: ToolMode) => void;
  activeCategory: FileCategory;
  onSelectCategory: (category: FileCategory) => void;
  onHoverCategory?: (category: FileCategory | null) => void;
  onReset: () => void;
  hasActiveFile: boolean;
  onOpenReportIssue?: () => void;
  onOpenSearch?: () => void;
  theme?: 'light' | 'dark';
  onToggleTheme?: () => void;
  toolsCount?: number;
}

export const Navbar: React.FC<NavbarProps> = ({
  activeTool,
  onSelectTool,
  activeCategory,
  onSelectCategory,
  onHoverCategory,
  onReset,
  onOpenReportIssue,
  onOpenSearch,
  theme = 'light',
  onToggleTheme,
  toolsCount,
}) => {
  const totalTools = toolsCount ?? ALL_TOOLS.length;
  const toolsLabel = `${Math.floor(totalTools / 5) * 5}+ Tools`;

  const categories: {
    id: FileCategory;
    label: string;
    icon: React.ReactNode;
  }[] = [
    {
      id: 'all',
      label: 'All Files',
      icon: <Layers className="w-3.5 h-3.5" />,
    },
    {
      id: 'pdf',
      label: 'PDF',
      icon: <FileText className="w-3.5 h-3.5" />,
    },
    {
      id: 'image',
      label: 'Photos',
      icon: <ImageIcon className="w-3.5 h-3.5" />,
    },
    {
      id: 'video',
      label: 'Video',
      icon: <Film className="w-3.5 h-3.5" />,
    },
    {
      id: 'audio',
      label: 'Audio',
      icon: <Music className="w-3.5 h-3.5" />,
    },
  ];

  const isDark = theme === 'dark';

  return (
    <header
      id="main-navbar"
      className="sticky top-0 z-50 w-full backdrop-blur-md bg-[#FAF7F2]/90 dark:bg-[#0B132B]/90 border-b border-[#0C162C]/8 dark:border-white/10 transition-colors"
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-15 sm:h-16 flex items-center justify-between gap-3">
        {/* Left: Apple Dots & Brandmark */}
        <div className="flex items-center gap-2.5 sm:gap-3 shrink-0">
          {/* Apple-style 3 Window Dots */}
          <div className="flex items-center gap-1.5 mr-1 shrink-0 select-none" aria-label="Window controls">
            <span className="w-2.5 h-2.5 sm:w-3 sm:h-3 rounded-full bg-[#ff5f56] border border-[#e0443e]/40 shadow-xs inline-block transition-transform hover:scale-110 cursor-pointer" title="Close"></span>
            <span className="w-2.5 h-2.5 sm:w-3 sm:h-3 rounded-full bg-[#ffbd2e] border border-[#dea123]/40 shadow-xs inline-block transition-transform hover:scale-110 cursor-pointer" title="Minimize"></span>
            <span className="w-2.5 h-2.5 sm:w-3 sm:h-3 rounded-full bg-[#27c93f] border border-[#1aab29]/40 shadow-xs inline-block transition-transform hover:scale-110 cursor-pointer" title="Zoom"></span>
          </div>

          <button
            id="brand-logo-btn"
            onClick={onReset}
            className="flex items-center gap-2.5 text-left focus:outline-none group cursor-pointer"
          >
            {/* Logo Icon beside zipstream */}
            <div className="relative w-8.5 h-8.5 rounded-lg bg-[#11141a] border border-white/[0.12] text-white flex items-center justify-center transition-all duration-200 group-hover:border-[#00ff87]/60 group-hover:shadow-[0_0_15px_rgba(0,255,135,0.25)] shadow-xs shrink-0">
              <span className="text-[13px] font-mono font-bold text-[#00ff87]">⇲</span>
              {/* Corner crosshairs */}
              <span className="absolute -top-0.5 -left-0.5 text-[7px] text-white/30 font-mono">+</span>
              <span className="absolute -bottom-0.5 -right-0.5 text-[7px] text-white/30 font-mono">+</span>
            </div>
            <div className="flex flex-col justify-center">
              <div className="flex items-center gap-1">
                <span className="text-base sm:text-lg font-black tracking-tight text-[#0C162C] dark:text-white">
                  zipstream<span className="text-[#FF5722]">.</span>
                </span>
                <span className="text-[10px] uppercase font-bold tracking-wider px-1.5 py-0.5 rounded-full bg-[#FF5722]/10 text-[#FF5722]">
                  STUDIO
                </span>
              </div>
            </div>
          </button>
        </div>

        {/* Center: Nomu Pill Format Navigation */}
        <div className="hidden md:flex items-center gap-2">
          {activeTool !== 'compress' ? (
            <button
              onClick={onReset}
              className="flex items-center gap-1.5 px-4 py-1.5 rounded-full bg-black/5 dark:bg-white/10 hover:bg-black/10 dark:hover:bg-white/15 text-[13px] font-semibold text-[#0C162C] dark:text-white transition-colors cursor-pointer"
            >
              <span>← All Tools & Files</span>
            </button>
          ) : (
            <nav
              aria-label="Format filter"
              className="p-1 rounded-full bg-[#0C162C]/5 dark:bg-white/5 flex items-center gap-1"
            >
              {categories.map((item) => {
                const isActive = activeCategory === item.id;
                return (
                  <button
                    key={item.id}
                    id={`nav-tab-${item.id}`}
                    onClick={() => onSelectCategory(item.id)}
                    onMouseEnter={() => onHoverCategory && onHoverCategory(item.id)}
                    onMouseLeave={() => onHoverCategory && onHoverCategory(null)}
                    className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-semibold transition-all duration-150 select-none cursor-pointer ${
                      isActive
                        ? 'bg-[#0C162C] dark:bg-white text-white dark:text-[#0C162C] shadow-sm'
                        : 'text-[#0C162C]/70 dark:text-white/70 hover:text-[#0C162C] dark:hover:text-white hover:bg-black/5 dark:hover:bg-white/5'
                    }`}
                  >
                    <span>{item.icon}</span>
                    <span>{item.label}</span>
                  </button>
                );
              })}
            </nav>
          )}

          {/* Quick All Tools Pill */}
          <button
            onClick={onOpenSearch}
            className="flex items-center gap-1 px-3.5 py-1.5 rounded-full text-xs font-bold text-[#FF5722] bg-[#FF5722]/10 hover:bg-[#FF5722]/20 transition-all cursor-pointer"
          >
            <span>{toolsLabel}</span>
          </button>
        </div>

        {/* Right: Search, Theme, Security Badge & Feedback */}
        <div className="flex items-center gap-2 sm:gap-2.5 flex-1 md:flex-initial justify-end">
          {/* Nomu Pill Search Bar */}
          <button
            id="nav-search-trigger-btn"
            type="button"
            onClick={onOpenSearch}
            className="flex items-center justify-between gap-2 w-full sm:w-44 md:w-48 lg:w-52 h-9 px-3.5 rounded-full bg-white dark:bg-[#131E3A] hover:bg-white/90 border border-[#0C162C]/10 dark:border-white/10 hover:border-[#FF5722]/50 text-[#0C162C]/70 dark:text-white/70 transition-all group cursor-pointer shadow-sm"
            title="Search tools and actions (Press ⌘K or Ctrl+K)"
          >
            <div className="flex items-center gap-2 min-w-0">
              <Search className="w-3.5 h-3.5 shrink-0 text-[#0C162C]/40 dark:text-white/40 group-hover:text-[#FF5722] transition-colors" />
              <span className="text-xs font-medium text-[#5C6479] dark:text-white/50 group-hover:text-[#0C162C] dark:group-hover:text-white truncate">
                Search tools...
              </span>
            </div>
            <kbd className="hidden sm:inline-flex items-center gap-0.5 px-2 py-0.5 rounded-full bg-[#0C162C]/5 dark:bg-white/10 text-[10px] font-semibold text-[#0C162C]/70 dark:text-white/70 shrink-0">
              <span>⌘</span>K
            </kbd>
          </button>

          {/* Theme Toggle Button */}
          {onToggleTheme && (
            <button
              id="nav-theme-toggle-btn"
              type="button"
              onClick={onToggleTheme}
              className="flex items-center justify-center w-9 h-9 rounded-full bg-white dark:bg-[#131E3A] border border-[#0C162C]/10 dark:border-white/10 text-[#0C162C] dark:text-white hover:border-[#FF5722]/50 transition-all cursor-pointer shrink-0 shadow-sm"
              title={`Switch to ${isDark ? 'Light' : 'Dark'} Mode`}
              aria-label={`Switch to ${isDark ? 'Light' : 'Dark'} Mode`}
            >
              {isDark ? (
                <Sun className="w-4 h-4 text-[#FFCB70]" />
              ) : (
                <Moon className="w-4 h-4 text-[#0C162C]" />
              )}
            </button>
          )}

          {/* Security Badge Pill */}
          <div className="hidden xl:flex items-center gap-1.5 text-xs font-semibold text-[#0C162C] dark:text-white px-3 py-1.5 rounded-full bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-500/20 shrink-0">
            <Lock className="w-3 h-3" />
            <span>100% Private</span>
          </div>

          {/* Feedback button */}
          <button
            id="nav-report-issue-btn"
            type="button"
            onClick={onOpenReportIssue}
            className="flex items-center gap-1 px-3 h-9 rounded-full bg-white dark:bg-[#131E3A] hover:bg-black/5 dark:hover:bg-white/10 text-[#5C6479] dark:text-white/70 hover:text-[#0C162C] dark:hover:text-white text-xs font-medium transition-colors cursor-pointer shrink-0 border border-[#0C162C]/10 dark:border-white/10 shadow-sm"
            title="Feedback & Support"
          >
            <AlertCircle className="w-3.5 h-3.5 text-[#FF5722]" />
            <span className="hidden sm:inline">Help</span>
          </button>
        </div>
      </div>
    </header>
  );
};
