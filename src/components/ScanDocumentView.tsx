import React, { useState, useRef, useEffect } from 'react';
import {
  Camera,
  Upload,
  RotateCw,
  Trash2,
  Download,
  FileText,
  Sparkles,
  Layers,
  CheckCircle2,
  RefreshCw,
  Eye,
  Sliders,
  Maximize2,
  X,
  Plus,
} from 'lucide-react';
import { ScannedPage, ScanFilterMode } from '../types';
import {
  processDocumentFilter,
  createPdfFromScannedPages,
  packageScannedPagesZip,
} from '../utils/scannerEngine';
import { formatBytes } from '../utils/formatters';
import confetti from 'canvas-confetti';

interface ScanDocumentViewProps {
  onBackToHome: () => void;
}

export const ScanDocumentView: React.FC<ScanDocumentViewProps> = ({ onBackToHome }) => {
  const [pages, setPages] = useState<ScannedPage[]>([]);
  const [activePageIndex, setActivePageIndex] = useState<number>(0);
  const [isCameraActive, setIsCameraActive] = useState<boolean>(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [exportSuccess, setExportSuccess] = useState<{
    pdfBlob?: Blob;
    zipBlob?: Blob;
    url?: string;
  } | null>(null);

  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  // Start Camera Stream
  const startCamera = async () => {
    setCameraError(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: 'environment', // Rear camera on mobile, default webcam on desktop
          width: { ideal: 1920 },
          height: { ideal: 1080 },
        },
        audio: false,
      });

      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play();
      }
      setIsCameraActive(true);
    } catch (err: any) {
      console.warn('Camera access error:', err);
      setCameraError(
        'Camera permission was denied or not available. You can also upload document photos directly!'
      );
      setIsCameraActive(false);
    }
  };

  // Stop Camera Stream
  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    setIsCameraActive(false);
  };

  // Clean up camera on unmount
  useEffect(() => {
    return () => {
      stopCamera();
    };
  }, []);

  // Snap photo from live camera
  const capturePhoto = async () => {
    if (!videoRef.current) return;
    const video = videoRef.current;

    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth || 1280;
    canvas.height = video.videoHeight || 720;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    const dataUrl = canvas.toDataURL('image/jpeg', 0.92);

    await addScannedPageFromDataUrl(dataUrl);
  };

  // Upload image from file picker
  const handleImageUpload = (fileList: FileList | File[]) => {
    Array.from(fileList).forEach((file) => {
      if (file.type.startsWith('image/')) {
        const reader = new FileReader();
        reader.onload = async (e) => {
          const dataUrl = e.target?.result as string;
          if (dataUrl) {
            await addScannedPageFromDataUrl(dataUrl);
          }
        };
        reader.readAsDataURL(file);
      }
    });
  };

  // Add new scanned page
  const addScannedPageFromDataUrl = async (dataUrl: string) => {
    setIsProcessing(true);
    try {
      // Default to auto_enhance filter for clean document scanning
      const filtered = await processDocumentFilter(dataUrl, 'clean_bw', 0);
      const newPage: ScannedPage = {
        id: `page-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
        dataUrl: filtered.dataUrl,
        blob: filtered.blob,
        width: filtered.width,
        height: filtered.height,
        rotation: 0,
        filter: 'clean_bw',
        originalDataUrl: dataUrl,
      };

      setPages((prev) => [...prev, newPage]);
      setActivePageIndex((prev) => (pages.length === 0 ? 0 : pages.length));
      setExportSuccess(null);
    } catch (err) {
      console.error('Failed to process page:', err);
    } finally {
      setIsProcessing(false);
    }
  };

  // Change active page filter mode
  const handleChangeFilter = async (filter: ScanFilterMode) => {
    if (pages.length === 0 || activePageIndex >= pages.length) return;
    const currentPage = pages[activePageIndex];

    setIsProcessing(true);
    try {
      const updated = await processDocumentFilter(
        currentPage.originalDataUrl,
        filter,
        currentPage.rotation
      );

      setPages((prev) => {
        const copy = [...prev];
        copy[activePageIndex] = {
          ...copy[activePageIndex],
          filter,
          dataUrl: updated.dataUrl,
          blob: updated.blob,
          width: updated.width,
          height: updated.height,
        };
        return copy;
      });
    } catch (err) {
      console.error('Filter application error:', err);
    } finally {
      setIsProcessing(false);
    }
  };

  // Rotate active page 90 degrees
  const handleRotatePage = async () => {
    if (pages.length === 0 || activePageIndex >= pages.length) return;
    const currentPage = pages[activePageIndex];
    const nextRotation = (currentPage.rotation + 90) % 360;

    setIsProcessing(true);
    try {
      const updated = await processDocumentFilter(
        currentPage.originalDataUrl,
        currentPage.filter,
        nextRotation
      );

      setPages((prev) => {
        const copy = [...prev];
        copy[activePageIndex] = {
          ...copy[activePageIndex],
          rotation: nextRotation,
          dataUrl: updated.dataUrl,
          blob: updated.blob,
          width: updated.width,
          height: updated.height,
        };
        return copy;
      });
    } catch (err) {
      console.error('Rotation error:', err);
    } finally {
      setIsProcessing(false);
    }
  };

  // Delete current page
  const handleDeletePage = (indexToDelete: number) => {
    setPages((prev) => prev.filter((_, i) => i !== indexToDelete));
    setActivePageIndex((prev) => Math.max(0, Math.min(prev, pages.length - 2)));
    setExportSuccess(null);
  };

  // Export as multi-page PDF
  const handleExportPdf = async () => {
    if (pages.length === 0) return;
    setIsProcessing(true);

    try {
      const pdfBlob = await createPdfFromScannedPages(pages);
      const url = URL.createObjectURL(pdfBlob);
      setExportSuccess({ pdfBlob, url });

      // Trigger direct download
      const a = document.createElement('a');
      a.href = url;
      a.download = `Scanned_Document_${new Date().toISOString().slice(0, 10)}.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);

      confetti({
        particleCount: 50,
        spread: 60,
        origin: { y: 0.6 },
      });
    } catch (err) {
      console.error('Export failed:', err);
      alert('Failed to generate PDF from scans.');
    } finally {
      setIsProcessing(false);
    }
  };

  // Load sample receipt/document
  const handleLoadSampleScan = () => {
    const canvas = document.createElement('canvas');
    canvas.width = 800;
    canvas.height = 1100;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Background paper texture
    ctx.fillStyle = '#f8f8f8';
    ctx.fillRect(0, 0, 800, 1100);

    // Document header
    ctx.fillStyle = '#1d1d1f';
    ctx.font = 'bold 28px sans-serif';
    ctx.fillText('OFFICIAL RECEIPT / INVOICE', 60, 90);

    ctx.font = '16px sans-serif';
    ctx.fillStyle = '#555555';
    ctx.fillText(`Invoice #: INV-2026-8942`, 60, 130);
    ctx.fillText(`Date: ${new Date().toLocaleDateString()}`, 60, 155);

    // Divider line
    ctx.strokeStyle = '#cccccc';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(60, 180);
    ctx.lineTo(740, 180);
    ctx.stroke();

    // Table rows
    const items = [
      { desc: 'Cloud Enterprise Hosting (Annual)', cost: '$480.00' },
      { desc: 'Client SSL Security Certificates', cost: '$95.00' },
      { desc: 'High-Throughput CDN Bandwidth', cost: '$140.00' },
      { desc: 'On-Device Document Compression License', cost: '$0.00' },
    ];

    let y = 230;
    items.forEach((item) => {
      ctx.fillStyle = '#222222';
      ctx.font = '18px sans-serif';
      ctx.fillText(item.desc, 60, y);
      ctx.fillText(item.cost, 620, y);
      y += 50;
    });

    ctx.beginPath();
    ctx.moveTo(60, y + 20);
    ctx.lineTo(740, y + 20);
    ctx.stroke();

    ctx.font = 'bold 22px sans-serif';
    ctx.fillStyle = '#0071e3';
    ctx.fillText('TOTAL PAID: $715.00', 500, y + 70);

    // Stamp
    ctx.save();
    ctx.translate(200, y + 100);
    ctx.rotate(-0.15);
    ctx.strokeStyle = '#27c93f';
    ctx.lineWidth = 4;
    ctx.strokeRect(-80, -30, 160, 60);
    ctx.fillStyle = '#27c93f';
    ctx.font = 'bold 24px sans-serif';
    ctx.fillText('PAID IN FULL', -70, 8);
    ctx.restore();

    const dataUrl = canvas.toDataURL('image/jpeg', 0.92);
    addScannedPageFromDataUrl(dataUrl);
  };

  const activePage = pages[activePageIndex];

  return (
    <div id="scan-document-view" className="w-full max-w-4xl mx-auto space-y-6 animate-in fade-in duration-200">
      {/* Header */}
      <div className="text-center space-y-2">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#34c759]/10 text-[#34c759] text-[12px] font-semibold">
          <Camera className="w-3.5 h-3.5" />
          <span>Document Scanner</span>
        </div>
        <h2 className="text-3xl font-bold tracking-tight text-[#1d1d1f] dark:text-[#f5f5f7]">
          Scan Documents & Receipts
        </h2>
        <p className="text-[15px] text-[#6e6e73] dark:text-[#8e8e93] max-w-xl mx-auto">
          Scan papers, bills, receipts, or notes using your camera or photos. Auto-enhances text contrast and exports clean multi-page PDFs on-device.
        </p>
      </div>

      {/* Main Workspace Card */}
      <div className="bg-white dark:bg-[#1c1c1e] rounded-[24px] border border-black/[0.08] dark:border-white/[0.08] shadow-[0_4px_24px_rgba(0,0,0,0.04)] p-6 sm:p-8 space-y-6 transition-colors">
        {/* Camera Live Viewfinder / Capture Section */}
        {isCameraActive ? (
          <div className="relative rounded-[20px] overflow-hidden bg-black aspect-4/3 max-h-[420px] flex items-center justify-center shadow-inner">
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              className="w-full h-full object-cover"
            />

            {/* Viewfinder Alignment Overlay */}
            <div className="absolute inset-8 border border-white/40 rounded-xl pointer-events-none flex flex-col justify-between p-4">
              <div className="flex justify-between">
                <span className="w-4 h-4 border-t-2 border-l-2 border-white" />
                <span className="w-4 h-4 border-t-2 border-r-2 border-white" />
              </div>
              <div className="flex justify-between">
                <span className="w-4 h-4 border-b-2 border-l-2 border-white" />
                <span className="w-4 h-4 border-b-2 border-r-2 border-white" />
              </div>
            </div>

            {/* Camera Floating Controls */}
            <div className="absolute bottom-4 inset-x-0 flex items-center justify-center gap-4 z-10">
              <button
                type="button"
                onClick={stopCamera}
                className="p-3 rounded-full bg-black/60 hover:bg-black/80 text-white backdrop-blur-md transition-colors cursor-pointer"
                title="Close Camera"
              >
                <X className="w-5 h-5" />
              </button>

              <button
                type="button"
                id="camera-snap-btn"
                onClick={capturePhoto}
                className="w-16 h-16 rounded-full bg-white border-4 border-[#34c759] shadow-lg flex items-center justify-center active:scale-95 transition-transform cursor-pointer"
                title="Capture Document Page"
              >
                <div className="w-11 h-11 rounded-full bg-[#34c759]" />
              </button>
            </div>
          </div>
        ) : (
          /* Capture / Upload Options */
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Option 1: Live Camera */}
            <button
              type="button"
              id="start-camera-scan-btn"
              onClick={startCamera}
              className="p-6 rounded-[20px] border-2 border-dashed border-black/10 dark:border-white/10 hover:border-[#34c759] bg-[#fafafc] dark:bg-[#252528] hover:bg-[#34c759]/5 dark:hover:bg-[#34c759]/10 flex flex-col items-center justify-center text-center gap-3 transition-all group cursor-pointer"
            >
              <div className="w-12 h-12 rounded-2xl bg-white dark:bg-[#2c2c2e] border border-black/10 dark:border-white/10 shadow-xs flex items-center justify-center text-[#34c759] group-hover:scale-105 transition-transform">
                <Camera className="w-6 h-6" />
              </div>
              <div>
                <h4 className="text-[15px] font-semibold text-[#1d1d1f] dark:text-[#f5f5f7]">Use Camera Scanner</h4>
                <p className="text-[12px] text-[#86868b] dark:text-[#8e8e93] mt-0.5">
                  Point your camera at a paper, invoice, or receipt
                </p>
              </div>
            </button>

            {/* Option 2: Upload Document Photo */}
            <div
              onClick={() => {
                const input = document.createElement('input');
                input.type = 'file';
                input.accept = 'image/*';
                input.multiple = true;
                input.onchange = (e: any) => {
                  if (e.target.files) handleImageUpload(e.target.files);
                };
                input.click();
              }}
              className="p-6 rounded-[20px] border-2 border-dashed border-black/10 dark:border-white/10 hover:border-[#0071e3] bg-[#fafafc] dark:bg-[#252528] hover:bg-[#0071e3]/5 dark:hover:bg-[#0071e3]/10 flex flex-col items-center justify-center text-center gap-3 transition-all group cursor-pointer"
            >
              <div className="w-12 h-12 rounded-2xl bg-white dark:bg-[#2c2c2e] border border-black/10 dark:border-white/10 shadow-xs flex items-center justify-center text-[#0071e3] group-hover:scale-105 transition-transform">
                <Upload className="w-6 h-6" />
              </div>
              <div>
                <h4 className="text-[15px] font-semibold text-[#1d1d1f] dark:text-[#f5f5f7]">Upload Document Photo</h4>
                <p className="text-[12px] text-[#86868b] dark:text-[#8e8e93] mt-0.5">
                  Select JPG, PNG, or photo scans from device
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Camera error message fallback */}
        {cameraError && (
          <p className="text-[13px] text-[#ff3b30] bg-[#ff3b30]/10 p-3 rounded-xl">
            {cameraError}
          </p>
        )}

        {/* Quick sample loader when no pages */}
        {pages.length === 0 && !isCameraActive && (
          <div className="text-center pt-2">
            <button
              type="button"
              onClick={handleLoadSampleScan}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-[#f5f5f7] dark:bg-[#252528] hover:bg-black/[0.06] dark:hover:bg-white/[0.08] text-[12px] font-medium text-[#1d1d1f] dark:text-[#f5f5f7] transition-colors cursor-pointer"
            >
              <Sparkles className="w-3.5 h-3.5 text-[#ff9500]" />
              <span>Load Sample Invoice Document</span>
            </button>
          </div>
        )}

        {/* Scanned Pages Workspace */}
        {pages.length > 0 && (
          <div className="space-y-6 pt-2">
            {/* Top Toolbar: Active Page Actions */}
            <div className="flex flex-wrap items-center justify-between gap-3 p-3.5 rounded-2xl bg-[#f5f5f7] dark:bg-[#252528] border border-black/[0.04] dark:border-white/[0.06]">
              <div className="flex items-center gap-2">
                <span className="text-[13px] font-semibold text-[#1d1d1f] dark:text-[#f5f5f7]">
                  Page {activePageIndex + 1} of {pages.length}
                </span>
                <span className="text-[11px] text-[#86868b] dark:text-[#8e8e93]">
                  • {formatBytes(activePage?.blob?.size || 0)}
                </span>
              </div>

              {/* Filter Presets */}
              <div className="flex items-center gap-1 bg-white dark:bg-[#1c1c1e] p-1 rounded-xl shadow-2xs border border-black/[0.04] dark:border-white/[0.06]">
                {(
                  [
                    { id: 'clean_bw', label: 'Clean B&W', icon: '📄' },
                    { id: 'auto_enhance', label: 'Magic Color', icon: '✨' },
                    { id: 'grayscale', label: 'Grayscale', icon: '🔘' },
                    { id: 'original', label: 'Original', icon: '🖼️' },
                  ] as const
                ).map((f) => (
                  <button
                    key={f.id}
                    onClick={() => handleChangeFilter(f.id)}
                    className={`px-2.5 py-1 rounded-lg text-[12px] font-medium transition-all cursor-pointer ${
                      activePage?.filter === f.id
                        ? 'bg-[#1d1d1f] dark:bg-white text-white dark:text-[#1d1d1f]'
                        : 'text-[#6e6e73] dark:text-[#8e8e93] hover:text-[#1d1d1f] dark:hover:text-[#f5f5f7]'
                    }`}
                  >
                    <span>{f.icon} </span>
                    <span className="hidden sm:inline">{f.label}</span>
                  </button>
                ))}
              </div>

              {/* Rotate & Delete controls */}
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={handleRotatePage}
                  className="p-2 rounded-xl bg-white dark:bg-[#2c2c2e] hover:bg-black/[0.04] dark:hover:bg-white/[0.08] text-[#1d1d1f] dark:text-[#f5f5f7] border border-black/[0.06] dark:border-white/[0.06] shadow-2xs cursor-pointer"
                  title="Rotate 90°"
                >
                  <RotateCw className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  onClick={() => handleDeletePage(activePageIndex)}
                  className="p-2 rounded-xl bg-white dark:bg-[#2c2c2e] hover:bg-[#ff3b30]/10 text-[#86868b] hover:text-[#ff3b30] border border-black/[0.06] dark:border-white/[0.06] shadow-2xs cursor-pointer"
                  title="Delete Page"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Active Page Large Preview */}
            {activePage && (
              <div className="relative rounded-[20px] overflow-hidden bg-[#e5e5ea] dark:bg-[#2c2c2e] flex items-center justify-center p-4 min-h-[340px] max-h-[500px]">
                <img
                  src={activePage.dataUrl}
                  alt={`Scanned Page ${activePageIndex + 1}`}
                  className="max-h-[460px] w-auto object-contain rounded-lg shadow-md bg-white"
                />
              </div>
            )}

            {/* Thumbnail Strip (Multi-page stack) */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[13px] font-semibold text-[#1d1d1f] dark:text-[#f5f5f7]">
                  Scanned Pages Queue ({pages.length})
                </span>
                <button
                  type="button"
                  onClick={() => {
                    const input = document.createElement('input');
                    input.type = 'file';
                    input.accept = 'image/*';
                    input.multiple = true;
                    input.onchange = (e: any) => {
                      if (e.target.files) handleImageUpload(e.target.files);
                    };
                    input.click();
                  }}
                  className="inline-flex items-center gap-1 text-[12px] text-[#0071e3] dark:text-[#2997ff] font-medium hover:underline cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Add Another Page</span>
                </button>
              </div>

              <div className="flex items-center gap-3 overflow-x-auto pb-2 pt-1">
                {pages.map((p, idx) => (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => setActivePageIndex(idx)}
                    className={`relative rounded-xl overflow-hidden shrink-0 border-2 transition-all cursor-pointer ${
                      idx === activePageIndex
                        ? 'border-[#0071e3] dark:border-[#2997ff] shadow-md ring-2 ring-[#0071e3]/20 dark:ring-[#2997ff]/20 scale-105'
                        : 'border-black/10 dark:border-white/10 hover:border-black/30 dark:hover:border-white/30 opacity-70 hover:opacity-100'
                    }`}
                  >
                    <img
                      src={p.dataUrl}
                      alt={`Scanned document thumbnail ${idx + 1}`}
                      className="w-16 h-20 object-cover bg-white"
                    />
                    <span className="absolute bottom-1 right-1 px-1.5 py-0.5 rounded bg-black/70 text-white text-[10px] font-semibold">
                      {idx + 1}
                    </span>
                  </button>
                ))}
              </div>
            </div>

            {/* Export Actions */}
            <div className="pt-4 border-t border-black/[0.06] dark:border-white/[0.08] flex flex-col sm:flex-row items-center justify-between gap-3">
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
                onClick={handleExportPdf}
                className="w-full sm:w-auto px-8 py-3 rounded-xl bg-[#34c759] hover:bg-[#2fb350] active:bg-[#27a346] text-white font-semibold text-[15px] shadow-sm flex items-center justify-center gap-2 transition-all cursor-pointer"
              >
                {isProcessing ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>Compiling PDF...</span>
                  </>
                ) : (
                  <>
                    <Download className="w-4 h-4" />
                    <span>Download Scanned PDF ({pages.length} {pages.length === 1 ? 'Page' : 'Pages'})</span>
                  </>
                )}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
