import React from 'react';
import {
  Loader2,
  Check,
  Clock,
  Zap,
  Cpu,
  Sparkles,
} from 'lucide-react';
import { UploadedFileInfo, CompressionSettings } from '../types';
import { ProgressUpdate } from '../utils/compressionEngine';
import { formatBytes } from '../utils/formatters';

interface ProcessingViewProps {
  fileInfo: UploadedFileInfo;
  settings: CompressionSettings;
  progress: ProgressUpdate;
}

const HUMAN_STEPS = {
  pdf: [
    'Parsing PDF structure & font catalogs…',
    'Rasterizing & downsampling page streams…',
    'Applying quantizer & compression matrix…',
    'Stripping unused metadata & XRef tables…',
    'Reassembling linearized PDF payload…',
  ],
  image: [
    'Analyzing EXIF color profile & headers…',
    'Quantizing color vectors & DCT blocks…',
    'Downsampling pixel matrix & chroma…',
    'Encoding Huffman entropy codebook…',
    'Finalizing compressed image container…',
  ],
  video: [
    'Demuxing container & analyzing keyframes…',
    'Transcoding visual motion vectors…',
    'Optimizing variable bitrate (VBR)…',
    'Balancing psychoacoustic audio channels…',
    'Writing faststart playback container…',
  ],
  audio: [
    'Analyzing psychoacoustic spectrum…',
    'Downsampling audio frequency buffers…',
    'Encoding 16-bit PCM bitstream…',
    'Compacting frequency dynamics…',
    'Packaging compressed audio container…',
  ],
};

