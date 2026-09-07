import React, { useRef, useState } from 'react';
import {
  FileText,
  Image as ImageIcon,
  Film,
  Music,
  AlertCircle,
  FilePlus2,
  Lock,
  Cpu,
  Eye,
  Layers,
} from 'lucide-react';
import { FileCategory, UploadedFileInfo } from '../types';
import { detectFileCategory, getAcceptedExtensions } from '../utils/formatters';
import { prepareFileInfo } from '../utils/fileInfo';

interface DropZoneProps {
  activeCategory: FileCategory;
  hoverCategory: FileCategory | null;
  onFileLoaded: (fileInfo: UploadedFileInfo) => void;
  onMultipleFilesLoaded?: (files: UploadedFileInfo[]) => void;
}

export const DropZone: React.FC<DropZoneProps> = ({
  activeCategory,
  hoverCategory,
  onFileLoaded,
  onMultipleFilesLoaded,
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isDragOver, setIsDragOver] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const effectiveCategory = hoverCategory || activeCategory;

  const getCategoryDetails = () => {
    switch (effectiveCategory) {
      case 'pdf':
        return {
          title: 'Drop PDF document here',
          subtitle: 'Compress scanned documents, portfolios, reports, and multi-page books.',
          icon: <FileText className="w-10 h-10 text-[#ff3b30]" />,
          badge: 'PDF Document',
          extensions: ['.pdf'],
        };
      case 'image':
        return {
          title: 'Drop photos or images here',
          subtitle: 'Reduce image file size while keeping fine details, text, and vibrant colors.',
          icon: <ImageIcon className="w-10 h-10 text-[#34c759]" />,
          badge: 'Photos & Images',
          extensions: ['.jpg', '.jpeg', '.png', '.webp', '.avif'],
        };
      case 'video':
        return {
          title: 'Drop video files here',
          subtitle: 'Compress high-definition video clips and recordings for easy sharing.',
          icon: <Film className="w-10 h-10 text-[#0071e3]" />,
          badge: 'Video Clips',
          extensions: ['.mp4', '.mov', '.mkv', '.webm'],
        };
      case 'document':
        return {
          title: 'Drop Office document here',
          subtitle: 'Losslessly optimize DOCX, PPTX, and XLSX packages without changing document content.',
          icon: <FileText className="w-10 h-10 text-[#0071e3]" />,
          badge: 'Office Documents',
          extensions: ['.docx', '.pptx', '.xlsx', '.docm', '.pptm', '.xlsm'],
        };
      case 'audio':
        return {
          title: 'Drop audio files here',
          subtitle: 'Compress podcasts, music, voice memos, and recordings.',
          icon: <Music className="w-10 h-10 text-[#af52de]" />,
          badge: 'Audio & Music',
          extensions: ['.mp3', '.wav', '.m4a', '.aac', '.ogg'],
        };
      case 'all':
      default:
        return {
          title: 'Drop your files here to compress',
          subtitle: 'Reduce PDF, image, video, audio, and Office document file sizes with safe content-preserving optimization.',
          icon: <FilePlus2 className="w-10 h-10 text-[#0071e3]" />,
          badge: 'Universal Compression',
          extensions: ['.pdf', '.jpg', '.png', '.webp', '.mp4', '.mp3', '.wav'],
        };
    }
  };

  const currentDetails = getCategoryDetails();

  const handleProcessFileList = (fileList: FileList | File[]) => {
    setErrorMessage(null);
    const validItems: UploadedFileInfo[] = [];
    const invalidNames: string[] = [];

    Array.from(fileList).forEach((file) => {
      const category = detectFileCategory(file);
      if (category) {
        validItems.push(prepareFileInfo(file, category));
      } else {
        invalidNames.push(file.name);
      }
    });

    if (invalidNames.length > 0 && validItems.length === 0) {
      setErrorMessage(
        `"${invalidNames.join(', ')}" is not supported. Please choose a PDF, image, video, audio, DOCX, PPTX, or XLSX file.`
      );
      return;
    }

    if (validItems.length > 1 && onMultipleFilesLoaded) {
      onMultipleFilesLoaded(validItems);
    } else if (validItems.length > 0) {
      onFileLoaded(validItems[0]);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      handleProcessFileList(files);
    }
    if (e.target) {
      e.target.value = '';
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);

    const files = e.dataTransfer.files;
    if (files && files.length > 0) {
      handleProcessFileList(files);
    }
  };

  const handleBrowseClick = () => {
    fileInputRef.current?.click();
  };

  const handleLoadSample = async (type: 'pdf' | 'image' | 'video' | 'audio') => {
    const samples = await import('../utils/sampleFiles');
    let file: File;
    if (type === 'pdf') {
      try {
        file = await samples.createSamplePdfFileAsync();
      } catch {
        file = samples.createSamplePdfFile();
      }
    } else if (type === 'image') {
      file = samples.createSampleImageFile();
    } else if (type === 'audio') {
      file = samples.createSampleAudioFile();
    } else {
      try {
        file = await samples.createSampleVideoFileAsync();
      } catch {
        file = samples.createSampleVideoFile();
      }
    }

    handleProcessFileList([file]);
  };

  return (
    <div className="w-full max-w-3xl mx-auto flex flex-col items-center">
      {/* Nomu Storefront Inspired Drop Target */}
      <div
        id="file-dropzone-container"
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={handleBrowseClick}
        className={`relative w-full rounded-[28px] p-8 sm:p-12 md:p-14 text-center cursor-pointer transition-all duration-200 bg-white dark:bg-[#111C38] border-2 border-dashed ${
          isDragOver
            ? 'border-[#FF5722] ring-4 ring-[#FF5722]/20 bg-[#FFF9F6] dark:bg-[#FF5722]/10 shadow-[0_16px_40px_rgba(255,87,34,0.15)] scale-[1.01]'
            : 'border-[#0C162C]/15 dark:border-white/15 hover:border-[#FF5722] shadow-[0_10px_35px_rgba(12,22,44,0.05)] dark:shadow-[0_10px_35px_rgba(0,0,0,0.4)]'
        }`}
      >
        {/* Top Badges Inside DropZone */}
        <div className="flex items-center justify-between mb-6 pb-3 border-b border-[#0C162C]/8 dark:border-white/8 text-xs font-semibold text-[#5C6479] dark:text-white/60">
          <span className="flex items-center gap-1.5 text-[#FF5722]">
            <span className="inline-block w-2 h-2 rounded-full bg-[#FF5722] animate-pulse"></span>
            Instant Processing
          </span>
          <span className="px-2.5 py-0.5 rounded-full bg-[#0C162C]/5 dark:bg-white/10 text-[11px] font-bold text-[#0C162C] dark:text-white">
            {currentDetails.badge}
          </span>
          <span className="text-[#0C162C]/70 dark:text-white/70 font-medium">100% Private</span>
        </div>

        {/* Centerpiece Icon */}
        <div className="mx-auto mb-5 w-20 h-20 rounded-3xl bg-[#FFF4EE] dark:bg-[#FF5722]/15 border border-[#FF5722]/20 flex items-center justify-center transition-all duration-300 group-hover:scale-105 shadow-sm">
          {currentDetails.icon}
        </div>

        {/* Title and Subtitle with Nomu Typography */}
        <div className="max-w-md mx-auto mb-7 space-y-2">
          <h2
            id="dropzone-title"
            className="text-2xl sm:text-3xl font-extrabold tracking-tight text-[#0C162C] dark:text-white"
          >
            {currentDetails.title}
          </h2>
          <p className="text-sm text-[#5C6479] dark:text-white/60 leading-relaxed font-normal">
            {currentDetails.subtitle}
          </p>
        </div>

        {/* Primary Action Button - Nomu Signature Orange Pill */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
          <button
            type="button"
            id="browse-files-btn"
            onClick={(e) => {
              e.stopPropagation();
              handleBrowseClick();
            }}
            className="w-full sm:w-auto px-8 py-3.5 rounded-full bg-[#FF5722] hover:bg-[#FF6838] text-white font-bold text-sm tracking-wide shadow-[0_4px_16px_rgba(255,87,34,0.35)] hover:shadow-[0_6px_22px_rgba(255,87,34,0.45)] transition-all active:scale-[0.98] cursor-pointer"
          >
            Choose files from device
          </button>
        </div>

        {/* Formats Pills */}
        <div className="mt-8 pt-5 border-t border-[#0C162C]/8 dark:border-white/8 flex flex-wrap items-center justify-center gap-2 text-xs text-[#5C6479] dark:text-white/60">
          <span className="font-semibold text-[#0C162C] dark:text-white">Supported formats:</span>
          {currentDetails.extensions.map((ext) => (
            <span
              key={ext}
              className="px-2.5 py-0.5 rounded-full bg-[#0C162C]/5 dark:bg-white/10 text-[#0C162C] dark:text-white/90 font-medium text-[11px]"
            >
              {ext.toUpperCase()}
            </span>
          ))}
          <span className="text-black/20 dark:text-white/20 mx-1">•</span>
          <span className="font-semibold text-[#FF5722]">Batch upload supported</span>
        </div>

        {/* Hidden Native File Input */}
        <input
          ref={fileInputRef}
          type="file"
          id="native-file-input"
          multiple
          className="hidden"
          accept={getAcceptedExtensions(effectiveCategory)}
          onChange={handleFileChange}
        />
      </div>

      {/* Error Alert Box */}
      {errorMessage && (
        <div
          id="upload-error-banner"
          className="w-full mt-4 p-4 rounded-2xl bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800 text-red-900 dark:text-red-200 text-sm flex items-start gap-3 animate-in fade-in shadow-sm"
        >
          <AlertCircle className="w-5 h-5 text-[#FF5722] shrink-0 mt-0.5" />
          <div className="flex-1">
            <p className="font-bold">File Unsupported</p>
            <p className="text-xs text-red-700 dark:text-red-300 mt-0.5">{errorMessage}</p>
          </div>
          <button
            onClick={() => setErrorMessage(null)}
            className="text-xs font-semibold hover:underline cursor-pointer"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Instant Test Samples Quick Bar - Nomu Card Style */}
      <div className="w-full mt-5 p-4 rounded-2xl bg-white dark:bg-[#111C38] border border-[#0C162C]/10 dark:border-white/10 shadow-sm">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div className="text-xs font-medium text-[#5C6479] dark:text-white/60 flex items-center gap-2">
            <span className="font-bold text-[#0C162C] dark:text-white">Quick test:</span>
            <span>Try with a sample file instantly</span>
          </div>
          <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
            <button
              id="test-sample-pdf-btn"
              onClick={() => handleLoadSample('pdf')}
              className="flex-1 sm:flex-initial px-3.5 py-1.5 rounded-full bg-[#FAF7F2] dark:bg-[#1A2645] hover:bg-[#F2EDE4] dark:hover:bg-[#202E54] text-[#0C162C] dark:text-white text-xs font-semibold border border-[#0C162C]/10 dark:border-white/10 transition-all flex items-center justify-center gap-1.5 cursor-pointer shadow-xs"
            >
              <FileText className="w-3.5 h-3.5 text-[#FF5722]" />
              <span>Sample PDF</span>
            </button>
            <button
              id="test-sample-image-btn"
              onClick={() => handleLoadSample('image')}
              className="flex-1 sm:flex-initial px-3.5 py-1.5 rounded-full bg-[#FAF7F2] dark:bg-[#1A2645] hover:bg-[#F2EDE4] dark:hover:bg-[#202E54] text-[#0C162C] dark:text-white text-xs font-semibold border border-[#0C162C]/10 dark:border-white/10 transition-all flex items-center justify-center gap-1.5 cursor-pointer shadow-xs"
            >
              <ImageIcon className="w-3.5 h-3.5 text-[#34c759]" />
              <span>Sample Photo</span>
            </button>
            <button
              id="test-sample-video-btn"
              onClick={() => handleLoadSample('video')}
              className="flex-1 sm:flex-initial px-3.5 py-1.5 rounded-full bg-[#FAF7F2] dark:bg-[#1A2645] hover:bg-[#F2EDE4] dark:hover:bg-[#202E54] text-[#0C162C] dark:text-white text-xs font-semibold border border-[#0C162C]/10 dark:border-white/10 transition-all flex items-center justify-center gap-1.5 cursor-pointer shadow-xs"
            >
              <Film className="w-3.5 h-3.5 text-[#0071e3]" />
              <span>Sample Video</span>
            </button>
            <button
              id="test-sample-audio-btn"
              onClick={() => handleLoadSample('audio')}
              className="flex-1 sm:flex-initial px-3.5 py-1.5 rounded-full bg-[#FAF7F2] dark:bg-[#1A2645] hover:bg-[#F2EDE4] dark:hover:bg-[#202E54] text-[#0C162C] dark:text-white text-xs font-semibold border border-[#0C162C]/10 dark:border-white/10 transition-all flex items-center justify-center gap-1.5 cursor-pointer shadow-xs"
            >
              <Music className="w-3.5 h-3.5 text-[#af52de]" />
              <span>Sample Audio</span>
            </button>
          </div>
        </div>
      </div>

      {/* 3 Core Value Props - Nomu Style Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5 w-full mt-4 text-left">
        <div className="p-4.5 rounded-2xl bg-white dark:bg-[#111C38] border border-[#0C162C]/8 dark:border-white/8 hover:border-[#FF5722]/30 transition-all shadow-sm">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-7 h-7 rounded-xl bg-orange-500/10 flex items-center justify-center">
              <Cpu className="w-4 h-4 text-[#FF5722]" />
            </div>
            <span className="text-xs font-bold text-[#FF5722] uppercase tracking-wider">Fast & Local</span>
          </div>
          <h4 className="text-sm font-bold text-[#0C162C] dark:text-white">WebAssembly Engine</h4>
          <p className="text-xs text-[#5C6479] dark:text-white/60 mt-1 leading-relaxed">
            Direct on-device processing via native multi-threaded browser workers. Zero queue waiting.
          </p>
        </div>

        <div className="p-4.5 rounded-2xl bg-white dark:bg-[#111C38] border border-[#0C162C]/8 dark:border-white/8 hover:border-[#FF5722]/30 transition-all shadow-sm">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-7 h-7 rounded-xl bg-emerald-500/10 flex items-center justify-center">
              <Lock className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
            </div>
            <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider">Privacy First</span>
          </div>
          <h4 className="text-sm font-bold text-[#0C162C] dark:text-white">Zero Cloud Uploads</h4>
          <p className="text-xs text-[#5C6479] dark:text-white/60 mt-1 leading-relaxed">
            Your confidential files never touch remote servers or databases. 100% air-gapped security.
          </p>
        </div>

        <div className="p-4.5 rounded-2xl bg-white dark:bg-[#111C38] border border-[#0C162C]/8 dark:border-white/8 hover:border-[#FF5722]/30 transition-all shadow-sm">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-7 h-7 rounded-xl bg-amber-500/10 flex items-center justify-center">
              <Eye className="w-4 h-4 text-[#FFCB70]" />
            </div>
            <span className="text-xs font-bold text-[#FF9500] uppercase tracking-wider">Studio Quality</span>
          </div>
          <h4 className="text-sm font-bold text-[#0C162C] dark:text-white">Lossless Fidelity</h4>
          <p className="text-xs text-[#5C6479] dark:text-white/60 mt-1 leading-relaxed">
            Preserves font vectors, form fields, high-res graphics, and color balance with precision.
          </p>
        </div>
      </div>
    </div>
  );
};
