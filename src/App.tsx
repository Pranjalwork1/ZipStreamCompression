import React, { useState, useEffect, useCallback } from 'react';
import confetti from 'canvas-confetti';
import { Analytics } from '@vercel/analytics/react';
import { Header } from './components/Header';
import { DropZone } from './components/DropZone';
import { FileList } from './components/FileList';
import { BatchActionBar } from './components/BatchActionBar';
import { PrivacyBanner } from './components/PrivacyBanner';
import { PreviewModal } from './components/PreviewModal';
import { FileSettingsModal } from './components/FileSettingsModal';
import { ReportIssueModal } from './components/ReportIssueModal';
import {
  CompressibleFile,
  CompressionPreset,
  CompressionSettings,
} from './types';
import { detectFileCategory, calculateSavings, formatBytes } from './utils/formatters';
import { compressFile, createZipBundle } from './utils/compressors';

export function App() {
  // Theme state
  const [isDark, setIsDark] = useState<boolean>(() => {
    if (typeof window !== 'undefined') {
      return (
        localStorage.getItem('zipstream-theme') === 'dark' ||
        (!('zipstream-theme' in localStorage) &&
          window.matchMedia('(prefers-color-scheme: dark)').matches)
      );
    }
    return false;
  });

  useEffect(() => {
    if (isDark) {
      document.documentElement.classList.add('dark');
      localStorage.setItem('zipstream-theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('zipstream-theme', 'light');
    }
  }, [isDark]);

  const toggleTheme = () => setIsDark((prev) => !prev);

  // Compression State
  const [files, setFiles] = useState<CompressibleFile[]>([]);
  const [selectedPreset, setSelectedPreset] = useState<CompressionPreset>('balanced');
  const [isProcessingBatch, setIsProcessingBatch] = useState(false);

  // Modal States
  const [previewItem, setPreviewItem] = useState<CompressibleFile | null>(null);
  const [settingsItem, setSettingsItem] = useState<CompressibleFile | null>(null);
  const [isReportModalOpen, setIsReportModalOpen] = useState(false);

  // Generate settings from preset
  const getSettingsForPreset = (preset: CompressionPreset): CompressionSettings => {
    switch (preset) {
      case 'maximum':
        return {
          preset: 'maximum',
          quality: 0.5,
          scale: 0.7,
          targetFormat: 'webp',
          stripMetadata: true,
        };
      case 'high_quality':
        return {
          preset: 'high_quality',
          quality: 0.9,
          scale: 1.0,
          targetFormat: 'original',
          stripMetadata: false,
        };
      case 'email':
        return {
          preset: 'email',
          quality: 0.65,
          scale: 0.75,
          targetFormat: 'original',
          stripMetadata: true,
        };
      case 'balanced':
      default:
        return {
          preset: 'balanced',
          quality: 0.75,
          scale: 0.85,
          targetFormat: 'original',
          stripMetadata: true,
        };
    }
  };

  // Add newly selected files
  const handleFilesSelected = (selectedFiles: FileList | File[]) => {
    const newItems: CompressibleFile[] = Array.from(selectedFiles).map((file) => {
      const category = detectFileCategory(file);
      const isImage = category === 'image';
      const previewUrl = isImage ? URL.createObjectURL(file) : undefined;

      return {
        id: `file-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        file,
        name: file.name,
        originalSize: file.size,
        category,
        mimeType: file.type,
        previewUrl,
        status: 'pending',
        progress: 0,
        settings: getSettingsForPreset(selectedPreset),
      };
    });

    setFiles((prev) => [...prev, ...newItems]);
  };

  // Handle Preset Change
  const handlePresetChange = (preset: CompressionPreset) => {
    setSelectedPreset(preset);
    const newSettings = getSettingsForPreset(preset);
    // Update all pending files
    setFiles((prev) =>
      prev.map((f) =>
        f.status === 'pending' ? { ...f, settings: newSettings } : f
      )
    );
  };

  // Compress a single file
  const runCompression = useCallback(async (item: CompressibleFile) => {
    setFiles((prev) =>
      prev.map((f) =>
        f.id === item.id ? { ...f, status: 'compressing', progress: 5 } : f
      )
    );

    const startTime = performance.now();

    try {
      const result = await compressFile(item, (progress) => {
        setFiles((prev) =>
          prev.map((f) =>
            f.id === item.id ? { ...f, progress } : f
          )
        );
      });

      const compressedSize = result.blob.size;
      const { percent } = calculateSavings(item.originalSize, compressedSize);
      const compressedUrl = URL.createObjectURL(result.blob);
      const durationMs = Math.round(performance.now() - startTime);

      setFiles((prev) =>
        prev.map((f) =>
          f.id === item.id
            ? {
                ...f,
                status: 'completed',
                progress: 100,
                compressedBlob: result.blob,
                compressedSize,
                compressedUrl,
                savingsPercent: percent,
                durationMs,
              }
            : f
        )
      );
    } catch (err: any) {
      console.error('Compression error for', item.name, err);
      setFiles((prev) =>
        prev.map((f) =>
          f.id === item.id
            ? {
                ...f,
                status: 'failed',
                error: err.message || 'Compression failed',
                progress: 0,
              }
            : f
        )
      );
    }
  }, []);

  // Compress all pending files
  const handleCompressAll = async () => {
    setIsProcessingBatch(true);
    const pendingItems = files.filter(
      (f) => f.status === 'pending' || f.status === 'failed'
    );

    // Process in parallel chunks of 3 for smooth browser responsiveness
    const chunkSize = 3;
    for (let i = 0; i < pendingItems.length; i += chunkSize) {
      const chunk = pendingItems.slice(i, i + chunkSize);
      await Promise.all(chunk.map((item) => runCompression(item)));
    }

    setIsProcessingBatch(false);

    // Trigger celebration if files were saved
    confetti({
      particleCount: 60,
      spread: 70,
      origin: { y: 0.7 },
    });
  };

  // Download a single file
  const handleDownload = (item: CompressibleFile) => {
    if (!item.compressedBlob) return;
    const url = item.compressedUrl || URL.createObjectURL(item.compressedBlob);
    const a = document.createElement('a');
    a.href = url;

    // Craft friendly filename
    const dotIdx = item.name.lastIndexOf('.');
    const baseName = dotIdx !== -1 ? item.name.substring(0, dotIdx) : item.name;
    const ext = dotIdx !== -1 ? item.name.substring(dotIdx) : '';
    a.download = `${baseName}-compressed${ext}`;

    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  // Download all completed as ZIP
  const handleDownloadAllZip = async () => {
    const completed = files.filter((f) => f.status === 'completed' && f.compressedBlob);
    if (completed.length === 0) return;

    try {
      const zipFiles = completed.map((f) => {
        const dotIdx = f.name.lastIndexOf('.');
        const baseName = dotIdx !== -1 ? f.name.substring(0, dotIdx) : f.name;
        const ext = dotIdx !== -1 ? f.name.substring(dotIdx) : '';
        return {
          name: `${baseName}-compressed${ext}`,
          blob: f.compressedBlob!,
        };
      });

      const zipBlob = await createZipBundle(zipFiles);
      const zipUrl = URL.createObjectURL(zipBlob);
      const a = document.createElement('a');
      a.href = zipUrl;
      a.download = `ZipStream-Batch-${new Date().toISOString().slice(0, 10)}.zip`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(zipUrl);

      confetti({
        particleCount: 80,
        spread: 80,
        origin: { y: 0.6 },
      });
    } catch (err) {
      console.error('Error generating zip archive:', err);
    }
  };

  // Remove file
  const handleRemove = (id: string) => {
    setFiles((prev) => {
      const target = prev.find((f) => f.id === id);
      if (target?.previewUrl) URL.revokeObjectURL(target.previewUrl);
      if (target?.compressedUrl) URL.revokeObjectURL(target.compressedUrl);
      return prev.filter((f) => f.id !== id);
    });
  };

  // Clear all
  const handleClearAll = () => {
    files.forEach((f) => {
      if (f.previewUrl) URL.revokeObjectURL(f.previewUrl);
      if (f.compressedUrl) URL.revokeObjectURL(f.compressedUrl);
    });
    setFiles([]);
  };

  // Update settings for an individual file
  const handleSaveSettings = (id: string, updatedSettings: CompressionSettings) => {
    setFiles((prev) =>
      prev.map((f) =>
        f.id === id ? { ...f, settings: updatedSettings, status: 'pending' } : f
      )
    );
  };

  // Aggregate stats
  const totalSavedBytes = files.reduce((acc, f) => {
    if (f.status === 'completed' && f.compressedSize !== undefined) {
      return acc + Math.max(0, f.originalSize - f.compressedSize);
    }
    return acc;
  }, 0);

  const completedCount = files.filter((f) => f.status === 'completed').length;

  return (
    <div className="min-h-screen flex flex-col bg-[#f5f5f7] dark:bg-zinc-950 text-[#1d1d1f] dark:text-zinc-100 transition-colors duration-300">
      {/* Navigation Header */}
      <Header
        isDark={isDark}
        onToggleTheme={toggleTheme}
        onOpenReportModal={() => setIsReportModalOpen(true)}
        totalSavedBytes={totalSavedBytes}
        totalProcessedCount={completedCount}
      />

      {/* Main Content Area */}
      <main className="flex-1 max-w-5xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12 space-y-8">
        {/* Hero Section */}
        <div className="text-center max-w-2xl mx-auto space-y-2">
          <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-zinc-900 dark:text-zinc-50">
            Smart, Private File Compression
          </h1>
          <p className="text-sm sm:text-base text-zinc-500 dark:text-zinc-400">
            Shrink PDFs, photos, audio, and videos instantly on your device with zero cloud uploads.
          </p>
        </div>

        {/* Drop & Upload Zone */}
        <DropZone
          onFilesSelected={handleFilesSelected}
          selectedPreset={selectedPreset}
          onPresetChange={handlePresetChange}
        />

        {/* Queue of Files */}
        <FileList
          files={files}
          onRemove={handleRemove}
          onClearAll={handleClearAll}
          onDownload={handleDownload}
          onPreview={(item) => setPreviewItem(item)}
          onOpenSettings={(item) => setSettingsItem(item)}
        />

        {/* Privacy & Engine Benefits */}
        <PrivacyBanner />
      </main>

      {/* Sticky Batch Actions Bar */}
      <BatchActionBar
        files={files}
        isProcessing={isProcessingBatch}
        onCompressAll={handleCompressAll}
        onDownloadAllZip={handleDownloadAllZip}
        totalSavedBytes={totalSavedBytes}
      />

      {/* Modals */}
      <PreviewModal
        item={previewItem}
        onClose={() => setPreviewItem(null)}
        onDownload={handleDownload}
      />

      <FileSettingsModal
        item={settingsItem}
        isOpen={Boolean(settingsItem)}
        onClose={() => setSettingsItem(null)}
        onSave={handleSaveSettings}
      />

      <ReportIssueModal
        isOpen={isReportModalOpen}
        onClose={() => setIsReportModalOpen(false)}
      />

      {/* Footer */}
      <footer className="w-full border-t border-black/[0.04] dark:border-white/[0.06] py-6 text-center text-xs text-zinc-400">
        <p>ZipStream File Compression • 100% On-Device Web Processing • Privacy Guaranteed</p>
      </footer>
      
      <Analytics />
    </div>
  );
}
export default App;
