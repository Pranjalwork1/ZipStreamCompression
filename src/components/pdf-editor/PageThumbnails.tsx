/**
 * ZipStream PDF Editor — Page Thumbnails Sidebar
 * 
 * Displays miniature page previews for fast document navigation in multi-page PDFs.
 */

import React, { useEffect, useRef, useState } from 'react';
import * as pdfjsLib from 'pdfjs-dist';
import { ChevronLeft, ChevronRight, Layers } from 'lucide-react';

interface PageThumbnailsProps {
  pdfDoc: pdfjsLib.PDFDocumentProxy | null;
  totalPages: number;
  currentPage: number;
  onSelectPage: (page: number) => void;
  isOpen: boolean;
  onToggle: () => void;
}

export const PageThumbnails: React.FC<PageThumbnailsProps> = ({
  pdfDoc,
  totalPages,
  currentPage,
  onSelectPage,
  isOpen,
  onToggle,
}) => {
  const [thumbnails, setThumbnails] = useState<Map<number, string>>(new Map());

  // Render low-res thumbnails progressively
  useEffect(() => {
    if (!pdfDoc) {
      setThumbnails(new Map());
      return;
    }

    let isMounted = true;
    const cache = new Map<number, string>();

    const renderThumbnails = async () => {
      // Prioritize rendering first 10 pages, then rest
      for (let pageNum = 1; pageNum <= totalPages; pageNum++) {
        if (!isMounted) break;

        try {
          const page = await pdfDoc.getPage(pageNum);
          const viewport = page.getViewport({ scale: 0.25 });

          const canvas = document.createElement('canvas');
          canvas.width = Math.max(1, Math.floor(viewport.width));
          canvas.height = Math.max(1, Math.floor(viewport.height));
          const ctx = canvas.getContext('2d');

          if (ctx) {
            await page.render({ canvasContext: ctx, viewport }).promise;
            if (isMounted) {
              cache.set(pageNum, canvas.toDataURL('image/jpeg', 0.6));
              setThumbnails(new Map(cache));
            }
          }
        } catch (err) {
          // If a page fails to render thumbnail, ignore silently
        }
      }
    };

    renderThumbnails();

    return () => {
      isMounted = false;
    };
  }, [pdfDoc, totalPages]);

  if (!isOpen) {
    return (
      <button
        type="button"
        onClick={onToggle}
        className="hidden md:flex absolute top-16 left-2 z-20 items-center justify-center w-8 h-8 rounded-full bg-white dark:bg-[#111C38] border border-black/10 dark:border-white/10 shadow-md text-slate-700 dark:text-slate-200 hover:text-[#055EFE] transition-colors cursor-pointer"
        title="Open Page Thumbnails"
      >
        <ChevronRight className="w-4 h-4" />
      </button>
    );
  }

  return (
    <aside
      id="pdf-editor-thumbnails-sidebar"
      className="hidden md:flex flex-col w-52 shrink-0 bg-slate-50/90 dark:bg-[#0B132B]/90 border-r border-black/[0.08] dark:border-white/[0.08] h-full overflow-y-auto select-none relative z-20"
    >
      <div className="p-3 border-b border-black/[0.06] dark:border-white/[0.06] flex items-center justify-between sticky top-0 bg-inherit backdrop-blur-md z-10">
        <div className="flex items-center gap-1.5 text-xs font-bold text-slate-800 dark:text-slate-200">
          <Layers className="w-3.5 h-3.5 text-[#055EFE]" />
          <span>Pages ({totalPages})</span>
        </div>
        <button
          type="button"
          onClick={onToggle}
          className="p-1 rounded-lg hover:bg-black/5 dark:hover:bg-white/10 text-slate-500 hover:text-slate-800 dark:hover:text-white cursor-pointer"
          title="Collapse sidebar"
        >
          <ChevronLeft className="w-4 h-4" />
        </button>
      </div>

      <div className="p-3 space-y-3">
        {Array.from({ length: totalPages }, (_, i) => i + 1).map((pageNum) => {
          const isSelected = pageNum === currentPage;
          const thumbUrl = thumbnails.get(pageNum);

          return (
            <div
              key={`thumb-${pageNum}`}
              onClick={() => onSelectPage(pageNum)}
              className={`group flex flex-col items-center gap-1.5 p-2 rounded-xl transition-all cursor-pointer ${
                isSelected
                  ? 'bg-[#055EFE]/10 dark:bg-[#055EFE]/20 ring-2 ring-[#055EFE]'
                  : 'hover:bg-black/5 dark:hover:bg-white/5'
              }`}
            >
              <div className="w-full aspect-[1/1.3] bg-white rounded-md shadow-xs border border-black/10 flex items-center justify-center overflow-hidden relative">
                {thumbUrl ? (
                  <img
                    src={thumbUrl}
                    alt={`Page ${pageNum}`}
                    className="w-full h-full object-contain"
                  />
                ) : (
                  <div className="text-[11px] text-slate-400 font-mono">
                    Page {pageNum}
                  </div>
                )}
              </div>
              <span
                className={`text-[11px] font-mono font-medium ${
                  isSelected ? 'text-[#055EFE] font-bold' : 'text-slate-500 dark:text-slate-400'
                }`}
              >
                {pageNum}
              </span>
            </div>
          );
        })}
      </div>
    </aside>
  );
};
