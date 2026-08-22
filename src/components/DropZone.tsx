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
import {
  createSamplePdfFile,
  createSamplePdfFileAsync,
  createSampleImageFile,
  createSampleVideoFile,
  createSampleVideoFileAsync,
  createSampleAudioFile,
  prepareFileInfo,
} from '../utils/sampleFiles';

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
          subtitle: 'Reduce file size of PDFs, images, videos, and audio on-device.',
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
        `"${invalidNames.join(', ')}" is not supported. Please choose a PDF, image, video, or audio file.`
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
    let file: File;
    if (type === 'pdf') {
      try {
        file = await createSamplePdfFileAsync();
      } catch {
        file = createSamplePdfFile();
      }
    } else if (type === 'image') {
      file = createSampleImageFile();
    } else if (type === 'audio') {
      file = createSampleAudioFile();
    } else {
      try {
        file = await createSampleVideoFileAsync();
      } catch {
        file = createSampleVideoFile();
      }
    }

    handleProcessFileList([file]);
  };

  return (
    <div className="w-full max-w-3xl mx-auto flex flex-col items-center">
      {/* Apple Mac Drop Target Card */}
      <div
        id="file-dropzone-container"
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={handleBrowseClick}
        className={`relative w-full rounded-[28px] p-8 sm:p-12 md:p-14 text-center cursor-pointer transition-all duration-200 bg-white dark:bg-[#1c1c1e] border ${
          isDragOver
            ? 'border-[#0071e3] dark:border-[#2997ff] ring-4 ring-[#0071e3]/10 dark:ring-[#2997ff]/20 bg-[#fbfdff] dark:bg-[#202024] scale-[1.008]'
            : 'border-black/[0.08] dark:border-white/[0.08] hover:border-black/[0.16] dark:hover:border-white/[0.16] shadow-[0_4px_20px_rgba(0,0,0,0.04),0_1px_3px_rgba(0,0,0,0.02)]'
        }`}
      >
        {/* Subtle Category Badge */}
        <div className="flex justify-center mb-6">
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-black/[0.04] dark:bg-white/[0.06] text-[12px] font-medium text-[#6e6e73] dark:text-[#a1a1a6]">
            {currentDetails.badge}
          </span>
        </div>

        {/* Mac Document Icon Container */}
        <div className="mx-auto mb-5 w-18 h-18 rounded-[20px] bg-[#f5f5f7] dark:bg-[#2c2c2e] border border-black/[0.04] dark:border-white/[0.06] flex items-center justify-center transition-transform group-hover:scale-105">
          {currentDetails.icon}
        </div>

        {/* Title and Subtitle in Apple Typography */}
        <div className="max-w-md mx-auto mb-7 space-y-1.5">
          <h2
            id="dropzone-title"
            className="text-[22px] sm:text-[26px] font-semibold tracking-tight text-[#1d1d1f] dark:text-[#f5f5f7]"
          >
            {currentDetails.title}
          </h2>
          <p className="text-[14px] text-[#86868b] dark:text-[#8e8e93] leading-relaxed font-normal">
            {currentDetails.subtitle}
          </p>
        </div>

        {/* Apple Primary Action Button */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
          <button
            type="button"
            id="browse-files-btn"
            onClick={(e) => {
              e.stopPropagation();
              handleBrowseClick();
            }}
            className="w-full sm:w-auto px-7 py-3 rounded-full bg-[#0071e3] hover:bg-[#0077ed] active:bg-[#0062c4] text-white text-[14px] font-medium shadow-sm transition-all active:scale-[0.98] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#0071e3]"
          >
            Choose Files (Single or Batch)…
          </button>
        </div>

        {/* Supported Formats info row */}
        <div className="mt-8 pt-6 border-t border-black/[0.06] dark:border-white/[0.08] flex flex-wrap items-center justify-center gap-1.5 text-[12px] text-[#86868b] dark:text-[#8e8e93]">
          <span>Supported:</span>
          {currentDetails.extensions.map((ext) => (
            <span
              key={ext}
              className="px-1.5 py-0.5 rounded-[5px] bg-black/[0.04] dark:bg-white/[0.08] text-[#1d1d1f] dark:text-[#f5f5f7] font-mono text-[11px]"
            >
              {ext}
            </span>
          ))}
          <span className="text-[#d2d2d7] dark:text-[#3a3a3c] mx-1">•</span>
          <span>Batch mode supported</span>
          <span className="text-[#d2d2d7] dark:text-[#3a3a3c] mx-1">•</span>
          <span>Up to 500 MB</span>
        </div>

        {/* Hidden Native File Input (supports multiple) */}
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
          className="w-full mt-4 p-4 rounded-2xl bg-[#fff2f2] dark:bg-[#2c1515] border border-[#ff3b30]/20 dark:border-[#ff3b30]/30 text-[#1d1d1f] dark:text-[#f5f5f7] text-[13px] flex items-start gap-3 animate-in fade-in"
        >
          <AlertCircle className="w-4 h-4 text-[#ff3b30] shrink-0 mt-0.5" />
          <div className="flex-1">
            <p className="font-semibold text-[#ff3b30]">Unable to open file</p>
            <p className="text-[12px] text-[#6e6e73] dark:text-[#a1a1a6] mt-0.5">{errorMessage}</p>
          </div>
          <button
            onClick={() => setErrorMessage(null)}
            className="text-[12px] text-[#86868b] dark:text-[#a1a1a6] hover:text-[#1d1d1f] dark:hover:text-[#f5f5f7] font-medium px-2 py-0.5 cursor-pointer"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Instant Test Samples Quick Bar */}
      <div className="w-full mt-6 p-4 rounded-2xl bg-white dark:bg-[#1c1c1e] border border-black/[0.08] dark:border-white/[0.08] shadow-[0_2px_8px_rgba(0,0,0,0.02)]">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div className="text-[13px] text-[#6e6e73] dark:text-[#a1a1a6]">
            <span>Try with genuine sample files:</span>
          </div>
          <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
            <button
              id="test-sample-pdf-btn"
              onClick={() => handleLoadSample('pdf')}
              className="flex-1 sm:flex-initial px-3 py-1.5 rounded-lg bg-[#f5f5f7] dark:bg-[#2c2c2e] hover:bg-[#e8e8ed] dark:hover:bg-[#3a3a3c] text-[#1d1d1f] dark:text-[#f5f5f7] text-[12px] font-medium border border-black/[0.04] dark:border-white/[0.06] transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
            >
              <FileText className="w-3.5 h-3.5 text-[#ff3b30]" />
              <span>Sample PDF</span>
            </button>
            <button
              id="test-sample-image-btn"
              onClick={() => handleLoadSample('image')}
              className="flex-1 sm:flex-initial px-3 py-1.5 rounded-lg bg-[#f5f5f7] dark:bg-[#2c2c2e] hover:bg-[#e8e8ed] dark:hover:bg-[#3a3a3c] text-[#1d1d1f] dark:text-[#f5f5f7] text-[12px] font-medium border border-black/[0.04] dark:border-white/[0.06] transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
            >
              <ImageIcon className="w-3.5 h-3.5 text-[#34c759]" />
              <span>Sample Photo</span>
            </button>
            <button
              id="test-sample-video-btn"
              onClick={() => handleLoadSample('video')}
              className="flex-1 sm:flex-initial px-3 py-1.5 rounded-lg bg-[#f5f5f7] dark:bg-[#2c2c2e] hover:bg-[#e8e8ed] dark:hover:bg-[#3a3a3c] text-[#1d1d1f] dark:text-[#f5f5f7] text-[12px] font-medium border border-black/[0.04] dark:border-white/[0.06] transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
            >
              <Film className="w-3.5 h-3.5 text-[#0071e3] dark:text-[#2997ff]" />
              <span>Sample Video</span>
            </button>
            <button
              id="test-sample-audio-btn"
              onClick={() => handleLoadSample('audio')}
              className="flex-1 sm:flex-initial px-3 py-1.5 rounded-lg bg-[#f5f5f7] dark:bg-[#2c2c2e] hover:bg-[#e8e8ed] dark:hover:bg-[#3a3a3c] text-[#1d1d1f] dark:text-[#f5f5f7] text-[12px] font-medium border border-black/[0.04] dark:border-white/[0.06] transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
            >
              <Music className="w-3.5 h-3.5 text-[#af52de]" />
              <span>Sample Audio</span>
            </button>
          </div>
        </div>
      </div>

      {/* Feature Highlights */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5 w-full mt-6 text-left">
        <div className="p-4 rounded-2xl bg-white dark:bg-[#1c1c1e] border border-black/[0.08] dark:border-white/[0.08] flex items-start gap-3">
          <div className="p-2 rounded-xl bg-black/[0.04] dark:bg-white/[0.06] text-[#0071e3] dark:text-[#2997ff] shrink-0">
            <Cpu className="w-4 h-4" />
          </div>
          <div>
            <h4 className="text-[13px] font-semibold text-[#1d1d1f] dark:text-[#f5f5f7]">Fast On-Device</h4>
            <p className="text-[12px] text-[#86868b] dark:text-[#8e8e93] mt-0.5 leading-normal">
              Processed locally using your device’s hardware with zero server delays.
            </p>
          </div>
        </div>
        <div className="p-4 rounded-2xl bg-white dark:bg-[#1c1c1e] border border-black/[0.08] dark:border-white/[0.08] flex items-start gap-3">
          <div className="p-2 rounded-xl bg-black/[0.04] dark:bg-white/[0.06] text-[#34c759] shrink-0">
            <Lock className="w-4 h-4" />
          </div>
          <div>
            <h4 className="text-[13px] font-semibold text-[#1d1d1f] dark:text-[#f5f5f7]">Completely Private</h4>
            <p className="text-[12px] text-[#86868b] dark:text-[#8e8e93] mt-0.5 leading-normal">
              Your documents and media never leave your browser or computer.
            </p>
          </div>
        </div>
        <div className="p-4 rounded-2xl bg-white dark:bg-[#1c1c1e] border border-black/[0.08] dark:border-white/[0.08] flex items-start gap-3">
          <div className="p-2 rounded-xl bg-black/[0.04] dark:bg-white/[0.06] text-[#af52de] shrink-0">
            <Eye className="w-4 h-4" />
          </div>
          <div>
            <h4 className="text-[13px] font-semibold text-[#1d1d1f] dark:text-[#f5f5f7]">Retains Clarity</h4>
            <p className="text-[12px] text-[#86868b] dark:text-[#8e8e93] mt-0.5 leading-normal">
              Preserves sharp text, valid container catalogs, and clean outlines.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
