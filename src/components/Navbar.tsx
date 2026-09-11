import React, { useState, useEffect, useRef, useCallback } from 'react';
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
  GitCompare,
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
  CheckCircle2,
  ExternalLink,
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

type DropdownKey = 'tools' | 'solutions' | 'resources' | null;

export const Navbar: React.FC<NavbarProps> = ({
  activeTool,
  onSelectTool,
  onReset,
  onOpenReportIssue,
  onOpenSearch,
  theme = 'light',
  onToggleTheme,
  toolsCount,
}) => {
  const [activeDropdown, setActiveDropdown] = useState<DropdownKey>(null);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [mobileExpandedSection, setMobileExpandedSection] = useState<DropdownKey>(null);
  const dropdownTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const navContainerRef = useRef<HTMLElement>(null);

  const isDark = theme === 'dark';
  const isHomepage = activeTool === 'compress';

  // Handle dropdown mouse enter/leave with generous grace delay for smooth hover
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
    }, 160);
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
      ref={navContainerRef}
      id="main-navbar"
      className="sticky top-0 z-50 w-full bg-white/85 dark:bg-[#0B132B]/85 backdrop-blur-md border-b border-black/[0.06] dark:border-white/[0.08] transition-colors"
      role="banner"
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 sm:h-[68px] flex items-center justify-between gap-4">
        
        {/* ─── LEFT: Refined ZipStream SaaS Brandmark ───────────────────────── */}
        <div className="flex items-center gap-4 shrink-0">
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
            {/* Modern Geometric Logo Icon */}
            <div className="relative w-8 h-8 rounded-xl bg-gradient-to-br from-[#0C162C] to-[#1E293B] dark:from-white/15 dark:to-white/5 border border-black/10 dark:border-white/15 text-white flex items-center justify-center shadow-xs transition-all duration-200 group-hover:scale-105 group-hover:border-[#FF5722]/50">
              <svg
                viewBox="0 0 24 24"
                className="w-4.5 h-4.5 transition-transform duration-200 group-hover:scale-110"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
              >
                {/* Two converging dynamic geometric compression arrows */}
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
                <circle cx="12" cy="12" r="2.2" fill="currentColor" />
              </svg>
            </div>

            {/* Typography */}
            <div className="flex items-baseline">
              <span className="text-[17px] sm:text-lg font-bold tracking-tight text-[#0C162C] dark:text-white transition-colors">
                zipstream<span className="text-[#FF5722]">.</span>
              </span>
            </div>
          </button>

          {/* Breadcrumb back-link when inside a specific tool */}
          {!isHomepage && (
            <button
              onClick={onReset}
              className="hidden lg:inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium text-slate-500 dark:text-slate-400 hover:text-[#0C162C] dark:hover:text-white hover:bg-black/5 dark:hover:bg-white/5 transition-colors cursor-pointer"
              title="Return to Home & All Tools"
            >
              <span>←</span>
              <span>All Tools</span>
            </button>
          )}
        </div>

        {/* ─── CENTER: SaaS Desktop Navigation Links ────────────────────────── */}
        <nav
          className="hidden md:flex items-center gap-1 lg:gap-2"
          role="navigation"
          aria-label="Main Navigation"
        >
          {/* 1. Tools Dropdown Trigger */}
          <div
            className="relative"
            onMouseEnter={() => handleMouseEnter('tools')}
            onMouseLeave={handleMouseLeave}
          >
            <button
              id="nav-tools-trigger"
              type="button"
              onClick={() => toggleDropdownClick('tools')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[13px] font-medium transition-all duration-150 cursor-pointer ${
                activeDropdown === 'tools'
                  ? 'text-[#0C162C] dark:text-white bg-black/[0.04] dark:bg-white/[0.06]'
                  : 'text-slate-600 dark:text-slate-300 hover:text-[#0C162C] dark:hover:text-white hover:bg-black/[0.03] dark:hover:bg-white/[0.04]'
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

            {/* Tools Dropdown Card */}
            {activeDropdown === 'tools' && (
              <div
                className="absolute top-full left-1/2 -translate-x-1/2 pt-2 w-[640px] animate-in fade-in zoom-in-95 duration-150 origin-top z-50"
                role="menu"
                aria-label="Tools Menu"
              >
                <div className="bg-white/95 dark:bg-[#0F172A]/95 backdrop-blur-xl rounded-2xl border border-black/[0.08] dark:border-white/[0.1] shadow-[0_20px_40px_-15px_rgba(0,0,0,0.15),0_0_0_1px_rgba(0,0,0,0.04)] dark:shadow-[0_20px_40px_-15px_rgba(0,0,0,0.6)] p-5">
                  <div className="grid grid-cols-3 gap-6">
                    
                    {/* Column 1: Core PDF Tools */}
                    <div className="space-y-2">
                      <span className="text-[11px] font-bold text-slate-400 dark:text-slate-400 uppercase tracking-wider block px-2">
                        Core PDF
                      </span>
                      <div className="space-y-0.5">
                        {[
                          { id: 'compress', name: 'Compress PDF', icon: <FileText className="w-3.5 h-3.5 text-red-500" />, desc: 'Shrink file size' },
                          { id: 'merge_pdf', name: 'Merge PDF', icon: <FilePlus className="w-3.5 h-3.5 text-blue-500" />, desc: 'Combine multiple files' },
                          { id: 'split_pdf', name: 'Split & Extract', icon: <Scissors className="w-3.5 h-3.5 text-amber-500" />, desc: 'Separate pages' },
                          { id: 'scan_document', name: 'Scan Document', icon: <Camera className="w-3.5 h-3.5 text-emerald-500" />, desc: 'Photo / camera scan' },
                          { id: 'watermark_pdf', name: 'Watermark PDF', icon: <Stamp className="w-3.5 h-3.5 text-purple-500" />, desc: 'Stamp stamps & text' },
                        ].map((t) => (
                          <button
                            key={t.id}
                            onClick={() => handleToolClick(t.id as ToolMode)}
                            className="w-full flex items-start gap-2.5 p-2 rounded-xl text-left hover:bg-slate-100/80 dark:hover:bg-white/[0.06] transition-colors group cursor-pointer"
                          >
                            <span className="p-1 rounded-lg bg-slate-100 dark:bg-white/10 text-slate-700 dark:text-slate-200 shrink-0 group-hover:scale-105 transition-transform">
                              {t.icon}
                            </span>
                            <div className="min-w-0">
                              <p className="text-[13px] font-medium text-slate-800 dark:text-slate-100 group-hover:text-[#FF5722] dark:group-hover:text-[#FF5722] transition-colors leading-tight">
                                {t.name}
                              </p>
                              <p className="text-[11px] text-slate-600 dark:text-slate-400 truncate mt-0.5">
                                {t.desc}
                              </p>
                            </div>
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Column 2: Document Conversion */}
                    <div className="space-y-2">
                      <span className="text-[11px] font-bold text-slate-400 dark:text-slate-400 uppercase tracking-wider block px-2">
                        Convert Document
                      </span>
                      <div className="space-y-0.5">
                        {[
                          { id: 'word_to_pdf', name: 'Word to PDF', icon: <FileText className="w-3.5 h-3.5 text-blue-600" />, desc: 'DOCX with full fidelity' },
                          { id: 'pdf_to_word', name: 'PDF to Word', icon: <FileText className="w-3.5 h-3.5 text-indigo-500" />, desc: 'Export editable DOCX' },
                          { id: 'images_to_pdf', name: 'Images to PDF', icon: <ImageIcon className="w-3.5 h-3.5 text-pink-500" />, desc: 'JPG, PNG to PDF' },
                          { id: 'excel_to_pdf', name: 'Excel to PDF', icon: <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600" />, desc: 'Spreadsheets to PDF' },
                          { id: 'pptx_to_pdf', name: 'PPTX to PDF', icon: <Presentation className="w-3.5 h-3.5 text-orange-500" />, desc: 'Slide decks to PDF' },
                        ].map((t) => (
                          <button
                            key={t.id}
                            onClick={() => handleToolClick(t.id as ToolMode)}
                            className="w-full flex items-start gap-2.5 p-2 rounded-xl text-left hover:bg-slate-100/80 dark:hover:bg-white/[0.06] transition-colors group cursor-pointer"
                          >
                            <span className="p-1 rounded-lg bg-slate-100 dark:bg-white/10 text-slate-700 dark:text-slate-200 shrink-0 group-hover:scale-105 transition-transform">
                              {t.icon}
                            </span>
                            <div className="min-w-0">
                              <p className="text-[13px] font-medium text-slate-800 dark:text-slate-100 group-hover:text-[#FF5722] dark:group-hover:text-[#FF5722] transition-colors leading-tight">
                                {t.name}
                              </p>
                              <p className="text-[11px] text-slate-600 dark:text-slate-400 truncate mt-0.5">
                                {t.desc}
                              </p>
                            </div>
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Column 3: Media & High Performance */}
                    <div className="space-y-2">
                      <span className="text-[11px] font-bold text-slate-400 dark:text-slate-400 uppercase tracking-wider block px-2">
                        Media &amp; Other
                      </span>
                      <div className="space-y-0.5">
                        {[
                          { id: 'compress', name: 'Compress Images', icon: <ImageIcon className="w-3.5 h-3.5 text-cyan-500" />, desc: 'JPG, PNG, WebP' },
                          { id: 'compress', name: 'Compress Video', icon: <Film className="w-3.5 h-3.5 text-rose-500" />, desc: 'MP4, MOV, WebM' },
                          { id: 'compress', name: 'Compress Audio', icon: <Music className="w-3.5 h-3.5 text-violet-500" />, desc: 'MP3, WAV, M4A' },
                          { id: 'extract_text', name: 'Extract Text', icon: <Sparkles className="w-3.5 h-3.5 text-amber-500" />, desc: 'PDF text & Markdown' },
                          { id: 'pdf_to_jpg', name: 'PDF to JPG', icon: <ImageIcon className="w-3.5 h-3.5 text-orange-500" />, desc: 'Pages as image gallery' },
                        ].map((t, idx) => (
                          <button
                            key={`${t.id}-${idx}`}
                            onClick={() => handleToolClick(t.id as ToolMode)}
                            className="w-full flex items-start gap-2.5 p-2 rounded-xl text-left hover:bg-slate-100/80 dark:hover:bg-white/[0.06] transition-colors group cursor-pointer"
                          >
                            <span className="p-1 rounded-lg bg-slate-100 dark:bg-white/10 text-slate-700 dark:text-slate-200 shrink-0 group-hover:scale-105 transition-transform">
                              {t.icon}
                            </span>
                            <div className="min-w-0">
                              <p className="text-[13px] font-medium text-slate-800 dark:text-slate-100 group-hover:text-[#FF5722] dark:group-hover:text-[#FF5722] transition-colors leading-tight">
                                {t.name}
                              </p>
                              <p className="text-[11px] text-slate-600 dark:text-slate-400 truncate mt-0.5">
                                {t.desc}
                              </p>
                            </div>
                          </button>
                        ))}
                      </div>
                    </div>

                  </div>

                  {/* Dropdown Footer */}
                  <div className="mt-4 pt-3 border-t border-slate-100 dark:border-white/10 flex items-center justify-between">
                    <span className="text-xs text-slate-600 dark:text-slate-400 font-medium">
                      All tools process privately with client-side &amp; isolated sandboxes.
                    </span>
                    <button
                      onClick={() => {
                        setActiveDropdown(null);
                        onOpenSearch?.();
                      }}
                      className="inline-flex items-center gap-1 text-xs font-semibold text-[#FF5722] hover:text-[#e64a19] transition-colors cursor-pointer"
                    >
                      <span>Explore all 30+ tools</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* 2. Solutions Dropdown Trigger */}
          <div
            className="relative"
            onMouseEnter={() => handleMouseEnter('solutions')}
            onMouseLeave={handleMouseLeave}
          >
            <button
              id="nav-solutions-trigger"
              type="button"
              onClick={() => toggleDropdownClick('solutions')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[13px] font-medium transition-all duration-150 cursor-pointer ${
                activeDropdown === 'solutions'
                  ? 'text-[#0C162C] dark:text-white bg-black/[0.04] dark:bg-white/[0.06]'
                  : 'text-slate-600 dark:text-slate-300 hover:text-[#0C162C] dark:hover:text-white hover:bg-black/[0.03] dark:hover:bg-white/[0.04]'
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

            {/* Solutions Dropdown Card */}
            {activeDropdown === 'solutions' && (
              <div
                className="absolute top-full left-1/2 -translate-x-1/2 pt-2 w-[520px] animate-in fade-in zoom-in-95 duration-150 origin-top z-50"
                role="menu"
                aria-label="Solutions Menu"
              >
                <div className="bg-white/95 dark:bg-[#0F172A]/95 backdrop-blur-xl rounded-2xl border border-black/[0.08] dark:border-white/[0.1] shadow-[0_20px_40px_-15px_rgba(0,0,0,0.15),0_0_0_1px_rgba(0,0,0,0.04)] dark:shadow-[0_20px_40px_-15px_rgba(0,0,0,0.6)] p-5">
                  <div className="grid grid-cols-2 gap-5">
                    
                    {/* Security & Privacy */}
                    <div className="space-y-2">
                      <span className="text-[11px] font-bold text-slate-400 dark:text-slate-400 uppercase tracking-wider block px-2">
                        Security &amp; Privacy
                      </span>
                      <div className="space-y-1">
                        {[
                          { id: 'encrypt_pdf', name: 'Protect PDF', icon: <Lock className="w-3.5 h-3.5 text-emerald-500" />, desc: 'Password encryption' },
                          { id: 'unlock_pdf', name: 'Unlock PDF', icon: <Unlock className="w-3.5 h-3.5 text-amber-500" />, desc: 'Remove document password' },
                          { id: 'auto_redact_pii', name: 'Redact Sensitive PII', icon: <EyeOff className="w-3.5 h-3.5 text-rose-500" />, desc: 'Auto-blackout private data' },
                          { id: 'privacy_scanner', name: 'Privacy Scanner', icon: <ShieldCheck className="w-3.5 h-3.5 text-blue-500" />, desc: 'Inspect hidden metadata' },
                        ].map((s) => (
                          <button
                            key={s.id}
                            onClick={() => handleToolClick(s.id as ToolMode)}
                            className="w-full flex items-start gap-2.5 p-2 rounded-xl text-left hover:bg-slate-100/80 dark:hover:bg-white/[0.06] transition-colors group cursor-pointer"
                          >
                            <span className="p-1 rounded-lg bg-slate-100 dark:bg-white/10 text-slate-700 dark:text-slate-200 shrink-0 group-hover:scale-105 transition-transform">
                              {s.icon}
                            </span>
                            <div className="min-w-0">
                              <p className="text-[13px] font-medium text-slate-800 dark:text-slate-100 group-hover:text-[#FF5722] dark:group-hover:text-[#FF5722] transition-colors leading-tight">
                                {s.name}
                              </p>
                              <p className="text-[11px] text-slate-600 dark:text-slate-400 truncate mt-0.5">
                                {s.desc}
                              </p>
                            </div>
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Business & Collaboration */}
                    <div className="space-y-2">
                      <span className="text-[11px] font-bold text-slate-400 dark:text-slate-400 uppercase tracking-wider block px-2">
                        Business &amp; Team
                      </span>
                      <div className="space-y-1">
                        {[
                          { id: 'gst_invoice', name: 'GST Invoice Builder', icon: <Receipt className="w-3.5 h-3.5 text-indigo-500" />, desc: 'Compliant invoices & tax calc' },
                          { id: 'pos_billing', name: 'POS Quick Billing', icon: <QrCode className="w-3.5 h-3.5 text-blue-500" />, desc: 'Retail receipts with QR' },
                          { id: 'p2p_share', name: 'P2P Direct Share', icon: <Share2 className="w-3.5 h-3.5 text-emerald-500" />, desc: 'Peer-to-peer encrypted transfer' },
                          { id: 'collab_whiteboard', name: 'Live Whiteboard', icon: <PenTool className="w-3.5 h-3.5 text-purple-500" />, desc: 'Real-time collaborative drawing' },
                        ].map((s) => (
                          <button
                            key={s.id}
                            onClick={() => handleToolClick(s.id as ToolMode)}
                            className="w-full flex items-start gap-2.5 p-2 rounded-xl text-left hover:bg-slate-100/80 dark:hover:bg-white/[0.06] transition-colors group cursor-pointer"
                          >
                            <span className="p-1 rounded-lg bg-slate-100 dark:bg-white/10 text-slate-700 dark:text-slate-200 shrink-0 group-hover:scale-105 transition-transform">
                              {s.icon}
                            </span>
                            <div className="min-w-0">
                              <p className="text-[13px] font-medium text-slate-800 dark:text-slate-100 group-hover:text-[#FF5722] dark:group-hover:text-[#FF5722] transition-colors leading-tight">
                                {s.name}
                              </p>
                              <p className="text-[11px] text-slate-600 dark:text-slate-400 truncate mt-0.5">
                                {s.desc}
                              </p>
                            </div>
                          </button>
                        ))}
                      </div>
                    </div>

                  </div>
                </div>
              </div>
            )}
          </div>

          {/* 3. Resources Dropdown Trigger */}
          <div
            className="relative"
            onMouseEnter={() => handleMouseEnter('resources')}
            onMouseLeave={handleMouseLeave}
          >
            <button
              id="nav-resources-trigger"
              type="button"
              onClick={() => toggleDropdownClick('resources')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[13px] font-medium transition-all duration-150 cursor-pointer ${
                activeDropdown === 'resources'
                  ? 'text-[#0C162C] dark:text-white bg-black/[0.04] dark:bg-white/[0.06]'
                  : 'text-slate-600 dark:text-slate-300 hover:text-[#0C162C] dark:hover:text-white hover:bg-black/[0.03] dark:hover:bg-white/[0.04]'
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

            {/* Resources Dropdown Card */}
            {activeDropdown === 'resources' && (
              <div
                className="absolute top-full left-1/2 -translate-x-1/2 pt-2 w-[420px] animate-in fade-in zoom-in-95 duration-150 origin-top z-50"
                role="menu"
                aria-label="Resources Menu"
              >
                <div className="bg-white/95 dark:bg-[#0F172A]/95 backdrop-blur-xl rounded-2xl border border-black/[0.08] dark:border-white/[0.1] shadow-[0_20px_40px_-15px_rgba(0,0,0,0.15),0_0_0_1px_rgba(0,0,0,0.04)] dark:shadow-[0_20px_40px_-15px_rgba(0,0,0,0.6)] p-4 space-y-1.5">
                  
                  {/* Privacy Architecture Link */}
                  <div className="p-3 rounded-xl bg-slate-50 dark:bg-white/[0.03] border border-black/[0.04] dark:border-white/[0.06]">
                    <div className="flex items-center gap-2 text-[#047857] dark:text-emerald-400 text-xs font-semibold">
                      <Shield className="w-3.5 h-3.5" />
                      <span>100% Private Architecture</span>
                    </div>
                    <p className="text-[12px] text-slate-600 dark:text-slate-300 mt-1 leading-relaxed">
                      Files are processed in your browser or isolated short-lived sandboxes and automatically purged. No permanent storage or tracking.
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
                      <div>
                        <p className="text-[13px] font-medium text-slate-800 dark:text-slate-100 group-hover:text-[#FF5722] transition-colors">
                          Feedback &amp; Support
                        </p>
                        <p className="text-[11px] text-slate-600 dark:text-slate-400">
                          Report an issue, request a tool, or get help
                        </p>
                      </div>
                    </div>
                    <ArrowRight className="w-4 h-4 text-slate-400 group-hover:text-[#FF5722] transition-colors" />
                  </button>

                  {/* Search Command Palette Shortcut */}
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
                      <div>
                        <p className="text-[13px] font-medium text-slate-800 dark:text-slate-100 group-hover:text-[#FF5722] transition-colors">
                          Command Palette
                        </p>
                        <p className="text-[11px] text-slate-600 dark:text-slate-400">
                          Search all tools instantly with ⌘K / Ctrl+K
                        </p>
                      </div>
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

        {/* ─── RIGHT: Search, Theme Toggle, Primary SaaS CTA & Mobile Menu ─── */}
        <div className="flex items-center gap-2 sm:gap-3">
          
          {/* Compact SaaS Search Pill (Desktop) */}
          {onOpenSearch && (
            <button
              id="nav-search-trigger-btn"
              type="button"
              onClick={onOpenSearch}
              className="hidden sm:flex items-center gap-2 h-9 px-3 rounded-xl bg-slate-100/70 dark:bg-white/[0.06] hover:bg-slate-200/70 dark:hover:bg-white/10 text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-white border border-transparent hover:border-black/[0.06] dark:hover:border-white/[0.08] transition-all cursor-pointer group shadow-2xs"
              title="Search tools and actions (Press ⌘K or Ctrl+K)"
              aria-label="Search tools"
            >
              <Search className="w-3.5 h-3.5 text-slate-400 group-hover:text-[#FF5722] transition-colors shrink-0" />
              <span className="text-[13px] font-medium">Search</span>
              <kbd className="inline-flex items-center gap-0.5 text-[10px] font-semibold text-slate-500 dark:text-slate-400 bg-white dark:bg-white/10 px-1.5 py-0.5 rounded-md border border-black/[0.06] dark:border-white/10 shadow-2xs">
                ⌘K
              </kbd>
            </button>
          )}

          {/* Search Icon Button (Mobile) */}
          {onOpenSearch && (
            <button
              type="button"
              onClick={onOpenSearch}
              className="sm:hidden flex items-center justify-center w-9 h-9 rounded-xl text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-white/[0.08] transition-colors cursor-pointer"
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
              className="flex items-center justify-center w-9 h-9 rounded-xl text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/[0.08] transition-colors cursor-pointer shrink-0"
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
            className="hidden sm:inline-flex items-center justify-center h-9 px-4 rounded-xl bg-[#0C162C] dark:bg-white text-white dark:text-[#0C162C] hover:bg-[#1E293B] dark:hover:bg-slate-100 text-[13px] font-semibold tracking-[-0.01em] shadow-xs transition-all duration-150 cursor-pointer active:scale-98"
          >
            <span>{isHomepage ? 'Start Compressing' : 'All Tools'}</span>
          </button>

          {/* Mobile Menu Hamburger Button */}
          <button
            type="button"
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            className="md:hidden flex items-center justify-center w-9 h-9 rounded-xl text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-white/[0.08] transition-colors cursor-pointer"
            aria-label={isMobileMenuOpen ? 'Close Menu' : 'Open Menu'}
            aria-expanded={isMobileMenuOpen}
          >
            {isMobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>

        </div>
      </div>

      {/* ─── MOBILE NAVIGATION DRAWER ───────────────────────────────────────── */}
      {isMobileMenuOpen && (
        <div
          className="md:hidden fixed inset-x-0 top-16 bg-white/98 dark:bg-[#0B132B]/98 backdrop-blur-2xl border-b border-black/[0.08] dark:border-white/[0.1] shadow-2xl p-4 max-h-[calc(100vh-64px)] overflow-y-auto animate-in slide-in-from-top-4 duration-200"
          role="dialog"
          aria-modal="true"
          aria-label="Mobile Navigation"
        >
          <div className="space-y-3 pb-6">
            
            {/* Mobile Search Input Trigger */}
            {onOpenSearch && (
              <button
                type="button"
                onClick={() => {
                  setIsMobileMenuOpen(false);
                  onOpenSearch();
                }}
                className="w-full flex items-center justify-between h-11 px-3.5 rounded-xl bg-slate-100/80 dark:bg-white/[0.06] text-slate-500 dark:text-slate-400 text-sm font-medium border border-black/[0.04] dark:border-white/[0.06]"
              >
                <div className="flex items-center gap-2">
                  <Search className="w-4 h-4 text-[#FF5722]" />
                  <span>Search all 30+ tools...</span>
                </div>
                <kbd className="text-[11px] font-semibold text-slate-500 bg-white dark:bg-white/10 px-2 py-0.5 rounded border border-black/[0.06]">
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
                className="w-full flex items-center justify-between p-3.5 text-left text-sm font-semibold text-slate-800 dark:text-slate-100 cursor-pointer"
              >
                <span>Tools</span>
                <ChevronDown
                  className={`w-4 h-4 text-slate-400 transition-transform duration-200 ${
                    mobileExpandedSection === 'tools' ? 'rotate-180' : ''
                  }`}
                />
              </button>

              {mobileExpandedSection === 'tools' && (
                <div className="p-3 pt-0 grid grid-cols-1 sm:grid-cols-2 gap-1 border-t border-black/[0.04] dark:border-white/[0.06]">
                  {[
                    { id: 'compress', name: 'Compress PDF' },
                    { id: 'merge_pdf', name: 'Merge PDF' },
                    { id: 'split_pdf', name: 'Split PDF' },
                    { id: 'scan_document', name: 'Scan Document' },
                    { id: 'word_to_pdf', name: 'Word to PDF' },
                    { id: 'pdf_to_word', name: 'PDF to Word' },
                    { id: 'images_to_pdf', name: 'Images to PDF' },
                    { id: 'excel_to_pdf', name: 'Excel to PDF' },
                    { id: 'watermark_pdf', name: 'Watermark PDF' },
                  ].map((t) => (
                    <button
                      key={t.id}
                      onClick={() => handleToolClick(t.id as ToolMode)}
                      className="w-full text-left px-3 py-2 rounded-lg text-[13px] font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-200/50 dark:hover:bg-white/10 transition-colors"
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
                className="w-full flex items-center justify-between p-3.5 text-left text-sm font-semibold text-slate-800 dark:text-slate-100 cursor-pointer"
              >
                <span>Solutions</span>
                <ChevronDown
                  className={`w-4 h-4 text-slate-400 transition-transform duration-200 ${
                    mobileExpandedSection === 'solutions' ? 'rotate-180' : ''
                  }`}
                />
              </button>

              {mobileExpandedSection === 'solutions' && (
                <div className="p-3 pt-0 grid grid-cols-1 sm:grid-cols-2 gap-1 border-t border-black/[0.04] dark:border-white/[0.06]">
                  {[
                    { id: 'encrypt_pdf', name: 'Protect PDF (Password)' },
                    { id: 'unlock_pdf', name: 'Unlock PDF' },
                    { id: 'auto_redact_pii', name: 'Auto-Redact PII' },
                    { id: 'privacy_scanner', name: 'Privacy Scanner' },
                    { id: 'gst_invoice', name: 'GST Invoice Generator' },
                    { id: 'pos_billing', name: 'POS Quick Billing' },
                    { id: 'p2p_share', name: 'P2P Encrypted File Share' },
                    { id: 'collab_whiteboard', name: 'Collaborative Whiteboard' },
                  ].map((s) => (
                    <button
                      key={s.id}
                      onClick={() => handleToolClick(s.id as ToolMode)}
                      className="w-full text-left px-3 py-2 rounded-lg text-[13px] font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-200/50 dark:hover:bg-white/10 transition-colors"
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
                className="w-full flex items-center justify-between p-3.5 text-left text-sm font-semibold text-slate-800 dark:text-slate-100 cursor-pointer"
              >
                <span>Resources &amp; Support</span>
                <ChevronDown
                  className={`w-4 h-4 text-slate-400 transition-transform duration-200 ${
                    mobileExpandedSection === 'resources' ? 'rotate-180' : ''
                  }`}
                />
              </button>

              {mobileExpandedSection === 'resources' && (
                <div className="p-3 pt-2 space-y-2 border-t border-black/[0.04] dark:border-white/[0.06]">
                  <div className="flex items-center gap-2 text-xs font-semibold text-[#047857] dark:text-emerald-400 px-2 py-1">
                    <Shield className="w-3.5 h-3.5" />
                    <span>100% Client-Side &amp; Sandbox Privacy</span>
                  </div>
                  <button
                    onClick={() => {
                      setIsMobileMenuOpen(false);
                      onOpenReportIssue?.();
                    }}
                    className="w-full text-left px-3 py-2 rounded-lg text-[13px] font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-200/50 dark:hover:bg-white/10 transition-colors flex items-center justify-between"
                  >
                    <span>Report Issue / Support</span>
                    <HelpCircle className="w-3.5 h-3.5 text-amber-500" />
                  </button>
                </div>
              )}
            </div>

            {/* Mobile Actions: Theme & Primary CTA */}
            <div className="pt-2 flex items-center gap-3">
              {onToggleTheme && (
                <button
                  type="button"
                  onClick={onToggleTheme}
                  className="flex-1 flex items-center justify-center gap-2 h-11 rounded-xl bg-slate-100 dark:bg-white/[0.06] text-slate-700 dark:text-slate-200 font-medium text-xs border border-black/[0.04] dark:border-white/[0.06]"
                >
                  {isDark ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4 text-slate-700" />}
                  <span>{isDark ? 'Light Theme' : 'Dark Theme'}</span>
                </button>
              )}

              <button
                type="button"
                onClick={handlePrimaryCta}
                className="flex-1 h-11 rounded-xl bg-[#0C162C] dark:bg-white text-white dark:text-[#0C162C] font-semibold text-xs shadow-xs"
              >
                <span>{isHomepage ? 'Start Free' : 'Home'}</span>
              </button>
            </div>

          </div>
        </div>
      )}

    </header>
  );
};
