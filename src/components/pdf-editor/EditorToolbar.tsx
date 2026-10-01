/**
 * ZipStream PDF Editor — Main Action Toolbar
 * 
 * Provides responsive controls for tool selection, undo/redo, zoom, and export.
 */

import React, { useState, useRef } from 'react';
import {
  MousePointer,
  Type,
  Image as ImageIcon,
  Square,
  Circle,
  Minus,
  ArrowRight,
  Highlighter,
  PenTool,
  Underline as UnderlineIcon,
  Strikethrough,
  MessageSquare,
  Trash2,
  Undo2,
  Redo2,
  ZoomIn,
  ZoomOut,
  Maximize2,
  Download,
  HelpCircle,
  ChevronDown,
} from 'lucide-react';
import { EditorToolType } from './types';

interface EditorToolbarProps {
  activeTool: EditorToolType;
  onSelectTool: (tool: EditorToolType) => void;
  canUndo: boolean;
  canRedo: boolean;
  onUndo: () => void;
  onRedo: () => void;
  zoom: number;
  onZoomIn: () => void;
  onZoomOut: () => void;
  onResetZoom: () => void;
  onFitWidth: () => void;
  onExport: () => void;
  isExporting: boolean;
  onOpenHelp: () => void;
  onSelectImage: () => void;
}

