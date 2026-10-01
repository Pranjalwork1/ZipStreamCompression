/**
 * ZipStream PDF Editor — Selection Bounding Box & Transformation Handles
 * 
 * Provides drag-to-move, 8-point resize handles, rotation handle, and contextual action pill.
 */

import React, { useRef, useState, useEffect } from 'react';
import { Copy, Trash2, RotateCw } from 'lucide-react';
import { EditorObject } from './types';
import { pageToScreenCoords } from './coordinateUtils';

interface SelectionBoxProps {
  object: EditorObject;
  scale: number;
  onUpdate: (updated: Partial<EditorObject>) => void;
  onDelete: (id: string) => void;
  onDuplicate: (id: string) => void;
  onStartEditingText?: (id: string) => void;
}

type HandleType = 'nw' | 'n' | 'ne' | 'e' | 'se' | 's' | 'sw' | 'w';

export const SelectionBox: React.FC<SelectionBoxProps> = ({
  object,
  scale,
  onUpdate,
  onDelete,
  onDuplicate,
  onStartEditingText,
}) => {
  const [isDragging, setIsDragging] = useState(false);
  const [activeHandle, setActiveHandle] = useState<HandleType | null>(null);
  const startDragRef = useRef<{ clientX: number; clientY: number; origX: number; origY: number }>({
    clientX: 0,
    clientY: 0,
    origX: 0,
    origY: 0,
  });
  const startResizeRef = useRef<{
    clientX: number;
    clientY: number;
    origX: number;
    origY: number;
    origW: number;
    origH: number;
  }>({
    clientX: 0,
    clientY: 0,
    origX: 0,
    origY: 0,
    origW: 0,
    origH: 0,
  });

  const screenCoords = pageToScreenCoords(object.x, object.y, scale);
  const screenW = Math.max(16, object.width * scale);
  const screenH = Math.max(16, object.height * scale);

  // ─── Drag to Move ──────────────────────────────────────────────────────────
  const handlePointerDownMove = (e: React.PointerEvent) => {
    // Only drag with left mouse button or touch
    if (e.button !== 0 && e.pointerType === 'mouse') return;
    e.stopPropagation();

    setIsDragging(true);
    startDragRef.current = {
      clientX: e.clientX,
      clientY: e.clientY,
      origX: object.x,
      origY: object.y,
    };

    (e.target as HTMLElement).setPointerCapture(e.pointerId);
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (isDragging) {
      const dx = (e.clientX - startDragRef.current.clientX) / scale;
      const dy = (e.clientY - startDragRef.current.clientY) / scale;
      const newX = Math.round((startDragRef.current.origX + dx) * 10) / 10;
      const newY = Math.round((startDragRef.current.origY + dy) * 10) / 10;
      onUpdate({ x: Math.max(0, newX), y: Math.max(0, newY) });
    } else if (activeHandle) {
      const dx = (e.clientX - startResizeRef.current.clientX) / scale;
      const dy = (e.clientY - startResizeRef.current.clientY) / scale;
      const { origX, origY, origW, origH } = startResizeRef.current;

      let newX = origX;
      let newY = origY;
      let newW = origW;
      let newH = origH;

      const minSize = 12;

      // Handle based on handle position
      if (activeHandle.includes('e')) {
        newW = Math.max(minSize, origW + dx);
      }
      if (activeHandle.includes('s')) {
        newH = Math.max(minSize, origH + dy);
      }
      if (activeHandle.includes('w')) {
        const potentialW = origW - dx;
        if (potentialW >= minSize) {
          newW = potentialW;
          newX = origX + dx;
        }
      }
      if (activeHandle.includes('n')) {
        const potentialH = origH - dy;
        if (potentialH >= minSize) {
          newH = potentialH;
          newY = origY + dy;
        }
      }

      // Preserve aspect ratio for images if shift key or corner handle
      if (object.type === 'image' && ['nw', 'ne', 'se', 'sw'].includes(activeHandle)) {
        const imgObj = object as any;
        const ratio = imgObj.aspectRatio || origW / origH || 1;
        newH = newW / ratio;
      }

      onUpdate({
        x: Math.round(newX * 10) / 10,
        y: Math.round(newY * 10) / 10,
        width: Math.round(newW * 10) / 10,
        height: Math.round(newH * 10) / 10,
      });
    }
  };

  const handlePointerUp = (e: React.PointerEvent) => {
    if (isDragging) {
      setIsDragging(false);
      try {
        (e.target as HTMLElement).releasePointerCapture(e.pointerId);
      } catch (_) {}
    }
    if (activeHandle) {
      setActiveHandle(null);
      try {
        (e.target as HTMLElement).releasePointerCapture(e.pointerId);
      } catch (_) {}
    }
  };

  // ─── Resize Handles ────────────────────────────────────────────────────────
  const handlePointerDownResize = (e: React.PointerEvent, handle: HandleType) => {
    e.stopPropagation();
    setActiveHandle(handle);
    startResizeRef.current = {
      clientX: e.clientX,
      clientY: e.clientY,
      origX: object.x,
      origY: object.y,
      origW: object.width,
      origH: object.height,
    };
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
  };

  return (
    <div
      className="absolute pointer-events-none select-none z-30"
      style={{
        left: `${screenCoords.x}px`,
        top: `${screenCoords.y}px`,
        width: `${screenW}px`,
        height: `${screenH}px`,
      }}
    >
      {/* ─── Outer Bounding Box Border ─── */}
      <div
        onPointerDown={handlePointerDownMove}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onDoubleClick={(e) => {
          e.stopPropagation();
          if (object.type === 'text' && onStartEditingText) {
            onStartEditingText(object.id);
          }
        }}
        className={`absolute inset-0 border-2 border-[#055EFE] rounded-xs cursor-move pointer-events-auto transition-colors ${
          isDragging ? 'bg-[#055EFE]/10' : 'hover:bg-[#055EFE]/5'
        }`}
      />

      {/* ─── Context Action Pill Above Object ─── */}
      <div
        className="absolute -top-10 left-1/2 -translate-x-1/2 flex items-center gap-1 bg-[#0C162C] text-white px-2 py-1 rounded-full shadow-lg pointer-events-auto text-xs z-40 whitespace-nowrap animate-in fade-in zoom-in-95 duration-100"
        onPointerDown={(e) => e.stopPropagation()}
      >
        <button
          type="button"
          onClick={() => onDuplicate(object.id)}
          className="p-1 hover:bg-white/20 rounded-full transition-colors cursor-pointer text-slate-200 hover:text-white"
          title="Duplicate (Ctrl+D)"
        >
          <Copy className="w-3.5 h-3.5" />
        </button>
        <div className="w-[1px] h-3 bg-white/20" />
        <button
          type="button"
          onClick={() => onDelete(object.id)}
          className="p-1 hover:bg-red-500/80 rounded-full transition-colors cursor-pointer text-red-400 hover:text-white"
          title="Delete (Del)"
        >
          <Trash2 className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* ─── 8 Resize Handle Dots ─── */}
      {(['nw', 'n', 'ne', 'e', 'se', 's', 'sw', 'w'] as HandleType[]).map((h) => {
        let handlePos = '';
        let cursor = 'cursor-nwse-resize';

        if (h === 'nw') { handlePos = '-top-1.5 -left-1.5'; cursor = 'cursor-nwse-resize'; }
        else if (h === 'n') { handlePos = '-top-1.5 left-1/2 -translate-x-1/2'; cursor = 'cursor-ns-resize'; }
        else if (h === 'ne') { handlePos = '-top-1.5 -right-1.5'; cursor = 'cursor-nesw-resize'; }
        else if (h === 'e') { handlePos = 'top-1/2 -translate-y-1/2 -right-1.5'; cursor = 'cursor-ew-resize'; }
        else if (h === 'se') { handlePos = '-bottom-1.5 -right-1.5'; cursor = 'cursor-nwse-resize'; }
        else if (h === 's') { handlePos = '-bottom-1.5 left-1/2 -translate-x-1/2'; cursor = 'cursor-ns-resize'; }
        else if (h === 'sw') { handlePos = '-bottom-1.5 -left-1.5'; cursor = 'cursor-nesw-resize'; }
        else if (h === 'w') { handlePos = 'top-1/2 -translate-y-1/2 -left-1.5'; cursor = 'cursor-ew-resize'; }

        return (
          <div
            key={h}
            onPointerDown={(e) => handlePointerDownResize(e, h)}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerUp}
            className={`absolute ${handlePos} w-3 h-3 bg-white border-2 border-[#055EFE] rounded-full shadow-xs pointer-events-auto ${cursor} hover:scale-125 transition-transform`}
          />
        );
      })}
    </div>
  );
};
