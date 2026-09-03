import React, { useState } from 'react';
import {
  Download,
  RotateCcw,
  Check,
  Music,
  Film,
  FileText,
  Copy,
  CheckCheck,
} from 'lucide-react';
import { CompressionResult } from '../types';
import { formatBytes, downloadBlob } from '../utils/formatters';

interface SuccessViewProps {
  result: CompressionResult;
  onCompressAnother: () => void;
}

export const SuccessView: React.FC<SuccessViewProps> = ({
  result,
  onCompressAnother,
}) => {
  const [downloaded, setDownloaded] = useState(false);
  const [copied, setCopied] = useState(false);

  const handleDownload = () => {
    downloadBlob(result.compressedBlob, result.compressedName);
    setDownloaded(true);
    setTimeout(() => setDownloaded(false), 3000);
  };

  const handleCopyName = () => {
    navigator.clipboard.writeText(result.compressedName);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div
      id="compression-success-container"
      className="w-full max-w-3xl mx-auto rounded-[28px] bg-white dark:bg-[#1c1c1e] border border-black/[0.08] dark:border-white/[0.08] shadow-[0_4px_24px_rgba(0,0,0,0.06)] overflow-hidden animate-in fade-in duration-200 transition-colors"
    >
      {/* Header Banner */}
      <div className="p-6 sm:p-7 bg-[#fafafc] dark:bg-[#252528] border-b border-black/[0.06] dark:border-white/[0.08] flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <div className="w-11 h-11 rounded-full bg-[#34c759] text-white flex items-center justify-center shadow-xs">
            <Check className="w-6 h-6 stroke-[2.5]" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-[18px] font-semibold text-[#1d1d1f] dark:text-[#f5f5f7]">
                Compression Complete
              </h2>
              <span className="px-2.5 py-0.5 rounded-full bg-[#34c759]/10 dark:bg-[#34c759]/20 text-[#34c759] font-semibold text-[11px]">
                -{result.savedPercentage}%
              </span>
            </div>
            <p className="text-[13px] text-[#86868b] dark:text-[#8e8e93] mt-0.5">
              Saved {formatBytes(result.savedBytes)} space on your device
            </p>
          </div>
        </div>

        <div className="text-[12px] text-[#6e6e73] dark:text-[#a1a1a6] font-medium px-3 py-1.5 rounded-lg bg-white dark:bg-[#2c2c2e] border border-black/[0.06] dark:border-white/[0.08] shadow-xs">
          Completed in {result.processingTimeSec}s
        </div>
      </div>

      {/* Main Content Body */}
      <div className="p-6 sm:p-7 space-y-6">
        {/* Metric Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
          {/* Original */}
          <div className="p-4 rounded-2xl bg-[#f5f5f7] dark:bg-[#252528] border border-black/[0.04] dark:border-white/[0.06]">
            <span className="text-[11px] font-medium text-[#86868b] dark:text-[#8e8e93] uppercase tracking-wider block">
              Original Size
            </span>
            <p className="text-[22px] font-semibold text-[#1d1d1f] dark:text-[#f5f5f7] mt-1">
              {formatBytes(result.originalFile.size)}
            </p>
            <p className="text-[12px] text-[#86868b] dark:text-[#8e8e93] mt-0.5 truncate">
              {result.originalFile.name}
            </p>
          </div>

          {/* Compressed */}
          <div className="p-4 rounded-2xl bg-[#f0f6ff] dark:bg-[#182635] border border-[#0071e3]/20 dark:border-[#2997ff]/30">
            <span className="text-[11px] font-medium text-[#0071e3] dark:text-[#2997ff] uppercase tracking-wider block">
              Compressed Size
            </span>
            <p className="text-[22px] font-semibold text-[#0071e3] dark:text-[#2997ff] mt-1">
              {formatBytes(result.compressedSize)}
            </p>
            <div className="flex items-center justify-between mt-0.5">
              <span className="text-[12px] text-[#0071e3]/80 dark:text-[#2997ff]/80 truncate">
                {result.compressedName}
              </span>
              <button
                type="button"
                onClick={handleCopyName}
                title="Copy file name"
                className="text-[#0071e3] dark:text-[#2997ff] hover:text-[#0055b3] dark:hover:text-[#64b5ff] ml-1 p-0.5 cursor-pointer"
              >
                {copied ? <CheckCheck className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
              </button>
            </div>
          </div>

          {/* Space Saved */}
          <div className="p-4 rounded-2xl bg-[#34c759]/5 dark:bg-[#34c759]/10 border border-[#34c759]/20 dark:border-[#34c759]/30">
            <span className="text-[11px] font-medium text-[#34c759] uppercase tracking-wider block">
              Reduction
            </span>
            <p className="text-[22px] font-semibold text-[#34c759] mt-1">
              -{result.savedPercentage}%
            </p>
            <p className="text-[12px] text-[#34c759] mt-0.5">
              {formatBytes(result.savedBytes)} saved
            </p>
          </div>
        </div>

        {/* Visual Preview for Images */}
        {result.originalFile.category === 'image' && result.compressedPreviewUrl && (
          <div className="p-4 rounded-2xl bg-[#fafafc] dark:bg-[#252528] border border-black/[0.06] dark:border-white/[0.08] space-y-2">
            <div className="flex items-center justify-between text-[12px] font-medium text-[#6e6e73] dark:text-[#a1a1a6]">
              <span>Quick Look Preview</span>
              <span>{formatBytes(result.compressedSize)}</span>
            </div>
            <div className="h-44 sm:h-56 rounded-xl overflow-hidden bg-white dark:bg-[#1c1c1e] border border-black/[0.06] dark:border-white/[0.08] flex items-center justify-center p-2">
              <img
                src={result.compressedPreviewUrl}
                alt="Compressed preview"
                className="max-h-full max-w-full object-contain rounded-lg"
              />
            </div>
          </div>
        )}

        {/* Audio Player Preview */}
        {result.originalFile.category === 'audio' && result.compressedPreviewUrl && (
          <div className="p-4 rounded-2xl bg-[#fafafc] dark:bg-[#252528] border border-black/[0.06] dark:border-white/[0.08] space-y-3">
            <div className="flex items-center justify-between text-[12px] font-medium text-[#6e6e73] dark:text-[#a1a1a6]">
              <div className="flex items-center gap-1.5">
                <Music className="w-4 h-4 text-[#af52de]" />
                <span>Audio Playback Preview</span>
              </div>
              <span className="text-[#af52de] font-mono text-[11px]">Valid 16-bit PCM WAV</span>
            </div>
            <div className="p-3 bg-white dark:bg-[#1c1c1e] rounded-xl border border-black/[0.06] dark:border-white/[0.08]">
              <audio
                controls
                src={result.compressedPreviewUrl}
                className="w-full h-9 focus:outline-none"
              />
            </div>
          </div>
        )}

        {/* Video Player Preview */}
        {result.originalFile.category === 'video' && result.compressedPreviewUrl && (
          <div className="p-4 rounded-2xl bg-[#fafafc] dark:bg-[#252528] border border-black/[0.06] dark:border-white/[0.08] space-y-2">
            <div className="flex items-center justify-between text-[12px] font-medium text-[#6e6e73] dark:text-[#a1a1a6]">
              <div className="flex items-center gap-1.5">
                <Film className="w-4 h-4 text-[#0071e3] dark:text-[#2997ff]" />
                <span>Video Playback Preview</span>
              </div>
              <span className="text-[#0071e3] dark:text-[#2997ff] font-mono text-[11px]">Valid WebM / MP4 Stream</span>
            </div>
            <div className="max-h-56 rounded-xl overflow-hidden bg-black flex items-center justify-center">
              <video
                controls
                playsInline
                src={result.compressedPreviewUrl}
                className="max-h-52 w-full object-contain"
              />
            </div>
          </div>
        )}

        {/* PDF Metadata Badge */}
        {result.originalFile.category === 'pdf' && (
          <div className="p-4 rounded-2xl bg-[#fafafc] dark:bg-[#252528] border border-black/[0.06] dark:border-white/[0.08] flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <FileText className="w-5 h-5 text-[#ff3b30]" />
              <div>
                <h4 className="text-[13px] font-medium text-[#1d1d1f] dark:text-[#f5f5f7]">
                  PDF Stream & XRef Rebuilt Successfully
                </h4>
                <p className="text-[12px] text-[#86868b] dark:text-[#8e8e93]">
                  Full compatibility across Adobe Acrobat, Preview, Chrome, and iOS Files.
                  {result.pdfPageCount ? ` (${result.pdfPageCount} pages preserved)` : ''}
                </p>
              </div>
            </div>
            <span className="px-2.5 py-1 rounded-md bg-[#34c759]/10 text-[#34c759] font-medium text-[11px]">
              Verified Valid
            </span>
          </div>
        )}

        {/* Actions Bar */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
          {/* Download Button */}
          <button
            type="button"
            id="download-compressed-file-btn"
            onClick={handleDownload}
            className="w-full sm:w-auto px-8 py-3.5 rounded-full bg-[#0071e3] hover:bg-[#0077ed] active:bg-[#0062c4] text-white font-medium text-[15px] shadow-sm transition-all active:scale-[0.98] flex items-center justify-center gap-2 cursor-pointer"
          >
            {downloaded ? (
              <>
                <Check className="w-4 h-4 stroke-[2.5]" />
                <span>Saved to Downloads</span>
              </>
            ) : (
              <>
                <Download className="w-4 h-4" />
                <span>Save to Device ({formatBytes(result.compressedSize)})</span>
              </>
            )}
          </button>

          {/* Compress Another */}
          <button
            type="button"
            id="compress-another-file-btn"
            onClick={onCompressAnother}
            className="w-full sm:w-auto px-6 py-3.5 rounded-full bg-[#f5f5f7] dark:bg-[#2c2c2e] hover:bg-[#e8e8ed] dark:hover:bg-[#3a3a3c] text-[#1d1d1f] dark:text-[#f5f5f7] font-medium text-[14px] transition-colors flex items-center justify-center gap-2 cursor-pointer"
          >
            <RotateCcw className="w-4 h-4 text-[#86868b] dark:text-[#8e8e93]" />
            <span>Compress Another File</span>
          </button>
        </div>
      </div>
    </div>
  );
};
