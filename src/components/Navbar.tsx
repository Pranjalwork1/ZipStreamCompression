import React, { useState, useEffect, useRef } from 'react';
import {
  FileText,
  FilePlus,
  Camera,
  Sparkles,
  Scissors,
  Stamp,
  Image as ImageIcon,
  Film,
  Music,
  Lock,
  Unlock,
  EyeOff,
  ShieldCheck,
  Receipt,
  QrCode,
  Share2,
  PenTool,
  Search,
  Sun,
  Moon,
  ChevronDown,
  ArrowRight,
  Menu,
  X,
  Shield,
  HelpCircle,
  FileSpreadsheet,
  Presentation,
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
  toolsCount?: number;
}

type DropdownKey = 'tools' | 'solutions' | 'resources' | null;

export const Navbar: React.FC<NavbarProps> = ({
  activeTool,
  onSelectTool,
  onReset,
  onOpenReportIssue,
  onOpenSearch,
  theme = 'light',
  onToggleTheme,
}) => {
  const [activeDropdown, setActiveDropdown] = useState<DropdownKey>(null);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [mobileExpandedSection, setMobileExpandedSection] = useState<DropdownKey>(null);
  const [isScrolled, setIsScrolled] = useState(false);
  const dropdownTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const navContainerRef = useRef<HTMLDivElement>(null);

  const isDark = theme === 'dark';
  const isHomepage = activeTool === 'compress';

  // Track window scroll to slightly increase shadow and backdrop opacity when scrolling
  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 15);
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const handleMouseEnter = (key: DropdownKey) => {
    if (dropdownTimeoutRef.current) {
      clearTimeout(dropdownTimeoutRef.current);
      dropdownTimeoutRef.current = null;
    }
    setActiveDropdown(key);
  };

  const handleMouseLeave = () => {
    dropdownTimeoutRef.current = setTimeout(() => {
      setActiveDropdown(null);
    }, 180);
  };

  const toggleDropdownClick = (key: DropdownKey) => {
    setActiveDropdown((prev) => (prev === key ? null : key));
  };

  // Close menus on outside click or Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setActiveDropdown(null);
        setIsMobileMenuOpen(false);
      }
    };

    const handleClickOutside = (e: MouseEvent) => {
      if (navContainerRef.current && !navContainerRef.current.contains(e.target as Node)) {
        setActiveDropdown(null);
        setIsMobileMenuOpen(false);
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.removeEventListener('mousedown', handleClickOutside);
      if (dropdownTimeoutRef.current) clearTimeout(dropdownTimeoutRef.current);
    };
  }, []);

  // Lock body scroll when mobile menu is active
  useEffect(() => {
    if (isMobileMenuOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isMobileMenuOpen]);

  const handleToolClick = (tool: ToolMode) => {
    setActiveDropdown(null);
    setIsMobileMenuOpen(false);
    onSelectTool(tool);
  };

  const handlePrimaryCta = () => {
    setActiveDropdown(null);
    setIsMobileMenuOpen(false);
    if (!isHomepage) {
      onReset();
    } else {
      const dropzone = document.getElementById('main-dropzone') || document.getElementById('compression-suite');
      if (dropzone) {
        dropzone.scrollIntoView({ behavior: 'smooth' });
      } else {
        onSelectTool('compress');
      }
    }
  };

  return (
    <header
      id="main-navbar-wrapper"
      className="sticky top-0 z-50 w-full px-3 sm:px-6 pt-3 sm:pt-4 pointer-events-none transition-all duration-200"
      role="banner"
    >
      <div
        ref={navContainerRef}
        className={`pointer-events-auto max-w-[1140px] w-full mx-auto rounded-[22px] transition-all duration-300 ${
          isScrolled
            ? 'bg-white/75 dark:bg-[#0B132B]/75 shadow-[0_16px_40px_-6px_rgba(15,23,42,0.1),0_0_0_1px_rgba(255,255,255,0.95)_inset] dark:shadow-[0_20px_48px_-8px_rgba(0,0,0,0.8),0_0_0_1px_rgba(255,255,255,0.12)_inset]'
            : 'bg-white/60 dark:bg-[#0B132B]/60 shadow-[0_10px_30px_-6px_rgba(15,23,42,0.06),0_0_0_1px_rgba(255,255,255,0.85)_inset,0_1px_2px_0_rgba(255,255,255,0.9)_inset] dark:shadow-[0_14px_36px_-6px_rgba(0,0,0,0.6),0_0_0_1px_rgba(255,255,255,0.08)_inset,0_1px_2px_0_rgba(255,255,255,0.12)_inset]'
        } backdrop-blur-2xl border border-white/70 dark:border-white/[0.12] h-14 sm:h-[58px] px-3.5 sm:px-5 flex items-center justify-between gap-3 relative`}
      >
        {/* ─── LEFT: Refined ZipStream SaaS Brandmark ───────────────────────── */}
        <div className="flex items-center gap-3 shrink-0">
          <button
            id="brand-logo-btn"
            onClick={() => {
              setActiveDropdown(null);
              setIsMobileMenuOpen(false);
              onReset();
            }}
            className="flex items-center gap-2.5 text-left focus:outline-none group cursor-pointer"
            aria-label="ZipStream Home"
          >
            {/* Geometric Converging Logo Mark */}
            <div className="relative w-7.5 h-7.5 rounded-[10px] bg-gradient-to-br from-[#0C162C] to-[#1E293B] dark:from-white/15 dark:to-white/5 border border-black/10 dark:border-white/15 text-white flex items-center justify-center shadow-xs transition-transform duration-200 group-hover:scale-105">
              <svg
                viewBox="0 0 24 24"
                className="w-4 h-4"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path
                  d="M4 8L12 3L20 8"
                  stroke="#FF5722"
                  strokeWidth="2.2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
                <path
                  d="M4 16L12 21L20 16"
                  stroke="#00ff87"
                  strokeWidth="2.2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
                <circle cx="12" cy="12" r="2" fill="currentColor" />
              </svg>
            </div>

            {/* Wordmark */}
            <span className="text-[16px] sm:text-[17px] font-bold tracking-tight text-[#0C162C] dark:text-white transition-colors">
              zipstream<span className="text-[#FF5722]">.</span>
            </span>
          </button>

          {/* Breadcrumb back button when inside a specific tool */}
          {!isHomepage && (
            <button
              onClick={onReset}
              className="hidden lg:inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium text-slate-500 dark:text-slate-400 hover:text-[#0C162C] dark:hover:text-white hover:bg-black/5 dark:hover:bg-white/5 transition-colors cursor-pointer"
              title="Return to Home"
            >
              <span>←</span>
              <span>All Tools</span>
            </button>
          )}
        </div>

        {/* ─── CENTER: Clean SaaS Text Links (Desktop) ──────────────────────── */}
        <nav
          className="hidden md:flex items-center gap-1"
          role="navigation"
          aria-label="Main Navigation"
        >
          {/* 1. Tools Flyout Trigger */}
          <div
            className="relative"
            onMouseEnter={() => handleMouseEnter('tools')}
            onMouseLeave={handleMouseLeave}
          >
            <button
              id="nav-tools-trigger"
              type="button"
              onClick={() => toggleDropdownClick('tools')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[13px] font-medium transition-all duration-150 cursor-pointer ${
                activeDropdown === 'tools'
                  ? 'text-[#0C162C] dark:text-white bg-black/[0.04] dark:bg-white/[0.08]'
                  : 'text-slate-600 dark:text-slate-300 hover:text-[#0C162C] dark:hover:text-white hover:bg-black/[0.03] dark:hover:bg-white/[0.05]'
              }`}
              aria-expanded={activeDropdown === 'tools'}
              aria-haspopup="true"
            >
              <span>Tools</span>
              <ChevronDown
                className={`w-3.5 h-3.5 text-slate-400 transition-transform duration-200 ${
                  activeDropdown === 'tools' ? 'rotate-180 text-[#0C162C] dark:text-white' : ''
                }`}
              />
            </button>

            {/* Compact SaaS Tools Flyout Card */}
            {activeDropdown === 'tools' && (
              <div
                className="absolute top-[calc(100%+8px)] left-1/2 -translate-x-1/2 w-[480px] animate-in fade-in zoom-in-95 duration-150 origin-top z-50"
                role="menu"
                aria-label="Tools Menu"
              >
                <div className="bg-white/80 dark:bg-[#0B132B]/80 backdrop-blur-3xl rounded-2xl border border-white/80 dark:border-white/[0.14] shadow-[0_24px_50px_-12px_rgba(15,23,42,0.18),0_0_0_1px_rgba(255,255,255,0.85)_inset,0_1px_2px_0_rgba(255,255,255,0.9)_inset] dark:shadow-[0_24px_60px_-12px_rgba(0,0,0,0.85),0_0_0_1px_rgba(255,255,255,0.08)_inset] p-4">
                  <div className="grid grid-cols-2 gap-3">
                    
                    {/* Column 1: PDF Essentials */}
                    <div className="space-y-1">
                      <span className="text-[11px] font-bold text-slate-400 dark:text-slate-400 uppercase tracking-wider block px-2.5 py-1">
                        PDF Essentials
                      </span>
                      {[
                        { id: 'compress', name: 'Compress PDF', icon: <FileText className="w-3.5 h-3.5 text-red-500" /> },
                        { id: 'merge_pdf', name: 'Merge PDF', icon: <FilePlus className="w-3.5 h-3.5 text-blue-500" /> },
                        { id: 'split_pdf', name: 'Split & Extract', icon: <Scissors className="w-3.5 h-3.5 text-amber-500" /> },
                        { id: 'scan_document', name: 'Scan Document', icon: <Camera className="w-3.5 h-3.5 text-emerald-500" /> },
                        { id: 'watermark_pdf', name: 'Watermark PDF', icon: <Stamp className="w-3.5 h-3.5 text-purple-500" /> },
                      ].map((t) => (
                        <button
                          key={t.id}
                          onClick={() => handleToolClick(t.id as ToolMode)}
                          className="w-full flex items-center gap-2.5 px-2.5 py-1.5 rounded-xl text-left hover:bg-slate-100/80 dark:hover:bg-white/[0.06] transition-colors group cursor-pointer"
                        >
                          <span className="p-1 rounded-lg bg-slate-100 dark:bg-white/10 text-slate-700 dark:text-slate-200 shrink-0 group-hover:scale-105 transition-transform">
                            {t.icon}
                          </span>
                          <span className="text-[13px] font-medium text-slate-800 dark:text-slate-200 group-hover:text-[#FF5722] dark:group-hover:text-[#FF5722] transition-colors">
                            {t.name}
                          </span>
                        </button>
                      ))}
                    </div>

                    {/* Column 2: Document Conversion */}
                    <div className="space-y-1">
                      <span className="text-[11px] font-bold text-slate-400 dark:text-slate-400 uppercase tracking-wider block px-2.5 py-1">
                        Conversion
                      </span>
                      {[
                        { id: 'word_to_pdf', name: 'Word to PDF', icon: <FileText className="w-3.5 h-3.5 text-blue-600" /> },
                        { id: 'pdf_to_word', name: 'PDF to Word', icon: <FileText className="w-3.5 h-3.5 text-indigo-500" /> },
                        { id: 'images_to_pdf', name: 'Images to PDF', icon: <ImageIcon className="w-3.5 h-3.5 text-pink-500" /> },
                        { id: 'excel_to_pdf', name: 'Excel to PDF', icon: <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600" /> },
                        { id: 'pptx_to_pdf', name: 'PowerPoint to PDF', icon: <Presentation className="w-3.5 h-3.5 text-orange-500" /> },
                      ].map((t) => (
                        <button
                          key={t.id}
                          onClick={() => handleToolClick(t.id as ToolMode)}
                          className="w-full flex items-center gap-2.5 px-2.5 py-1.5 rounded-xl text-left hover:bg-slate-100/80 dark:hover:bg-white/[0.06] transition-colors group cursor-pointer"
                        >
                          <span className="p-1 rounded-lg bg-slate-100 dark:bg-white/10 text-slate-700 dark:text-slate-200 shrink-0 group-hover:scale-105 transition-transform">
                            {t.icon}
                          </span>
                          <span className="text-[13px] font-medium text-slate-800 dark:text-slate-200 group-hover:text-[#FF5722] dark:group-hover:text-[#FF5722] transition-colors">
                            {t.name}
                          </span>
                        </button>
                      ))}
                    </div>

                  </div>

                  {/* Flyout Footer Link */}
                  <div className="mt-3 pt-2.5 border-t border-slate-100 dark:border-white/10 flex items-center justify-between px-1">
                    <span className="text-xs text-slate-600 dark:text-slate-400">
                      Private, on-device &amp; sandboxed
                    </span>
                    <button
                      onClick={() => {
                        setActiveDropdown(null);
                        onOpenSearch?.();
                      }}
                      className="inline-flex items-center gap-1 text-xs font-semibold text-[#FF5722] hover:text-[#e64a19] transition-colors cursor-pointer"
                    >
                      <span>Explore all 30+ tools</span>
                      <ArrowRight className="w-3 h-3" />
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* 2. Solutions Flyout Trigger */}
          <div
            className="relative"
            onMouseEnter={() => handleMouseEnter('solutions')}
            onMouseLeave={handleMouseLeave}
          >
            <button
              id="nav-solutions-trigger"
              type="button"
              onClick={() => toggleDropdownClick('solutions')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[13px] font-medium transition-all duration-150 cursor-pointer ${
                activeDropdown === 'solutions'
                  ? 'text-[#0C162C] dark:text-white bg-black/[0.04] dark:bg-white/[0.08]'
                  : 'text-slate-600 dark:text-slate-300 hover:text-[#0C162C] dark:hover:text-white hover:bg-black/[0.03] dark:hover:bg-white/[0.05]'
              }`}
              aria-expanded={activeDropdown === 'solutions'}
              aria-haspopup="true"
            >
              <span>Solutions</span>
              <ChevronDown
                className={`w-3.5 h-3.5 text-slate-400 transition-transform duration-200 ${
                  activeDropdown === 'solutions' ? 'rotate-180 text-[#0C162C] dark:text-white' : ''
                }`}
              />
            </button>

            {/* Compact Solutions Flyout Card */}
            {activeDropdown === 'solutions' && (
              <div
                className="absolute top-[calc(100%+8px)] left-1/2 -translate-x-1/2 w-[360px] animate-in fade-in zoom-in-95 duration-150 origin-top z-50"
                role="menu"
                aria-label="Solutions Menu"
              >
                <div className="bg-white/80 dark:bg-[#0B132B]/80 backdrop-blur-3xl rounded-2xl border border-white/80 dark:border-white/[0.14] shadow-[0_24px_50px_-12px_rgba(15,23,42,0.18),0_0_0_1px_rgba(255,255,255,0.85)_inset,0_1px_2px_0_rgba(255,255,255,0.9)_inset] dark:shadow-[0_24px_60px_-12px_rgba(0,0,0,0.85),0_0_0_1px_rgba(255,255,255,0.08)_inset] p-4 space-y-3">
                  
                  {/* Security */}
                  <div className="space-y-1">
                    <span className="text-[11px] font-bold text-slate-400 dark:text-slate-400 uppercase tracking-wider block px-2.5 py-0.5">
                      Security &amp; Privacy
                    </span>
                    {[
                      { id: 'encrypt_pdf', name: 'Password Protect PDF', icon: <Lock className="w-3.5 h-3.5 text-emerald-500" /> },
                      { id: 'unlock_pdf', name: 'Unlock Password PDF', icon: <Unlock className="w-3.5 h-3.5 text-amber-500" /> },
                      { id: 'auto_redact_pii', name: 'Auto-Redact Sensitive PII', icon: <EyeOff className="w-3.5 h-3.5 text-rose-500" /> },
                      { id: 'privacy_scanner', name: 'Privacy Metadata Scanner', icon: <ShieldCheck className="w-3.5 h-3.5 text-blue-500" /> },
                    ].map((s) => (
                      <button
                        key={s.id}
                        onClick={() => handleToolClick(s.id as ToolMode)}
                        className="w-full flex items-center gap-2.5 px-2.5 py-1.5 rounded-xl text-left hover:bg-slate-100/80 dark:hover:bg-white/[0.06] transition-colors group cursor-pointer"
                      >
                        <span className="p-1 rounded-lg bg-slate-100 dark:bg-white/10 text-slate-700 dark:text-slate-200 shrink-0 group-hover:scale-105 transition-transform">
                          {s.icon}
                        </span>
                        <span className="text-[13px] font-medium text-slate-800 dark:text-slate-200 group-hover:text-[#FF5722] dark:group-hover:text-[#FF5722] transition-colors">
                          {s.name}
                        </span>
                      </button>
                    ))}
                  </div>

                  {/* Business & Team */}
                  <div className="space-y-1 pt-1 border-t border-slate-100 dark:border-white/10">
                    <span className="text-[11px] font-bold text-slate-400 dark:text-slate-400 uppercase tracking-wider block px-2.5 py-0.5">
                      Business &amp; Team
                    </span>
                    {[
                      { id: 'gst_invoice', name: 'GST Invoice Generator', icon: <Receipt className="w-3.5 h-3.5 text-indigo-500" /> },
                      { id: 'pos_billing', name: 'POS Quick Billing (UPI QR)', icon: <QrCode className="w-3.5 h-3.5 text-blue-500" /> },
                      { id: 'p2p_share', name: 'P2P Encrypted File Share', icon: <Share2 className="w-3.5 h-3.5 text-emerald-500" /> },
                      { id: 'collab_whiteboard', name: 'Collaborative Whiteboard', icon: <PenTool className="w-3.5 h-3.5 text-purple-500" /> },
                    ].map((s) => (
                      <button
                        key={s.id}
                        onClick={() => handleToolClick(s.id as ToolMode)}
                        className="w-full flex items-center gap-2.5 px-2.5 py-1.5 rounded-xl text-left hover:bg-slate-100/80 dark:hover:bg-white/[0.06] transition-colors group cursor-pointer"
                      >
                        <span className="p-1 rounded-lg bg-slate-100 dark:bg-white/10 text-slate-700 dark:text-slate-200 shrink-0 group-hover:scale-105 transition-transform">
                          {s.icon}
                        </span>
                        <span className="text-[13px] font-medium text-slate-800 dark:text-slate-200 group-hover:text-[#FF5722] dark:group-hover:text-[#FF5722] transition-colors">
                          {s.name}
                        </span>
                      </button>
                    ))}
                  </div>

                </div>
              </div>
            )}
          </div>

          {/* 3. Resources Flyout Trigger */}
          <div
            className="relative"
            onMouseEnter={() => handleMouseEnter('resources')}
            onMouseLeave={handleMouseLeave}
          >
            <button
              id="nav-resources-trigger"
              type="button"
              onClick={() => toggleDropdownClick('resources')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[13px] font-medium transition-all duration-150 cursor-pointer ${
                activeDropdown === 'resources'
                  ? 'text-[#0C162C] dark:text-white bg-black/[0.04] dark:bg-white/[0.08]'
                  : 'text-slate-600 dark:text-slate-300 hover:text-[#0C162C] dark:hover:text-white hover:bg-black/[0.03] dark:hover:bg-white/[0.05]'
              }`}
              aria-expanded={activeDropdown === 'resources'}
              aria-haspopup="true"
            >
              <span>Resources</span>
              <ChevronDown
                className={`w-3.5 h-3.5 text-slate-400 transition-transform duration-200 ${
                  activeDropdown === 'resources' ? 'rotate-180 text-[#0C162C] dark:text-white' : ''
                }`}
              />
            </button>

            {/* Compact Resources Flyout Card */}
            {activeDropdown === 'resources' && (
              <div
                className="absolute top-[calc(100%+8px)] left-1/2 -translate-x-1/2 w-[340px] animate-in fade-in zoom-in-95 duration-150 origin-top z-50"
                role="menu"
                aria-label="Resources Menu"
              >
                <div className="bg-white/80 dark:bg-[#0B132B]/80 backdrop-blur-3xl rounded-2xl border border-white/80 dark:border-white/[0.14] shadow-[0_24px_50px_-12px_rgba(15,23,42,0.18),0_0_0_1px_rgba(255,255,255,0.85)_inset,0_1px_2px_0_rgba(255,255,255,0.9)_inset] dark:shadow-[0_24px_60px_-12px_rgba(0,0,0,0.85),0_0_0_1px_rgba(255,255,255,0.08)_inset] p-4 space-y-2">
                  
                  {/* Privacy Statement */}
                  <div className="p-3 rounded-xl bg-black/[0.02] dark:bg-white/[0.04] backdrop-blur-sm border border-black/[0.04] dark:border-white/[0.06]">
                    <div className="flex items-center gap-2 text-[#047857] dark:text-emerald-400 text-xs font-semibold">
                      <Shield className="w-3.5 h-3.5" />
                      <span>100% Private Architecture</span>
                    </div>
                    <p className="text-[12px] text-slate-600 dark:text-slate-300 mt-1 leading-relaxed">
                      Files are processed client-side in your browser or in isolated short-lived sandboxes. Zero permanent storage.
                    </p>
                  </div>

                  {/* Feedback & Support */}
                  <button
                    onClick={() => {
                      setActiveDropdown(null);
                      onOpenReportIssue?.();
                    }}
                    className="w-full flex items-center justify-between p-2.5 rounded-xl text-left hover:bg-slate-100/80 dark:hover:bg-white/[0.06] transition-colors group cursor-pointer"
                  >
                    <div className="flex items-center gap-2.5">
                      <span className="p-1.5 rounded-lg bg-amber-500/10 text-amber-600 dark:text-amber-400 shrink-0">
                        <HelpCircle className="w-4 h-4" />
                      </span>
                      <span className="text-[13px] font-medium text-slate-800 dark:text-slate-200 group-hover:text-[#FF5722] transition-colors">
                        Feedback &amp; Support
                      </span>
                    </div>
                    <ArrowRight className="w-3.5 h-3.5 text-slate-400 group-hover:text-[#FF5722] transition-colors" />
                  </button>

                  {/* Command Palette Shortcut */}
                  <button
                    onClick={() => {
                      setActiveDropdown(null);
                      onOpenSearch?.();
                    }}
                    className="w-full flex items-center justify-between p-2.5 rounded-xl text-left hover:bg-slate-100/80 dark:hover:bg-white/[0.06] transition-colors group cursor-pointer"
                  >
                    <div className="flex items-center gap-2.5">
                      <span className="p-1.5 rounded-lg bg-blue-500/10 text-blue-600 dark:text-blue-400 shrink-0">
                        <Search className="w-4 h-4" />
                      </span>
                      <span className="text-[13px] font-medium text-slate-800 dark:text-slate-200 group-hover:text-[#FF5722] transition-colors">
                        Command Palette
                      </span>
                    </div>
                    <kbd className="text-[10px] font-semibold text-slate-500 bg-slate-200/60 dark:bg-white/10 px-1.5 py-0.5 rounded">
                      ⌘K
                    </kbd>
                  </button>

                </div>
              </div>
            )}
          </div>
        </nav>

        {/* ─── RIGHT: Search, Theme Toggle, Primary CTA & Mobile Toggle ─────── */}
        <div className="flex items-center gap-2 sm:gap-2.5">
          
          {/* Compact SaaS Search Pill (Desktop) */}
          {onOpenSearch && (
            <button
              id="nav-search-trigger-btn"
              type="button"
              onClick={onOpenSearch}
              className="hidden sm:flex items-center gap-2 h-8.5 px-3 rounded-[12px] bg-slate-100/80 dark:bg-white/[0.06] hover:bg-slate-200/70 dark:hover:bg-white/10 text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-white border border-transparent hover:border-black/[0.06] dark:hover:border-white/[0.08] transition-all cursor-pointer group shadow-2xs"
              title="Search tools (Press ⌘K or Ctrl+K)"
              aria-label="Search tools"
            >
              <Search className="w-3.5 h-3.5 text-slate-400 group-hover:text-[#FF5722] transition-colors shrink-0" />
              <span className="text-[12.5px] font-medium">Search</span>
              <kbd className="inline-flex items-center text-[10px] font-semibold text-slate-500 dark:text-slate-400 bg-white dark:bg-white/10 px-1.5 py-0.5 rounded-md border border-black/[0.06] dark:border-white/10 shadow-2xs">
                ⌘K
              </kbd>
            </button>
          )}

          {/* Search Icon Button (Mobile) */}
          {onOpenSearch && (
            <button
              type="button"
              onClick={onOpenSearch}
              className="sm:hidden flex items-center justify-center w-8.5 h-8.5 rounded-xl text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-white/[0.08] transition-colors cursor-pointer"
              aria-label="Search tools"
            >
              <Search className="w-4 h-4" />
            </button>
          )}

          {/* Subtle Theme Toggle Button */}
          {onToggleTheme && (
            <button
              id="nav-theme-toggle-btn"
              type="button"
              onClick={onToggleTheme}
              className="flex items-center justify-center w-8.5 h-8.5 rounded-[12px] text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/[0.08] transition-colors cursor-pointer shrink-0"
              title={`Switch to ${isDark ? 'Light' : 'Dark'} Mode`}
              aria-label={`Switch to ${isDark ? 'Light' : 'Dark'} Mode`}
            >
              {isDark ? (
                <Sun className="w-4 h-4 text-amber-400" />
              ) : (
                <Moon className="w-4 h-4 text-slate-700" />
              )}
            </button>
          )}

          {/* Primary High-Contrast SaaS CTA */}
          <button
            id="nav-primary-cta-btn"
            type="button"
            onClick={handlePrimaryCta}
            className="hidden sm:inline-flex items-center justify-center h-8.5 px-3.5 rounded-[12px] bg-[#0C162C] dark:bg-white text-white dark:text-[#0C162C] hover:bg-[#1E293B] dark:hover:bg-slate-100 text-[12.5px] font-semibold tracking-tight shadow-xs transition-all duration-150 cursor-pointer active:scale-98"
          >
            <span>{isHomepage ? 'Start Compressing' : 'All Tools'}</span>
          </button>

          {/* Mobile Menu Hamburger Toggle */}
          <button
            type="button"
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            className="md:hidden flex items-center justify-center w-8.5 h-8.5 rounded-xl text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-white/[0.08] transition-colors cursor-pointer"
            aria-label={isMobileMenuOpen ? 'Close Menu' : 'Open Menu'}
            aria-expanded={isMobileMenuOpen}
          >
            {isMobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>

        </div>

        {/* ─── DETACHED MOBILE FLOATING DRAWER CARD ──────────────────────────── */}
        {isMobileMenuOpen && (
          <div
            className="md:hidden absolute top-[calc(100%+8px)] inset-x-0 bg-white/85 dark:bg-[#0B132B]/85 backdrop-blur-3xl rounded-[22px] border border-white/80 dark:border-white/[0.14] shadow-[0_24px_50px_-12px_rgba(15,23,42,0.2),0_0_0_1px_rgba(255,255,255,0.85)_inset] dark:shadow-[0_24px_60px_-12px_rgba(0,0,0,0.9),0_0_0_1px_rgba(255,255,255,0.08)_inset] p-4 max-h-[calc(100vh-80px)] overflow-y-auto animate-in slide-in-from-top-2 duration-150 z-50"
            role="dialog"
            aria-modal="true"
            aria-label="Mobile Navigation"
          >
            <div className="space-y-2.5 pb-2">
              
              {/* Search Bar in Mobile Menu */}
              {onOpenSearch && (
                <button
                  type="button"
                  onClick={() => {
                    setIsMobileMenuOpen(false);
                    onOpenSearch();
                  }}
                  className="w-full flex items-center justify-between h-10 px-3.5 rounded-xl bg-slate-100/80 dark:bg-white/[0.06] text-slate-500 dark:text-slate-400 text-xs font-medium border border-black/[0.04] dark:border-white/[0.06]"
                >
                  <div className="flex items-center gap-2">
                    <Search className="w-3.5 h-3.5 text-[#FF5722]" />
                    <span>Search all 30+ tools...</span>
                  </div>
                  <kbd className="text-[10px] font-semibold text-slate-500 bg-white dark:bg-white/10 px-1.5 py-0.5 rounded border border-black/[0.06]">
                    ⌘K
                  </kbd>
                </button>
              )}

              {/* Mobile Accordion: Tools */}
              <div className="border border-black/[0.06] dark:border-white/[0.08] rounded-xl overflow-hidden bg-slate-50/50 dark:bg-white/[0.02]">
                <button
                  type="button"
                  onClick={() =>
                    setMobileExpandedSection(mobileExpandedSection === 'tools' ? null : 'tools')
                  }
                  className="w-full flex items-center justify-between p-3 text-left text-xs font-semibold text-slate-800 dark:text-slate-100 cursor-pointer"
                >
                  <span>Tools</span>
                  <ChevronDown
                    className={`w-3.5 h-3.5 text-slate-400 transition-transform duration-200 ${
                      mobileExpandedSection === 'tools' ? 'rotate-180' : ''
                    }`}
                  />
                </button>

                {mobileExpandedSection === 'tools' && (
                  <div className="p-2.5 pt-0 grid grid-cols-2 gap-1 border-t border-black/[0.04] dark:border-white/[0.06]">
                    {[
                      { id: 'compress', name: 'Compress PDF' },
                      { id: 'merge_pdf', name: 'Merge PDF' },
                      { id: 'split_pdf', name: 'Split PDF' },
                      { id: 'scan_document', name: 'Scan Document' },
                      { id: 'word_to_pdf', name: 'Word to PDF' },
                      { id: 'pdf_to_word', name: 'PDF to Word' },
                      { id: 'images_to_pdf', name: 'Images to PDF' },
                      { id: 'excel_to_pdf', name: 'Excel to PDF' },
                    ].map((t) => (
                      <button
                        key={t.id}
                        onClick={() => handleToolClick(t.id as ToolMode)}
                        className="w-full text-left px-2.5 py-1.5 rounded-lg text-xs font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-200/50 dark:hover:bg-white/10 transition-colors truncate"
                      >
                        {t.name}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Mobile Accordion: Solutions */}
              <div className="border border-black/[0.06] dark:border-white/[0.08] rounded-xl overflow-hidden bg-slate-50/50 dark:bg-white/[0.02]">
                <button
                  type="button"
                  onClick={() =>
                    setMobileExpandedSection(mobileExpandedSection === 'solutions' ? null : 'solutions')
                  }
                  className="w-full flex items-center justify-between p-3 text-left text-xs font-semibold text-slate-800 dark:text-slate-100 cursor-pointer"
                >
                  <span>Solutions</span>
                  <ChevronDown
                    className={`w-3.5 h-3.5 text-slate-400 transition-transform duration-200 ${
                      mobileExpandedSection === 'solutions' ? 'rotate-180' : ''
                    }`}
                  />
                </button>

                {mobileExpandedSection === 'solutions' && (
                  <div className="p-2.5 pt-0 grid grid-cols-2 gap-1 border-t border-black/[0.04] dark:border-white/[0.06]">
                    {[
                      { id: 'encrypt_pdf', name: 'Protect PDF' },
                      { id: 'unlock_pdf', name: 'Unlock PDF' },
                      { id: 'auto_redact_pii', name: 'Redact PII' },
                      { id: 'privacy_scanner', name: 'Privacy Scanner' },
                      { id: 'gst_invoice', name: 'GST Invoicing' },
                      { id: 'p2p_share', name: 'P2P File Share' },
                    ].map((s) => (
                      <button
                        key={s.id}
                        onClick={() => handleToolClick(s.id as ToolMode)}
                        className="w-full text-left px-2.5 py-1.5 rounded-lg text-xs font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-200/50 dark:hover:bg-white/10 transition-colors truncate"
                      >
                        {s.name}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Mobile Accordion: Resources */}
              <div className="border border-black/[0.06] dark:border-white/[0.08] rounded-xl overflow-hidden bg-slate-50/50 dark:bg-white/[0.02]">
                <button
                  type="button"
                  onClick={() =>
                    setMobileExpandedSection(mobileExpandedSection === 'resources' ? null : 'resources')
                  }
                  className="w-full flex items-center justify-between p-3 text-left text-xs font-semibold text-slate-800 dark:text-slate-100 cursor-pointer"
                >
                  <span>Resources &amp; Support</span>
                  <ChevronDown
                    className={`w-3.5 h-3.5 text-slate-400 transition-transform duration-200 ${
                      mobileExpandedSection === 'resources' ? 'rotate-180' : ''
                    }`}
                  />
                </button>

                {mobileExpandedSection === 'resources' && (
                  <div className="p-2.5 pt-1.5 space-y-1.5 border-t border-black/[0.04] dark:border-white/[0.06]">
                    <div className="flex items-center gap-1.5 text-[11px] font-semibold text-[#047857] dark:text-emerald-400 px-2 py-0.5">
                      <Shield className="w-3 h-3" />
                      <span>100% Client-Side &amp; Sandboxed Privacy</span>
                    </div>
                    <button
                      onClick={() => {
                        setIsMobileMenuOpen(false);
                        onOpenReportIssue?.();
                      }}
                      className="w-full text-left px-2.5 py-1.5 rounded-lg text-xs font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-200/50 dark:hover:bg-white/10 transition-colors flex items-center justify-between"
                    >
                      <span>Report Issue / Support</span>
                      <HelpCircle className="w-3.5 h-3.5 text-amber-500" />
                    </button>
                  </div>
                )}
              </div>

              {/* Mobile Actions: Theme & Primary CTA */}
              <div className="pt-1.5 flex items-center gap-2">
                {onToggleTheme && (
                  <button
                    type="button"
                    onClick={onToggleTheme}
                    className="flex-1 flex items-center justify-center gap-1.5 h-10 rounded-xl bg-slate-100 dark:bg-white/[0.06] text-slate-700 dark:text-slate-200 font-medium text-xs border border-black/[0.04] dark:border-white/[0.06]"
                  >
                    {isDark ? <Sun className="w-3.5 h-3.5 text-amber-400" /> : <Moon className="w-3.5 h-3.5 text-slate-700" />}
                    <span>{isDark ? 'Light' : 'Dark'}</span>
                  </button>
                )}

                <button
                  type="button"
                  onClick={handlePrimaryCta}
                  className="flex-1 h-10 rounded-xl bg-[#0C162C] dark:bg-white text-white dark:text-[#0C162C] font-semibold text-xs shadow-xs"
                >
                  <span>{isHomepage ? 'Start Free' : 'Home'}</span>
                </button>
              </div>

            </div>
          </div>
        )}

      </div>
    </header>
  );
};
