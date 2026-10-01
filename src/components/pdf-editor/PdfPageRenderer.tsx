/**
 * ZipStream PDF Editor — Multi-Layer PDF Page Renderer
 * 
 * Layer 1: High-DPI Canvas (PDF.js base layer)
 * Layer 2: Interactive SVG & DOM Editor Overlays (Text, Images, Shapes, Markup, Drawings, Notes)
 * Layer 3: Selection Bounding Box & Transformation Handles
 */

import React, { useRef, useEffect, useState, useCallback } from 'react';
import * as pdfjsLib from 'pdfjs-dist';
import {
  EditorObject,
  EditorToolType,
  ActiveToolSettings,
  TextObject,
  ImageObject,
  ShapeObject,
  HighlightObject,
  MarkupObject,
  DrawObject,
  CommentObject,
  DrawPoint,
} from './types';
import { screenToPageCoords, pageToScreenCoords } from './coordinateUtils';
import { SelectionBox } from './SelectionBox';
import { MessageSquare, X } from 'lucide-react';

interface PdfPageRendererProps {
  pdfDoc: pdfjsLib.PDFDocumentProxy;
  pageNum: number;
  zoomScale: number;
  activeTool: EditorToolType;
  toolSettings: ActiveToolSettings;
  pageObjects: EditorObject[];
  selectedObjectId: string | null;
  onSelectObject: (id: string | null) => void;
  onAddObject: (newObj: EditorObject) => void;
  onUpdateObject: (id: string, updated: Partial<EditorObject>) => void;
  onDeleteObject: (id: string) => void;
  onDuplicateObject: (id: string) => void;
  onPageDimensionsLoaded?: (dimensions: { width: number; height: number }) => void;
}

