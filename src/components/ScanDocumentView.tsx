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
import {
  detectDocumentBounds,
  detectDocumentInImage,
  autoCropDocumentImage,
  DetectedCropBox,
} from '../utils/documentDetector';
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

  // Document Viewfinder Crop Box & Automatic Page Border Detection
  const [cropBox, setCropBox] = useState<CropBox>(DEFAULT_CROP_BOX);
  const [cropPreset, setCropPreset] = useState<'a4' | 'receipt' | 'idcard' | 'full' | 'custom'>('a4');
  const [isAutoBorderActive, setIsAutoBorderActive] = useState<boolean>(true);
  const [isDocumentDetected, setIsDocumentDetected] = useState<boolean>(false);
  const [autoCropOnUpload, setAutoCropOnUpload] = useState<boolean>(true);
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
    setIsAutoBorderActive(false); // Manual preset chosen
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

  // Real-time automatic document border detection on live camera feed
  useEffect(() => {
    if (!isCameraActive || !isAutoBorderActive) {
      setIsDocumentDetected(false);
      return;
    }

    let animationFrameId: number;
    let lastCheckTime = 0;
    let isCancelled = false;

    const runDetection = (timestamp: number) => {
      if (isCancelled) return;

      // Throttle detection to ~120ms (approx 8 FPS) for buttery smooth performance without battery drain
      if (timestamp - lastCheckTime >= 120) {
        lastCheckTime = timestamp;
        if (videoRef.current && videoRef.current.readyState >= 2) {
          const result = detectDocumentBounds(videoRef.current);
          if (result.found && result.confidence >= 0.6) {
            setIsDocumentDetected(true);
            // Smoothly lerp towards detected target box to avoid tremor jitter
            setCropBox((prev) => {
              const target = result.box;
              const lerpFactor = 0.35;
              const nextX = prev.x + (target.x - prev.x) * lerpFactor;
              const nextY = prev.y + (target.y - prev.y) * lerpFactor;
              const nextW = prev.w + (target.w - prev.w) * lerpFactor;
              const nextH = prev.h + (target.h - prev.h) * lerpFactor;
              return {
                x: Math.round(nextX * 10) / 10,
                y: Math.round(nextY * 10) / 10,
                w: Math.round(nextW * 10) / 10,
                h: Math.round(nextH * 10) / 10,
              };
            });
          } else {
            setIsDocumentDetected(false);
          }
        }
      }

      animationFrameId = requestAnimationFrame(runDetection);
    };

    animationFrameId = requestAnimationFrame(runDetection);

    return () => {
      isCancelled = true;
      cancelAnimationFrame(animationFrameId);
    };
  }, [isCameraActive, isAutoBorderActive]);

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
    setIsAutoBorderActive(false);

    const targetElem = e.currentTarget as HTMLElement;
    try {
      targetElem.setPointerCapture?.(e.pointerId);
    } catch {}

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
      setIsAutoBorderActive(false);
    };

    const handlePointerUp = (upEvt: PointerEvent) => {
      try {
        targetElem.releasePointerCapture?.(upEvt.pointerId);
      } catch {}
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

    const targetElem = e.currentTarget as HTMLElement;
    try {
      targetElem.setPointerCapture?.(e.pointerId);
    } catch {}

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

    const handlePointerUp = (upEvt: PointerEvent) => {
      try {
        targetElem.releasePointerCapture?.(upEvt.pointerId);
      } catch {}
      window.removeEventListener('pointermove', handlePointerMove);
      window.removeEventListener('pointerup', handlePointerUp);
    };

    window.addEventListener('pointermove', handlePointerMove);
    window.addEventListener('pointerup', handlePointerUp);
  };

  // Open post-capture crop modal with automatic border detection
  const handleOpenCropModal = async () => {
    if (pages.length === 0 || activePageIndex >= pages.length) return;
    const currentPage = pages[activePageIndex];
    setIsCropModalOpen(true);
    try {
      const detection = await detectDocumentInImage(currentPage.originalDataUrl);
      if (detection.found) {
        setModalCropBox(detection.box);
      } else {
        setModalCropBox({ x: 5, y: 5, w: 90, h: 90 });
      }
    } catch {
      setModalCropBox({ x: 5, y: 5, w: 90, h: 90 });
    }
  };

  // Re-detect document boundary in post-capture crop modal on demand
  const handleAutoDetectModalCrop = async () => {
    if (pages.length === 0 || activePageIndex >= pages.length) return;
    const currentPage = pages[activePageIndex];
    try {
      const detection = await detectDocumentInImage(currentPage.originalDataUrl);
      if (detection.found) {
        setModalCropBox(detection.box);
      } else {
        setModalCropBox({ x: 5, y: 5, w: 90, h: 90 });
      }
    } catch {
      setModalCropBox({ x: 5, y: 5, w: 90, h: 90 });
    }
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

  // Upload image from file picker or camera capture input with automatic document border detection
  const handleImageUpload = (fileList: FileList | File[]) => {
    const files = Array.from(fileList).filter((f) => f.type.startsWith('image/'));
    if (files.length === 0) return;

    files.forEach((file) => {
      const reader = new FileReader();
      reader.onload = async (e) => {
        const rawDataUrl = e.target?.result as string;
        if (rawDataUrl) {
          if (autoCropOnUpload) {
            try {
              // Automatically detect and crop the document border from the uploaded picture
              const { croppedDataUrl } = await autoCropDocumentImage(rawDataUrl);
              await addScannedPageFromDataUrl(croppedDataUrl);
            } catch {
              await addScannedPageFromDataUrl(rawDataUrl);
            }
          } else {
            await addScannedPageFromDataUrl(rawDataUrl);
          }
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

  // Load sample receipt/document with simulated desk surface to demonstrate automatic border detection
  const handleLoadSampleScan = async () => {
    const canvas = document.createElement('canvas');
    canvas.width = 1000;
    canvas.height = 1350;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Outer desk surface (dark slate background representing a desk/table)
    ctx.fillStyle = '#1e293b';
    ctx.fillRect(0, 0, 1000, 1350);

    // Subtle table woodgrain / desk texture lines
    ctx.strokeStyle = '#334155';
    ctx.lineWidth = 1;
    for (let lx = 40; lx < 1000; lx += 80) {
      ctx.beginPath();
      ctx.moveTo(lx, 0);
      ctx.lineTo(lx, 1350);
      ctx.stroke();
    }

    // Document sheet sitting on desk with subtle drop shadow
    const docX = 100;
    const docY = 90;
    const docW = 800;
    const docH = 1170;

    ctx.save();
    ctx.shadowColor = 'rgba(0,0,0,0.5)';
    ctx.shadowBlur = 24;
    ctx.shadowOffsetX = 4;
    ctx.shadowOffsetY = 8;
    ctx.fillStyle = '#fcfcfc';
    ctx.fillRect(docX, docY, docW, docH);
    ctx.restore();

    // Document header inside paper
    ctx.fillStyle = '#111827';
    ctx.font = 'bold 30px sans-serif';
    ctx.fillText('TAX INVOICE / RECEIPT', docX + 60, docY + 90);

    ctx.font = '15px sans-serif';
    ctx.fillStyle = '#4b5563';
    ctx.fillText(`Invoice #: INV-2026-9842`, docX + 60, docY + 130);
    ctx.fillText(`Date: ${new Date().toLocaleDateString()}`, docX + 60, docY + 155);
    ctx.fillText(`Vendor: Cloud Infrastructure & Storage Inc.`, docX + 60, docY + 180);

    // Divider line
    ctx.strokeStyle = '#e5e7eb';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(docX + 60, docY + 205);
    ctx.lineTo(docX + 740, docY + 205);
    ctx.stroke();

    // Table headers
    ctx.font = 'bold 15px sans-serif';
    ctx.fillStyle = '#374151';
    ctx.fillText('DESCRIPTION', docX + 60, docY + 235);
    ctx.fillText('AMOUNT', docX + 640, docY + 235);

    // Table rows
    const items = [
      { desc: 'High-Performance Document Compression Engine', cost: '$320.00' },
      { desc: 'High-Speed Web Workers & WASM Acceleration', cost: '$180.00' },
      { desc: 'Client SSL Security & Privacy Safeguards', cost: '$95.00' },
      { desc: 'Unlimited CamScanner Device Offline License', cost: '$0.00' },
    ];

    let y = docY + 280;
    items.forEach((item) => {
      ctx.fillStyle = '#1f2937';
      ctx.font = '16px sans-serif';
      ctx.fillText(item.desc, docX + 60, y);
      ctx.fillText(item.cost, docX + 650, y);
      y += 50;
    });

    ctx.beginPath();
    ctx.moveTo(docX + 60, y + 20);
    ctx.lineTo(docX + 740, y + 20);
    ctx.stroke();

    ctx.font = 'bold 22px sans-serif';
    ctx.fillStyle = '#2563eb';
    ctx.fillText('TOTAL PAID: $595.00', docX + 480, y + 70);

    // Stamp
    ctx.save();
    ctx.translate(docX + 200, y + 100);
    ctx.rotate(-0.12);
    ctx.strokeStyle = '#16a34a';
    ctx.lineWidth = 3.5;
    ctx.strokeRect(-80, -30, 160, 60);
    ctx.fillStyle = '#16a34a';
    ctx.font = 'bold 22px sans-serif';
    ctx.fillText('PAID IN FULL', -70, 8);
    ctx.restore();

    const rawDataUrl = canvas.toDataURL('image/jpeg', 0.92);
    // Automatically detect and crop the document border from the sample desk photo!
    try {
      const { croppedDataUrl } = await autoCropDocumentImage(rawDataUrl);
      await addScannedPageFromDataUrl(croppedDataUrl);
    } catch {
      await addScannedPageFromDataUrl(rawDataUrl);
    }
  };

  const activePage = pages[activePageIndex];
  const activeAdj = activePage ? pageAdjustments[activePage.id] || { brightness: 0, contrast: 0 } : { brightness: 0, contrast: 0 };

  return (
    <div id="scan-document-view" className="w-full max-w-4xl mx-auto space-y-4 sm:space-y-6 px-2 sm:px-0 animate-in fade-in duration-200">
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
      <div className="text-center space-y-2 px-2">
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#34c759]/10 text-[#34c759] dark:text-[#30d158] text-[11px] sm:text-[12px] font-semibold border border-[#34c759]/20">
          <Sparkles className="w-3.5 h-3.5 shrink-0" />
          <span>CamScanner Document Engine • Auto-Border Detection</span>
        </div>
        <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-[#1d1d1f] dark:text-[#f5f5f7]">
          Scan Documents & Receipts
        </h2>
        <p className="text-[13px] sm:text-[15px] text-[#6e6e73] dark:text-[#8e8e93] max-w-xl mx-auto leading-relaxed">
          Point camera at receipts, notes, forms, or paperwork. Page borders are automatically detected and fitted in real-time, text contrast is enhanced, and shareable PDFs are exported instantly without installing an app.
        </p>
      </div>

      {/* Main Workspace Card */}
      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        className={`bg-white dark:bg-[#1c1c1e] rounded-[20px] sm:rounded-[24px] border ${
          isDragOver
            ? 'border-[#34c759] ring-2 ring-[#34c759]/30'
            : 'border-black/[0.08] dark:border-white/[0.08]'
        } shadow-[0_4px_24px_rgba(0,0,0,0.04)] p-3.5 sm:p-6 md:p-8 space-y-4 sm:space-y-6 transition-all`}
      >
        {/* Camera Live Viewfinder / Capture Section with Corner Points & Document Border Line */}
        {isCameraActive ? (
          <div
            ref={cameraContainerRef}
            className={`${
              isCameraFullscreen
                ? 'fixed inset-0 z-50 bg-black flex flex-col justify-between p-2 sm:p-4'
                : 'relative rounded-[18px] sm:rounded-[24px] overflow-hidden bg-black h-[74vh] min-h-[460px] max-h-[720px] sm:h-[520px] sm:max-h-[640px] flex items-center justify-center shadow-2xl border border-white/10'
            } select-none transition-all touch-none`}
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

            {/* Real-time Document Detected Status Indicator */}
            {isAutoBorderActive && isDocumentDetected && (
              <div className="absolute top-14 sm:top-16 inset-x-0 flex justify-center pointer-events-none z-30 animate-in fade-in zoom-in-95 duration-150 px-2">
                <div className="px-3 py-1 rounded-full bg-[#34c759]/90 text-white backdrop-blur-md text-[10px] sm:text-[11px] font-bold shadow-[0_0_16px_rgba(52,199,89,0.6)] flex items-center gap-1.5 border border-white/20">
                  <span className="w-2 h-2 rounded-full bg-white animate-ping shrink-0" />
                  <span>Page Detected • Borders Auto-Set</span>
                </div>
              </div>
            )}

            {/* Illuminated Document Border Line with 4 Corner Points */}
            <div
              className={`absolute border-2 transition-[left,top,width,height] duration-75 select-none z-20 ${
                isDocumentDetected
                  ? 'border-[#34c759] shadow-[0_0_24px_rgba(52,199,89,0.7)]'
                  : 'border-[#34c759]/80 shadow-[0_0_15px_rgba(52,199,89,0.35)]'
              }`}
              style={{
                left: `${cropBox.x}%`,
                top: `${cropBox.y}%`,
                width: `${cropBox.w}%`,
                height: `${cropBox.h}%`,
              }}
            >
              {/* L-shaped Bold Corner Brackets with dynamic glow when locked */}
              <div className={`absolute -top-1 -left-1 w-6 h-6 border-t-4 border-l-4 border-[#34c759] rounded-tl pointer-events-none shadow-sm ${isDocumentDetected ? 'drop-shadow-[0_0_8px_#34c759]' : ''}`} />
              <div className={`absolute -top-1 -right-1 w-6 h-6 border-t-4 border-r-4 border-[#34c759] rounded-tr pointer-events-none shadow-sm ${isDocumentDetected ? 'drop-shadow-[0_0_8px_#34c759]' : ''}`} />
              <div className={`absolute -bottom-1 -left-1 w-6 h-6 border-b-4 border-l-4 border-[#34c759] rounded-bl pointer-events-none shadow-sm ${isDocumentDetected ? 'drop-shadow-[0_0_8px_#34c759]' : ''}`} />
              <div className={`absolute -bottom-1 -right-1 w-6 h-6 border-b-4 border-r-4 border-[#34c759] rounded-br pointer-events-none shadow-sm ${isDocumentDetected ? 'drop-shadow-[0_0_8px_#34c759]' : ''}`} />

              {/* 1. Top-Left Corner Point Handle (48px Touch Hit Target) */}
              <div
                onPointerDown={(e) => handleStartCropDrag('tl', e)}
                className="absolute -top-6 -left-6 w-12 h-12 flex items-center justify-center cursor-nwse-resize touch-none z-30 group"
                title="Drag Corner Point"
              >
                <div className="w-5 h-5 rounded-full bg-[#34c759] border-2 border-white shadow-[0_2px_10px_rgba(0,0,0,0.6)] group-active:scale-125 transition-transform flex items-center justify-center pointer-events-none">
                  <div className="w-1.5 h-1.5 rounded-full bg-white" />
                </div>
              </div>

              {/* 2. Top-Right Corner Point Handle (48px Touch Hit Target) */}
              <div
                onPointerDown={(e) => handleStartCropDrag('tr', e)}
                className="absolute -top-6 -right-6 w-12 h-12 flex items-center justify-center cursor-nesw-resize touch-none z-30 group"
                title="Drag Corner Point"
              >
                <div className="w-5 h-5 rounded-full bg-[#34c759] border-2 border-white shadow-[0_2px_10px_rgba(0,0,0,0.6)] group-active:scale-125 transition-transform flex items-center justify-center pointer-events-none">
                  <div className="w-1.5 h-1.5 rounded-full bg-white" />
                </div>
              </div>

              {/* 3. Bottom-Left Corner Point Handle (48px Touch Hit Target) */}
              <div
                onPointerDown={(e) => handleStartCropDrag('bl', e)}
                className="absolute -bottom-6 -left-6 w-12 h-12 flex items-center justify-center cursor-nesw-resize touch-none z-30 group"
                title="Drag Corner Point"
              >
                <div className="w-5 h-5 rounded-full bg-[#34c759] border-2 border-white shadow-[0_2px_10px_rgba(0,0,0,0.6)] group-active:scale-125 transition-transform flex items-center justify-center pointer-events-none">
                  <div className="w-1.5 h-1.5 rounded-full bg-white" />
                </div>
              </div>

              {/* 4. Bottom-Right Corner Point Handle (48px Touch Hit Target) */}
              <div
                onPointerDown={(e) => handleStartCropDrag('br', e)}
                className="absolute -bottom-6 -right-6 w-12 h-12 flex items-center justify-center cursor-nwse-resize touch-none z-30 group"
                title="Drag Corner Point"
              >
                <div className="w-5 h-5 rounded-full bg-[#34c759] border-2 border-white shadow-[0_2px_10px_rgba(0,0,0,0.6)] group-active:scale-125 transition-transform flex items-center justify-center pointer-events-none">
                  <div className="w-1.5 h-1.5 rounded-full bg-white" />
                </div>
              </div>

              {/* Center Move Handle & Indicator */}
              <div
                onPointerDown={(e) => handleStartCropDrag('center', e)}
                className="absolute inset-0 flex items-center justify-center cursor-move touch-none"
              >
                <div className="px-3 py-1 rounded-full bg-black/60 backdrop-blur-md border border-white/20 text-[10px] sm:text-[11px] font-semibold text-white/90 shadow-md flex items-center gap-1.5 pointer-events-none">
                  {isAutoBorderActive ? (
                    <>
                      <Sparkles className="w-3 h-3 text-[#34c759]" />
                      <span>{isDocumentDetected ? 'Page Detected (Auto-Fitted)' : 'Auto-Framing Document...'}</span>
                    </>
                  ) : (
                    <>
                      <Move className="w-3 h-3 text-[#34c759]" />
                      <span>Document Border (Manual)</span>
                    </>
                  )}
                </div>
              </div>
            </div>

            {/* Top Toolbar overlay inside camera */}
            <div className="absolute top-2.5 inset-x-2.5 sm:top-4 sm:inset-x-4 flex items-center justify-between z-30 gap-1.5">
              {/* Document Type Preset Buttons & Auto-Border Toggle */}
              <div className="flex items-center gap-1 p-1 rounded-full bg-black/60 backdrop-blur-md border border-white/10 overflow-x-auto scrollbar-none max-w-[64%] sm:max-w-none flex-nowrap shrink">
                <button
                  type="button"
                  onClick={() => setIsAutoBorderActive((prev) => !prev)}
                  className={`px-2.5 py-1 rounded-full text-[11px] font-semibold transition-all cursor-pointer whitespace-nowrap flex items-center gap-1 shrink-0 ${
                    isAutoBorderActive
                      ? 'bg-[#34c759] text-white shadow-xs'
                      : 'text-white/70 hover:text-white hover:bg-white/10'
                  }`}
                  title={isAutoBorderActive ? 'Auto-Border is Active' : 'Enable Automatic Border Detection'}
                >
                  <Sparkles className="w-3 h-3" />
                  <span>{isAutoBorderActive ? '⚡ Auto' : 'Manual'}</span>
                </button>
                <button
                  type="button"
                  onClick={() => applyCropPreset('a4')}
                  className={`px-2 py-1 rounded-full text-[11px] font-medium transition-all cursor-pointer whitespace-nowrap shrink-0 ${
                    cropPreset === 'a4' && !isAutoBorderActive
                      ? 'bg-[#34c759] text-white shadow-xs'
                      : 'text-white/70 hover:text-white hover:bg-white/10'
                  }`}
                >
                  📄 A4
                </button>
                <button
                  type="button"
                  onClick={() => applyCropPreset('receipt')}
                  className={`px-2 py-1 rounded-full text-[11px] font-medium transition-all cursor-pointer whitespace-nowrap shrink-0 ${
                    cropPreset === 'receipt' && !isAutoBorderActive
                      ? 'bg-[#34c759] text-white shadow-xs'
                      : 'text-white/70 hover:text-white hover:bg-white/10'
                  }`}
                >
                  🧾 Receipt
                </button>
                <button
                  type="button"
                  onClick={() => applyCropPreset('idcard')}
                  className={`px-2 py-1 rounded-full text-[11px] font-medium transition-all cursor-pointer whitespace-nowrap shrink-0 ${
                    cropPreset === 'idcard' && !isAutoBorderActive
                      ? 'bg-[#34c759] text-white shadow-xs'
                      : 'text-white/70 hover:text-white hover:bg-white/10'
                  }`}
                >
                  🪪 ID
                </button>
                <button
                  type="button"
                  onClick={() => applyCropPreset('full')}
                  className={`px-2 py-1 rounded-full text-[11px] font-medium transition-all cursor-pointer whitespace-nowrap shrink-0 ${
                    cropPreset === 'full' && !isAutoBorderActive
                      ? 'bg-[#34c759] text-white shadow-xs'
                      : 'text-white/70 hover:text-white hover:bg-white/10'
                  }`}
                >
                  ⛶ Full
                </button>
              </div>

              {/* Utility Buttons: Torch, Flip, Fullscreen, Close */}
              <div className="flex items-center gap-1 shrink-0">
                {hasTorch && (
                  <button
                    type="button"
                    onClick={toggleTorch}
                    className={`p-2 sm:p-2.5 rounded-full backdrop-blur-md transition-colors cursor-pointer border border-white/10 ${
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
                  className="p-2 sm:p-2.5 rounded-full bg-black/60 hover:bg-black/80 text-white backdrop-blur-md transition-colors cursor-pointer border border-white/10"
                  title="Switch Front/Rear Camera"
                >
                  <RotateCw className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  onClick={() => setIsCameraFullscreen((prev) => !prev)}
                  className="p-2 sm:p-2.5 rounded-full bg-black/60 hover:bg-black/80 text-white backdrop-blur-md transition-colors cursor-pointer border border-white/10 hidden sm:flex"
                  title={isCameraFullscreen ? 'Exit Fullscreen' : 'Fullscreen Camera'}
                >
                  {isCameraFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
                </button>
                <button
                  type="button"
                  onClick={stopCamera}
                  className="p-2 sm:p-2.5 rounded-full bg-black/60 hover:bg-black/80 text-white backdrop-blur-md transition-colors cursor-pointer border border-white/10"
                  title="Close Camera"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Bottom Shutter Controls */}
            <div className="absolute bottom-3 sm:bottom-6 inset-x-0 flex items-center justify-between sm:justify-center gap-4 sm:gap-10 z-30 px-4 sm:px-8">
              {pages.length > 0 ? (
                <button
                  type="button"
                  onClick={stopCamera}
                  className="px-3 py-1.5 sm:px-4 sm:py-2 rounded-full bg-black/70 hover:bg-black/90 text-white text-[12px] sm:text-[13px] font-semibold backdrop-blur-md transition-colors cursor-pointer border border-white/15 shrink-0"
                >
                  Done ({pages.length})
                </button>
              ) : (
                <div className="w-14 sm:w-16" />
              )}

              {/* Shutter Button with tactile feedback */}
              <button
                type="button"
                id="camera-snap-btn"
                onClick={capturePhoto}
                disabled={isProcessing}
                className="w-16 h-16 sm:w-20 sm:h-20 rounded-full bg-white border-4 border-[#34c759] shadow-[0_0_24px_rgba(52,199,89,0.5)] flex items-center justify-center active:scale-90 transition-transform cursor-pointer hover:scale-105 shrink-0"
                title="Capture Document Inside Border"
              >
                <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-full bg-[#34c759] hover:bg-[#2fb350] transition-colors flex items-center justify-center shadow-inner">
                  <Camera className="w-6 h-6 text-white" />
                </div>
              </button>

              {pages.length > 0 ? (
                <div className="w-14 sm:w-16 flex justify-end sm:justify-center shrink-0">
                  <span className="px-2.5 py-1 rounded-full bg-[#34c759] text-white text-[12px] font-bold shadow-md">
                    +{pages.length}
                  </span>
                </div>
              ) : (
                <div className="w-14 sm:w-16" />
              )}
            </div>

            {/* Quick Switch to Auto Border if currently manual */}
            {!isAutoBorderActive && (
              <button
                type="button"
                onClick={() => setIsAutoBorderActive(true)}
                className="absolute bottom-24 sm:bottom-28 inset-x-0 mx-auto w-fit px-3 py-1.5 sm:px-3.5 sm:py-1.5 rounded-full bg-[#34c759] hover:bg-[#2fb350] text-white text-[11px] sm:text-[12px] font-bold shadow-lg transition-transform active:scale-95 cursor-pointer z-30 flex items-center gap-1.5"
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span>Re-enable Auto-Border</span>
              </button>
            )}

            {/* Mobile Touch Guidance Tip */}
            <div className="absolute bottom-20 sm:bottom-24 inset-x-2 text-center pointer-events-none z-20">
              <span className="inline-block px-3 py-1 rounded-full bg-black/70 text-white/90 text-[10px] sm:text-[11px] font-medium backdrop-blur-xs border border-white/10 shadow-xs max-w-[90%] truncate">
                {isAutoBorderActive
                  ? isDocumentDetected
                    ? '✓ Document borders automatically fitted to page'
                    : 'Point camera at paper or receipt — border fits automatically'
                  : 'Manual mode — drag green corner points or click Re-enable Auto-Border'}
              </span>
            </div>
          </div>
        ) : (
          /* Capture / Upload Options */
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
            {/* Option 1: Live Camera Scanner */}
            <button
              type="button"
              id="start-camera-scan-btn"
              onClick={() => startCamera('environment')}
              className="p-4 sm:p-6 rounded-[18px] sm:rounded-[20px] border-2 border-dashed border-black/10 dark:border-white/10 hover:border-[#34c759] bg-[#fafafc] dark:bg-[#252528] hover:bg-[#34c759]/5 dark:hover:bg-[#34c759]/10 flex sm:flex-col items-center sm:justify-center text-left sm:text-center gap-3.5 sm:gap-3 transition-all group cursor-pointer"
            >
              <div className="w-12 h-12 shrink-0 rounded-2xl bg-white dark:bg-[#2c2c2e] border border-black/10 dark:border-white/10 shadow-xs flex items-center justify-center text-[#34c759] group-hover:scale-105 transition-transform">
                <Camera className="w-6 h-6" />
              </div>
              <div className="flex-1 min-w-0">
                <h4 className="text-[14px] sm:text-[15px] font-semibold text-[#1d1d1f] dark:text-[#f5f5f7]">Live Camera Scanner</h4>
                <p className="text-[12px] text-[#86868b] dark:text-[#8e8e93] mt-0.5">
                  Auto-detects page boundaries & aligns document
                </p>
              </div>
            </button>

            {/* Option 2: Phone Native Camera (Mobile Optimized) */}
            <button
              type="button"
              id="mobile-camera-btn"
              onClick={() => mobileInputRef.current?.click()}
              className="relative p-4 sm:p-6 rounded-[18px] sm:rounded-[20px] border-2 border-dashed border-black/10 dark:border-white/10 hover:border-[#ff9500] bg-[#fafafc] dark:bg-[#252528] hover:bg-[#ff9500]/5 dark:hover:bg-[#ff9500]/10 flex sm:flex-col items-center sm:justify-center text-left sm:text-center gap-3.5 sm:gap-3 transition-all group cursor-pointer"
            >
              <span className="absolute top-2.5 right-2.5 px-2 py-0.5 rounded-full bg-[#ff9500]/10 text-[#ff9500] text-[10px] font-bold border border-[#ff9500]/20">
                Instant Snap
              </span>
              <div className="w-12 h-12 shrink-0 rounded-2xl bg-white dark:bg-[#2c2c2e] border border-black/10 dark:border-white/10 shadow-xs flex items-center justify-center text-[#ff9500] group-hover:scale-105 transition-transform">
                <Smartphone className="w-6 h-6" />
              </div>
              <div className="flex-1 min-w-0">
                <h4 className="text-[14px] sm:text-[15px] font-semibold text-[#1d1d1f] dark:text-[#f5f5f7]">Phone Camera Snap</h4>
                <p className="text-[12px] text-[#86868b] dark:text-[#8e8e93] mt-0.5">
                  Auto-crops paper & receipts from photo
                </p>
              </div>
            </button>

            {/* Option 3: Upload Document Photos */}
            <button
              type="button"
              id="upload-photos-btn"
              onClick={() => fileInputRef.current?.click()}
              className="p-4 sm:p-6 rounded-[18px] sm:rounded-[20px] border-2 border-dashed border-black/10 dark:border-white/10 hover:border-[#0071e3] bg-[#fafafc] dark:bg-[#252528] hover:bg-[#0071e3]/5 dark:hover:bg-[#0071e3]/10 flex sm:flex-col items-center sm:justify-center text-left sm:text-center gap-3.5 sm:gap-3 transition-all group cursor-pointer"
            >
              <div className="w-12 h-12 shrink-0 rounded-2xl bg-white dark:bg-[#2c2c2e] border border-black/10 dark:border-white/10 shadow-xs flex items-center justify-center text-[#0071e3] group-hover:scale-105 transition-transform">
                <Upload className="w-6 h-6" />
              </div>
              <div className="flex-1 min-w-0">
                <h4 className="text-[14px] sm:text-[15px] font-semibold text-[#1d1d1f] dark:text-[#f5f5f7]">Upload Photos</h4>
                <p className="text-[12px] text-[#86868b] dark:text-[#8e8e93] mt-0.5">
                  Auto-detects borders from JPG, PNG, or photo scans
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
              <span>Load Sample Invoice Document to Test Auto-Detection</span>
            </button>
          </div>
        )}

        {/* Scanned Pages Workspace */}
        {pages.length > 0 && (
          <div className="space-y-4 sm:space-y-6 pt-2">
            {/* Top Toolbar: Active Page Actions */}
            <div className="space-y-2.5 p-3 sm:p-3.5 rounded-2xl bg-[#f5f5f7] dark:bg-[#252528] border border-black/[0.04] dark:border-white/[0.06]">
              {/* Row 1: Page Counter & Action Tools */}
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-1.5 min-w-0">
                  <span className="text-[13px] font-bold text-[#1d1d1f] dark:text-[#f5f5f7] truncate">
                    Page {activePageIndex + 1} of {pages.length}
                  </span>
                  <span className="text-[11px] text-[#86868b] dark:text-[#8e8e93] hidden xs:inline">
                    • {formatBytes(activePage?.blob?.size || 0)}
                  </span>
                </div>

                {/* Action Buttons: Sliders, Crop, Zoom, Rotate, Delete */}
                <div className="flex items-center gap-1 shrink-0">
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
                    onClick={handleOpenCropModal}
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

              {/* Row 2: Filter Presets (Horizontally scrollable with no scrollbar on mobile) */}
              <div className="flex items-center gap-1 bg-white dark:bg-[#1c1c1e] p-1 rounded-xl shadow-2xs border border-black/[0.04] dark:border-white/[0.06] overflow-x-auto scrollbar-none flex-nowrap">
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
                    className={`flex-1 sm:flex-none px-2.5 py-1.5 rounded-lg text-[12px] font-medium transition-all cursor-pointer whitespace-nowrap text-center flex items-center justify-center gap-1 shrink-0 ${
                      activePage?.filter === f.id
                        ? 'bg-[#1d1d1f] dark:bg-white text-white dark:text-[#1d1d1f] shadow-xs'
                        : 'text-[#6e6e73] dark:text-[#8e8e93] hover:text-[#1d1d1f] dark:hover:text-[#f5f5f7]'
                    }`}
                  >
                    <span>{f.icon}</span>
                    <span>{f.label}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Fine-Tuning Sliders Panel */}
            {showAdjustments && (
              <div className="p-3.5 sm:p-4 rounded-2xl bg-[#fafafc] dark:bg-[#252528] border border-black/[0.06] dark:border-white/[0.06] space-y-4 animate-in fade-in slide-in-from-top-2 duration-150">
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
              <div className="relative rounded-[18px] sm:rounded-[20px] overflow-hidden bg-[#e5e5ea] dark:bg-[#2c2c2e] flex items-center justify-center p-2 sm:p-4 min-h-[280px] sm:min-h-[340px] max-h-[60vh] sm:max-h-[520px]">
                <img
                  src={activePage.dataUrl}
                  alt={`Scanned Page ${activePageIndex + 1}`}
                  className="max-h-[52vh] sm:max-h-[480px] w-auto object-contain rounded-lg shadow-md bg-white transition-all"
                />

                {/* Page Navigation Overlay Buttons (44px Touch Targets) */}
                {pages.length > 1 && (
                  <>
                    <button
                      type="button"
                      disabled={activePageIndex === 0}
                      onClick={() => setActivePageIndex((prev) => Math.max(0, prev - 1))}
                      className="absolute left-2 sm:left-3 w-10 h-10 sm:w-11 sm:h-11 rounded-full bg-black/60 hover:bg-black/80 disabled:opacity-20 text-white backdrop-blur-xs transition-all cursor-pointer disabled:cursor-not-allowed flex items-center justify-center shadow-md active:scale-95"
                      title="Previous Page"
                    >
                      <ArrowLeft className="w-5 h-5" />
                    </button>
                    <button
                      type="button"
                      disabled={activePageIndex === pages.length - 1}
                      onClick={() => setActivePageIndex((prev) => Math.min(pages.length - 1, prev + 1))}
                      className="absolute right-2 sm:right-3 w-10 h-10 sm:w-11 sm:h-11 rounded-full bg-black/60 hover:bg-black/80 disabled:opacity-20 text-white backdrop-blur-xs transition-all cursor-pointer disabled:cursor-not-allowed flex items-center justify-center shadow-md active:scale-95"
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
                <div className="flex items-center gap-2 sm:gap-3">
                  <button
                    type="button"
                    onClick={() => startCamera('environment')}
                    className="inline-flex items-center gap-1 text-[12px] text-[#34c759] dark:text-[#30d158] font-medium hover:underline cursor-pointer"
                  >
                    <Camera className="w-3.5 h-3.5" />
                    <span>Scan</span>
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

              <div className="flex items-center gap-2.5 sm:gap-3 overflow-x-auto scrollbar-none pb-2 pt-1">
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
                      className="w-14 h-18 sm:w-16 sm:h-20 object-cover bg-white"
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
            <div className="pt-4 sm:pt-5 border-t border-black/[0.06] dark:border-white/[0.08] space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-[13px]">
                {/* PDF Page Format Selector */}
                <div className="flex items-center justify-between sm:justify-start gap-2">
                  <span className="text-[#6e6e73] dark:text-[#8e8e93] text-xs sm:text-[13px]">PDF Format:</span>
                  <div className="flex items-center bg-[#f5f5f7] dark:bg-[#252528] p-1 rounded-xl border border-black/[0.04] dark:border-white/[0.06]">
                    <button
                      type="button"
                      onClick={() => setPdfPageSize('a4')}
                      className={`px-2.5 sm:px-3 py-1 rounded-lg text-xs sm:text-[13px] font-medium cursor-pointer transition-all ${
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
                      className={`px-2.5 sm:px-3 py-1 rounded-lg text-xs sm:text-[13px] font-medium cursor-pointer transition-all ${
                        pdfPageSize === 'fit'
                          ? 'bg-white dark:bg-[#1c1c1e] text-[#1d1d1f] dark:text-[#f5f5f7] shadow-xs'
                          : 'text-[#6e6e73] dark:text-[#8e8e93]'
                      }`}
                    >
                      Fit to Scan
                    </button>
                  </div>
                </div>

                {/* Quick actions row */}
                <div className="flex items-center justify-between sm:justify-end gap-2 overflow-x-auto scrollbar-none py-0.5">
                  <button
                    type="button"
                    onClick={handleSharePdf}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-[#34c759]/30 bg-[#34c759]/10 text-[#34c759] dark:text-[#30d158] font-semibold cursor-pointer shrink-0 text-xs sm:text-[13px]"
                    title="Share PDF via device"
                  >
                    <Share2 className="w-3.5 h-3.5" />
                    <span>Share PDF</span>
                  </button>

                  <button
                    type="button"
                    onClick={handlePrintDocument}
                    className="inline-flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-xl border border-black/10 dark:border-white/10 hover:bg-black/[0.03] dark:hover:bg-white/[0.05] text-[#1d1d1f] dark:text-[#f5f5f7] font-medium cursor-pointer shrink-0 text-xs sm:text-[13px]"
                    title="Print Document"
                  >
                    <Printer className="w-3.5 h-3.5 text-[#86868b]" />
                    <span className="hidden xs:inline">Print</span>
                  </button>

                  <button
                    type="button"
                    onClick={handleExportZip}
                    className="inline-flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-xl border border-black/10 dark:border-white/10 hover:bg-black/[0.03] dark:hover:bg-white/[0.05] text-[#1d1d1f] dark:text-[#f5f5f7] font-medium cursor-pointer shrink-0 text-xs sm:text-[13px]"
                    title="Download individual images as ZIP"
                  >
                    <Archive className="w-3.5 h-3.5 text-[#86868b]" />
                    <span className="hidden xs:inline">ZIP</span>
                  </button>

                  <button
                    type="button"
                    onClick={handleClearAllPages}
                    className="text-[#ff3b30] hover:underline px-2 py-1 cursor-pointer text-xs sm:text-[12px] shrink-0"
                  >
                    Clear All
                  </button>
                </div>
              </div>

              {/* Main Download PDF CTA */}
              <div className="flex flex-col-reverse sm:flex-row items-center justify-between gap-2.5 sm:gap-3 pt-2">
                <button
                  type="button"
                  onClick={onBackToHome}
                  className="w-full sm:w-auto px-5 py-3 rounded-xl border border-black/10 dark:border-white/10 text-[14px] font-medium text-[#1d1d1f] dark:text-[#f5f5f7] hover:bg-black/[0.03] dark:hover:bg-white/[0.05] cursor-pointer text-center"
                >
                  Back to Tools
                </button>

                <button
                  type="button"
                  id="download-scanned-pdf-btn"
                  disabled={isProcessing}
                  onClick={handleExportPdf}
                  className="w-full sm:w-auto px-8 py-3.5 rounded-xl bg-[#34c759] hover:bg-[#2fb350] active:bg-[#27a346] text-white font-semibold text-[15px] shadow-sm flex items-center justify-center gap-2 transition-all cursor-pointer active:scale-98"
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
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-end sm:items-center justify-center p-0 sm:p-6 animate-in fade-in duration-200">
          <div className="relative w-full max-w-2xl bg-[#1c1c1e] text-white rounded-t-[24px] sm:rounded-3xl overflow-hidden shadow-2xl flex flex-col border border-white/10 max-h-[96dvh] sm:max-h-[92vh] h-[92dvh] sm:h-auto">
            {/* Modal Header */}
            <div className="flex items-center justify-between px-4 sm:px-5 py-3 sm:py-4 border-b border-white/10 shrink-0">
              <div className="flex items-center gap-2">
                <Crop className="w-5 h-5 text-[#34c759]" />
                <h3 className="text-sm sm:text-base font-bold">Crop & Trim Document Borders</h3>
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
            <div className="relative p-2 sm:p-4 flex-1 flex items-center justify-center overflow-hidden bg-black/90 min-h-[260px]">
              <div
                ref={modalCropContainerRef}
                className="relative inline-block max-w-full max-h-full select-none touch-none"
              >
                {/* Image element */}
                <img
                  src={activePage.originalDataUrl}
                  alt="Original Document"
                  className="max-h-[50vh] sm:max-h-[55vh] max-w-full object-contain pointer-events-none rounded-lg"
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

                  {/* Corner handles (48px Touch Hit Targets) */}
                  <div
                    onPointerDown={(e) => handleStartModalCropDrag('tl', e)}
                    className="absolute -top-6 -left-6 w-12 h-12 flex items-center justify-center cursor-nwse-resize touch-none z-30 group"
                  >
                    <div className="w-5 h-5 rounded-full bg-[#34c759] border-2 border-white shadow-md flex items-center justify-center group-active:scale-125 transition-transform pointer-events-none">
                      <div className="w-1.5 h-1.5 rounded-full bg-white" />
                    </div>
                  </div>

                  <div
                    onPointerDown={(e) => handleStartModalCropDrag('tr', e)}
                    className="absolute -top-6 -right-6 w-12 h-12 flex items-center justify-center cursor-nesw-resize touch-none z-30 group"
                  >
                    <div className="w-5 h-5 rounded-full bg-[#34c759] border-2 border-white shadow-md flex items-center justify-center group-active:scale-125 transition-transform pointer-events-none">
                      <div className="w-1.5 h-1.5 rounded-full bg-white" />
                    </div>
                  </div>

                  <div
                    onPointerDown={(e) => handleStartModalCropDrag('bl', e)}
                    className="absolute -bottom-6 -left-6 w-12 h-12 flex items-center justify-center cursor-nesw-resize touch-none z-30 group"
                  >
                    <div className="w-5 h-5 rounded-full bg-[#34c759] border-2 border-white shadow-md flex items-center justify-center group-active:scale-125 transition-transform pointer-events-none">
                      <div className="w-1.5 h-1.5 rounded-full bg-white" />
                    </div>
                  </div>

                  <div
                    onPointerDown={(e) => handleStartModalCropDrag('br', e)}
                    className="absolute -bottom-6 -right-6 w-12 h-12 flex items-center justify-center cursor-nwse-resize touch-none z-30 group"
                  >
                    <div className="w-5 h-5 rounded-full bg-[#34c759] border-2 border-white shadow-md flex items-center justify-center group-active:scale-125 transition-transform pointer-events-none">
                      <div className="w-1.5 h-1.5 rounded-full bg-white" />
                    </div>
                  </div>

                  {/* Center drag handle */}
                  <div
                    onPointerDown={(e) => handleStartModalCropDrag('center', e)}
                    className="absolute inset-0 flex items-center justify-center cursor-move touch-none"
                  >
                    <div className="px-2.5 py-0.5 rounded-full bg-black/70 backdrop-blur-xs border border-white/20 text-[10px] font-semibold text-white/90 shadow-md flex items-center gap-1 pointer-events-none">
                      <Move className="w-3 h-3 text-[#34c759]" />
                      <span>Drag to reposition</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Modal Footer Controls */}
            <div className="flex flex-wrap items-center justify-between gap-2.5 px-4 sm:px-5 py-3 sm:py-4 border-t border-white/10 bg-[#252528] shrink-0">
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleAutoDetectModalCrop}
                  className="px-3 py-1.5 sm:px-3.5 sm:py-2 rounded-xl bg-[#34c759]/20 hover:bg-[#34c759]/30 text-[#34c759] dark:text-[#30d158] border border-[#34c759]/40 text-xs sm:text-[13px] font-semibold transition-colors cursor-pointer flex items-center gap-1.5"
                  title="Automatically detect and fit borders to document page"
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>Auto-Detect</span>
                </button>
                <button
                  type="button"
                  onClick={() => setModalCropBox({ x: 5, y: 5, w: 90, h: 90 })}
                  className="px-3 py-1.5 sm:px-3.5 sm:py-2 rounded-xl bg-white/10 hover:bg-white/15 text-white text-xs sm:text-[13px] font-medium transition-colors cursor-pointer"
                >
                  Reset
                </button>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setIsCropModalOpen(false)}
                  className="px-3.5 py-1.5 sm:px-4 sm:py-2 rounded-xl text-white/70 hover:text-white text-xs sm:text-[13px] font-medium transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleApplyPageCrop}
                  disabled={isModalCropping}
                  className="px-4 py-1.5 sm:px-5 sm:py-2 rounded-xl bg-[#34c759] hover:bg-[#2fb350] text-white text-xs sm:text-[13px] font-semibold shadow-md transition-all cursor-pointer flex items-center gap-1.5 disabled:opacity-50"
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