export const ProcessingView: React.FC<ProcessingViewProps> = ({
  fileInfo,
  settings,
  progress,
}) => {
  const steps = HUMAN_STEPS[fileInfo.category] || HUMAN_STEPS.image;

  const radius = 62;
  const circumference = 2 * Math.PI * radius;
  const percentage = Math.min(100, Math.max(0, progress.percentage));
  const strokeDashoffset = circumference - (percentage / 100) * circumference;

  return (
    <div
      id="processing-state-container"
      className="w-full max-w-xl mx-auto rounded-[32px] bg-white dark:bg-[#1c1c1e] border border-black/[0.08] dark:border-white/[0.08] shadow-[0_12px_40px_rgba(0,0,0,0.06)] p-6 sm:p-9 animate-in fade-in zoom-in-95 duration-300 relative overflow-hidden transition-colors"
    >
      {/* Subtle ambient backdrop */}
      <div className="absolute -top-24 -right-24 w-52 h-52 bg-[#0071e3]/8 dark:bg-[#2997ff]/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -bottom-24 -left-24 w-52 h-52 bg-[#34c759]/8 dark:bg-[#34c759]/10 rounded-full blur-3xl pointer-events-none" />

      {/* File Header */}
      <div className="text-center pb-5 border-b border-black/[0.06] dark:border-white/[0.08] relative z-10">
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#0071e3]/10 dark:bg-[#2997ff]/20 text-[#0071e3] dark:text-[#2997ff] text-[12px] font-semibold mb-2.5">
          <Zap className="w-3.5 h-3.5 fill-[#0071e3]/20" />
          <span>ZipStream In-Memory Engine Active</span>
        </div>
        <h3 className="text-[18px] font-semibold text-[#1d1d1f] dark:text-[#f5f5f7] truncate max-w-md mx-auto">
          Optimizing “{fileInfo.name}”
        </h3>
        <p className="text-[13px] text-[#86868b] dark:text-[#8e8e93] mt-1 flex items-center justify-center gap-2">
          <span>{formatBytes(fileInfo.size)}</span>
          <span>•</span>
          <span className="capitalize font-medium text-[#1d1d1f] dark:text-[#f5f5f7]">
            {settings.targetSizeBytes
              ? `Target Cap: ${formatBytes(settings.targetSizeBytes)}`
              : settings.level === 'low'
              ? 'Best Quality'
              : settings.level === 'medium'
              ? 'Balanced'
              : 'Smallest Size'}
          </span>
        </p>
      </div>

      {/* Circular Progress Gauge with Apple aesthetic */}
      <div className="py-6 flex flex-col items-center justify-center relative z-10">
        <div className="relative w-44 h-44 flex items-center justify-center">
          {/* Ambient Rotating Gradient Ring */}
          <div className="absolute inset-0 rounded-full bg-gradient-to-tr from-[#0071e3]/15 via-transparent to-[#30b0c7]/20 animate-spin [animation-duration:6s] blur-md pointer-events-none" />

          <svg className="w-40 h-40 transform -rotate-90 relative z-10" viewBox="0 0 160 160">
            {/* Background Track */}
            <circle
              cx="80"
              cy="80"
              r={radius}
              stroke="currentColor"
              className="text-[#f0f0f4] dark:text-[#2c2c2e]"
              strokeWidth="9"
              fill="transparent"
            />
            {/* Gradient Definition */}
            <defs>
              <linearGradient id="appleGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#0071e3" />
                <stop offset="60%" stopColor="#2997ff" />
                <stop offset="100%" stopColor="#30b0c7" />
              </linearGradient>
            </defs>
            {/* Animated Active Track */}
            <circle
              cx="80"
              cy="80"
              r={radius}
              stroke="url(#appleGradient)"
              strokeWidth="9"
              strokeDasharray={circumference}
              strokeDashoffset={strokeDashoffset}
              strokeLinecap="round"
              fill="transparent"
              style={{
                transition: 'stroke-dashoffset 0.2s ease-out',
              }}
            />
          </svg>

          {/* Center Percentage Display */}
          <div className="absolute flex flex-col items-center justify-center text-center z-20 pointer-events-none">
            <div className="flex items-baseline">
              <span
                id="processing-percentage-display"
                className="text-4xl font-semibold text-[#1d1d1f] dark:text-[#f5f5f7] tracking-tight font-mono"
              >
                {percentage}
              </span>
              <span className="text-xl font-semibold text-[#0071e3] dark:text-[#2997ff] font-mono ml-0.5">%</span>
            </div>
            <div className="flex items-center gap-1.5 mt-0.5">
              <span className="w-1.5 h-1.5 rounded-full bg-[#0071e3] dark:bg-[#2997ff] animate-ping" />
              <span className="text-[11px] font-semibold text-[#86868b] dark:text-[#8e8e93] uppercase tracking-wider">
                {percentage === 100 ? 'Finalizing' : 'Optimizing'}
              </span>
            </div>
          </div>
        </div>

        {/* Dynamic Status Text & Linear Bar */}
        <div className="mt-4 text-center max-w-sm w-full">
          <p
            id="processing-status-text"
            className="text-[14px] font-medium text-[#1d1d1f] dark:text-[#f5f5f7] min-h-[1.4rem]"
          >
            {steps[Math.min(steps.length - 1, progress.stepIndex - 1)] || progress.currentStep}
          </p>

          {/* Animated Linear Progress Bar */}
          <div className="w-full bg-[#f0f0f4] dark:bg-[#2c2c2e] h-2 rounded-full overflow-hidden mt-3 max-w-xs mx-auto relative shadow-inner">
            <div
              className="bg-gradient-to-r from-[#0071e3] via-[#2997ff] to-[#30b0c7] h-full rounded-full transition-all duration-200 ease-out relative"
              style={{ width: `${percentage}%` }}
            >
              {/* Shimmer reflection */}
              <div className="absolute inset-0 bg-white/30 animate-[pulse_1.5s_ease-in-out_infinite]" />
            </div>
          </div>
          
          {/* Live Engine Metrics */}
          <div className="flex items-center justify-center gap-4 text-[12px] text-[#86868b] dark:text-[#8e8e93] mt-3.5 font-medium">
            <span className="flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5 text-[#0071e3] dark:text-[#2997ff]" />
              <span>{(progress.elapsedMs / 1000).toFixed(1)}s elapsed</span>
            </span>
            <span>•</span>
            <span className="flex items-center gap-1.5">
              <Cpu className="w-3.5 h-3.5 text-[#34c759]" />
              <span>{progress.speedMBps || 14.5} MB/s throughput</span>
            </span>
          </div>
        </div>
      </div>

      {/* Structured Progress Checklist */}
      <div className="bg-[#f5f5f7]/80 dark:bg-[#252528]/80 backdrop-blur-xs rounded-2xl p-3.5 border border-black/[0.04] dark:border-white/[0.06] space-y-1.5 relative z-10">
        <div className="flex items-center justify-between text-[11px] font-semibold text-[#86868b] dark:text-[#8e8e93] px-2.5 pb-1">
          <span>PIPELINE EXECUTION</span>
          <span>STEP {Math.min(steps.length, progress.stepIndex)} OF {steps.length}</span>
        </div>
        {steps.map((stepText, idx) => {
          const stepNumber = idx + 1;
          const isDone = stepNumber < progress.stepIndex;
          const isCurrent = stepNumber === progress.stepIndex;
          return (
            <div
              key={idx}
              className={`flex items-center gap-2.5 text-[12px] px-3 py-2 rounded-xl transition-all duration-200 ${
                isCurrent
                  ? 'bg-white dark:bg-[#1c1c1e] text-[#1d1d1f] dark:text-[#f5f5f7] font-semibold shadow-xs ring-1 ring-[#0071e3]/20 dark:ring-[#2997ff]/40'
                  : isDone
                  ? 'text-[#6e6e73] dark:text-[#a1a1a6]'
                  : 'text-[#a1a1a6] dark:text-[#636366]'
              }`}
            >
              {isDone ? (
                <div className="w-4 h-4 rounded-full bg-[#34c759] text-white flex items-center justify-center shrink-0 shadow-xs">
                  <Check className="w-2.5 h-2.5 stroke-[3]" />
                </div>
              ) : isCurrent ? (
                <div className="w-4 h-4 rounded-full bg-[#0071e3]/15 dark:bg-[#2997ff]/20 flex items-center justify-center shrink-0">
                  <div className="w-2 h-2 rounded-full bg-[#0071e3] dark:bg-[#2997ff] animate-pulse" />
                </div>
              ) : (
                <div className="w-4 h-4 rounded-full border border-black/15 dark:border-white/20 shrink-0" />
              )}
              <span className="truncate">{stepText}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
};


