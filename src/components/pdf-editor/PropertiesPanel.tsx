/**
 * ZipStream PDF Editor — Contextual Properties Panel
 * 
 * Displays tool-specific formatting options (Font, Size, Color, Fill, Stroke, Opacity, Align).
 */

import React from 'react';
import {
  Bold,
  Italic,
  Underline as UnderlineIcon,
  AlignLeft,
  AlignCenter,
  AlignRight,
  Minus,
  Plus,
} from 'lucide-react';
import {
  EditorObject,
  TextObject,
  ShapeObject,
  HighlightObject,
  DrawObject,
  FontOption,
  ActiveToolSettings,
} from './types';

interface PropertiesPanelProps {
  selectedObject: EditorObject | null;
  activeTool: string;
  toolSettings: ActiveToolSettings;
  onUpdateSelected: (updated: Partial<EditorObject>) => void;
  onUpdateToolSettings: (settings: Partial<ActiveToolSettings>) => void;
}

const COLOR_PALETTE = [
  '#0C162C', // Near Black
  '#4B5563', // Gray
  '#055EFE', // Brand Blue
  '#EF4444', // Red
  '#10B981', // Green
  '#F59E0B', // Amber
  '#8B5CF6', // Purple
  '#FFE814', // Yellow Highlight
  '#EC4899', // Pink
];

