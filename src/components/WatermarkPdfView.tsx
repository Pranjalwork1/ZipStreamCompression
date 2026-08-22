import React, { useState } from 'react';
import {
  Stamp,
  Download,
  CheckCircle2,
  RefreshCw,
  FileText,
  Sparkles,
} from 'lucide-react';
import { WatermarkPdfSettings } from '../types';
import { stampWatermarkPdf, getPdfPageCount } from '../utils/pdfTools';
import { formatBytes } from '../utils/formatters';
import confetti from 'canvas-confetti';

interface WatermarkPdfViewProps {
  onBackToHome: () => void;
}

export const WatermarkPdfView: React.FC<WatermarkPdfViewProps> = ({ onBackToHome }) => {
  const [file, setFile] = useState<File | null>(null);
  const [pageCount, setPageCount] = useState<number>(0);
  const [settings, setSettings] = useState<WatermarkPdfSettings>({
    text: 'CONFIDENTIAL',
    opacity: 0.3,
    fontSize: 44,
    rotationDegrees: 45,
    color: 'gray',
    position: 'center',
  });
  const [isProcessing, setIsProcessing] = useState(false);
  const [result, setResult] = useState<{ blob: Blob; totalPages: number; url: string } | null>(null);

  const handleFileSelected = async (selectedFile: File) => {
    setFile(selectedFile);
    const count = await getPdfPageCount(selectedFile);
    setPageCount(count);
    setResult(null);
  };

  const handleApplyWatermark = async () => {
    if (!file) return;
    setIsProcessing(true);

    try {
      const res = await stampWatermarkPdf(file, settings);
      const url = URL.createObjectURL(res.blob);
      setResult({ blob: res.blob, totalPages: res.totalPages, url });

      confetti({
        particleCount: 50,
        spread: 60,
        origin: { y: 0.6 },
      });
    } catch (err: any) {
      console.error('Watermarking failed:', err);
      alert('Failed to stamp watermark onto PDF.');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleDownload = () => {
    if (!result || !file) return;
    const a = document.createElement('a');
    a.href = result.url;
    const baseName = file.name.replace(/\.[^/.]+$/, '');
    a.download = `${baseName}_watermarked.pdf`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  const handleLoadSample = async () => {
    const { PDFDocument, StandardFonts, rgb } = await import('pdf-lib');
    const doc = await PDFDocument.create();
    const font = await doc.embedFont(StandardFonts.HelveticaBold);
    const page = doc.addPage([600, 400]);
    page.drawText('Sample Contract Agreement', { x: 50, y: 320, size: 22, font, color: rgb(0.1, 0.1, 0.1) });
    page.drawText('This is a sample document for applying confidential watermarks.', {
      x: 50,
      y: 280,
      size: 14,
      font: await doc.embedFont(StandardFonts.Helvetica),
      color: rgb(0.3, 0.3, 0.3),
    });
    const bytes = await doc.save();
    const sampleFile = new File([bytes], 'Sample_Contract.pdf', { type: 'application/pdf' });
    handleFileSelected(sampleFile);
  };

  return (
    <div id="watermark-pdf-view" className="w-full max-w-4xl mx-auto space-y-6 animate-in fade-in duration-200">
      <div className="text-center space-y-2">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#5856d6]/10 text-[#5856d6] text-[12px] font-semibold">
          <Stamp className="w-3.5 h-3.5" />
          <span>Watermark Studio</span>
        </div>
        <h2 className="text-3xl font-bold tracking-tight text-[#1d1d1f] dark:text-[#f5f5f7]">Watermark PDF Documents</h2>
        <p className="text-[15px] text-[#6e6e73] dark:text-[#8e8e93] max-w-xl mx-auto">
          Stamp custom confidential marks, draft labels, or copyright notices onto every page of your PDF.
        </p>
      </div>

      <div className="bg-white dark:bg-[#1c1c1e] rounded-[24px] border border-black/[0.08] dark:border-white/[0.08] shadow-[0_4px_24px_rgba(0,0,0,0.04)] p-6 sm:p-8 space-y-6 transition-colors">
        {!file ? (
          <div
            onClick={() => {
              const input = document.createElement('input');
              input.type = 'file';
              input.accept = 'application/pdf';
              input.onchange = (e: any) => {
                if (e.target.files?.[0]) handleFileSelected(e.target.files[0]);
              };
              input.click();
            }}
            className="border-2 border-dashed border-black/10 dark:border-white/10 hover:border-[#5856d6] bg-[#fafafc] dark:bg-[#252528] hover:bg-[#5856d6]/5 dark:hover:bg-[#5856d6]/10 rounded-[20px] p-8 text-center cursor-pointer transition-all"
          >
            <div className="w-14 h-14 mx-auto rounded-2xl bg-white dark:bg-[#2c2c2e] border border-black/10 dark:border-white/10 shadow-xs flex items-center justify-center text-[#5856d6] mb-3">
              <Stamp className="w-7 h-7" />
            </div>
            <h3 className="text-[16px] font-semibold text-[#1d1d1f] dark:text-[#f5f5f7]">
              Choose a PDF file to watermark, or <span className="text-[#5856d6]">browse</span>
            </h3>
            <p className="text-[13px] text-[#86868b] dark:text-[#8e8e93] mt-1">Stamps watermark across all pages in seconds</p>

            <div className="mt-4">
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  handleLoadSample();
                }}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white dark:bg-[#2c2c2e] border border-black/[0.08] dark:border-white/[0.08] text-[12px] font-medium text-[#1d1d1f] dark:text-[#f5f5f7] shadow-xs cursor-pointer hover:bg-black/[0.03] dark:hover:bg-white/[0.05]"
              >
                <Sparkles className="w-3.5 h-3.5 text-[#5856d6]" />
                <span>Load Sample Contract PDF</span>
              </button>
            </div>
          </div>
        ) : (
          <div className="space-y-6">
            <div className="flex items-center justify-between p-4 rounded-2xl bg-[#f5f5f7] dark:bg-[#252528] border border-black/[0.04] dark:border-white/[0.06]">
              <div className="flex items-center gap-3">
                <FileText className="w-6 h-6 text-[#5856d6]" />
                <div>
                  <h4 className="text-[14px] font-semibold text-[#1d1d1f] dark:text-[#f5f5f7]">{file.name}</h4>
                  <p className="text-[12px] text-[#86868b] dark:text-[#8e8e93]">
                    {pageCount} total pages • {formatBytes(file.size)}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setFile(null)}
                className="text-[12px] text-[#6e6e73] dark:text-[#8e8e93] hover:text-[#1d1d1f] dark:hover:text-[#f5f5f7] underline cursor-pointer"
              >
                Change file
              </button>
            </div>

            {/* Watermark Controls */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-5 rounded-2xl bg-[#fafafc] dark:bg-[#252528] border border-black/[0.06] dark:border-white/[0.06]">
              <div className="space-y-2 sm:col-span-2">
                <label className="text-[13px] font-semibold text-[#1d1d1f] dark:text-[#f5f5f7]">Watermark Text</label>
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    value={settings.text}
                    onChange={(e) => setSettings({ ...settings, text: e.target.value })}
                    placeholder="CONFIDENTIAL"
                    className="w-full px-3.5 py-2 rounded-xl bg-white dark:bg-[#2c2c2e] border border-black/10 dark:border-white/10 text-[14px] text-[#1d1d1f] dark:text-[#f5f5f7] font-semibold focus:outline-none focus:border-[#5856d6]"
                  />
                  {(['CONFIDENTIAL', 'DRAFT', 'DO NOT COPY', 'SAMPLE'] as const).map((preset) => (
                    <button
                      key={preset}
                      type="button"
                      onClick={() => setSettings({ ...settings, text: preset })}
                      className="px-2.5 py-2 rounded-xl bg-white dark:bg-[#2c2c2e] border border-black/10 dark:border-white/10 text-[11px] font-medium text-[#6e6e73] dark:text-[#8e8e93] hover:text-[#1d1d1f] dark:hover:text-[#f5f5f7] shrink-0 cursor-pointer"
                    >
                      {preset}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="text-[12px] font-semibold text-[#1d1d1f] dark:text-[#f5f5f7] block mb-1.5">Color</label>
                <select
                  value={settings.color}
                  onChange={(e: any) => setSettings({ ...settings, color: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl bg-white dark:bg-[#2c2c2e] border border-black/10 dark:border-white/10 text-[13px] font-medium text-[#1d1d1f] dark:text-[#f5f5f7] focus:outline-none"
                >
                  <option value="gray">Subtle Gray</option>
                  <option value="red">Security Red</option>
                  <option value="blue">Corporate Blue</option>
                  <option value="black">Bold Black</option>
                </select>
              </div>

              <div>
                <label className="text-[12px] font-semibold text-[#1d1d1f] dark:text-[#f5f5f7] block mb-1.5">Orientation</label>
                <select
                  value={settings.rotationDegrees}
                  onChange={(e: any) => setSettings({ ...settings, rotationDegrees: Number(e.target.value) })}
                  className="w-full px-3 py-2 rounded-xl bg-white dark:bg-[#2c2c2e] border border-black/10 dark:border-white/10 text-[13px] font-medium text-[#1d1d1f] dark:text-[#f5f5f7] focus:outline-none"
                >
                  <option value={45}>Diagonal (45° Angle)</option>
                  <option value={0}>Horizontal (0° Angle)</option>
                  <option value={-45}>Reverse Diagonal (-45°)</option>
                </select>
              </div>

              <div>
                <div className="flex justify-between text-[12px] font-semibold text-[#1d1d1f] dark:text-[#f5f5f7] mb-1.5">
                  <span>Opacity</span>
                  <span className="text-[#86868b] dark:text-[#8e8e93]">{Math.round(settings.opacity * 100)}%</span>
                </div>
                <input
                  type="range"
                  min={0.1}
                  max={0.8}
                  step={0.05}
                  value={settings.opacity}
                  onChange={(e) => setSettings({ ...settings, opacity: parseFloat(e.target.value) })}
                  className="w-full accent-[#5856d6]"
                />
              </div>

              <div>
                <div className="flex justify-between text-[12px] font-semibold text-[#1d1d1f] dark:text-[#f5f5f7] mb-1.5">
                  <span>Font Size</span>
                  <span className="text-[#86868b] dark:text-[#8e8e93]">{settings.fontSize}pt</span>
                </div>
                <input
                  type="range"
                  min={24}
                  max={72}
                  step={2}
                  value={settings.fontSize}
                  onChange={(e) => setSettings({ ...settings, fontSize: parseInt(e.target.value, 10) })}
                  className="w-full accent-[#5856d6]"
                />
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
                onClick={handleApplyWatermark}
                className="w-full sm:w-auto px-8 py-3 rounded-xl bg-[#5856d6] hover:bg-[#4d4bb8] active:bg-[#4240a3] text-white font-semibold text-[15px] shadow-sm flex items-center justify-center gap-2 transition-all cursor-pointer"
              >
                {isProcessing ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>Applying Watermark...</span>
                  </>
                ) : (
                  <>
                    <Stamp className="w-4 h-4" />
                    <span>Stamp Watermark on {pageCount} Pages</span>
                  </>
                )}
              </button>
            </div>
          </div>
        )}

        {/* Result */}
        {result && (
          <div className="p-6 rounded-[20px] bg-[#5856d6]/10 dark:bg-[#5856d6]/15 border border-[#5856d6]/20 text-center space-y-4 animate-in zoom-in-95 duration-150">
            <div className="w-12 h-12 rounded-full bg-[#5856d6] text-white mx-auto flex items-center justify-center shadow-md">
              <CheckCircle2 className="w-6 h-6" />
            </div>
            <div>
              <h4 className="text-[18px] font-bold text-[#1d1d1f] dark:text-[#f5f5f7]">Watermark Applied Successfully!</h4>
              <p className="text-[13px] text-[#6e6e73] dark:text-[#8e8e93] mt-1">
                Stamped across <strong>{result.totalPages} pages</strong> ({formatBytes(result.blob.size)})
              </p>
            </div>

            <div className="flex items-center justify-center gap-3 pt-2">
              <button
                type="button"
                onClick={handleDownload}
                className="px-6 py-2.5 rounded-xl bg-[#5856d6] hover:bg-[#4d4bb8] text-white text-[14px] font-semibold shadow-xs flex items-center gap-2 cursor-pointer"
              >
                <Download className="w-4 h-4" />
                <span>Download Watermarked PDF</span>
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
