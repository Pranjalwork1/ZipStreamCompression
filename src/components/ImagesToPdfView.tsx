import React, { useState } from 'react';
import {
  Sparkles,
  ArrowUp,
  ArrowDown,
  Trash2,
  Download,
  CheckCircle2,
  RefreshCw,
  Image as ImageIcon,
  Layers,
  Plus,
} from 'lucide-react';
import { ImageToPdfItem, ImageToPdfSettings } from '../types';
import { convertImagesToPdf } from '../utils/pdfTools';
import { formatBytes } from '../utils/formatters';
import confetti from 'canvas-confetti';

interface ImagesToPdfViewProps {
  onBackToHome: () => void;
}

export const ImagesToPdfView: React.FC<ImagesToPdfViewProps> = ({ onBackToHome }) => {
  const [items, setItems] = useState<ImageToPdfItem[]>([]);
  const [settings, setSettings] = useState<ImageToPdfSettings>({
    orientation: 'portrait',
    pageSize: 'a4',
    margin: 'small',
    quality: 0.9,
  });
  const [isProcessing, setIsProcessing] = useState(false);
  const [result, setResult] = useState<{ blob: Blob; totalPages: number; url: string } | null>(null);

  const handleImagesAdded = (fileList: FileList | File[]) => {
    Array.from(fileList).forEach((file) => {
      if (file.type.startsWith('image/')) {
        const reader = new FileReader();
        reader.onload = (e) => {
          const dataUrl = e.target?.result as string;
          const img = new Image();
          img.onload = () => {
            setItems((prev) => [
              ...prev,
              {
                id: `img-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
                file,
                dataUrl,
                name: file.name,
                size: file.size,
                width: img.width,
                height: img.height,
              },
            ]);
            setResult(null);
          };
          img.src = dataUrl;
        };
        reader.readAsDataURL(file);
      }
    });
  };

  const moveItem = (index: number, direction: 'up' | 'down') => {
    setItems((prev) => {
      const copy = [...prev];
      const targetIndex = direction === 'up' ? index - 1 : index + 1;
      if (targetIndex < 0 || targetIndex >= copy.length) return prev;
      const temp = copy[index];
      copy[index] = copy[targetIndex];
      copy[targetIndex] = temp;
      return copy;
    });
  };

  const removeItem = (id: string) => {
    setItems((prev) => prev.filter((i) => i.id !== id));
    setResult(null);
  };

  // Convert to PDF
  const handleConvert = async () => {
    if (items.length === 0) return;
    setIsProcessing(true);

    try {
      const res = await convertImagesToPdf(items, settings);
      const url = URL.createObjectURL(res.blob);
      setResult({ blob: res.blob, totalPages: res.totalPages, url });

      confetti({
        particleCount: 50,
        spread: 60,
        origin: { y: 0.6 },
      });
    } catch (err) {
      console.error('Conversion failed:', err);
      alert('Failed to convert images to PDF.');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleDownload = () => {
    if (!result) return;
    const a = document.createElement('a');
    a.href = result.url;
    a.download = `Images_Document_${new Date().toISOString().slice(0, 10)}.pdf`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  return (
    <div id="images-to-pdf-view" className="w-full max-w-4xl mx-auto space-y-6 animate-in fade-in duration-200">
      <div className="text-center space-y-2">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#af52de]/10 text-[#af52de] text-[12px] font-semibold">
          <Sparkles className="w-3.5 h-3.5" />
          <span>JPG / PNG to PDF</span>
        </div>
        <h2 className="text-3xl font-bold tracking-tight text-[#1d1d1f] dark:text-[#f5f5f7]">Convert Images to PDF</h2>
        <p className="text-[15px] text-[#6e6e73] dark:text-[#8e8e93] max-w-xl mx-auto">
          Convert photo albums, screenshots, and graphics into a high quality multi-page PDF document.
        </p>
      </div>

      <div className="bg-white dark:bg-[#1c1c1e] rounded-[24px] border border-black/[0.08] dark:border-white/[0.08] shadow-[0_4px_24px_rgba(0,0,0,0.04)] p-6 sm:p-8 space-y-6 transition-colors">
        {/* Drop zone */}
        <div
          onClick={() => {
            const input = document.createElement('input');
            input.type = 'file';
            input.accept = 'image/*';
            input.multiple = true;
            input.onchange = (e: any) => {
              if (e.target.files) handleImagesAdded(e.target.files);
            };
            input.click();
          }}
          className="border-2 border-dashed border-black/10 dark:border-white/10 hover:border-[#af52de] dark:hover:border-[#bf5af2] bg-[#fafafc] dark:bg-[#252528] hover:bg-[#af52de]/5 dark:hover:bg-[#af52de]/10 rounded-[20px] p-8 text-center cursor-pointer transition-all"
        >
          <div className="w-14 h-14 mx-auto rounded-2xl bg-white dark:bg-[#2c2c2e] border border-black/10 dark:border-white/10 shadow-xs flex items-center justify-center text-[#af52de] dark:text-[#bf5af2] mb-3">
            <ImageIcon className="w-7 h-7" />
          </div>
          <h3 className="text-[16px] font-semibold text-[#1d1d1f] dark:text-[#f5f5f7]">
            Drop photos here, or <span className="text-[#af52de] dark:text-[#bf5af2]">browse images</span>
          </h3>
          <p className="text-[13px] text-[#86868b] dark:text-[#8e8e93] mt-1">Supports JPG, PNG, WEBP, and Screenshots</p>
        </div>

        {items.length > 0 && (
          <div className="space-y-6">
            {/* Settings Bar */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 p-4 rounded-2xl bg-[#f5f5f7] dark:bg-[#252528] border border-black/[0.04] dark:border-white/[0.06]">
              <div>
                <label className="text-[12px] font-semibold text-[#1d1d1f] dark:text-[#f5f5f7] block mb-1.5">Page Size</label>
                <select
                  value={settings.pageSize}
                  onChange={(e: any) => setSettings({ ...settings, pageSize: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl bg-white dark:bg-[#2c2c2e] border border-black/10 dark:border-white/10 text-[13px] font-medium text-[#1d1d1f] dark:text-[#f5f5f7] focus:outline-none"
                >
                  <option value="a4">A4 (Standard)</option>
                  <option value="letter">US Letter</option>
                  <option value="fit">Fit to Image</option>
                </select>
              </div>

              <div>
                <label className="text-[12px] font-semibold text-[#1d1d1f] dark:text-[#f5f5f7] block mb-1.5">Orientation</label>
                <select
                  value={settings.orientation}
                  onChange={(e: any) => setSettings({ ...settings, orientation: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl bg-white dark:bg-[#2c2c2e] border border-black/10 dark:border-white/10 text-[13px] font-medium text-[#1d1d1f] dark:text-[#f5f5f7] focus:outline-none"
                >
                  <option value="portrait">Portrait</option>
                  <option value="landscape">Landscape</option>
                  <option value="fit">Auto-detect per image</option>
                </select>
              </div>

              <div>
                <label className="text-[12px] font-semibold text-[#1d1d1f] dark:text-[#f5f5f7] block mb-1.5">Page Margins</label>
                <select
                  value={settings.margin}
                  onChange={(e: any) => setSettings({ ...settings, margin: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl bg-white dark:bg-[#2c2c2e] border border-black/10 dark:border-white/10 text-[13px] font-medium text-[#1d1d1f] dark:text-[#f5f5f7] focus:outline-none"
                >
                  <option value="none">No Margin (Full Bleed)</option>
                  <option value="small">Small Margin</option>
                  <option value="large">Large Margin</option>
                </select>
              </div>
            </div>

            {/* Images Grid */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-[14px] font-semibold text-[#1d1d1f] dark:text-[#f5f5f7]">
                  Images Queue ({items.length})
                </span>
                <span className="text-[12px] text-[#86868b] dark:text-[#8e8e93]">
                  {formatBytes(items.reduce((a, b) => a + b.size, 0))} total
                </span>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 max-h-[300px] overflow-y-auto p-1">
                {items.map((item, idx) => (
                  <div
                    key={item.id}
                    className="relative group rounded-xl overflow-hidden border border-black/10 dark:border-white/10 bg-[#fafafc] dark:bg-[#252528] flex flex-col p-2"
                  >
                    <div className="aspect-square rounded-lg overflow-hidden bg-black/[0.04] dark:bg-white/[0.04] mb-2 flex items-center justify-center">
                      <img src={item.dataUrl} alt={item.name} className="w-full h-full object-cover" />
                    </div>
                    <div className="flex items-center justify-between text-[11px] text-[#1d1d1f] dark:text-[#f5f5f7] font-medium">
                      <span className="truncate">{item.name}</span>
                      <span className="px-1 py-0.5 rounded bg-black/5 dark:bg-white/10 text-[10px] shrink-0">#{idx + 1}</span>
                    </div>

                    <div className="absolute top-3 right-3 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity bg-black/60 backdrop-blur-xs p-1 rounded-lg">
                      <button
                        disabled={idx === 0}
                        onClick={() => moveItem(idx, 'up')}
                        className="text-white hover:text-[#0071e3] p-0.5 disabled:opacity-30 cursor-pointer"
                      >
                        <ArrowUp className="w-3 h-3" />
                      </button>
                      <button
                        disabled={idx === items.length - 1}
                        onClick={() => moveItem(idx, 'down')}
                        className="text-white hover:text-[#0071e3] p-0.5 disabled:opacity-30 cursor-pointer"
                      >
                        <ArrowDown className="w-3 h-3" />
                      </button>
                      <button
                        onClick={() => removeItem(item.id)}
                        className="text-white hover:text-[#ff3b30] p-0.5 cursor-pointer"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Actions */}
            <div className="pt-2 flex flex-col sm:flex-row items-center justify-between gap-3">
              <button
                type="button"
                onClick={onBackToHome}
                className="w-full sm:w-auto px-5 py-2.5 rounded-xl border border-black/10 dark:border-white/10 text-[14px] font-medium text-[#1d1d1f] dark:text-[#f5f5f7] hover:bg-black/[0.03] dark:hover:bg-white/[0.05] cursor-pointer"
              >
                Back to Tools
              </button>

              <button
                type="button"
                disabled={isProcessing}
                onClick={handleConvert}
                className="w-full sm:w-auto px-8 py-3 rounded-xl bg-[#af52de] hover:bg-[#a042d1] active:bg-[#9233c4] text-white font-semibold text-[15px] shadow-sm flex items-center justify-center gap-2 transition-all cursor-pointer"
              >
                {isProcessing ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>Generating PDF...</span>
                  </>
                ) : (
                  <>
                    <Layers className="w-4 h-4" />
                    <span>Convert {items.length} Images to PDF</span>
                  </>
                )}
              </button>
            </div>
          </div>
        )}

        {/* Result Card */}
        {result && (
          <div className="p-6 rounded-[20px] bg-[#af52de]/10 dark:bg-[#af52de]/15 border border-[#af52de]/20 text-center space-y-4 animate-in zoom-in-95 duration-150">
            <div className="w-12 h-12 rounded-full bg-[#af52de] text-white mx-auto flex items-center justify-center shadow-md">
              <CheckCircle2 className="w-6 h-6" />
            </div>
            <div>
              <h4 className="text-[18px] font-bold text-[#1d1d1f] dark:text-[#f5f5f7]">PDF Generated!</h4>
              <p className="text-[13px] text-[#6e6e73] dark:text-[#8e8e93] mt-1">
                Converted into a <strong>{result.totalPages}-page PDF</strong> ({formatBytes(result.blob.size)})
              </p>
            </div>

            <div className="flex items-center justify-center gap-3 pt-2">
              <button
                type="button"
                onClick={handleDownload}
                className="px-6 py-2.5 rounded-xl bg-[#af52de] hover:bg-[#a042d1] text-white text-[14px] font-semibold shadow-xs flex items-center gap-2 cursor-pointer"
              >
                <Download className="w-4 h-4" />
                <span>Download Generated PDF</span>
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