export const PropertiesPanel: React.FC<PropertiesPanelProps> = ({
  selectedObject,
  activeTool,
  toolSettings,
  onUpdateSelected,
  onUpdateToolSettings,
}) => {
  const isText = (selectedObject?.type === 'text') || activeTool === 'text';
  const isShape = (selectedObject?.type === 'shape') || ['rectangle', 'circle', 'line', 'arrow'].includes(activeTool);
  const isHighlight = (selectedObject?.type === 'highlight') || activeTool === 'highlight';
  const isDraw = (selectedObject?.type === 'draw') || activeTool === 'draw';
  const isMarkup = (selectedObject?.type === 'markup') || ['underline', 'strikethrough'].includes(activeTool);

  const textObj = selectedObject?.type === 'text' ? (selectedObject as TextObject) : null;
  const shapeObj = selectedObject?.type === 'shape' ? (selectedObject as ShapeObject) : null;
  const hlObj = selectedObject?.type === 'highlight' ? (selectedObject as HighlightObject) : null;
  const drawObj = selectedObject?.type === 'draw' ? (selectedObject as DrawObject) : null;

  return (
    <div
      id="pdf-editor-properties-panel"
      className="bg-white/95 dark:bg-[#111C38]/95 backdrop-blur-md border border-black/10 dark:border-white/10 px-3 py-1.5 rounded-2xl shadow-md flex items-center flex-wrap gap-2 text-xs text-slate-800 dark:text-slate-200 transition-all select-none"
    >
      {/* ─── TEXT PROPERTIES ────────────────────────────────────────────── */}
      {isText && (
        <div className="flex items-center gap-1.5 flex-wrap">
          {/* Font Family */}
          <select
            value={textObj?.fontFamily || toolSettings.fontFamily}
            onChange={(e) => {
              const val = e.target.value as FontOption;
              if (textObj) onUpdateSelected({ fontFamily: val });
              onUpdateToolSettings({ fontFamily: val });
            }}
            className="bg-slate-100 dark:bg-white/10 px-2 py-1 rounded-lg border border-black/10 dark:border-white/10 text-xs font-medium cursor-pointer focus:outline-none"
          >
            <option value="Helvetica">Helvetica (Standard)</option>
            <option value="TimesRoman">Times New Roman</option>
            <option value="Courier">Courier Monospace</option>
          </select>

          {/* Font Size */}
          <div className="flex items-center bg-slate-100 dark:bg-white/10 rounded-lg border border-black/10 dark:border-white/10 overflow-hidden">
            <button
              type="button"
              onClick={() => {
                const cur = textObj?.fontSize || toolSettings.fontSize;
                const next = Math.max(8, cur - 2);
                if (textObj) onUpdateSelected({ fontSize: next });
                onUpdateToolSettings({ fontSize: next });
              }}
              className="p-1 hover:bg-black/5 dark:hover:bg-white/10 cursor-pointer"
              title="Decrease font size"
            >
              <Minus className="w-3 h-3" />
            </button>
            <span className="px-2 font-mono text-[11px] font-bold">
              {textObj?.fontSize || toolSettings.fontSize}
            </span>
            <button
              type="button"
              onClick={() => {
                const cur = textObj?.fontSize || toolSettings.fontSize;
                const next = Math.min(96, cur + 2);
                if (textObj) onUpdateSelected({ fontSize: next });
                onUpdateToolSettings({ fontSize: next });
              }}
              className="p-1 hover:bg-black/5 dark:hover:bg-white/10 cursor-pointer"
              title="Increase font size"
            >
              <Plus className="w-3 h-3" />
            </button>
          </div>

          <div className="w-[1px] h-4 bg-slate-200 dark:bg-white/10" />

          {/* Bold, Italic, Underline */}
          <button
            type="button"
            onClick={() => {
              const cur = textObj?.fontWeight || toolSettings.fontWeight;
              const next = cur === 'bold' ? 'normal' : 'bold';
              if (textObj) onUpdateSelected({ fontWeight: next });
              onUpdateToolSettings({ fontWeight: next });
            }}
            className={`p-1.5 rounded-lg cursor-pointer transition-colors ${
              (textObj ? textObj.fontWeight === 'bold' : toolSettings.fontWeight === 'bold')
                ? 'bg-[#055EFE] text-white'
                : 'hover:bg-black/5 dark:hover:bg-white/10 text-slate-700 dark:text-slate-300'
            }`}
            title="Bold"
          >
            <Bold className="w-3.5 h-3.5" />
          </button>

          <button
            type="button"
            onClick={() => {
              const cur = textObj?.fontStyle || toolSettings.fontStyle;
              const next = cur === 'italic' ? 'normal' : 'italic';
              if (textObj) onUpdateSelected({ fontStyle: next });
              onUpdateToolSettings({ fontStyle: next });
            }}
            className={`p-1.5 rounded-lg cursor-pointer transition-colors ${
              (textObj ? textObj.fontStyle === 'italic' : toolSettings.fontStyle === 'italic')
                ? 'bg-[#055EFE] text-white'
                : 'hover:bg-black/5 dark:hover:bg-white/10 text-slate-700 dark:text-slate-300'
            }`}
            title="Italic"
          >
            <Italic className="w-3.5 h-3.5" />
          </button>

          <button
            type="button"
            onClick={() => {
              const cur = textObj?.textDecoration || toolSettings.textDecoration;
              const next = cur === 'underline' ? 'none' : 'underline';
              if (textObj) onUpdateSelected({ textDecoration: next });
              onUpdateToolSettings({ textDecoration: next });
            }}
            className={`p-1.5 rounded-lg cursor-pointer transition-colors ${
              (textObj ? textObj.textDecoration === 'underline' : toolSettings.textDecoration === 'underline')
                ? 'bg-[#055EFE] text-white'
                : 'hover:bg-black/5 dark:hover:bg-white/10 text-slate-700 dark:text-slate-300'
            }`}
            title="Underline"
          >
            <UnderlineIcon className="w-3.5 h-3.5" />
          </button>

          <div className="w-[1px] h-4 bg-slate-200 dark:bg-white/10" />

          {/* Alignment */}
          <div className="flex items-center gap-0.5 bg-slate-100 dark:bg-white/10 p-0.5 rounded-lg border border-black/10 dark:border-white/10">
            {(['left', 'center', 'right'] as const).map((align) => {
              const isActive = (textObj ? textObj.textAlign === align : toolSettings.textAlign === align);
              return (
                <button
                  key={align}
                  type="button"
                  onClick={() => {
                    if (textObj) onUpdateSelected({ textAlign: align });
                    onUpdateToolSettings({ textAlign: align });
                  }}
                  className={`p-1 rounded cursor-pointer ${
                    isActive ? 'bg-white dark:bg-[#0C162C] text-[#055EFE] shadow-xs' : 'text-slate-500 hover:text-slate-800 dark:hover:text-white'
                  }`}
                  title={`Align ${align}`}
                >
                  {align === 'left' && <AlignLeft className="w-3.5 h-3.5" />}
                  {align === 'center' && <AlignCenter className="w-3.5 h-3.5" />}
                  {align === 'right' && <AlignRight className="w-3.5 h-3.5" />}
                </button>
              );
            })}
          </div>

          <div className="w-[1px] h-4 bg-slate-200 dark:bg-white/10" />

          {/* Color Palette */}
          <div className="flex items-center gap-1">
            {COLOR_PALETTE.slice(0, 6).map((c) => {
              const activeColor = textObj?.color || toolSettings.textColor;
              return (
                <button
                  key={c}
                  type="button"
                  onClick={() => {
                    if (textObj) onUpdateSelected({ color: c });
                    onUpdateToolSettings({ textColor: c });
                  }}
                  className={`w-4 h-4 rounded-full border border-black/20 dark:border-white/20 cursor-pointer transition-transform ${
                    activeColor === c ? 'scale-125 ring-2 ring-[#055EFE]' : 'hover:scale-110'
                  }`}
                  style={{ backgroundColor: c }}
                  title={c}
                />
              );
            })}
          </div>
        </div>
      )}

      {/* ─── SHAPE PROPERTIES ───────────────────────────────────────────── */}
      {isShape && (
        <div className="flex items-center gap-2 flex-wrap">
          {/* Stroke Width */}
          <span className="text-[11px] text-slate-500">Stroke:</span>
          <div className="flex items-center gap-1">
            {[1, 2, 4, 6].map((w) => {
              const curW = shapeObj?.strokeWidth || toolSettings.shapeStrokeWidth;
              return (
                <button
                  key={w}
                  type="button"
                  onClick={() => {
                    if (shapeObj) onUpdateSelected({ strokeWidth: w });
                    onUpdateToolSettings({ shapeStrokeWidth: w });
                  }}
                  className={`px-2 py-0.5 rounded text-[11px] font-mono cursor-pointer ${
                    curW === w
                      ? 'bg-[#055EFE] text-white font-bold'
                      : 'bg-slate-100 dark:bg-white/10 hover:bg-slate-200'
                  }`}
                >
                  {w}px
                </button>
              );
            })}
          </div>

          <div className="w-[1px] h-4 bg-slate-200 dark:bg-white/10" />

          {/* Stroke Color */}
          <span className="text-[11px] text-slate-500">Color:</span>
          <div className="flex items-center gap-1">
            {COLOR_PALETTE.slice(0, 6).map((c) => {
              const activeC = shapeObj?.stroke || toolSettings.shapeStroke;
              return (
                <button
                  key={c}
                  type="button"
                  onClick={() => {
                    if (shapeObj) onUpdateSelected({ stroke: c });
                    onUpdateToolSettings({ shapeStroke: c });
                  }}
                  className={`w-4 h-4 rounded-full border border-black/20 dark:border-white/20 cursor-pointer transition-transform ${
                    activeC === c ? 'scale-125 ring-2 ring-[#055EFE]' : 'hover:scale-110'
                  }`}
                  style={{ backgroundColor: c }}
                />
              );
            })}
          </div>

          <div className="w-[1px] h-4 bg-slate-200 dark:bg-white/10" />

          {/* Fill Color */}
          <span className="text-[11px] text-slate-500">Fill:</span>
          <button
            type="button"
            onClick={() => {
              if (shapeObj) onUpdateSelected({ fill: 'transparent' });
              onUpdateToolSettings({ shapeFill: 'transparent' });
            }}
            className={`px-2 py-0.5 rounded text-[11px] cursor-pointer ${
              (shapeObj ? shapeObj.fill === 'transparent' : toolSettings.shapeFill === 'transparent')
                ? 'bg-slate-300 dark:bg-white/20 font-bold'
                : 'bg-slate-100 dark:bg-white/10'
            }`}
          >
            None
          </button>
          <div className="flex items-center gap-1">
            {['#FFFFFF', '#FFE814', '#055EFE', '#EF4444', '#10B981'].map((c) => {
              const activeFill = shapeObj?.fill || toolSettings.shapeFill;
              return (
                <button
                  key={c}
                  type="button"
                  onClick={() => {
                    if (shapeObj) onUpdateSelected({ fill: c });
                    onUpdateToolSettings({ shapeFill: c });
                  }}
                  className={`w-4 h-4 rounded-sm border border-black/20 dark:border-white/20 cursor-pointer transition-transform ${
                    activeFill === c ? 'scale-125 ring-2 ring-[#055EFE]' : 'hover:scale-110'
                  }`}
                  style={{ backgroundColor: c }}
                />
              );
            })}
          </div>
        </div>
      )}

      {/* ─── HIGHLIGHT PROPERTIES ───────────────────────────────────────── */}
      {isHighlight && (
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-[11px] text-slate-500">Highlight Color:</span>
          <div className="flex items-center gap-1.5">
            {['#FFE814', '#34D399', '#F472B6', '#60A5FA', '#FBBF24'].map((c) => {
              const curColor = hlObj?.color || toolSettings.highlightColor;
              return (
                <button
                  key={c}
                  type="button"
                  onClick={() => {
                    if (hlObj) onUpdateSelected({ color: c });
                    onUpdateToolSettings({ highlightColor: c });
                  }}
                  className={`w-5 h-5 rounded-full border border-black/20 dark:border-white/20 cursor-pointer transition-transform ${
                    curColor === c ? 'scale-125 ring-2 ring-[#055EFE]' : 'hover:scale-110'
                  }`}
                  style={{ backgroundColor: c }}
                />
              );
            })}
          </div>
        </div>
      )}

      {/* ─── DRAW PROPERTIES ────────────────────────────────────────────── */}
      {isDraw && (
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-[11px] text-slate-500">Pen Size:</span>
          <div className="flex items-center gap-1">
            {[2, 4, 6, 10].map((w) => {
              const curW = drawObj?.strokeWidth || toolSettings.drawWidth;
              return (
                <button
                  key={w}
                  type="button"
                  onClick={() => {
                    if (drawObj) onUpdateSelected({ strokeWidth: w });
                    onUpdateToolSettings({ drawWidth: w });
                  }}
                  className={`px-2 py-0.5 rounded text-[11px] font-mono cursor-pointer ${
                    curW === w
                      ? 'bg-[#055EFE] text-white font-bold'
                      : 'bg-slate-100 dark:bg-white/10 hover:bg-slate-200'
                  }`}
                >
                  {w}px
                </button>
              );
            })}
          </div>

          <div className="w-[1px] h-4 bg-slate-200 dark:bg-white/10" />

          <span className="text-[11px] text-slate-500">Color:</span>
          <div className="flex items-center gap-1">
            {COLOR_PALETTE.map((c) => {
              const curC = drawObj?.color || toolSettings.drawColor;
              return (
                <button
                  key={c}
                  type="button"
                  onClick={() => {
                    if (drawObj) onUpdateSelected({ color: c });
                    onUpdateToolSettings({ drawColor: c });
                  }}
                  className={`w-4 h-4 rounded-full border border-black/20 dark:border-white/20 cursor-pointer transition-transform ${
                    curC === c ? 'scale-125 ring-2 ring-[#055EFE]' : 'hover:scale-110'
                  }`}
                  style={{ backgroundColor: c }}
                />
              );
            })}
          </div>
        </div>
      )}

      {/* ─── MARKUP PROPERTIES ──────────────────────────────────────────── */}
      {isMarkup && (
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-[11px] text-slate-500">Markup Color:</span>
          <div className="flex items-center gap-1">
            {['#EF4444', '#055EFE', '#10B981', '#0C162C'].map((c) => (
              <button
                key={c}
                type="button"
                onClick={() => {
                  if (selectedObject) onUpdateSelected({ color: c } as any);
                  onUpdateToolSettings({ markupColor: c });
                }}
                className={`w-4 h-4 rounded-full border border-black/20 cursor-pointer ${
                  toolSettings.markupColor === c ? 'scale-125 ring-2 ring-[#055EFE]' : ''
                }`}
                style={{ backgroundColor: c }}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