export const PdfPageRenderer: React.FC<PdfPageRendererProps> = ({
  pdfDoc,
  pageNum,
  zoomScale,
  activeTool,
  toolSettings,
  pageObjects,
  selectedObjectId,
  onSelectObject,
  onAddObject,
  onUpdateObject,
  onDeleteObject,
  onDuplicateObject,
  onPageDimensionsLoaded,
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const renderTaskRef = useRef<any>(null);

  const [pageNaturalWidth, setPageNaturalWidth] = useState(595);
  const [pageNaturalHeight, setPageNaturalHeight] = useState(842);
  const [effectiveScale, setEffectiveScale] = useState(1.0);

  // Freehand drawing in-progress state
  const [isDrawing, setIsDrawing] = useState(false);
  const [currentStroke, setCurrentStroke] = useState<DrawPoint[]>([]);

  // Shape drag-to-create in-progress state
  const [isCreatingShape, setIsCreatingShape] = useState(false);
  const [shapeStart, setShapeStart] = useState<{ x: number; y: number } | null>(null);
  const [shapeCurrent, setShapeCurrent] = useState<{ x: number; y: number } | null>(null);

  // In-line text editing state
  const [editingTextId, setEditingTextId] = useState<string | null>(null);
  const [editingTextContent, setEditingTextContent] = useState('');

  // ─── 1. Render PDF.js page onto HTML5 Canvas ─────────────────────────────
  useEffect(() => {
    let isCancelled = false;

    const renderPage = async () => {
      try {
        if (renderTaskRef.current) {
          try { await renderTaskRef.current.cancel(); } catch (_) {}
        }

        const page = await pdfDoc.getPage(pageNum);
        if (isCancelled) return;

        const baseViewport = page.getViewport({ scale: 1.0 });
        setPageNaturalWidth(baseViewport.width);
        setPageNaturalHeight(baseViewport.height);
        onPageDimensionsLoaded?.({ width: baseViewport.width, height: baseViewport.height });

        // Calculate auto-fit container width
        const containerWidth = containerRef.current
          ? Math.max(300, containerRef.current.parentElement?.clientWidth || 750)
          : 750;

        // Auto-scale to fit comfortably inside the workspace
        const targetWidth = Math.min(containerWidth - 48, baseViewport.width * 1.5);
        const autoFit = Math.min(1.5, Math.max(0.5, targetWidth / baseViewport.width));
        const calcScale = autoFit * zoomScale;
        setEffectiveScale(calcScale);

        const viewport = page.getViewport({ scale: calcScale });
        const canvas = canvasRef.current;
        if (!canvas) return;

        const dpr = window.devicePixelRatio || 1;
        canvas.width = Math.floor(viewport.width * dpr);
        canvas.height = Math.floor(viewport.height * dpr);
        canvas.style.width = `${Math.floor(viewport.width)}px`;
        canvas.style.height = `${Math.floor(viewport.height)}px`;

        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        ctx.setTransform(1, 0, 0, 1, 0, 0); // reset
        ctx.scale(dpr, dpr);

        const renderContext = {
          canvasContext: ctx,
          viewport,
        };

        const task = page.render(renderContext);
        renderTaskRef.current = task;
        await task.promise;
      } catch (err: any) {
        if (err?.name !== 'RenderingCancelledException') {
          console.warn('PDF page render notice:', err);
        }
      }
    };

    renderPage();

    return () => {
      isCancelled = true;
      if (renderTaskRef.current) {
        try { renderTaskRef.current.cancel(); } catch (_) {}
      }
    };
  }, [pdfDoc, pageNum, zoomScale]);

  // ─── 2. Pointer Down: Handle creation or selection ─────────────────────────
  const handleOverlayPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    // Only handle primary button
    if (e.button !== 0 && e.pointerType === 'mouse') return;

    const rect = e.currentTarget.getBoundingClientRect();
    const clickScreenX = e.clientX - rect.left;
    const clickScreenY = e.clientY - rect.top;
    const pageCoord = screenToPageCoords(clickScreenX, clickScreenY, effectiveScale);

    // ── Tool: Freehand Draw ──
    if (activeTool === 'draw') {
      setIsDrawing(true);
      setCurrentStroke([pageCoord]);
      (e.target as HTMLElement).setPointerCapture(e.pointerId);
      return;
    }

    // ── Tool: Drag-to-Create (Shapes, Highlight, Underline, Strikethrough) ──
    if (['rectangle', 'circle', 'line', 'arrow', 'highlight', 'underline', 'strikethrough'].includes(activeTool)) {
      setIsCreatingShape(true);
      setShapeStart(pageCoord);
      setShapeCurrent(pageCoord);
      (e.target as HTMLElement).setPointerCapture(e.pointerId);
      return;
    }

    // ── Tool: Click-to-Add Text ──
    if (activeTool === 'text') {
      const newId = `text-${Date.now()}`;
      const newText: TextObject = {
        id: newId,
        type: 'text',
        page: pageNum,
        x: pageCoord.x,
        y: pageCoord.y,
        width: 180,
        height: 38,
        content: 'Type here…',
        fontFamily: toolSettings.fontFamily,
        fontSize: toolSettings.fontSize,
        fontWeight: toolSettings.fontWeight,
        fontStyle: toolSettings.fontStyle,
        textDecoration: toolSettings.textDecoration,
        color: toolSettings.textColor,
        textAlign: toolSettings.textAlign,
        opacity: 1,
      };

      onAddObject(newText);
      onSelectObject(newId);
      setEditingTextId(newId);
      setEditingTextContent('Type here…');
      return;
    }

    // ── Tool: Click-to-Add Note / Comment ──
    if (activeTool === 'comment') {
      const newComment: CommentObject = {
        id: `comment-${Date.now()}`,
        type: 'comment',
        page: pageNum,
        x: pageCoord.x,
        y: pageCoord.y,
        width: 24,
        height: 24,
        author: 'Reviewer',
        content: 'New annotation note',
        color: toolSettings.commentColor,
        createdAt: Date.now(),
        isOpen: true,
      };

      onAddObject(newComment);
      onSelectObject(newComment.id);
      return;
    }

    // If clicking on empty page in select mode, deselect
    if (activeTool === 'select') {
      onSelectObject(null);
      setEditingTextId(null);
    }
  };

  const handleOverlayPointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!isDrawing && !isCreatingShape) return;

    const rect = e.currentTarget.getBoundingClientRect();
    const screenX = e.clientX - rect.left;
    const screenY = e.clientY - rect.top;
    const pageCoord = screenToPageCoords(screenX, screenY, effectiveScale);

    if (isDrawing) {
      setCurrentStroke((prev) => [...prev, pageCoord]);
    } else if (isCreatingShape) {
      setShapeCurrent(pageCoord);
    }
  };

  const handleOverlayPointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    // ── Finish Freehand Draw ──
    if (isDrawing) {
      setIsDrawing(false);
      try { (e.target as HTMLElement).releasePointerCapture(e.pointerId); } catch (_) {}

      if (currentStroke.length > 1) {
        let minX = Infinity; let minY = Infinity; let maxX = -Infinity; let maxY = -Infinity;
        currentStroke.forEach((p) => {
          minX = Math.min(minX, p.x);
          minY = Math.min(minY, p.y);
          maxX = Math.max(maxX, p.x);
          maxY = Math.max(maxY, p.y);
        });

        const newDraw: DrawObject = {
          id: `draw-${Date.now()}`,
          type: 'draw',
          page: pageNum,
          x: minX,
          y: minY,
          width: Math.max(12, maxX - minX),
          height: Math.max(12, maxY - minY),
          points: currentStroke,
          color: toolSettings.drawColor,
          strokeWidth: toolSettings.drawWidth,
          opacity: toolSettings.drawOpacity,
        };

        onAddObject(newDraw);
      }
      setCurrentStroke([]);
      return;
    }

    // ── Finish Shape or Markup Creation ──
    if (isCreatingShape && shapeStart && shapeCurrent) {
      setIsCreatingShape(false);
      try { (e.target as HTMLElement).releasePointerCapture(e.pointerId); } catch (_) {}

      const x = Math.min(shapeStart.x, shapeCurrent.x);
      const y = Math.min(shapeStart.y, shapeCurrent.y);
      const w = Math.max(16, Math.abs(shapeCurrent.x - shapeStart.x));
      const h = Math.max(12, Math.abs(shapeCurrent.y - shapeStart.y));

      if (['rectangle', 'circle', 'line', 'arrow'].includes(activeTool)) {
        const newShape: ShapeObject = {
          id: `shape-${Date.now()}`,
          type: 'shape',
          shapeType: activeTool as any,
          page: pageNum,
          x,
          y,
          width: w,
          height: h,
          fill: toolSettings.shapeFill,
          stroke: toolSettings.shapeStroke,
          strokeWidth: toolSettings.shapeStrokeWidth,
          opacity: toolSettings.shapeOpacity,
        };
        onAddObject(newShape);
        onSelectObject(newShape.id);
      } else if (activeTool === 'highlight') {
        const newHl: HighlightObject = {
          id: `highlight-${Date.now()}`,
          type: 'highlight',
          page: pageNum,
          x,
          y,
          width: w,
          height: Math.max(14, h),
          color: toolSettings.highlightColor,
          opacity: toolSettings.highlightOpacity,
        };
        onAddObject(newHl);
        onSelectObject(newHl.id);
      } else if (activeTool === 'underline' || activeTool === 'strikethrough') {
        const newMarkup: MarkupObject = {
          id: `markup-${Date.now()}`,
          type: 'markup',
          markupType: activeTool as any,
          page: pageNum,
          x,
          y,
          width: w,
          height: Math.max(10, h),
          color: toolSettings.markupColor,
          strokeWidth: toolSettings.markupWidth,
        };
        onAddObject(newMarkup);
        onSelectObject(newMarkup.id);
      }

      setShapeStart(null);
      setShapeCurrent(null);
    }
  };

  const selectedObject = pageObjects.find((o) => o.id === selectedObjectId) || null;

  return (
    <div
      ref={containerRef}
      className="relative flex items-center justify-center p-2 sm:p-6"
    >
      <div
        className="relative bg-white shadow-[0_12px_40px_rgba(0,0,0,0.18)] dark:shadow-[0_16px_50px_rgba(0,0,0,0.7)] rounded-xs overflow-visible"
        style={{
          width: `${Math.floor(pageNaturalWidth * effectiveScale)}px`,
          height: `${Math.floor(pageNaturalHeight * effectiveScale)}px`,
        }}
      >
        {/* ─── LAYER 1: Base PDF.js Canvas ─── */}
        <canvas
          ref={canvasRef}
          className="absolute inset-0 block select-none pointer-events-none"
        />

        {/* ─── LAYER 2: Interactive SVG & Overlays ─── */}
        <div
          id={`page-overlay-${pageNum}`}
          onPointerDown={handleOverlayPointerDown}
          onPointerMove={handleOverlayPointerMove}
          onPointerUp={handleOverlayPointerUp}
          className={`absolute inset-0 select-none overflow-hidden ${
            activeTool === 'select'
              ? 'cursor-default'
              : activeTool === 'draw'
              ? 'cursor-crosshair'
              : 'cursor-crosshair'
          }`}
          style={{ touchAction: 'none' }}
        >
          {/* Render Vector Shapes & Drawings SVG */}
          <svg className="absolute inset-0 w-full h-full pointer-events-none">
            {pageObjects.map((obj) => {
              if (obj.type === 'draw') {
                const drawObj = obj as DrawObject;
                if (!drawObj.points || drawObj.points.length < 2) return null;
                const pathData = drawObj.points
                  .map((p, idx) => {
                    const sc = pageToScreenCoords(p.x, p.y, effectiveScale);
                    return `${idx === 0 ? 'M' : 'L'} ${sc.x} ${sc.y}`;
                  })
                  .join(' ');

                return (
                  <path
                    key={drawObj.id}
                    d={pathData}
                    fill="none"
                    stroke={drawObj.color}
                    strokeWidth={Math.max(1, drawObj.strokeWidth * effectiveScale)}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    opacity={drawObj.opacity || 1}
                  />
                );
              }

              if (obj.type === 'shape') {
                const shape = obj as ShapeObject;
                const sc = pageToScreenCoords(shape.x, shape.y, effectiveScale);
                const sw = shape.width * effectiveScale;
                const sh = shape.height * effectiveScale;

                if (shape.shapeType === 'rectangle') {
                  return (
                    <rect
                      key={shape.id}
                      x={sc.x}
                      y={sc.y}
                      width={sw}
                      height={sh}
                      fill={shape.fill === 'transparent' ? 'none' : shape.fill}
                      stroke={shape.stroke}
                      strokeWidth={shape.strokeWidth * effectiveScale}
                      opacity={shape.opacity || 1}
                    />
                  );
                }

                if (shape.shapeType === 'circle') {
                  return (
                    <ellipse
                      key={shape.id}
                      cx={sc.x + sw / 2}
                      cy={sc.y + sh / 2}
                      rx={sw / 2}
                      ry={sh / 2}
                      fill={shape.fill === 'transparent' ? 'none' : shape.fill}
                      stroke={shape.stroke}
                      strokeWidth={shape.strokeWidth * effectiveScale}
                      opacity={shape.opacity || 1}
                    />
                  );
                }

                if (shape.shapeType === 'line' || shape.shapeType === 'arrow') {
                  return (
                    <line
                      key={shape.id}
                      x1={sc.x}
                      y1={sc.y}
                      x2={sc.x + sw}
                      y2={sc.y + sh}
                      stroke={shape.stroke}
                      strokeWidth={shape.strokeWidth * effectiveScale}
                      strokeLinecap="round"
                      opacity={shape.opacity || 1}
                    />
                  );
                }
              }

              return null;
            })}

            {/* Current in-progress freehand stroke */}
            {isDrawing && currentStroke.length > 1 && (
              <path
                d={currentStroke
                  .map((p, idx) => {
                    const sc = pageToScreenCoords(p.x, p.y, effectiveScale);
                    return `${idx === 0 ? 'M' : 'L'} ${sc.x} ${sc.y}`;
                  })
                  .join(' ')}
                fill="none"
                stroke={toolSettings.drawColor}
                strokeWidth={Math.max(1, toolSettings.drawWidth * effectiveScale)}
                strokeLinecap="round"
                strokeLinejoin="round"
                opacity={toolSettings.drawOpacity}
              />
            )}

            {/* Current in-progress shape preview */}
            {isCreatingShape && shapeStart && shapeCurrent && (
              <rect
                x={pageToScreenCoords(Math.min(shapeStart.x, shapeCurrent.x), 0, effectiveScale).x}
                y={pageToScreenCoords(0, Math.min(shapeStart.y, shapeCurrent.y), effectiveScale).y}
                width={Math.abs(shapeCurrent.x - shapeStart.x) * effectiveScale}
                height={Math.abs(shapeCurrent.y - shapeStart.y) * effectiveScale}
                fill={activeTool === 'highlight' ? toolSettings.highlightColor : 'none'}
                stroke={activeTool === 'highlight' ? 'none' : '#055EFE'}
                strokeWidth={2}
                strokeDasharray="4 4"
                opacity={activeTool === 'highlight' ? toolSettings.highlightOpacity : 0.8}
              />
            )}
          </svg>

          {/* ─── Render DOM Elements (Text, Highlights, Images, Comments) ─── */}
          {pageObjects.map((obj) => {
            const sc = pageToScreenCoords(obj.x, obj.y, effectiveScale);
            const sw = obj.width * effectiveScale;
            const sh = obj.height * effectiveScale;
            const isSelected = obj.id === selectedObjectId;

            // Highlight
            if (obj.type === 'highlight') {
              const hl = obj as HighlightObject;
              return (
                <div
                  key={hl.id}
                  onClick={(e) => {
                    e.stopPropagation();
                    if (activeTool === 'select') onSelectObject(hl.id);
                  }}
                  className={`absolute cursor-pointer transition-opacity ${
                    isSelected ? 'ring-2 ring-[#055EFE]' : ''
                  }`}
                  style={{
                    left: `${sc.x}px`,
                    top: `${sc.y}px`,
                    width: `${sw}px`,
                    height: `${sh}px`,
                    backgroundColor: hl.color || '#FFE814',
                    opacity: typeof hl.opacity === 'number' ? hl.opacity : 0.35,
                    mixBlendMode: 'multiply',
                  }}
                />
              );
            }

            // Markup (Underline / Strikethrough)
            if (obj.type === 'markup') {
              const mk = obj as MarkupObject;
              return (
                <div
                  key={mk.id}
                  onClick={(e) => {
                    e.stopPropagation();
                    if (activeTool === 'select') onSelectObject(mk.id);
                  }}
                  className={`absolute cursor-pointer ${isSelected ? 'ring-2 ring-[#055EFE]' : ''}`}
                  style={{
                    left: `${sc.x}px`,
                    top: `${sc.y}px`,
                    width: `${sw}px`,
                    height: `${sh}px`,
                  }}
                >
                  <div
                    className="absolute left-0 right-0"
                    style={{
                      top: mk.markupType === 'underline' ? 'auto' : '50%',
                      bottom: mk.markupType === 'underline' ? '0' : 'auto',
                      height: `${Math.max(1, mk.strokeWidth * effectiveScale)}px`,
                      backgroundColor: mk.color,
                    }}
                  />
                </div>
              );
            }

            // Text
            if (obj.type === 'text') {
              const textObj = obj as TextObject;
              const isEditing = editingTextId === textObj.id;

              return (
                <div
                  key={textObj.id}
                  onClick={(e) => {
                    e.stopPropagation();
                    if (activeTool === 'select') onSelectObject(textObj.id);
                  }}
                  onDoubleClick={(e) => {
                    e.stopPropagation();
                    setEditingTextId(textObj.id);
                    setEditingTextContent(textObj.content);
                  }}
                  className={`absolute pointer-events-auto cursor-text ${
                    isSelected && !isEditing ? 'ring-2 ring-[#055EFE] ring-dashed' : ''
                  }`}
                  style={{
                    left: `${sc.x}px`,
                    top: `${sc.y}px`,
                    width: `${sw}px`,
                    minHeight: `${sh}px`,
                    fontFamily: textObj.fontFamily || 'Helvetica',
                    fontSize: `${textObj.fontSize * effectiveScale}px`,
                    fontWeight: textObj.fontWeight,
                    fontStyle: textObj.fontStyle,
                    textDecoration: textObj.textDecoration,
                    color: textObj.color,
                    textAlign: textObj.textAlign,
                    lineHeight: '1.25',
                    whiteSpace: 'pre-wrap',
                    wordBreak: 'break-word',
                  }}
                >
                  {isEditing ? (
                    <textarea
                      autoFocus
                      value={editingTextContent}
                      onChange={(e) => setEditingTextContent(e.target.value)}
                      onBlur={() => {
                        onUpdateObject(textObj.id, { content: editingTextContent });
                        setEditingTextId(null);
                      }}
                      onKeyDown={(e) => {
                        if (e.key === 'Escape') {
                          onUpdateObject(textObj.id, { content: editingTextContent });
                          setEditingTextId(null);
                        }
                      }}
                      className="w-full h-full bg-white/95 dark:bg-[#111C38]/95 p-1 border-2 border-[#055EFE] rounded-xs shadow-md focus:outline-none resize-none"
                      style={{
                        fontFamily: 'inherit',
                        fontSize: 'inherit',
                        fontWeight: 'inherit',
                        color: 'inherit',
                      }}
                    />
                  ) : (
                    textObj.content
                  )}
                </div>
              );
            }

            // Image
            if (obj.type === 'image') {
              const imgObj = obj as ImageObject;
              return (
                <div
                  key={imgObj.id}
                  onClick={(e) => {
                    e.stopPropagation();
                    if (activeTool === 'select') onSelectObject(imgObj.id);
                  }}
                  className={`absolute pointer-events-auto cursor-pointer ${
                    isSelected ? 'ring-2 ring-[#055EFE]' : ''
                  }`}
                  style={{
                    left: `${sc.x}px`,
                    top: `${sc.y}px`,
                    width: `${sw}px`,
                    height: `${sh}px`,
                    opacity: imgObj.opacity || 1,
                  }}
                >
                  <img
                    src={imgObj.dataUrl}
                    alt="Editor asset"
                    className="w-full h-full object-contain pointer-events-none"
                  />
                </div>
              );
            }

            // Comment / Note
            if (obj.type === 'comment') {
              const cObj = obj as CommentObject;
              return (
                <div
                  key={cObj.id}
                  onClick={(e) => {
                    e.stopPropagation();
                    onSelectObject(cObj.id);
                  }}
                  className="absolute pointer-events-auto z-20 group"
                  style={{
                    left: `${sc.x}px`,
                    top: `${sc.y}px`,
                  }}
                >
                  <div
                    className="w-7 h-7 rounded-full flex items-center justify-center text-white shadow-md cursor-pointer hover:scale-110 transition-transform"
                    style={{ backgroundColor: cObj.color || '#F59E0B' }}
                    title={cObj.content}
                  >
                    <MessageSquare className="w-3.5 h-3.5" />
                  </div>

                  {/* Note Popover Dialog */}
                  {isSelected && (
                    <div
                      onClick={(e) => e.stopPropagation()}
                      className="absolute left-8 top-0 w-64 bg-white dark:bg-[#111C38] rounded-2xl border border-black/10 dark:border-white/10 shadow-xl p-3 z-40 animate-in fade-in zoom-in-95 duration-100"
                    >
                      <div className="flex items-center justify-between pb-1.5 border-b border-black/5 dark:border-white/5">
                        <span className="text-xs font-bold text-slate-800 dark:text-slate-100">
                          {cObj.author || 'Note'}
                        </span>
                        <button
                          type="button"
                          onClick={() => onSelectObject(null)}
                          className="p-1 hover:bg-black/5 dark:hover:bg-white/10 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-white"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>
                      <textarea
                        value={cObj.content}
                        onChange={(e) => onUpdateObject(cObj.id, { content: e.target.value })}
                        placeholder="Add a comment or note…"
                        rows={3}
                        className="w-full mt-2 text-xs bg-slate-50 dark:bg-white/5 p-2 rounded-xl border border-black/10 dark:border-white/10 focus:outline-none focus:ring-1 focus:ring-[#055EFE]"
                      />
                    </div>
                  )}
                </div>
              );
            }

            return null;
          })}

          {/* ─── LAYER 3: Selection Box & Transformation Handles ─── */}
          {selectedObject && activeTool === 'select' && (
            <SelectionBox
              object={selectedObject}
              scale={effectiveScale}
              onUpdate={(updated) => onUpdateObject(selectedObject.id, updated)}
              onDelete={(id) => onDeleteObject(id)}
              onDuplicate={(id) => onDuplicateObject(id)}
              onStartEditingText={(id) => {
                setEditingTextId(id);
                setEditingTextContent(selectedObject.type === 'text' ? (selectedObject as TextObject).content : '');
              }}
            />
          )}
        </div>
      </div>
    </div>
  );
};
