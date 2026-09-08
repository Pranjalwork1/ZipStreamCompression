import React, { useState, useRef, useEffect, useCallback } from 'react';
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
  SlidersHorizontal,
  Maximize2,
  Minimize2,
  X,
  Plus,
  ArrowLeft,
  ArrowRight,
  Share2,
  Printer,
  Archive,
  Smartphone,
  Check,
  Crop,
  Zap,
  ZapOff,
  Move,
} from 'lucide-react';
import { ScannedPage, ScanFilterMode } from '../types';
import {
  processDocumentFilter,
  createPdfFromScannedPages,
  packageScannedPagesZip,
  FilterAdjustments,
} from '../utils/scannerEngine';
import { formatBytes } from '../utils/formatters';
import confetti from 'canvas-confetti';

interface ScanDocumentViewProps {
  onBackToHome: () => void;
}

interface PageAdjustmentState {
  brightness: number;
  contrast: number;
}

export interface CropBox {
  x: number; // percentage from left [0, 100]
  y: number; // percentage from top [0, 100]
  w: number; // width percentage [0, 100]
  h: number; // height percentage [0, 100]
}

const DEFAULT_CROP_BOX: CropBox = { x: 10, y: 8, w: 80, h: 84 };

export const ScanDocumentView: React.FC<ScanDocumentViewProps> = ({ onBackToHome }) => {
  const [pages, setPages] = useState<ScannedPage[]>([]);
  const [activePageIndex, setActivePageIndex] = useState<number>(0);
  const [isCameraActive, setIsCameraActive] = useState<boolean>(false);
  const [cameraFacing, setCameraFacing] = useState<'environment' | 'user'>('environment');
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [isFlashing, setIsFlashing] = useState<boolean>(false);
  const [isDragOver, setIsDragOver] = useState<boolean>(false);
  const [previewModalUrl, setPreviewModalUrl] = useState<string | null>(null);

  // Document Viewfinder Crop Box & Mobile Enhancements
  const [cropBox, setCropBox] = useState<CropBox>(DEFAULT_CROP_BOX);
  const [cropPreset, setCropPreset] = useState<'a4' | 'receipt' | 'idcard' | 'full' | 'custom'>('a4');
  const [isCameraFullscreen, setIsCameraFullscreen] = useState<boolean>(false);
  const [isTorchOn, setIsTorchOn] = useState<boolean>(false);
  const [hasTorch, setHasTorch] = useState<boolean>(false);

  // Post-capture Crop Modal state for editing existing pages
  const [isCropModalOpen, setIsCropModalOpen] = useState<boolean>(false);
  const [modalCropBox, setModalCropBox] = useState<CropBox>({ x: 5, y: 5, w: 90, h: 90 });
  const [isModalCropping, setIsModalCropping] = useState<boolean>(false);

  // PDF Export Settings
  const [pdfPageSize, setPdfPageSize] = useState<'a4' | 'fit'>('a4');
  const [exportSuccess, setExportSuccess] = useState<{
    pdfBlob?: Blob;
    url?: string;
    filename?: string;
  } | null>(null);

  // Per-page brightness & contrast adjustments map
  const [pageAdjustments, setPageAdjustments] = useState<Record<string, PageAdjustmentState>>({});
  const [showAdjustments, setShowAdjustments] = useState<boolean>(false);

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const mobileInputRef = useRef<HTMLInputElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const cameraContainerRef = useRef<HTMLDivElement | null>(null);
  const modalCropContainerRef = useRef<HTMLDivElement | null>(null);

  // Safely attach stream to video element whenever node mounts or stream updates
  const setVideoRef = useCallback((node: HTMLVideoElement | null) => {
    videoRef.current = node;
    if (node && streamRef.current) {
      node.srcObject = streamRef.current;
      node.play().catch((err) => {
        console.warn('Video auto-play blocked or failed:', err);
      });
    }
  }, []);

  // Sync stream to video element when isCameraActive changes
  useEffect(() => {
    if (isCameraActive && videoRef.current && streamRef.current) {
      videoRef.current.srcObject = streamRef.current;
      videoRef.current.play().catch((err) => {
        console.warn('Video auto-play blocked or failed:', err);
      });
    }
  }, [isCameraActive]);

  // Clean up camera on unmount
  useEffect(() => {
    return () => {
      stopCamera();
    };
  }, []);

  // Apply Document Viewfinder Preset
  const applyCropPreset = (preset: 'a4' | 'receipt' | 'idcard' | 'full') => {
    setCropPreset(preset);
    if (preset === 'a4') {
      setCropBox({ x: 12, y: 8, w: 76, h: 84 });
    } else if (preset === 'receipt') {
      setCropBox({ x: 22, y: 4, w: 56, h: 92 });
    } else if (preset === 'idcard') {
      setCropBox({ x: 10, y: 22, w: 80, h: 56 });
    } else if (preset === 'full') {
      setCropBox({ x: 2, y: 2, w: 96, h: 96 });
    }
  };

  // Toggle device torch (flashlight) if supported
  const toggleTorch = async () => {
    if (streamRef.current) {
      const track = streamRef.current.getVideoTracks()[0];
      if (track) {
        try {
          const nextTorch = !isTorchOn;
          await (track as any).applyConstraints({ advanced: [{ torch: nextTorch }] });
          setIsTorchOn(nextTorch);
        } catch (err) {
          console.warn('Torch toggle error:', err);
        }
      }
    }
  };

  // Stop Camera Stream
  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    setIsCameraActive(false);
    setIsTorchOn(false);
    setIsCameraFullscreen(false);
  };

  // Start Camera Stream with robust fallback handling
  const startCamera = async (targetFacing: 'environment' | 'user' = cameraFacing) => {
    setCameraError(null);
    stopCamera();

    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      setCameraError(
        'Direct camera access is not supported by your current browser context (requires HTTPS or localhost). Please upload photos directly or use your mobile device camera.'
      );
      return;
    }

    try {
      let stream: MediaStream;
      try {
        // Prefer requested camera facing mode (rear environment or front user)
        stream = await navigator.mediaDevices.getUserMedia({
          video: {
            facingMode: { ideal: targetFacing },
            width: { ideal: 1920 },
            height: { ideal: 1080 },
          },
          audio: false,
        });
      } catch (constraintErr) {
        console.warn('High-res facingMode camera constraint failed, trying basic video:', constraintErr);
        // Fallback: any available video device
        stream = await navigator.mediaDevices.getUserMedia({
          video: true,
          audio: false,
        });
      }

      streamRef.current = stream;
      setCameraFacing(targetFacing);
      setIsCameraActive(true);

      // Check device torch capability
      const track = stream.getVideoTracks()[0];
      const caps = (track?.getCapabilities?.() || {}) as any;
      setHasTorch(Boolean(caps?.torch));
      setIsTorchOn(false);

      // If video element is already mounted, attach immediately
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play().catch((e) => console.warn('Play error:', e));
      }
    } catch (err: any) {
      console.warn('Camera access denied or failed:', err);
      if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
        setCameraError('Camera permission was denied in your browser settings. You can still upload document photos directly.');
      } else if (err.name === 'NotFoundError' || err.name === 'DevicesNotFoundError') {
        setCameraError('No camera device was detected on this computer. You can upload scanned photos or receipts from your files.');
      } else {
        setCameraError('Unable to start camera: ' + (err.message || 'Unknown device error') + '. Please upload document photos directly.');
      }
      setIsCameraActive(false);
    }
  };

  // Toggle front/rear camera
  const toggleCameraFacing = () => {
    const nextFacing = cameraFacing === 'environment' ? 'user' : 'environment';
    startCamera(nextFacing);
  };

  // Drag handler for Camera Viewfinder Corner Handles
  const handleStartCropDrag = (
    handle: 'tl' | 'tr' | 'bl' | 'br' | 'center',
    e: React.PointerEvent
  ) => {
    e.preventDefault();
    e.stopPropagation();
    if (!cameraContainerRef.current) return;

    const startX = e.clientX;
    const startY = e.clientY;
    const initialBox = { ...cropBox };
    const rect = cameraContainerRef.current.getBoundingClientRect();

    const handlePointerMove = (moveEvt: PointerEvent) => {
      moveEvt.preventDefault();
      const deltaXPercent = ((moveEvt.clientX - startX) / rect.width) * 100;
      const deltaYPercent = ((moveEvt.clientY - startY) / rect.height) * 100;

      setCropBox((prev) => {
        let { x, y, w, h } = initialBox;

        if (handle === 'center') {
          const nextX = Math.max(0, Math.min(100 - w, x + deltaXPercent));
          const nextY = Math.max(0, Math.min(100 - h, y + deltaYPercent));
          return { ...prev, x: nextX, y: nextY };
        }

        if (handle === 'tl') {
          const maxLeft = x + w - 15;
          const maxTop = y + h - 15;
          const nextX = Math.max(0, Math.min(maxLeft, x + deltaXPercent));
          const nextY = Math.max(0, Math.min(maxTop, y + deltaYPercent));
          return {
            x: nextX,
            y: nextY,
            w: w - (nextX - x),
            h: h - (nextY - y),
          };
        }

        if (handle === 'tr') {
          const maxTop = y + h - 15;
          const nextY = Math.max(0, Math.min(maxTop, y + deltaYPercent));
          const nextW = Math.max(15, Math.min(100 - x, w + deltaXPercent));
          return {
            ...prev,
            y: nextY,
            w: nextW,
            h: h - (nextY - y),
          };
        }

        if (handle === 'bl') {
          const maxLeft = x + w - 15;
          const maxTop = y + h - 15;
          const nextX = Math.max(0, Math.min(maxLeft, x + deltaXPercent));
          const nextH = Math.max(15, Math.min(100 - y, h + deltaYPercent));
          return {
            ...prev,
            x: nextX,
            w: w - (nextX - x),
            h: nextH,
          };
        }

        if (handle === 'br') {
          const nextW = Math.max(15, Math.min(100 - x, w + deltaXPercent));
          const nextH = Math.max(15, Math.min(100 - y, h + deltaYPercent));
          return {
            ...prev,
            w: nextW,
            h: nextH,
          };
        }

        return prev;
      });
      setCropPreset('custom');
    };

    const handlePointerUp = () => {
      window.removeEventListener('pointermove', handlePointerMove);
      window.removeEventListener('pointerup', handlePointerUp);
    };

    window.addEventListener('pointermove', handlePointerMove);
    window.addEventListener('pointerup', handlePointerUp);
  };

  // Drag handler for Post-Capture Modal Cropping
  const handleStartModalCropDrag = (
    handle: 'tl' | 'tr' | 'bl' | 'br' | 'center',
    e: React.PointerEvent
  ) => {
    e.preventDefault();
    e.stopPropagation();
    if (!modalCropContainerRef.current) return;

    const startX = e.clientX;
    const startY = e.clientY;
    const initialBox = { ...modalCropBox };
    const rect = modalCropContainerRef.current.getBoundingClientRect();

    const handlePointerMove = (moveEvt: PointerEvent) => {
      moveEvt.preventDefault();
      const deltaXPercent = ((moveEvt.clientX - startX) / rect.width) * 100;
      const deltaYPercent = ((moveEvt.clientY - startY) / rect.height) * 100;

      setModalCropBox((prev) => {
        let { x, y, w, h } = initialBox;

        if (handle === 'center') {
          const nextX = Math.max(0, Math.min(100 - w, x + deltaXPercent));
          const nextY = Math.max(0, Math.min(100 - h, y + deltaYPercent));
          return { ...prev, x: nextX, y: nextY };
        }

        if (handle === 'tl') {
          const maxLeft = x + w - 10;
          const maxTop = y + h - 10;
          const nextX = Math.max(0, Math.min(maxLeft, x + deltaXPercent));
          const nextY = Math.max(0, Math.min(maxTop, y + deltaYPercent));
          return {
            x: nextX,
            y: nextY,
            w: w - (nextX - x),
            h: h - (nextY - y),
          };
        }

        if (handle === 'tr') {
          const maxTop = y + h - 10;
          const nextY = Math.max(0, Math.min(maxTop, y + deltaYPercent));
          const nextW = Math.max(10, Math.min(100 - x, w + deltaXPercent));
          return {
            ...prev,
            y: nextY,
            w: nextW,
            h: h - (nextY - y),
          };
        }

        if (handle === 'bl') {
          const maxLeft = x + w - 10;
          const maxTop = y + h - 10;
          const nextX = Math.max(0, Math.min(maxLeft, x + deltaXPercent));
          const nextH = Math.max(10, Math.min(100 - y, h + deltaYPercent));
          return {
            ...prev,
            x: nextX,
            w: w - (nextX - x),
            h: nextH,
          };
        }

        if (handle === 'br') {
          const nextW = Math.max(10, Math.min(100 - x, w + deltaXPercent));
          const nextH = Math.max(10, Math.min(100 - y, h + deltaYPercent));
          return {
            ...prev,
            w: nextW,
            h: nextH,
          };
        }

        return prev;
      });
    };

    const handlePointerUp = () => {
      window.removeEventListener('pointermove', handlePointerMove);
      window.removeEventListener('pointerup', handlePointerUp);
    };

    window.addEventListener('pointermove', handlePointerMove);
    window.addEventListener('pointerup', handlePointerUp);
  };

  // Apply post-capture crop to current page
  const handleApplyPageCrop = async () => {
    if (pages.length === 0 || activePageIndex >= pages.length) return;
    const currentPage = pages[activePageIndex];
    setIsModalCropping(true);

    try {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      await new Promise<void>((resolve, reject) => {
        img.onload = () => resolve();
        img.onerror = reject;
        img.src = currentPage.originalDataUrl;
      });

      const srcW = img.width;
      const srcH = img.height;

      const sx = Math.max(0, Math.round((modalCropBox.x / 100) * srcW));
      const sy = Math.max(0, Math.round((modalCropBox.y / 100) * srcH));
      const sw = Math.min(srcW - sx, Math.max(20, Math.round((modalCropBox.w / 100) * srcW)));
      const sh = Math.min(srcH - sy, Math.max(20, Math.round((modalCropBox.h / 100) * srcH)));

      const canvas = document.createElement('canvas');
      canvas.width = sw;
      canvas.height = sh;
      const ctx = canvas.getContext('2d');
      if (!ctx) throw new Error('Canvas context unavailable');

      ctx.drawImage(img, sx, sy, sw, sh, 0, 0, sw, sh);
      const croppedDataUrl = canvas.toDataURL('image/jpeg', 0.94);

      const adj = pageAdjustments[currentPage.id] || { brightness: 0, contrast: 0 };
      const filtered = await processDocumentFilter(
        croppedDataUrl,
        currentPage.filter,
        currentPage.rotation,
        adj
      );

      setPages((prev) => {
        const copy = [...prev];
        copy[activePageIndex] = {
          ...copy[activePageIndex],
          originalDataUrl: croppedDataUrl,
          dataUrl: filtered.dataUrl,
          blob: filtered.blob,
          width: filtered.width,
          height: filtered.height,
        };
        return copy;
      });

      setIsCropModalOpen(false);
    } catch (cropErr) {
      console.error('Failed to crop page:', cropErr);
      alert('Failed to crop page.');
    } finally {
      setIsModalCropping(false);
    }
  };

  // Capture photo from live camera strictly inside the document border lines
  const capturePhoto = async () => {
    if (!videoRef.current) return;
    const video = videoRef.current;
    const container = cameraContainerRef.current;

    // Trigger visual shutter flash
    setIsFlashing(true);
    setTimeout(() => setIsFlashing(false), 180);

    // Haptic feedback for mobile phones
    if (typeof navigator !== 'undefined' && navigator.vibrate) {
      navigator.vibrate(40);
    }

    const W_v = video.videoWidth || 1280;
    const H_v = video.videoHeight || 720;

    let sourceX = 0;
    let sourceY = 0;
    let sourceW = W_v;
    let sourceH = H_v;

    // Map screen crop coordinates exactly to video resolution
    if (container) {
      const rect = container.getBoundingClientRect();
      const W_c = rect.width;
      const H_c = rect.height;

      const containerAspect = W_c / H_c;
      const videoAspect = W_v / H_v;

      let scale: number;
      let offsetX = 0;
      let offsetY = 0;

      if (containerAspect > videoAspect) {
        scale = W_c / W_v;
        offsetY = (H_v * scale - H_c) / 2;
      } else {
        scale = H_c / H_v;
        offsetX = (W_v * scale - W_c) / 2;
      }

      const cropLeft = (cropBox.x / 100) * W_c;
      const cropTop = (cropBox.y / 100) * H_c;
      const cropWidth = (cropBox.w / 100) * W_c;
      const cropHeight = (cropBox.h / 100) * H_c;

      sourceX = Math.max(0, Math.round((cropLeft + offsetX) / scale));
      sourceY = Math.max(0, Math.round((cropTop + offsetY) / scale));
      sourceW = Math.min(W_v - sourceX, Math.max(20, Math.round(cropWidth / scale)));
      sourceH = Math.min(H_v - sourceY, Math.max(20, Math.round(cropHeight / scale)));
    }

    const canvas = document.createElement('canvas');
    canvas.width = sourceW;
    canvas.height = sourceH;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Extract strictly the area inside the border line
    ctx.drawImage(video, sourceX, sourceY, sourceW, sourceH, 0, 0, sourceW, sourceH);
    const dataUrl = canvas.toDataURL('image/jpeg', 0.94);

    await addScannedPageFromDataUrl(dataUrl);
  };

  // Upload image from file picker or camera capture input
  const handleImageUpload = (fileList: FileList | File[]) => {
    const files = Array.from(fileList).filter((f) => f.type.startsWith('image/'));
    if (files.length === 0) return;

    files.forEach((file) => {
      const reader = new FileReader();
      reader.onload = async (e) => {
        const dataUrl = e.target?.result as string;
        if (dataUrl) {
          await addScannedPageFromDataUrl(dataUrl);
        }
      };
      reader.readAsDataURL(file);
    });
  };

  // Drag & drop event handlers
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
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleImageUpload(e.dataTransfer.files);
    }
  };

  // Add new scanned page with default auto_enhance filter
  const addScannedPageFromDataUrl = async (dataUrl: string) => {
    setIsProcessing(true);
    try {
      // Default to auto_enhance filter ("Magic Color")
      const filtered = await processDocumentFilter(dataUrl, 'auto_enhance', 0);
      const newPageId = `page-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
      const newPage: ScannedPage = {
        id: newPageId,
        dataUrl: filtered.dataUrl,
        blob: filtered.blob,
        width: filtered.width,
        height: filtered.height,
        rotation: 0,
        filter: 'auto_enhance',
        originalDataUrl: dataUrl,
      };

      setPages((prev) => {
        const updated = [...prev, newPage];
        setActivePageIndex(updated.length - 1);
        return updated;
      });

      setPageAdjustments((prev) => ({
        ...prev,
        [newPageId]: { brightness: 0, contrast: 0 },
      }));

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
    const adj = pageAdjustments[currentPage.id] || { brightness: 0, contrast: 0 };

    setIsProcessing(true);
    try {
      const updated = await processDocumentFilter(
        currentPage.originalDataUrl,
        filter,
        currentPage.rotation,
        adj
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
      setExportSuccess(null);
    } catch (err) {
      console.error('Filter application error:', err);
    } finally {
      setIsProcessing(false);
    }
  };

  // Apply current active filter to all pages
  const handleApplyFilterToAll = async () => {
    if (pages.length === 0 || activePageIndex >= pages.length) return;
    const targetFilter = pages[activePageIndex].filter;

    setIsProcessing(true);
    try {
      const updatedPages = await Promise.all(
        pages.map(async (p) => {
          const adj = pageAdjustments[p.id] || { brightness: 0, contrast: 0 };
          const updated = await processDocumentFilter(
            p.originalDataUrl,
            targetFilter,
            p.rotation,
            adj
          );
          return {
            ...p,
            filter: targetFilter,
            dataUrl: updated.dataUrl,
            blob: updated.blob,
            width: updated.width,
            height: updated.height,
          };
        })
      );
      setPages(updatedPages);
      setExportSuccess(null);
    } catch (err) {
      console.error('Failed to apply filter to all pages:', err);
    } finally {
      setIsProcessing(false);
    }
  };

  // Update brightness or contrast adjustment for active page
  const handleAdjustmentChange = async (type: 'brightness' | 'contrast', value: number) => {
    if (pages.length === 0 || activePageIndex >= pages.length) return;
    const currentPage = pages[activePageIndex];
    const currentAdj = pageAdjustments[currentPage.id] || { brightness: 0, contrast: 0 };
    const nextAdj = { ...currentAdj, [type]: value };

    setPageAdjustments((prev) => ({
      ...prev,
      [currentPage.id]: nextAdj,
    }));

    setIsProcessing(true);
    try {
      const updated = await processDocumentFilter(
        currentPage.originalDataUrl,
        currentPage.filter,
        currentPage.rotation,
        nextAdj
      );

      setPages((prev) => {
        const copy = [...prev];
        copy[activePageIndex] = {
          ...copy[activePageIndex],
          dataUrl: updated.dataUrl,
          blob: updated.blob,
          width: updated.width,
          height: updated.height,
        };
        return copy;
      });
      setExportSuccess(null);
    } catch (err) {
      console.error('Adjustment error:', err);
    } finally {
      setIsProcessing(false);
    }
  };

  // Rotate active page 90 degrees clockwise
  const handleRotatePage = async (pageIdx: number = activePageIndex) => {
    if (pages.length === 0 || pageIdx >= pages.length) return;
    const currentPage = pages[pageIdx];
    const nextRotation = (currentPage.rotation + 90) % 360;
    const adj = pageAdjustments[currentPage.id] || { brightness: 0, contrast: 0 };

    setIsProcessing(true);
    try {
      const updated = await processDocumentFilter(
        currentPage.originalDataUrl,
        currentPage.filter,
        nextRotation,
        adj
      );

      setPages((prev) => {
        const copy = [...prev];
        copy[pageIdx] = {
          ...copy[pageIdx],
          rotation: nextRotation,
          dataUrl: updated.dataUrl,
          blob: updated.blob,
          width: updated.width,
          height: updated.height,
        };
        return copy;
      });
      setExportSuccess(null);
    } catch (err) {
      console.error('Rotation error:', err);
    } finally {
      setIsProcessing(false);
    }
  };

  // Reorder pages (move left or right)
  const handleMovePage = (index: number, direction: 'left' | 'right') => {
    const targetIndex = direction === 'left' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= pages.length) return;

    setPages((prev) => {
      const copy = [...prev];
      const temp = copy[index];
      copy[index] = copy[targetIndex];
      copy[targetIndex] = temp;
      return copy;
    });
    setActivePageIndex(targetIndex);
    setExportSuccess(null);
  };

  // Delete page
  const handleDeletePage = (indexToDelete: number) => {
    setPages((prev) => prev.filter((_, i) => i !== indexToDelete));
    setActivePageIndex((prev) => Math.max(0, Math.min(prev, pages.length - 2)));
    setExportSuccess(null);
  };

  // Clear all pages
  const handleClearAllPages = () => {
    if (window.confirm('Are you sure you want to remove all scanned pages?')) {
      setPages([]);
      setActivePageIndex(0);
      setExportSuccess(null);
      setPageAdjustments({});
    }
  };

  // Export as multi-page PDF
  const handleExportPdf = async () => {
    if (pages.length === 0) return;
    setIsProcessing(true);

    try {
      const pdfBlob = await createPdfFromScannedPages(pages, {
        pageSize: pdfPageSize,
        margin: 'none',
      });
      const url = URL.createObjectURL(pdfBlob);
      const filename = `Scanned_Document_${new Date().toISOString().slice(0, 10)}.pdf`;
      setExportSuccess({ pdfBlob, url, filename });

      // Trigger automatic direct download
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);

      confetti({
        particleCount: 60,
        spread: 70,
        origin: { y: 0.6 },
      });
    } catch (err) {
      console.error('Export failed:', err);
      alert('Failed to generate PDF from scans.');
    } finally {
      setIsProcessing(false);
    }
  };

  // Web Share API (Mobile direct share to WhatsApp, Email, Drive, etc.)
  const handleSharePdf = async () => {
    if (!exportSuccess?.pdfBlob) {
      await handleExportPdf();
    }
    if (!exportSuccess?.pdfBlob) return;

    try {
      const file = new File([exportSuccess.pdfBlob], exportSuccess.filename || 'Scanned_Document.pdf', {
        type: 'application/pdf',
      });
      if (navigator.canShare && navigator.canShare({ files: [file] })) {
        await navigator.share({
          title: 'Scanned Document',
          text: 'Scanned with ZipStream CamScanner',
          files: [file],
        });
      } else {
        // Fallback to clipboard or download
        alert('Sharing files is not supported on this browser. You can download the PDF directly.');
      }
    } catch (err: any) {
      if (err.name !== 'AbortError') {
        console.warn('Share error:', err);
      }
    }
  };

  // Download all pages as ZIP
  const handleExportZip = async () => {
    if (pages.length === 0) return;
    setIsProcessing(true);
    try {
      const zipBlob = await packageScannedPagesZip(pages);
      const url = URL.createObjectURL(zipBlob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `Scanned_Images_${new Date().toISOString().slice(0, 10)}.zip`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    } catch (err) {
      console.error('ZIP package error:', err);
      alert('Failed to package images as ZIP.');
    } finally {
      setIsProcessing(false);
    }
  };

  // Direct print scanned document
  const handlePrintDocument = () => {
    if (pages.length === 0) return;
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    const html = `
      <!DOCTYPE html>
      <html>
        <head>
          <title>Print Scanned Document</title>
          <style>
            @page { margin: 0; size: auto; }
            body { margin: 0; padding: 0; background: #fff; }
            .page-container { page-break-after: always; display: flex; justify-content: center; align-items: center; min-height: 100vh; }
            img { max-width: 100%; max-height: 100vh; object-fit: contain; }
          </style>
        </head>
        <body>
          ${pages.map((p) => `<div class="page-container"><img src="${p.dataUrl}" /></div>`).join('')}
          <script>
            window.onload = function() {
              window.print();
              window.onafterprint = function() { window.close(); };
            };
          </script>
        </body>
      </html>
    `;
    printWindow.document.write(html);
    printWindow.document.close();
  };

  // Load sample receipt/document
  const handleLoadSampleScan = () => {
    const canvas = document.createElement('canvas');
    canvas.width = 800;
    canvas.height = 1100;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Background paper texture
    ctx.fillStyle = '#fbfbfa';
    ctx.fillRect(0, 0, 800, 1100);

    // Document header
    ctx.fillStyle = '#111827';
    ctx.font = 'bold 30px sans-serif';
    ctx.fillText('TAX INVOICE / RECEIPT', 60, 90);

    ctx.font = '15px sans-serif';
    ctx.fillStyle = '#4b5563';
    ctx.fillText(`Invoice #: INV-2026-9842`, 60, 130);
    ctx.fillText(`Date: ${new Date().toLocaleDateString()}`, 60, 155);
    ctx.fillText(`Vendor: Cloud Infrastructure & Storage Inc.`, 60, 180);

    // Divider line
    ctx.strokeStyle = '#e5e7eb';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(60, 205);
    ctx.lineTo(740, 205);
    ctx.stroke();

    // Table headers
    ctx.font = 'bold 15px sans-serif';
    ctx.fillStyle = '#374151';
    ctx.fillText('DESCRIPTION', 60, 235);
    ctx.fillText('AMOUNT', 640, 235);

    // Table rows
    const items = [
      { desc: 'High-Performance Document Compression Engine', cost: '$320.00' },
      { desc: 'High-Speed Web Workers & WASM Acceleration', cost: '$180.00' },
      { desc: 'Client SSL Security & Privacy Safeguards', cost: '$95.00' },
      { desc: 'Unlimited CamScanner Device Offline License', cost: '$0.00' },
    ];

    let y = 280;
    items.forEach((item) => {
      ctx.fillStyle = '#1f2937';
      ctx.font = '16px sans-serif';
      ctx.fillText(item.desc, 60, y);
      ctx.fillText(item.cost, 650, y);
      y += 50;
    });

    ctx.beginPath();
    ctx.moveTo(60, y + 20);
    ctx.lineTo(740, y + 20);
    ctx.stroke();

    ctx.font = 'bold 22px sans-serif';
    ctx.fillStyle = '#2563eb';
    ctx.fillText('TOTAL PAID: $595.00', 480, y + 70);

    // Stamp
    ctx.save();
    ctx.translate(200, y + 100);
    ctx.rotate(-0.12);
    ctx.strokeStyle = '#16a34a';
    ctx.lineWidth = 3.5;
    ctx.strokeRect(-80, -30, 160, 60);
    ctx.fillStyle = '#16a34a';
    ctx.font = 'bold 22px sans-serif';
    ctx.fillText('PAID IN FULL', -70, 8);
    ctx.restore();

    const dataUrl = canvas.toDataURL('image/jpeg', 0.92);
    addScannedPageFromDataUrl(dataUrl);
  };

  const activePage = pages[activePageIndex];
  const activeAdj = activePage ? pageAdjustments[activePage.id] || { brightness: 0, contrast: 0 } : { brightness: 0, contrast: 0 };

  return (
    <div id="scan-document-view" className="w-full max-w-4xl mx-auto space-y-6 animate-in fade-in duration-200">
      {/* Hidden file inputs */}
      <input
        type="file"
        ref={fileInputRef}
        accept="image/jpeg,image/png,image/webp,image/bmp"
        multiple
        className="hidden"
        onChange={(e) => {
          if (e.target.files) handleImageUpload(e.target.files);
          e.target.value = '';
        }}
      />
      <input
        type="file"
        ref={mobileInputRef}
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={(e) => {
          if (e.target.files) handleImageUpload(e.target.files);
          e.target.value = '';
        }}
      />

      {/* Header */}
      <div className="text-center space-y-2">
        <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-[#34c759]/10 text-[#34c759] dark:text-[#30d158] text-[12px] font-semibold border border-[#34c759]/20">
          <Camera className="w-3.5 h-3.5" />
          <span>CamScanner Document Engine</span>
        </div>
        <h2 className="text-3xl font-bold tracking-tight text-[#1d1d1f] dark:text-[#f5f5f7]">
          Scan Documents & Receipts
        </h2>
        <p className="text-[15px] text-[#6e6e73] dark:text-[#8e8e93] max-w-xl mx-auto">
          Scan papers, bills, receipts, or notes using your camera or photos. Auto-enhances text contrast and exports clean multi-page PDFs on-device.
        </p>
      </div>

      {/* Main Workspace Card */}
      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        className={`bg-white dark:bg-[#1c1c1e] rounded-[24px] border ${
          isDragOver
            ? 'border-[#34c759] ring-2 ring-[#34c759]/30'
            : 'border-black/[0.08] dark:border-white/[0.08]'
        } shadow-[0_4px_24px_rgba(0,0,0,0.04)] p-6 sm:p-8 space-y-6 transition-all`}
      >
        {/* Camera Live Viewfinder / Capture Section with Corner Points & Document Border Line */}
        {isCameraActive ? (
          <div
            ref={cameraContainerRef}
            className={`${
              isCameraFullscreen
                ? 'fixed inset-0 z-50 bg-black flex flex-col justify-between p-2 sm:p-4'
                : 'relative rounded-[24px] overflow-hidden bg-black h-[68vh] sm:h-[520px] max-h-[640px] flex items-center justify-center shadow-2xl border border-white/10'
            } select-none transition-all`}
          >
            {/* Live Video Stream Element */}
            <video
              ref={setVideoRef}
              autoPlay
              playsInline
              muted
              className="w-full h-full object-cover"
            />

            {/* Visual Shutter Flash Overlay */}
            {isFlashing && (
              <div className="absolute inset-0 bg-white z-40 pointer-events-none transition-opacity duration-150" />
            )}

            {/* Dark Mask Overlays: Masks out unwanted background outside document border lines */}
            <div
              className="absolute top-0 left-0 right-0 bg-black/55 backdrop-blur-[1px] pointer-events-none transition-all z-10"
              style={{ height: `${cropBox.y}%` }}
            />
            <div
              className="absolute left-0 right-0 bottom-0 bg-black/55 backdrop-blur-[1px] pointer-events-none transition-all z-10"
              style={{ top: `${cropBox.y + cropBox.h}%` }}
            />
            <div
              className="absolute left-0 bg-black/55 backdrop-blur-[1px] pointer-events-none transition-all z-10"
              style={{
                top: `${cropBox.y}%`,
                height: `${cropBox.h}%`,
                width: `${cropBox.x}%`,
              }}
            />
            <div
              className="absolute right-0 bg-black/55 backdrop-blur-[1px] pointer-events-none transition-all z-10"
              style={{
                top: `${cropBox.y}%`,
                height: `${cropBox.h}%`,
                width: `${Math.max(0, 100 - (cropBox.x + cropBox.w))}%`,
              }}
            />

            {/* Illuminated Document Border Line with 4 Corner Points */}
            <div
              className="absolute border-2 border-[#34c759] shadow-[0_0_20px_rgba(52,199,89,0.45)] z-20 select-none"
              style={{
                left: `${cropBox.x}%`,
                top: `${cropBox.y}%`,
                width: `${cropBox.w}%`,
                height: `${cropBox.h}%`,
              }}
            >
              {/* L-shaped Bold Corner Brackets */}
              <div className="absolute -top-1 -left-1 w-6 h-6 border-t-4 border-l-4 border-[#34c759] rounded-tl pointer-events-none shadow-sm" />
              <div className="absolute -top-1 -right-1 w-6 h-6 border-t-4 border-r-4 border-[#34c759] rounded-tr pointer-events-none shadow-sm" />
              <div className="absolute -bottom-1 -left-1 w-6 h-6 border-b-4 border-l-4 border-[#34c759] rounded-bl pointer-events-none shadow-sm" />
              <div className="absolute -bottom-1 -right-1 w-6 h-6 border-b-4 border-r-4 border-[#34c759] rounded-br pointer-events-none shadow-sm" />

              {/* 1. Top-Left Corner Point Handle */}
              <div
                onPointerDown={(e) => handleStartCropDrag('tl', e)}
                className="absolute -top-5 -left-5 w-10 h-10 flex items-center justify-center cursor-nwse-resize touch-none z-30 group"
                title="Drag Corner Point"
              >
                <div className="w-5 h-5 rounded-full bg-[#34c759] border-2 border-white shadow-[0_2px_10px_rgba(0,0,0,0.6)] group-active:scale-125 transition-transform flex items-center justify-center">
                  <div className="w-1.5 h-1.5 rounded-full bg-white" />
                </div>
              </div>

              {/* 2. Top-Right Corner Point Handle */}
              <div
                onPointerDown={(e) => handleStartCropDrag('tr', e)}
                className="absolute -top-5 -right-5 w-10 h-10 flex items-center justify-center cursor-nesw-resize touch-none z-30 group"
                title="Drag Corner Point"
              >
                <div className="w-5 h-5 rounded-full bg-[#34c759] border-2 border-white shadow-[0_2px_10px_rgba(0,0,0,0.6)] group-active:scale-125 transition-transform flex items-center justify-center">
                  <div className="w-1.5 h-1.5 rounded-full bg-white" />
                </div>
              </div>

              {/* 3. Bottom-Left Corner Point Handle */}
              <div
                onPointerDown={(e) => handleStartCropDrag('bl', e)}
                className="absolute -bottom-5 -left-5 w-10 h-10 flex items-center justify-center cursor-nesw-resize touch-none z-30 group"
                title="Drag Corner Point"
              >
                <div className="w-5 h-5 rounded-full bg-[#34c759] border-2 border-white shadow-[0_2px_10px_rgba(0,0,0,0.6)] group-active:scale-125 transition-transform flex items-center justify-center">
                  <div className="w-1.5 h-1.5 rounded-full bg-white" />
                </div>
              </div>

              {/* 4. Bottom-Right Corner Point Handle */}
              <div
                onPointerDown={(e) => handleStartCropDrag('br', e)}
                className="absolute -bottom-5 -right-5 w-10 h-10 flex items-center justify-center cursor-nwse-resize touch-none z-30 group"
                title="Drag Corner Point"
              >
                <div className="w-5 h-5 rounded-full bg-[#34c759] border-2 border-white shadow-[0_2px_10px_rgba(0,0,0,0.6)] group-active:scale-125 transition-transform flex items-center justify-center">
                  <div className="w-1.5 h-1.5 rounded-full bg-white" />
                </div>
              </div>

              {/* Center Move Handle & Indicator */}
              <div
                onPointerDown={(e) => handleStartCropDrag('center', e)}
                className="absolute inset-0 flex items-center justify-center cursor-move touch-none"
              >
                <div className="px-3 py-1 rounded-full bg-black/60 backdrop-blur-md border border-white/20 text-[11px] font-semibold text-white/90 shadow-md flex items-center gap-1.5 pointer-events-none">
                  <Move className="w-3 h-3 text-[#34c759]" />
                  <span>Document Border (Only inside captured)</span>
                </div>
              </div>
            </div>

            {/* Top Toolbar overlay inside camera */}
            <div className="absolute top-3 inset-x-3 sm:top-4 sm:inset-x-4 flex items-center justify-between z-30 gap-2">
              {/* Document Type Preset Buttons */}
              <div className="flex items-center gap-1 p-1 rounded-full bg-black/60 backdrop-blur-md border border-white/10 overflow-x-auto max-w-[65%] sm:max-w-none">
                <button
                  type="button"
                  onClick={() => applyCropPreset('a4')}
                  className={`px-2.5 py-1 rounded-full text-[11px] font-medium transition-all cursor-pointer whitespace-nowrap ${
                    cropPreset === 'a4'
                      ? 'bg-[#34c759] text-white shadow-xs'
                      : 'text-white/70 hover:text-white hover:bg-white/10'
                  }`}
                >
                  📄 A4 Doc
                </button>
                <button
                  type="button"
                  onClick={() => applyCropPreset('receipt')}
                  className={`px-2.5 py-1 rounded-full text-[11px] font-medium transition-all cursor-pointer whitespace-nowrap ${
                    cropPreset === 'receipt'
                      ? 'bg-[#34c759] text-white shadow-xs'
                      : 'text-white/70 hover:text-white hover:bg-white/10'
                  }`}
                >
                  🧾 Receipt
                </button>
                <button
                  type="button"
                  onClick={() => applyCropPreset('idcard')}
                  className={`px-2.5 py-1 rounded-full text-[11px] font-medium transition-all cursor-pointer whitespace-nowrap ${
                    cropPreset === 'idcard'
                      ? 'bg-[#34c759] text-white shadow-xs'
                      : 'text-white/70 hover:text-white hover:bg-white/10'
                  }`}
                >
                  🪪 ID Card
                </button>
                <button
                  type="button"
                  onClick={() => applyCropPreset('full')}
                  className={`px-2.5 py-1 rounded-full text-[11px] font-medium transition-all cursor-pointer whitespace-nowrap hidden sm:inline ${
                    cropPreset === 'full'
                      ? 'bg-[#34c759] text-white shadow-xs'
                      : 'text-white/70 hover:text-white hover:bg-white/10'
                  }`}
                >
                  ⛶ Full
                </button>
              </div>

              {/* Utility Buttons: Torch, Flip, Fullscreen, Close */}
              <div className="flex items-center gap-1.5 shrink-0">
                {hasTorch && (
                  <button
                    type="button"
                    onClick={toggleTorch}
                    className={`p-2.5 rounded-full backdrop-blur-md transition-colors cursor-pointer border border-white/10 ${
                      isTorchOn ? 'bg-[#ff9500] text-white shadow-[0_0_12px_#ff9500]' : 'bg-black/60 text-white hover:bg-black/80'
                    }`}
                    title={isTorchOn ? 'Turn Flashlight Off' : 'Turn Flashlight On'}
                  >
                    {isTorchOn ? <Zap className="w-4 h-4" /> : <ZapOff className="w-4 h-4" />}
                  </button>
                )}
                <button
                  type="button"
                  onClick={toggleCameraFacing}
                  className="p-2.5 rounded-full bg-black/60 hover:bg-black/80 text-white backdrop-blur-md transition-colors cursor-pointer border border-white/10"
                  title="Switch Front/Rear Camera"
                >
                  <RotateCw className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  onClick={() => setIsCameraFullscreen((prev) => !prev)}
                  className="p-2.5 rounded-full bg-black/60 hover:bg-black/80 text-white backdrop-blur-md transition-colors cursor-pointer border border-white/10"
                  title={isCameraFullscreen ? 'Exit Fullscreen' : 'Fullscreen Camera'}
                >
                  {isCameraFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
                </button>
                <button
                  type="button"
                  onClick={stopCamera}
                  className="p-2.5 rounded-full bg-black/60 hover:bg-black/80 text-white backdrop-blur-md transition-colors cursor-pointer border border-white/10"
                  title="Close Camera"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Bottom Shutter Controls */}
            <div className="absolute bottom-4 sm:bottom-6 inset-x-0 flex items-center justify-center gap-6 sm:gap-10 z-30 px-4">
              {pages.length > 0 ? (
                <button
                  type="button"
                  onClick={stopCamera}
                  className="px-4 py-2 rounded-full bg-black/70 hover:bg-black/90 text-white text-[13px] font-semibold backdrop-blur-md transition-colors cursor-pointer border border-white/15"
                >
                  Done ({pages.length})
                </button>
              ) : (
                <div className="w-16" />
              )}

              {/* Shutter Button with tactile feedback */}
              <button
                type="button"
                id="camera-snap-btn"
                onClick={capturePhoto}
                disabled={isProcessing}
                className="w-18 h-18 sm:w-20 sm:h-20 rounded-full bg-white border-4 border-[#34c759] shadow-[0_0_24px_rgba(52,199,89,0.5)] flex items-center justify-center active:scale-90 transition-transform cursor-pointer hover:scale-105"
                title="Capture Document Inside Border"
              >
                <div className="w-13 h-13 sm:w-14 sm:h-14 rounded-full bg-[#34c759] hover:bg-[#2fb350] transition-colors flex items-center justify-center shadow-inner">
                  <Camera className="w-6 h-6 text-white" />
                </div>
              </button>

              {pages.length > 0 ? (
                <div className="w-16 flex justify-center">
                  <span className="px-2.5 py-1 rounded-full bg-[#34c759] text-white text-[12px] font-bold shadow-md">
                    +{pages.length}
                  </span>
                </div>
              ) : (
                <div className="w-16" />
              )}
            </div>

            {/* Mobile Touch Guidance Tip */}
            <div className="absolute bottom-20 sm:bottom-24 inset-x-0 text-center pointer-events-none z-20">
              <span className="px-3 py-1 rounded-full bg-black/60 text-white/80 text-[11px] font-medium backdrop-blur-xs border border-white/10 shadow-xs">
                Drag green corner points to fit document
              </span>
            </div>
          </div>
        ) : (
          /* Capture / Upload Options */
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {/* Option 1: Live Camera Scanner */}
            <button
              type="button"
              id="start-camera-scan-btn"
              onClick={() => startCamera('environment')}
              className="p-6 rounded-[20px] border-2 border-dashed border-black/10 dark:border-white/10 hover:border-[#34c759] bg-[#fafafc] dark:bg-[#252528] hover:bg-[#34c759]/5 dark:hover:bg-[#34c759]/10 flex flex-col items-center justify-center text-center gap-3 transition-all group cursor-pointer"
            >
              <div className="w-12 h-12 rounded-2xl bg-white dark:bg-[#2c2c2e] border border-black/10 dark:border-white/10 shadow-xs flex items-center justify-center text-[#34c759] group-hover:scale-105 transition-transform">
                <Camera className="w-6 h-6" />
              </div>
              <div>
                <h4 className="text-[15px] font-semibold text-[#1d1d1f] dark:text-[#f5f5f7]">Live Camera Scanner</h4>
                <p className="text-[12px] text-[#86868b] dark:text-[#8e8e93] mt-0.5">
                  Point camera at receipt, invoice, or paper
                </p>
              </div>
            </button>

            {/* Option 2: Phone Native Camera (Mobile Optimized) */}
            <button
              type="button"
              id="mobile-camera-btn"
              onClick={() => mobileInputRef.current?.click()}
              className="p-6 rounded-[20px] border-2 border-dashed border-black/10 dark:border-white/10 hover:border-[#ff9500] bg-[#fafafc] dark:bg-[#252528] hover:bg-[#ff9500]/5 dark:hover:bg-[#ff9500]/10 flex flex-col items-center justify-center text-center gap-3 transition-all group cursor-pointer"
            >
              <div className="w-12 h-12 rounded-2xl bg-white dark:bg-[#2c2c2e] border border-black/10 dark:border-white/10 shadow-xs flex items-center justify-center text-[#ff9500] group-hover:scale-105 transition-transform">
                <Smartphone className="w-6 h-6" />
              </div>
              <div>
                <h4 className="text-[15px] font-semibold text-[#1d1d1f] dark:text-[#f5f5f7]">Phone Camera Snap</h4>
                <p className="text-[12px] text-[#86868b] dark:text-[#8e8e93] mt-0.5">
                  Take photo using device native camera
                </p>
              </div>
            </button>

            {/* Option 3: Upload Document Photos */}
            <button
              type="button"
              id="upload-photos-btn"
              onClick={() => fileInputRef.current?.click()}
              className="p-6 rounded-[20px] border-2 border-dashed border-black/10 dark:border-white/10 hover:border-[#0071e3] bg-[#fafafc] dark:bg-[#252528] hover:bg-[#0071e3]/5 dark:hover:bg-[#0071e3]/10 flex flex-col items-center justify-center text-center gap-3 transition-all group cursor-pointer"
            >
              <div className="w-12 h-12 rounded-2xl bg-white dark:bg-[#2c2c2e] border border-black/10 dark:border-white/10 shadow-xs flex items-center justify-center text-[#0071e3] group-hover:scale-105 transition-transform">
                <Upload className="w-6 h-6" />
              </div>
              <div>
                <h4 className="text-[15px] font-semibold text-[#1d1d1f] dark:text-[#f5f5f7]">Upload Photos</h4>
                <p className="text-[12px] text-[#86868b] dark:text-[#8e8e93] mt-0.5">
                  Drop JPG, PNG, or photo scans here
                </p>
              </div>
            </button>
          </div>
        )}

        {/* Camera error message banner with friendly help */}
        {cameraError && (
          <div className="p-4 rounded-2xl bg-[#ff3b30]/10 border border-[#ff3b30]/20 text-[#ff3b30] flex items-start gap-3 text-[13px] leading-relaxed">
            <X className="w-4 h-4 shrink-0 mt-0.5" />
            <div className="space-y-1">
              <span className="font-semibold">Camera Access Notice:</span>
              <p>{cameraError}</p>
            </div>
          </div>
        )}

        {/* Quick sample loader when no pages are scanned */}
        {pages.length === 0 && !isCameraActive && (
          <div className="text-center pt-2">
            <button
              type="button"
              id="load-sample-btn"
              onClick={handleLoadSampleScan}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-[#f5f5f7] dark:bg-[#252528] hover:bg-black/[0.06] dark:hover:bg-white/[0.08] text-[13px] font-medium text-[#1d1d1f] dark:text-[#f5f5f7] transition-colors cursor-pointer border border-black/[0.04] dark:border-white/[0.06]"
            >
              <Sparkles className="w-4 h-4 text-[#ff9500]" />
              <span>Load Sample Invoice Document to Test</span>
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
                    { id: 'auto_enhance', label: 'Magic Color', icon: '✨' },
                    { id: 'clean_bw', label: 'Clean B&W', icon: '📄' },
                    { id: 'grayscale', label: 'Grayscale', icon: '🔘' },
                    { id: 'original', label: 'Original', icon: '🖼️' },
                  ] as const
                ).map((f) => (
                  <button
                    key={f.id}
                    onClick={() => handleChangeFilter(f.id)}
                    className={`px-2.5 py-1 rounded-lg text-[12px] font-medium transition-all cursor-pointer ${
                      activePage?.filter === f.id
                        ? 'bg-[#1d1d1f] dark:bg-white text-white dark:text-[#1d1d1f] shadow-xs'
                        : 'text-[#6e6e73] dark:text-[#8e8e93] hover:text-[#1d1d1f] dark:hover:text-[#f5f5f7]'
                    }`}
                  >
                    <span>{f.icon} </span>
                    <span className="hidden sm:inline">{f.label}</span>
                  </button>
                ))}
              </div>

              {/* Action Buttons: Sliders, Fullscreen, Rotate, Delete */}
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => setShowAdjustments((prev) => !prev)}
                  className={`p-2 rounded-xl transition-colors cursor-pointer border border-black/[0.06] dark:border-white/[0.06] shadow-2xs ${
                    showAdjustments
                      ? 'bg-[#0071e3] text-white'
                      : 'bg-white dark:bg-[#2c2c2e] text-[#1d1d1f] dark:text-[#f5f5f7] hover:bg-black/[0.04] dark:hover:bg-white/[0.08]'
                  }`}
                  title="Fine-tune Brightness & Contrast"
                >
                  <SlidersHorizontal className="w-4 h-4" />
                </button>

                <button
                  type="button"
                  id="page-crop-btn"
                  onClick={() => {
                    setModalCropBox({ x: 5, y: 5, w: 90, h: 90 });
                    setIsCropModalOpen(true);
                  }}
                  className="p-2 rounded-xl bg-white dark:bg-[#2c2c2e] hover:bg-black/[0.04] dark:hover:bg-white/[0.08] text-[#1d1d1f] dark:text-[#f5f5f7] border border-black/[0.06] dark:border-white/[0.06] shadow-2xs cursor-pointer flex items-center gap-1"
                  title="Crop Document Borders & Corners"
                >
                  <Crop className="w-4 h-4 text-[#34c759]" />
                  <span className="hidden sm:inline text-[12px] font-medium">Crop</span>
                </button>

                <button
                  type="button"
                  onClick={() => activePage && setPreviewModalUrl(activePage.dataUrl)}
                  className="p-2 rounded-xl bg-white dark:bg-[#2c2c2e] hover:bg-black/[0.04] dark:hover:bg-white/[0.08] text-[#1d1d1f] dark:text-[#f5f5f7] border border-black/[0.06] dark:border-white/[0.06] shadow-2xs cursor-pointer"
                  title="Zoom / Fullscreen View"
                >
                  <Maximize2 className="w-4 h-4" />
                </button>

                <button
                  type="button"
                  onClick={() => handleRotatePage(activePageIndex)}
                  className="p-2 rounded-xl bg-white dark:bg-[#2c2c2e] hover:bg-black/[0.04] dark:hover:bg-white/[0.08] text-[#1d1d1f] dark:text-[#f5f5f7] border border-black/[0.06] dark:border-white/[0.06] shadow-2xs cursor-pointer"
                  title="Rotate 90° Clockwise"
                >
                  <RotateCw className="w-4 h-4" />
                </button>

                <button
                  type="button"
                  onClick={() => handleDeletePage(activePageIndex)}
                  className="p-2 rounded-xl bg-white dark:bg-[#2c2c2e] hover:bg-[#ff3b30]/10 text-[#86868b] hover:text-[#ff3b30] border border-black/[0.06] dark:border-white/[0.06] shadow-2xs cursor-pointer"
                  title="Delete This Page"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Fine-Tuning Sliders Panel */}
            {showAdjustments && (
              <div className="p-4 rounded-2xl bg-[#fafafc] dark:bg-[#252528] border border-black/[0.06] dark:border-white/[0.06] space-y-4 animate-in fade-in slide-in-from-top-2 duration-150">
                <div className="flex items-center justify-between">
                  <span className="text-[13px] font-semibold text-[#1d1d1f] dark:text-[#f5f5f7]">
                    Adjust Page {activePageIndex + 1}
                  </span>
                  <div className="flex items-center gap-3">
                    <button
                      type="button"
                      onClick={handleApplyFilterToAll}
                      className="text-[12px] font-medium text-[#0071e3] dark:text-[#2997ff] hover:underline cursor-pointer"
                    >
                      Apply filter to all pages
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        handleAdjustmentChange('brightness', 0);
                        handleAdjustmentChange('contrast', 0);
                      }}
                      className="text-[12px] text-[#86868b] dark:text-[#8e8e93] hover:underline cursor-pointer"
                    >
                      Reset
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* Brightness */}
                  <div className="space-y-1">
                    <div className="flex justify-between text-[12px] text-[#6e6e73] dark:text-[#8e8e93]">
                      <span>Brightness</span>
                      <span>{activeAdj.brightness > 0 ? `+${activeAdj.brightness}` : activeAdj.brightness}</span>
                    </div>
                    <input
                      type="range"
                      min="-40"
                      max="40"
                      step="2"
                      value={activeAdj.brightness}
                      onChange={(e) => handleAdjustmentChange('brightness', parseInt(e.target.value, 10))}
                      className="w-full accent-[#34c759] cursor-pointer"
                    />
                  </div>

                  {/* Contrast */}
                  <div className="space-y-1">
                    <div className="flex justify-between text-[12px] text-[#6e6e73] dark:text-[#8e8e93]">
                      <span>Contrast</span>
                      <span>{activeAdj.contrast > 0 ? `+${activeAdj.contrast}` : activeAdj.contrast}</span>
                    </div>
                    <input
                      type="range"
                      min="-40"
                      max="40"
                      step="2"
                      value={activeAdj.contrast}
                      onChange={(e) => handleAdjustmentChange('contrast', parseInt(e.target.value, 10))}
                      className="w-full accent-[#34c759] cursor-pointer"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Active Page Large Preview */}
            {activePage && (
              <div className="relative rounded-[20px] overflow-hidden bg-[#e5e5ea] dark:bg-[#2c2c2e] flex items-center justify-center p-4 min-h-[340px] max-h-[520px]">
                <img
                  src={activePage.dataUrl}
                  alt={`Scanned Page ${activePageIndex + 1}`}
                  className="max-h-[480px] w-auto object-contain rounded-lg shadow-md bg-white transition-all"
                />

                {/* Page Navigation Overlay Buttons */}
                {pages.length > 1 && (
                  <>
                    <button
                      type="button"
                      disabled={activePageIndex === 0}
                      onClick={() => setActivePageIndex((prev) => Math.max(0, prev - 1))}
                      className="absolute left-3 p-2 rounded-full bg-black/50 hover:bg-black/70 disabled:opacity-30 text-white backdrop-blur-xs transition-opacity cursor-pointer disabled:cursor-not-allowed"
                      title="Previous Page"
                    >
                      <ArrowLeft className="w-5 h-5" />
                    </button>
                    <button
                      type="button"
                      disabled={activePageIndex === pages.length - 1}
                      onClick={() => setActivePageIndex((prev) => Math.min(pages.length - 1, prev + 1))}
                      className="absolute right-3 p-2 rounded-full bg-black/50 hover:bg-black/70 disabled:opacity-30 text-white backdrop-blur-xs transition-opacity cursor-pointer disabled:cursor-not-allowed"
                      title="Next Page"
                    >
                      <ArrowRight className="w-5 h-5" />
                    </button>
                  </>
                )}
              </div>
            )}

            {/* Thumbnail Strip (Multi-page stack & ordering) */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[13px] font-semibold text-[#1d1d1f] dark:text-[#f5f5f7]">
                  Scanned Pages Queue ({pages.length})
                </span>
                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={() => startCamera('environment')}
                    className="inline-flex items-center gap-1 text-[12px] text-[#34c759] dark:text-[#30d158] font-medium hover:underline cursor-pointer"
                  >
                    <Camera className="w-3.5 h-3.5" />
                    <span>Scan with Camera</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="inline-flex items-center gap-1 text-[12px] text-[#0071e3] dark:text-[#2997ff] font-medium hover:underline cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Add Photos</span>
                  </button>
                </div>
              </div>

              <div className="flex items-center gap-3 overflow-x-auto pb-2 pt-1">
                {pages.map((p, idx) => (
                  <div
                    key={p.id}
                    className={`relative group rounded-xl overflow-hidden shrink-0 border-2 transition-all cursor-pointer ${
                      idx === activePageIndex
                        ? 'border-[#34c759] shadow-md ring-2 ring-[#34c759]/20 scale-105'
                        : 'border-black/10 dark:border-white/10 hover:border-black/30 dark:hover:border-white/30 opacity-75 hover:opacity-100'
                    }`}
                  >
                    <img
                      src={p.dataUrl}
                      alt={`Scanned thumbnail ${idx + 1}`}
                      onClick={() => setActivePageIndex(idx)}
                      className="w-16 h-20 object-cover bg-white"
                    />

                    {/* Page index badge */}
                    <span className="absolute bottom-1 right-1 px-1.5 py-0.5 rounded bg-black/70 text-white text-[10px] font-semibold pointer-events-none">
                      {idx + 1}
                    </span>

                    {/* Hover actions: Move Left / Right */}
                    <div className="absolute inset-x-0 top-0 bg-black/70 p-1 flex items-center justify-between opacity-0 group-hover:opacity-100 transition-opacity">
                      <button
                        type="button"
                        disabled={idx === 0}
                        onClick={(e) => {
                          e.stopPropagation();
                          handleMovePage(idx, 'left');
                        }}
                        className="text-white hover:text-[#34c759] disabled:opacity-20 cursor-pointer"
                        title="Move Left"
                      >
                        <ArrowLeft className="w-3 h-3" />
                      </button>
                      <button
                        type="button"
                        disabled={idx === pages.length - 1}
                        onClick={(e) => {
                          e.stopPropagation();
                          handleMovePage(idx, 'right');
                        }}
                        className="text-white hover:text-[#34c759] disabled:opacity-20 cursor-pointer"
                        title="Move Right"
                      >
                        <ArrowRight className="w-3 h-3" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Export Settings & Actions Bar */}
            <div className="pt-5 border-t border-black/[0.06] dark:border-white/[0.08] space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-3 text-[13px]">
                <div className="flex items-center gap-2">
                  <span className="text-[#6e6e73] dark:text-[#8e8e93]">PDF Page Format:</span>
                  <div className="flex items-center bg-[#f5f5f7] dark:bg-[#252528] p-1 rounded-xl border border-black/[0.04] dark:border-white/[0.06]">
                    <button
                      type="button"
                      onClick={() => setPdfPageSize('a4')}
                      className={`px-3 py-1 rounded-lg font-medium cursor-pointer transition-all ${
                        pdfPageSize === 'a4'
                          ? 'bg-white dark:bg-[#1c1c1e] text-[#1d1d1f] dark:text-[#f5f5f7] shadow-xs'
                          : 'text-[#6e6e73] dark:text-[#8e8e93]'
                      }`}
                    >
                      A4 Standard
                    </button>
                    <button
                      type="button"
                      onClick={() => setPdfPageSize('fit')}
                      className={`px-3 py-1 rounded-lg font-medium cursor-pointer transition-all ${
                        pdfPageSize === 'fit'
                          ? 'bg-white dark:bg-[#1c1c1e] text-[#1d1d1f] dark:text-[#f5f5f7] shadow-xs'
                          : 'text-[#6e6e73] dark:text-[#8e8e93]'
                      }`}
                    >
                      Fit to Scan
                    </button>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={handlePrintDocument}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-black/10 dark:border-white/10 hover:bg-black/[0.03] dark:hover:bg-white/[0.05] text-[#1d1d1f] dark:text-[#f5f5f7] font-medium cursor-pointer"
                    title="Print Document"
                  >
                    <Printer className="w-4 h-4 text-[#86868b]" />
                    <span className="hidden sm:inline">Print</span>
                  </button>

                  <button
                    type="button"
                    onClick={handleExportZip}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-black/10 dark:border-white/10 hover:bg-black/[0.03] dark:hover:bg-white/[0.05] text-[#1d1d1f] dark:text-[#f5f5f7] font-medium cursor-pointer"
                    title="Download individual images as ZIP"
                  >
                    <Archive className="w-4 h-4 text-[#86868b]" />
                    <span className="hidden sm:inline">Export ZIP</span>
                  </button>

                  <button
                    type="button"
                    onClick={handleSharePdf}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-black/10 dark:border-white/10 hover:bg-black/[0.03] dark:hover:bg-white/[0.05] text-[#1d1d1f] dark:text-[#f5f5f7] font-medium cursor-pointer"
                    title="Share PDF via device"
                  >
                    <Share2 className="w-4 h-4 text-[#86868b]" />
                    <span className="hidden sm:inline">Share</span>
                  </button>

                  <button
                    type="button"
                    onClick={handleClearAllPages}
                    className="text-[#ff3b30] hover:underline px-2 py-1 cursor-pointer text-[12px]"
                  >
                    Clear All
                  </button>
                </div>
              </div>

              {/* Main Download PDF CTA */}
              <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-2">
                <button
                  type="button"
                  onClick={onBackToHome}
                  className="w-full sm:w-auto px-5 py-3 rounded-xl border border-black/10 dark:border-white/10 text-[14px] font-medium text-[#1d1d1f] dark:text-[#f5f5f7] hover:bg-black/[0.03] dark:hover:bg-white/[0.05] cursor-pointer"
                >
                  Back to Tools
                </button>

                <button
                  type="button"
                  id="download-scanned-pdf-btn"
                  disabled={isProcessing}
                  onClick={handleExportPdf}
                  className="w-full sm:w-auto px-8 py-3.5 rounded-xl bg-[#34c759] hover:bg-[#2fb350] active:bg-[#27a346] text-white font-semibold text-[15px] shadow-sm flex items-center justify-center gap-2 transition-all cursor-pointer"
                >
                  {isProcessing ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      <span>Compiling Document...</span>
                    </>
                  ) : (
                    <>
                      <Download className="w-4 h-4" />
                      <span>
                        Download Scanned PDF ({pages.length} {pages.length === 1 ? 'Page' : 'Pages'})
                      </span>
                    </>
                  )}
                </button>
              </div>

              {/* Download Success Notice */}
              {exportSuccess && (
                <div className="p-3.5 rounded-xl bg-[#34c759]/10 border border-[#34c759]/20 text-[#34c759] dark:text-[#30d158] flex items-center justify-between text-[13px]">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4" />
                    <span>PDF successfully generated and saved!</span>
                  </div>
                  <a
                    href={exportSuccess.url}
                    download={exportSuccess.filename}
                    className="font-semibold underline hover:no-underline"
                  >
                    Download Again
                  </a>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Zoom / Fullscreen Modal */}
      {previewModalUrl && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="relative max-w-4xl max-h-[90vh] bg-white dark:bg-[#1c1c1e] rounded-2xl overflow-hidden p-2 shadow-2xl flex flex-col">
            <button
              type="button"
              onClick={() => setPreviewModalUrl(null)}
              className="absolute top-4 right-4 p-2 rounded-full bg-black/60 hover:bg-black/80 text-white z-10 cursor-pointer"
              title="Close Preview"
            >
              <X className="w-5 h-5" />
            </button>
            <div className="overflow-auto p-4 flex items-center justify-center max-h-[80vh]">
              <img
                src={previewModalUrl}
                alt="Document Preview"
                className="max-w-full max-h-full object-contain rounded-lg shadow-md"
              />
            </div>
          </div>
        </div>
      )}

      {/* Interactive Post-Capture Page Crop Modal with 4 Corner Points */}
      {isCropModalOpen && activePage && (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-3 sm:p-6 animate-in fade-in duration-200">
          <div className="relative w-full max-w-2xl bg-[#1c1c1e] text-white rounded-3xl overflow-hidden shadow-2xl flex flex-col border border-white/10 max-h-[92vh]">
            {/* Modal Header */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-white/10 shrink-0">
              <div className="flex items-center gap-2">
                <Crop className="w-5 h-5 text-[#34c759]" />
                <h3 className="text-base font-bold">Crop & Trim Document Borders</h3>
              </div>
              <button
                type="button"
                onClick={() => setIsCropModalOpen(false)}
                className="p-1.5 rounded-full hover:bg-white/10 text-white/70 hover:text-white transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Interactive Crop Workspace */}
            <div className="relative p-4 flex-1 flex items-center justify-center overflow-hidden bg-black/90 min-h-[300px] max-h-[60vh]">
              <div
                ref={modalCropContainerRef}
                className="relative inline-block max-w-full max-h-full select-none"
              >
                {/* Image element */}
                <img
                  src={activePage.originalDataUrl}
                  alt="Original Document"
                  className="max-h-[55vh] max-w-full object-contain pointer-events-none rounded-lg"
                />

                {/* Dark Mask outside crop borders */}
                <div
                  className="absolute top-0 left-0 right-0 bg-black/60 backdrop-blur-[1px] pointer-events-none"
                  style={{ height: `${modalCropBox.y}%` }}
                />
                <div
                  className="absolute left-0 right-0 bottom-0 bg-black/60 backdrop-blur-[1px] pointer-events-none"
                  style={{ top: `${modalCropBox.y + modalCropBox.h}%` }}
                />
                <div
                  className="absolute left-0 bg-black/60 backdrop-blur-[1px] pointer-events-none"
                  style={{
                    top: `${modalCropBox.y}%`,
                    height: `${modalCropBox.h}%`,
                    width: `${modalCropBox.x}%`,
                  }}
                />
                <div
                  className="absolute right-0 bg-black/60 backdrop-blur-[1px] pointer-events-none"
                  style={{
                    top: `${modalCropBox.y}%`,
                    height: `${modalCropBox.h}%`,
                    width: `${Math.max(0, 100 - (modalCropBox.x + modalCropBox.w))}%`,
                  }}
                />

                {/* Crop Box with 4 Corner Points */}
                <div
                  className="absolute border-2 border-[#34c759] shadow-[0_0_20px_rgba(52,199,89,0.5)] z-20"
                  style={{
                    left: `${modalCropBox.x}%`,
                    top: `${modalCropBox.y}%`,
                    width: `${modalCropBox.w}%`,
                    height: `${modalCropBox.h}%`,
                  }}
                >
                  {/* Corner brackets */}
                  <div className="absolute -top-1 -left-1 w-5 h-5 border-t-3 border-l-3 border-[#34c759] pointer-events-none" />
                  <div className="absolute -top-1 -right-1 w-5 h-5 border-t-3 border-r-3 border-[#34c759] pointer-events-none" />
                  <div className="absolute -bottom-1 -left-1 w-5 h-5 border-b-3 border-l-3 border-[#34c759] pointer-events-none" />
                  <div className="absolute -bottom-1 -right-1 w-5 h-5 border-b-3 border-r-3 border-[#34c759] pointer-events-none" />

                  {/* Corner handles */}
                  <div
                    onPointerDown={(e) => handleStartModalCropDrag('tl', e)}
                    className="absolute -top-4 -left-4 w-8 h-8 flex items-center justify-center cursor-nwse-resize touch-none z-30 group"
                  >
                    <div className="w-4.5 h-4.5 rounded-full bg-[#34c759] border-2 border-white shadow-md flex items-center justify-center group-active:scale-125 transition-transform">
                      <div className="w-1.5 h-1.5 rounded-full bg-white" />
                    </div>
                  </div>

                  <div
                    onPointerDown={(e) => handleStartModalCropDrag('tr', e)}
                    className="absolute -top-4 -right-4 w-8 h-8 flex items-center justify-center cursor-nesw-resize touch-none z-30 group"
                  >
                    <div className="w-4.5 h-4.5 rounded-full bg-[#34c759] border-2 border-white shadow-md flex items-center justify-center group-active:scale-125 transition-transform">
                      <div className="w-1.5 h-1.5 rounded-full bg-white" />
                    </div>
                  </div>

                  <div
                    onPointerDown={(e) => handleStartModalCropDrag('bl', e)}
                    className="absolute -bottom-4 -left-4 w-8 h-8 flex items-center justify-center cursor-nesw-resize touch-none z-30 group"
                  >
                    <div className="w-4.5 h-4.5 rounded-full bg-[#34c759] border-2 border-white shadow-md flex items-center justify-center group-active:scale-125 transition-transform">
                      <div className="w-1.5 h-1.5 rounded-full bg-white" />
                    </div>
                  </div>

                  <div
                    onPointerDown={(e) => handleStartModalCropDrag('br', e)}
                    className="absolute -bottom-4 -right-4 w-8 h-8 flex items-center justify-center cursor-nwse-resize touch-none z-30 group"
                  >
                    <div className="w-4.5 h-4.5 rounded-full bg-[#34c759] border-2 border-white shadow-md flex items-center justify-center group-active:scale-125 transition-transform">
                      <div className="w-1.5 h-1.5 rounded-full bg-white" />
                    </div>
                  </div>

                  {/* Center drag handle */}
                  <div
                    onPointerDown={(e) => handleStartModalCropDrag('center', e)}
                    className="absolute inset-0 flex items-center justify-center cursor-move touch-none"
                  >
                    <div className="px-2.5 py-0.5 rounded-full bg-black/70 backdrop-blur-xs border border-white/20 text-[10px] font-semibold text-white/90 shadow-md flex items-center gap-1">
                      <Move className="w-3 h-3 text-[#34c759]" />
                      <span>Drag to reposition</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Modal Footer Controls */}
            <div className="flex items-center justify-between px-5 py-4 border-t border-white/10 bg-[#252528] shrink-0">
              <button
                type="button"
                onClick={() => setModalCropBox({ x: 5, y: 5, w: 90, h: 90 })}
                className="px-3.5 py-2 rounded-xl bg-white/10 hover:bg-white/15 text-white text-[13px] font-medium transition-colors cursor-pointer"
              >
                Reset to Full
              </button>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setIsCropModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-white/70 hover:text-white text-[13px] font-medium transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleApplyPageCrop}
                  disabled={isModalCropping}
                  className="px-5 py-2 rounded-xl bg-[#34c759] hover:bg-[#2fb350] text-white text-[13px] font-semibold shadow-md transition-all cursor-pointer flex items-center gap-1.5 disabled:opacity-50"
                >
                  <Check className="w-4 h-4" />
                  <span>{isModalCropping ? 'Cropping...' : 'Apply Crop'}</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
