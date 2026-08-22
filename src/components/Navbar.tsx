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
}) => {
  const categories: {
    id: FileCategory;
    label: string;
    icon: React.ReactNode;
  }[] = [
    {
      id: 'all',
      label: 'All',
      icon: <Layers className="w-3.5 h-3.5" />,
    },
    {
      id: 'pdf',
      label: 'PDF',
      icon: <FileText className="w-3.5 h-3.5" />,
    },
    {
      id: 'image',
      label: 'Images',
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
      className="sticky top-0 z-50 w-full backdrop-blur-xl bg-white/95 dark:bg-[#18181b]/95 border-b border-black/[0.06] dark:border-white/[0.08] transition-colors"
    >
      <div className="max-w-7xl mx-auto px-3 sm:px-4 lg:px-6 h-14 sm:h-15 flex items-center justify-between gap-2.5 sm:gap-3">
        {/* Left: macOS Window Traffic Lights & App Brand */}
        <div className="flex items-center gap-2.5 sm:gap-3 shrink-0">
          {/* macOS 3 Color Traffic Lights */}
          <div
            id="macos-traffic-lights"
            className="flex items-center gap-1.5 px-2 py-1 rounded-full bg-black/[0.03] dark:bg-white/[0.05] border border-black/[0.04] dark:border-white/[0.06] shadow-2xs"
          >
            <span
              title="Close window"
              className="w-2.5 h-2.5 sm:w-3 sm:h-3 rounded-full bg-[#ff5f56] hover:bg-[#ff4238] border border-[#e0443e]/60 transition-transform hover:scale-115 shadow-[inset_0_1px_1px_rgba(255,255,255,0.4)] cursor-pointer"
            />
            <span
              title="Minimize window"
              className="w-2.5 h-2.5 sm:w-3 sm:h-3 rounded-full bg-[#ffbd2e] hover:bg-[#e5a522] border border-[#dea123]/60 transition-transform hover:scale-115 shadow-[inset_0_1px_1px_rgba(255,255,255,0.4)] cursor-pointer"
            />
            <span
              title="Zoom window"
              className="w-2.5 h-2.5 sm:w-3 sm:h-3 rounded-full bg-[#27c93f] hover:bg-[#1eb033] border border-[#1aab29]/60 transition-transform hover:scale-115 shadow-[inset_0_1px_1px_rgba(255,255,255,0.4)] cursor-pointer"
            />
          </div>

          {/* Brand Logo & Name */}
          <button
            id="brand-logo-btn"
            onClick={onReset}
            className="flex items-center gap-2 text-left focus:outline-none rounded-xl group cursor-pointer"
          >
            <div className="w-7.5 h-7.5 sm:w-8 sm:h-8 rounded-[8px] sm:rounded-[9px] bg-[#1d1d1f] dark:bg-[#2c2c2e] text-white shadow-xs flex items-center justify-center transition-transform group-hover:scale-105 border border-black/5 dark:border-white/10">
              <span className="text-[13px] font-bold">⇲</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="text-[14px] sm:text-[15px] font-bold tracking-tight text-[#1d1d1f] dark:text-[#f5f5f7]">
                ZipStream
              </span>
              <span className="hidden lg:inline text-[10px] font-semibold px-1.5 py-0.5 rounded-[5px] bg-[#0071e3]/10 dark:bg-[#2997ff]/20 text-[#0071e3] dark:text-[#2997ff]">
                Studio
              </span>
            </div>
          </button>
        </div>

        {/* Center: Segmented Formats */}
        <div className="hidden md:flex items-center gap-1.5 lg:gap-2">
          {activeTool === 'compress' ? (
            <nav
              aria-label="Format filter"
              className="p-1 rounded-xl bg-black/[0.04] dark:bg-white/[0.06] border border-black/[0.04] dark:border-white/[0.06] flex items-center gap-0.5 shadow-2xs"
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
                    className={`flex items-center gap-1.5 px-2.5 lg:px-3 py-1 rounded-[7px] text-[12px] font-medium transition-all duration-150 select-none cursor-pointer ${
                      isActive
                        ? 'bg-white dark:bg-[#2c2c2e] text-[#1d1d1f] dark:text-[#f5f5f7] shadow-xs'
                        : 'text-[#6e6e73] dark:text-[#a1a1a6] hover:text-[#1d1d1f] dark:hover:text-[#f5f5f7]'
                    }`}
                  >
                    <span className={isActive ? 'text-[#0071e3] dark:text-[#2997ff]' : 'text-[#86868b] dark:text-[#8e8e93]'}>
                      {item.icon}
                    </span>
                    <span>{item.label}</span>
                  </button>
                );
              })}
            </nav>
          ) : (
            <button
              onClick={() => onSelectTool('compress')}
              className="flex items-center gap-1.5 px-3 py-1 rounded-xl bg-black/[0.04] dark:bg-white/[0.06] hover:bg-black/[0.08] dark:hover:bg-white/[0.1] text-[12px] font-medium text-[#1d1d1f] dark:text-[#f5f5f7] transition-colors cursor-pointer"
            >
              <span>← Back to Compressor</span>
            </button>
          )}
        </div>

        {/* Right: Adjusted Smaller Search Bar, Dark Mode Toggle, Privacy Indicator & Feedback */}
        <div className="flex items-center gap-1.5 sm:gap-2 flex-1 md:flex-initial justify-end">
          {/* Sleek & Compact Search Bar */}
          <button
            id="nav-search-trigger-btn"
            type="button"
            onClick={onOpenSearch}
            className="flex items-center justify-between gap-2 w-full sm:w-40 md:w-44 lg:w-48 xl:w-52 h-8.5 px-2.5 sm:px-3 rounded-lg bg-black/[0.04] dark:bg-white/[0.06] hover:bg-black/[0.07] dark:hover:bg-white/[0.1] border border-black/[0.06] dark:border-white/[0.08] hover:border-black/[0.12] dark:hover:border-white/[0.15] text-[#1d1d1f] dark:text-[#f5f5f7] transition-all group cursor-pointer shadow-2xs"
            title="Search tools, formats, and actions (Press ⌘K or Ctrl+K)"
          >
            <div className="flex items-center gap-1.5 min-w-0">
              <Search className="w-3.5 h-3.5 shrink-0 text-[#86868b] dark:text-[#8e8e93] group-hover:text-[#0071e3] dark:group-hover:text-[#2997ff] transition-colors" />
              <span className="text-[12px] text-[#6e6e73] dark:text-[#a1a1a6] group-hover:text-[#1d1d1f] dark:group-hover:text-[#f5f5f7] truncate font-normal">
                Search tools...
              </span>
            </div>
            <kbd className="hidden sm:inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded bg-white dark:bg-[#2c2c2e] text-[10px] font-mono text-[#86868b] dark:text-[#a1a1a6] border border-black/[0.08] dark:border-white/[0.1] shadow-2xs shrink-0">
              <span>⌘</span>K
            </kbd>
          </button>

          {/* Light / Dark Mode Toggle */}
          {onToggleTheme && (
            <button
              id="nav-theme-toggle-btn"
              type="button"
              onClick={onToggleTheme}
              className="flex items-center justify-center w-8.5 h-8.5 rounded-lg bg-black/[0.04] dark:bg-white/[0.06] hover:bg-black/[0.08] dark:hover:bg-white/[0.12] border border-black/[0.06] dark:border-white/[0.08] text-[#1d1d1f] dark:text-[#f5f5f7] transition-all cursor-pointer shadow-2xs shrink-0 group"
              title={`Switch to ${isDark ? 'Light' : 'Dark'} Mode`}
              aria-label={`Switch to ${isDark ? 'Light' : 'Dark'} Mode`}
            >
              {isDark ? (
                <Sun className="w-3.5 h-3.5 text-[#ffbd2e] group-hover:rotate-45 transition-transform duration-300" />
              ) : (
                <Moon className="w-3.5 h-3.5 text-[#5856d6] group-hover:-rotate-12 transition-transform duration-300" />
              )}
            </button>
          )}

          {/* Privacy badge */}
          <div className="hidden xl:flex items-center gap-1 text-[11.5px] text-[#6e6e73] dark:text-[#a1a1a6] font-medium px-1 shrink-0">
            <Lock className="w-3 h-3 text-[#34c759]" />
            <span>Private</span>
          </div>

          {/* Report Issue / Feedback modal button */}
          <button
            id="nav-report-issue-btn"
            type="button"
            onClick={onOpenReportIssue}
            className="flex items-center gap-1.5 px-2.5 sm:px-3 h-8.5 rounded-lg hover:bg-black/[0.05] dark:hover:bg-white/[0.08] text-[#86868b] dark:text-[#a1a1a6] hover:text-[#1d1d1f] dark:hover:text-[#f5f5f7] text-[12px] font-medium transition-colors cursor-pointer shrink-0 border border-transparent hover:border-black/[0.04] dark:hover:border-white/[0.06]"
            title="Report an issue or send feedback"
          >
            <AlertCircle className="w-3.5 h-3.5 text-[#ff3b30]" />
            <span className="hidden sm:inline">Feedback</span>
          </button>
        </div>
      </div>
    </header>
  );
};