export const EditorToolbar: React.FC<EditorToolbarProps> = ({
  activeTool,
  onSelectTool,
  canUndo,
  canRedo,
  onUndo,
  onRedo,
  zoom,
  onZoomIn,
  onZoomOut,
  onResetZoom,
  onFitWidth,
  onExport,
  isExporting,
  onOpenHelp,
  onSelectImage,
}) => {
  const [isShapeMenuOpen, setIsShapeMenuOpen] = useState(false);
  const shapeMenuRef = useRef<HTMLDivElement>(null);

  const isShapeActive = ['rectangle', 'circle', 'line', 'arrow'].includes(activeTool);

  return (
    <header
      id="pdf-editor-toolbar"
      className="bg-white/95 dark:bg-[#0B132B]/95 backdrop-blur-md border-b border-black/[0.08] dark:border-white/[0.08] px-3 sm:px-5 py-2.5 flex items-center justify-between gap-2 sm:gap-4 select-none z-30 sticky top-0"
    >
      {/* ─── LEFT: Core Editing Tools ────────────────────────────────────────── */}
      <div className="flex items-center gap-1 sm:gap-1.5 overflow-x-auto scrollbar-none py-0.5">
        {/* 1. Select Tool */}
        <button
          type="button"
          onClick={() => onSelectTool('select')}
          className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-xs font-semibold cursor-pointer transition-colors ${
            activeTool === 'select'
              ? 'bg-[#055EFE] text-white shadow-xs'
              : 'hover:bg-black/5 dark:hover:bg-white/10 text-slate-700 dark:text-slate-200'
          }`}
          title="Select & Move (V)"
        >
          <MousePointer className="w-4 h-4" />
          <span className="hidden lg:inline">Select</span>
        </button>

        {/* 2. Text Tool */}
        <button
          type="button"
          onClick={() => onSelectTool('text')}
          className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-xs font-semibold cursor-pointer transition-colors ${
            activeTool === 'text'
              ? 'bg-[#055EFE] text-white shadow-xs'
              : 'hover:bg-black/5 dark:hover:bg-white/10 text-slate-700 dark:text-slate-200'
          }`}
          title="Add Text (T)"
        >
          <Type className="w-4 h-4" />
          <span className="hidden lg:inline">Text</span>
        </button>

        {/* 3. Image Tool */}
        <button
          type="button"
          onClick={onSelectImage}
          className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-xs font-semibold cursor-pointer transition-colors ${
            activeTool === 'image'
              ? 'bg-[#055EFE] text-white shadow-xs'
              : 'hover:bg-black/5 dark:hover:bg-white/10 text-slate-700 dark:text-slate-200'
          }`}
          title="Insert Image (I)"
        >
          <ImageIcon className="w-4 h-4" />
          <span className="hidden lg:inline">Image</span>
        </button>

        {/* 4. Shapes Flyout */}
        <div className="relative" ref={shapeMenuRef}>
          <button
            type="button"
            onClick={() => setIsShapeMenuOpen((prev) => !prev)}
            className={`flex items-center gap-1 px-2.5 py-1.5 rounded-xl text-xs font-semibold cursor-pointer transition-colors ${
              isShapeActive
                ? 'bg-[#055EFE] text-white shadow-xs'
                : 'hover:bg-black/5 dark:hover:bg-white/10 text-slate-700 dark:text-slate-200'
            }`}
            title="Shapes (S)"
          >
            {activeTool === 'circle' ? (
              <Circle className="w-4 h-4" />
            ) : activeTool === 'line' ? (
              <Minus className="w-4 h-4" />
            ) : activeTool === 'arrow' ? (
              <ArrowRight className="w-4 h-4" />
            ) : (
              <Square className="w-4 h-4" />
            )}
            <span className="hidden lg:inline">Shape</span>
            <ChevronDown className="w-3 h-3 opacity-70" />
          </button>

          {isShapeMenuOpen && (
            <div className="absolute top-full left-0 mt-1.5 w-36 bg-white dark:bg-[#111C38] rounded-2xl border border-black/10 dark:border-white/10 shadow-xl p-1.5 z-50 flex flex-col gap-0.5 animate-in fade-in zoom-in-95 duration-100">
              <button
                type="button"
                onClick={() => {
                  onSelectTool('rectangle');
                  setIsShapeMenuOpen(false);
                }}
                className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-xs font-medium hover:bg-slate-100 dark:hover:bg-white/10 text-slate-700 dark:text-slate-200 cursor-pointer"
              >
                <Square className="w-3.5 h-3.5 text-blue-500" />
                <span>Rectangle</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  onSelectTool('circle');
                  setIsShapeMenuOpen(false);
                }}
                className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-xs font-medium hover:bg-slate-100 dark:hover:bg-white/10 text-slate-700 dark:text-slate-200 cursor-pointer"
              >
                <Circle className="w-3.5 h-3.5 text-purple-500" />
                <span>Circle</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  onSelectTool('line');
                  setIsShapeMenuOpen(false);
                }}
                className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-xs font-medium hover:bg-slate-100 dark:hover:bg-white/10 text-slate-700 dark:text-slate-200 cursor-pointer"
              >
                <Minus className="w-3.5 h-3.5 text-emerald-500" />
                <span>Line</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  onSelectTool('arrow');
                  setIsShapeMenuOpen(false);
                }}
                className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-xs font-medium hover:bg-slate-100 dark:hover:bg-white/10 text-slate-700 dark:text-slate-200 cursor-pointer"
              >
                <ArrowRight className="w-3.5 h-3.5 text-rose-500" />
                <span>Arrow</span>
              </button>
            </div>
          )}
        </div>

        {/* 5. Highlight Tool */}
        <button
          type="button"
          onClick={() => onSelectTool('highlight')}
          className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-xs font-semibold cursor-pointer transition-colors ${
            activeTool === 'highlight'
              ? 'bg-[#055EFE] text-white shadow-xs'
              : 'hover:bg-black/5 dark:hover:bg-white/10 text-slate-700 dark:text-slate-200'
          }`}
          title="Highlight (H)"
        >
          <Highlighter className="w-4 h-4 text-amber-400" />
          <span className="hidden lg:inline">Highlight</span>
        </button>

        {/* 6. Draw Tool */}
        <button
          type="button"
          onClick={() => onSelectTool('draw')}
          className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-xs font-semibold cursor-pointer transition-colors ${
            activeTool === 'draw'
              ? 'bg-[#055EFE] text-white shadow-xs'
              : 'hover:bg-black/5 dark:hover:bg-white/10 text-slate-700 dark:text-slate-200'
          }`}
          title="Freehand Draw (D)"
        >
          <PenTool className="w-4 h-4" />
          <span className="hidden lg:inline">Draw</span>
        </button>

        {/* 7. Underline & Strike */}
        <button
          type="button"
          onClick={() => onSelectTool('underline')}
          className={`p-1.5 rounded-xl text-xs font-semibold cursor-pointer transition-colors hidden sm:flex ${
            activeTool === 'underline'
              ? 'bg-[#055EFE] text-white'
              : 'hover:bg-black/5 dark:hover:bg-white/10 text-slate-700 dark:text-slate-200'
          }`}
          title="Underline Markup (U)"
        >
          <UnderlineIcon className="w-4 h-4" />
        </button>

        <button
          type="button"
          onClick={() => onSelectTool('strikethrough')}
          className={`p-1.5 rounded-xl text-xs font-semibold cursor-pointer transition-colors hidden sm:flex ${
            activeTool === 'strikethrough'
              ? 'bg-[#055EFE] text-white'
              : 'hover:bg-black/5 dark:hover:bg-white/10 text-slate-700 dark:text-slate-200'
          }`}
          title="Strikethrough Markup (K)"
        >
          <Strikethrough className="w-4 h-4" />
        </button>

        {/* 8. Comment / Note */}
        <button
          type="button"
          onClick={() => onSelectTool('comment')}
          className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-xs font-semibold cursor-pointer transition-colors ${
            activeTool === 'comment'
              ? 'bg-[#055EFE] text-white shadow-xs'
              : 'hover:bg-black/5 dark:hover:bg-white/10 text-slate-700 dark:text-slate-200'
          }`}
          title="Add Note (N)"
        >
          <MessageSquare className="w-4 h-4" />
          <span className="hidden lg:inline">Note</span>
        </button>
      </div>

      {/* ─── CENTER/RIGHT: Undo / Redo & Zoom ─────────────────────────────────── */}
      <div className="flex items-center gap-1 sm:gap-2 shrink-0">
        {/* Undo & Redo */}
        <div className="flex items-center gap-0.5 bg-slate-100/80 dark:bg-white/[0.06] p-0.5 rounded-xl border border-black/[0.06] dark:border-white/[0.08]">
          <button
            type="button"
            onClick={onUndo}
            disabled={!canUndo}
            className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
              canUndo
                ? 'hover:bg-white dark:hover:bg-white/10 text-slate-700 dark:text-slate-200'
                : 'opacity-30 cursor-not-allowed text-slate-400'
            }`}
            title="Undo (Ctrl+Z)"
          >
            <Undo2 className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={onRedo}
            disabled={!canRedo}
            className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
              canRedo
                ? 'hover:bg-white dark:hover:bg-white/10 text-slate-700 dark:text-slate-200'
                : 'opacity-30 cursor-not-allowed text-slate-400'
            }`}
            title="Redo (Ctrl+Shift+Z)"
          >
            <Redo2 className="w-4 h-4" />
          </button>
        </div>

        {/* Zoom Controls */}
        <div className="hidden md:flex items-center gap-0.5 bg-slate-100/80 dark:bg-white/[0.06] p-0.5 rounded-xl border border-black/[0.06] dark:border-white/[0.08]">
          <button
            type="button"
            onClick={onZoomOut}
            className="p-1.5 rounded-lg hover:bg-white dark:hover:bg-white/10 text-slate-700 dark:text-slate-200 cursor-pointer"
            title="Zoom Out"
          >
            <ZoomOut className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            onClick={onResetZoom}
            className="px-2 py-0.5 font-mono text-[11px] font-bold text-slate-700 dark:text-slate-200 hover:text-[#055EFE] cursor-pointer"
            title="Reset Zoom to 100%"
          >
            {Math.round(zoom * 100)}%
          </button>
          <button
            type="button"
            onClick={onZoomIn}
            className="p-1.5 rounded-lg hover:bg-white dark:hover:bg-white/10 text-slate-700 dark:text-slate-200 cursor-pointer"
            title="Zoom In"
          >
            <ZoomIn className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            onClick={onFitWidth}
            className="p-1.5 rounded-lg hover:bg-white dark:hover:bg-white/10 text-slate-700 dark:text-slate-200 cursor-pointer"
            title="Fit to Width"
          >
            <Maximize2 className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Keyboard Shortcuts Help */}
        <button
          type="button"
          onClick={onOpenHelp}
          className="p-2 rounded-xl text-slate-500 hover:text-slate-800 dark:hover:text-white hover:bg-black/5 dark:hover:bg-white/10 cursor-pointer transition-colors"
          title="Keyboard Shortcuts"
        >
          <HelpCircle className="w-4 h-4" />
        </button>

        {/* ─── EXPORT BUTTON ──────────────────────────────────────────────── */}
        <button
          type="button"
          onClick={onExport}
          disabled={isExporting}
          className="flex items-center gap-2 px-3 sm:px-4 py-2 rounded-xl bg-gradient-to-b from-[#0077ff] to-[#055efe] hover:from-[#006ee6] hover:to-[#0452e0] text-white font-bold text-xs sm:text-sm shadow-md shadow-[#055efe]/25 transition-all cursor-pointer disabled:opacity-50"
        >
          <Download className="w-4 h-4" />
          <span>{isExporting ? 'Exporting…' : 'Export PDF'}</span>
        </button>
      </div>
    </header>
  );
};
