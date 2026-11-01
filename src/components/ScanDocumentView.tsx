import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  Camera,
  Upload,
  RotateCw,
  Trash2,
  Download,
  Sparkles,
  RefreshCw,
  X,
  Plus,
  ArrowLeft,
  ArrowRight,
  Share2,
  Crop,
  Zap,
  ZapOff,
  Maximize2,
  Undo2,
  AlertCircle,
} from 'lucide-react';
import { ScannedPage, ScanFilterMode } from '../types';
import {
  processDocumentFilter,
  createPdfFromScannedPages,
} from '../utils/scannerEngine';
import {
  detectDocumentBounds,
  detectDocumentInImage,
  warpPerspectiveImage,
  Quad,
  Point2D,
} from '../utils/documentDetector';
import { formatBytes } from '../utils/formatters';
import { trackEvent } from '../utils/analytics';

interface ScanDocumentViewProps {
  onBackToHome: () => void;
}

const DEFAULT_SCREEN_QUAD: Quad = {
  tl: { x: 12, y: 15 },
  tr: { x: 88, y: 15 },
  br: { x: 88, y: 85 },
  bl: { x: 12, y: 85 },
};

/**
 * Maps normalized quad coordinates from raw video frame percentage [0, 100]
 * to container screen percentage [0, 100] accounting for CSS object-fit: cover.
 */
function mapVideoQuadToScreen(
  videoQuad: Quad,
  videoW: number,
  videoH: number,
  containerW: number,
  containerH: number
): Quad {
  if (!videoW || !videoH || !containerW || !containerH) return videoQuad;

  const videoAspect = videoW / videoH;
  const containerAspect = containerW / containerH;

  let scale: number;
  let offsetX = 0;
  let offsetY = 0;

  if (containerAspect > videoAspect) {
    // Screen is wider than video: video is scaled to screen width, vertical overflow cropped
    scale = containerW / videoW;
    const renderedH = videoH * scale;
    offsetY = (containerH - renderedH) / 2;
  } else {
    // Screen is taller than video (e.g. mobile portrait): video is scaled to screen height, horizontal overflow cropped
    scale = containerH / videoH;
    const renderedW = videoW * scale;
    offsetX = (containerW - renderedW) / 2;
  }

  const mapPoint = (p: Point2D): Point2D => {
    const videoPixelX = (p.x / 100) * videoW;
    const videoPixelY = (p.y / 100) * videoH;

    const screenPixelX = offsetX + videoPixelX * scale;
    const screenPixelY = offsetY + videoPixelY * scale;

    return {
      x: Math.round((screenPixelX / containerW) * 1000) / 10,
      y: Math.round((screenPixelY / containerH) * 1000) / 10,
    };
  };

  return {
    tl: mapPoint(videoQuad.tl),
    tr: mapPoint(videoQuad.tr),
    br: mapPoint(videoQuad.br),
    bl: mapPoint(videoQuad.bl),
  };
}

/**
 * Maps screen percentage coordinates [0, 100] back to raw video frame percentage [0, 100].
 */
function mapScreenQuadToVideo(
  screenQuad: Quad,
  videoW: number,
  videoH: number,
  containerW: number,
  containerH: number
): Quad {
  if (!videoW || !videoH || !containerW || !containerH) return screenQuad;

  const videoAspect = videoW / videoH;
  const containerAspect = containerW / containerH;

  let scale: number;
  let offsetX = 0;
  let offsetY = 0;

  if (containerAspect > videoAspect) {
    scale = containerW / videoW;
    const renderedH = videoH * scale;
    offsetY = (containerH - renderedH) / 2;
  } else {
    scale = containerH / videoH;
    const renderedW = videoW * scale;
    offsetX = (containerW - renderedW) / 2;
  }

  const mapPoint = (p: Point2D): Point2D => {
    const screenPixelX = (p.x / 100) * containerW;
    const screenPixelY = (p.y / 100) * containerH;

    const videoPixelX = (screenPixelX - offsetX) / scale;
    const videoPixelY = (screenPixelY - offsetY) / scale;

    return {
      x: Math.max(0, Math.min(100, Math.round((videoPixelX / videoW) * 1000) / 10)),
      y: Math.max(0, Math.min(100, Math.round((videoPixelY / videoH) * 1000) / 10)),
    };
  };

  return {
    tl: mapPoint(screenQuad.tl),
    tr: mapPoint(screenQuad.tr),
    br: mapPoint(screenQuad.br),
    bl: mapPoint(screenQuad.bl),
  };
}

export const ScanDocumentView: React.FC<ScanDocumentViewProps> = ({ onBackToHome }) => {
  // Navigation & View Mode
  const [viewMode, setViewMode] = useState<'camera' | 'review'>('camera');
  const [pages, setPages] = useState<ScannedPage[]>([]);
  const [activePageIndex, setActivePageIndex] = useState<number>(0);

  // Camera Stream & Hardware
  const [isCameraActive, setIsCameraActive] = useState<boolean>(false);
  const [cameraFacing, setCameraFacing] = useState<'environment' | 'user'>('environment');
  const [cameraError, setCameraError] = useState<{
    type: 'permission' | 'no-camera' | 'other';
    message: string;
  } | null>(null);
  const [isTorchOn, setIsTorchOn] = useState<boolean>(false);
  const [hasTorch, setHasTorch] = useState<boolean>(false);
  const [isLowLight, setIsLowLight] = useState<boolean>(false);

  // Auto-detection, Overlay & Stabilization
  const [isDocumentLocked, setIsDocumentLocked] = useState<boolean>(false);
  const [statusHint, setStatusHint] = useState<string>('Looking for document…');
  const [autoCaptureEnabled, setAutoCaptureEnabled] = useState<boolean>(true);
  const [autoCaptureProgress, setAutoCaptureProgress] = useState<number>(0);
  const [isFlashing, setIsFlashing] = useState<boolean>(false);
  const [isProcessing, setIsProcessing] = useState<boolean>(false);

  // Review Screen & Perspective Warp State
  const [reviewQuads, setReviewQuads] = useState<Record<string, Quad>>({});
  const [activeReviewQuad, setActiveReviewQuad] = useState<Quad>(DEFAULT_SCREEN_QUAD);
  const [activeHandle, setActiveHandle] = useState<'tl' | 'tr' | 'br' | 'bl' | null>(null);

  // PDF Export Settings
  const [pdfPageSize, setPdfPageSize] = useState<'a4' | 'fit'>('a4');
  const [exportSuccess, setExportSuccess] = useState<{
    pdfBlob?: Blob;
    url?: string;
    filename?: string;
  } | null>(null);

  // DOM & Media Refs
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const overlayCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const cameraContainerRef = useRef<HTMLDivElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const reviewContainerRef = useRef<HTMLDivElement | null>(null);

  // Real-time Detection & Smoothing Buffers
  const quadHistoryRef = useRef<Quad[]>([]);
  const currentRenderQuadRef = useRef<Quad>({ ...DEFAULT_SCREEN_QUAD });
  const lockedStateRef = useRef<boolean>(false);
  const lockedAnimRef = useRef<number>(0); // 0 = grey, 1 = green
  const stableStartRef = useRef<number | null>(null);
  const lastDetectionQuadRef = useRef<Quad | null>(null);
  const rawVideoQuadRef = useRef<Quad | null>(null);
  const isCapturingRef = useRef<boolean>(false);

  // Safely attach stream to video element
  const setVideoRef = useCallback((node: HTMLVideoElement | null) => {
    videoRef.current = node;
    if (node && streamRef.current) {
      node.srcObject = streamRef.current;
      node.play().catch((err) => {
        console.warn('Video playback notice:', err);
      });
    }
  }, []);

  // Stop Camera Stream
  const stopCamera = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    setIsCameraActive(false);
    setIsTorchOn(false);
    setHasTorch(false);
  }, []);

  // Start Camera Stream with rear-facing camera by default
  const startCamera = useCallback(async (targetFacing: 'environment' | 'user' = cameraFacing) => {
    setCameraError(null);
    stopCamera();

    if (typeof navigator === 'undefined' || !navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      setCameraError({
        type: 'other',
        message: 'Camera access requires a secure browser context (HTTPS or localhost). Please upload photos directly.',
      });
      return;
    }

    try {
      let stream: MediaStream;
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: {
            facingMode: { ideal: targetFacing },
            width: { ideal: 1920 },
            height: { ideal: 1080 },
          },
          audio: false,
        });
      } catch {
        stream = await navigator.mediaDevices.getUserMedia({
          video: true,
          audio: false,
        });
      }

      streamRef.current = stream;
      setCameraFacing(targetFacing);
      setIsCameraActive(true);

      // Check device flashlight / torch capability robustly
      const track = stream.getVideoTracks()[0];
      let torchSupported = false;
      try {
        if (track && typeof (track as any).getCapabilities === 'function') {
          const caps = (track as any).getCapabilities();
          torchSupported = Boolean(caps && caps.torch);
        }
      } catch {
        torchSupported = false;
      }
      setHasTorch(torchSupported);
      setIsTorchOn(false);

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play().catch((e) => console.warn('Video auto-play blocked:', e));
      }
    } catch (err: any) {
      console.warn('Camera initialization error:', err);
      if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
        setCameraError({
          type: 'permission',
          message: 'Camera permission was denied in your browser. Please allow camera access in site settings.',
        });
      } else if (err.name === 'NotFoundError' || err.name === 'DevicesNotFoundError') {
        setCameraError({
          type: 'no-camera',
          message: 'No camera hardware was found on this device. You can upload scanned photos from disk.',
        });
      } else {
        setCameraError({
          type: 'other',
          message: err.message || 'Unable to access camera. Please upload photos from your device.',
        });
      }
      setIsCameraActive(false);
    }
  }, [cameraFacing, stopCamera]);

  // Start camera on initial mount
  useEffect(() => {
    startCamera('environment');
    return () => {
      stopCamera();
    };
  }, []);

  // Sync stream to video element when viewMode returns to camera
  useEffect(() => {
    if (viewMode === 'camera' && isCameraActive && videoRef.current && streamRef.current) {
      videoRef.current.srcObject = streamRef.current;
      videoRef.current.play().catch((e) => console.warn('Video resume error:', e));
    }
  }, [viewMode, isCameraActive]);

  // Flip camera between rear and front
  const toggleCameraFacing = () => {
    const nextFacing = cameraFacing === 'environment' ? 'user' : 'environment';
    startCamera(nextFacing);
  };

  // Toggle flashlight / torch
  const toggleTorch = async () => {
    if (streamRef.current) {
      const track = streamRef.current.getVideoTracks()[0];
      if (track) {
        try {
          const nextTorch = !isTorchOn;
          await (track as any).applyConstraints({ advanced: [{ torch: nextTorch }] });
          setIsTorchOn(nextTorch);
        } catch (err) {
          console.warn('Torch toggle not supported on this track:', err);
        }
      }
    }
  };

  // 60fps Smooth Canvas Overlay Rendering Loop accounting for object-fit: cover
  useEffect(() => {
    if (viewMode !== 'camera' || !isCameraActive) return;

    let animId: number;

    const renderOverlay = () => {
      const canvas = overlayCanvasRef.current;
      if (!canvas) {
        animId = requestAnimationFrame(renderOverlay);
        return;
      }

      const rect = canvas.getBoundingClientRect();
      const dpr = window.devicePixelRatio || 1;
      const targetWidth = Math.round(rect.width * dpr);
      const targetHeight = Math.round(rect.height * dpr);

      if (canvas.width !== targetWidth || canvas.height !== targetHeight) {
        canvas.width = targetWidth;
        canvas.height = targetHeight;
      }

      const ctx = canvas.getContext('2d');
      if (!ctx) {
        animId = requestAnimationFrame(renderOverlay);
        return;
      }

      ctx.save();
      ctx.scale(dpr, dpr);
      ctx.clearRect(0, 0, rect.width, rect.height);

      // Compute smoothed target quad from moving average of last ~6 frames
      const history = quadHistoryRef.current;
      let targetQuad: Quad;

      if (lockedStateRef.current && history.length > 0) {
        let tlX = 0, tlY = 0, trX = 0, trY = 0, brX = 0, brY = 0, blX = 0, blY = 0;
        history.forEach((q) => {
          tlX += q.tl.x; tlY += q.tl.y;
          trX += q.tr.x; trY += q.tr.y;
          brX += q.br.x; brY += q.br.y;
          blX += q.bl.x; blY += q.bl.y;
        });
        const count = history.length;
        targetQuad = {
          tl: { x: tlX / count, y: tlY / count },
          tr: { x: trX / count, y: trY / count },
          br: { x: brX / count, y: brY / count },
          bl: { x: blX / count, y: blY / count },
        };
      } else {
        targetQuad = DEFAULT_SCREEN_QUAD;
      }

      // Smooth interpolation (exponential LERP) to eliminate hand tremors
      const current = currentRenderQuadRef.current;
      const lerpFactor = 0.22;
      current.tl.x += (targetQuad.tl.x - current.tl.x) * lerpFactor;
      current.tl.y += (targetQuad.tl.y - current.tl.y) * lerpFactor;
      current.tr.x += (targetQuad.tr.x - current.tr.x) * lerpFactor;
      current.tr.y += (targetQuad.tr.y - current.tr.y) * lerpFactor;
      current.br.x += (targetQuad.br.x - current.br.x) * lerpFactor;
      current.br.y += (targetQuad.br.y - current.br.y) * lerpFactor;
      current.bl.x += (targetQuad.bl.x - current.bl.x) * lerpFactor;
      current.bl.y += (targetQuad.bl.y - current.bl.y) * lerpFactor;

      // Animate locked state transition (0 = grey, 1 = emerald green)
      const targetLockedFactor = lockedStateRef.current ? 1 : 0;
      lockedAnimRef.current += (targetLockedFactor - lockedAnimRef.current) * 0.15;
      const t = Math.max(0, Math.min(1, lockedAnimRef.current));

      // Map percentage coordinates to canvas pixel space
      const toPixel = (p: Point2D) => ({
        x: (p.x / 100) * rect.width,
        y: (p.y / 100) * rect.height,
      });

      const p0 = toPixel(current.tl);
      const p1 = toPixel(current.tr);
      const p2 = toPixel(current.br);
      const p3 = toPixel(current.bl);

      // 1. Draw outer darkened vignette outside the document quad
      ctx.save();
      ctx.beginPath();
      ctx.rect(0, 0, rect.width, rect.height);
      ctx.moveTo(p0.x, p0.y);
      ctx.lineTo(p1.x, p1.y);
      ctx.lineTo(p2.x, p2.y);
      ctx.lineTo(p3.x, p3.y);
      ctx.closePath();
      ctx.fillStyle = `rgba(0, 0, 0, ${0.45 - t * 0.12})`;
      ctx.fill('evenodd');
      ctx.restore();

      // 2. Translucent fill polygon
      ctx.beginPath();
      ctx.moveTo(p0.x, p0.y);
      ctx.lineTo(p1.x, p1.y);
      ctx.lineTo(p2.x, p2.y);
      ctx.lineTo(p3.x, p3.y);
      ctx.closePath();

      // Blend color: grey rgba(156, 163, 175) to emerald green rgba(34, 197, 94)
      const r = Math.round(156 + (34 - 156) * t);
      const g = Math.round(163 + (197 - 163) * t);
      const b = Math.round(175 + (94 - 175) * t);
      const fillAlpha = 0.08 + t * 0.12;

      ctx.fillStyle = `rgba(${r}, ${g}, ${b}, ${fillAlpha})`;
      ctx.fill();

      // 3. Document border stroke
      ctx.lineWidth = 2.5 + t * 0.8;
      ctx.strokeStyle = `rgba(${r}, ${g}, ${b}, ${0.75 + t * 0.25})`;
      if (t > 0.5) {
        ctx.shadowColor = 'rgba(34, 197, 94, 0.6)';
        ctx.shadowBlur = 10 * t;
      }
      ctx.stroke();
      ctx.shadowBlur = 0;

      // 4. Rounded corner dots at all 4 vertices
      const cornerRadius = 7.5 + t * 1.5;
      [p0, p1, p2, p3].forEach((pt) => {
        // Outer dot ring
        ctx.beginPath();
        ctx.arc(pt.x, pt.y, cornerRadius, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(${r}, ${g}, ${b}, 1)`;
        ctx.shadowColor = t > 0.5 ? 'rgba(34, 197, 94, 0.8)' : 'rgba(0, 0, 0, 0.4)';
        ctx.shadowBlur = t > 0.5 ? 8 : 4;
        ctx.fill();

        // White border ring
        ctx.lineWidth = 2;
        ctx.strokeStyle = '#ffffff';
        ctx.stroke();
        ctx.shadowBlur = 0;

        // Inner center core dot
        ctx.beginPath();
        ctx.arc(pt.x, pt.y, 2.5, 0, Math.PI * 2);
        ctx.fillStyle = '#ffffff';
        ctx.fill();
      });

      ctx.restore();
      animId = requestAnimationFrame(renderOverlay);
    };

    animId = requestAnimationFrame(renderOverlay);

    return () => {
      cancelAnimationFrame(animId);
    };
  }, [viewMode, isCameraActive]);

  // Real-time edge detection & stabilization loop (~85ms interval, ~12 FPS)
  useEffect(() => {
    if (viewMode !== 'camera' || !isCameraActive) {
      setIsDocumentLocked(false);
      lockedStateRef.current = false;
      return;
    }

    let intervalId: number;
    let isCancelled = false;

    const runDetection = () => {
      if (isCancelled || isCapturingRef.current) return;
      if (!videoRef.current || videoRef.current.readyState < 2) return;

      try {
        const video = videoRef.current;
        const result = detectDocumentBounds(video);

        // Check ambient luminance (< 38 indicates low light)
        const lum = result.luminance ?? 128;
        setIsLowLight(lum < 38);

        if (result.found && result.confidence >= 0.6) {
          const rawVideoQuad = result.quad;
          rawVideoQuadRef.current = rawVideoQuad;

          // Map detected video frame coordinates to screen container coordinates taking object-fit: cover into account
          const container = cameraContainerRef.current;
          const containerW = container?.clientWidth || window.innerWidth;
          const containerH = container?.clientHeight || window.innerHeight;
          const videoW = video.videoWidth || 1920;
          const videoH = video.videoHeight || 1080;

          const screenQuad = mapVideoQuadToScreen(rawVideoQuad, videoW, videoH, containerW, containerH);

          lockedStateRef.current = true;
          setIsDocumentLocked(true);

          // Add to rolling history buffer of last 6 frames in screen space
          quadHistoryRef.current = [...quadHistoryRef.current.slice(-5), screenQuad];

          const area = result.areaRatio ?? 0.3;
          if (area < 0.20) {
            setStatusHint('Move closer');
            stableStartRef.current = null;
            setAutoCaptureProgress(0);
          } else {
            // Check stability against previous detected screen quad
            const prev = lastDetectionQuadRef.current;
            if (prev) {
              const deltaX = Math.abs(screenQuad.tl.x - prev.tl.x);
              const deltaY = Math.abs(screenQuad.tl.y - prev.tl.y);
              const deltaW = Math.abs(screenQuad.tr.x - prev.tr.x);
              const isSteady = deltaX < 1.4 && deltaY < 1.4 && deltaW < 1.6;

              if (isSteady) {
                if (!stableStartRef.current) {
                  stableStartRef.current = Date.now();
                }
                const elapsed = Date.now() - stableStartRef.current;
                const progress = Math.min(1, elapsed / 1000);
                setAutoCaptureProgress(progress);

                if (autoCaptureEnabled) {
                  setStatusHint('Hold steady…');
                  if (elapsed >= 1000 && !isCapturingRef.current) {
                    // Trigger Auto-Capture!
                    triggerCapture(rawVideoQuad);
                  }
                } else {
                  setStatusHint('Document locked');
                }
              } else {
                stableStartRef.current = null;
                setAutoCaptureProgress(0);
                setStatusHint('Hold steady…');
              }
            } else {
              setStatusHint('Hold steady…');
            }
            lastDetectionQuadRef.current = screenQuad;
          }
        } else {
          lockedStateRef.current = false;
          setIsDocumentLocked(false);
          stableStartRef.current = null;
          setAutoCaptureProgress(0);
          setStatusHint('Looking for document…');
          lastDetectionQuadRef.current = null;
          rawVideoQuadRef.current = null;
          if (quadHistoryRef.current.length > 0) {
            quadHistoryRef.current = quadHistoryRef.current.slice(1);
          }
        }
      } catch (err) {
        console.warn('Live detection error:', err);
      }
    };

    intervalId = window.setInterval(runDetection, 85);

    return () => {
      isCancelled = true;
      clearInterval(intervalId);
    };
  }, [viewMode, isCameraActive, autoCaptureEnabled]);

  // Capture Photo with shutter flash, haptic feedback, perspective rectification
  const triggerCapture = async (explicitVideoQuad?: Quad) => {
    if (isCapturingRef.current || !videoRef.current) return;
    isCapturingRef.current = true;
    setIsProcessing(true);

    // 1. Shutter Flash Animation
    setIsFlashing(true);
    setTimeout(() => setIsFlashing(false), 220);

    // 2. Haptic Feedback guarded by feature check
    if (typeof navigator !== 'undefined' && 'vibrate' in navigator && typeof navigator.vibrate === 'function') {
      try {
        navigator.vibrate([35, 45, 35]);
      } catch {}
    }

    try {
      const video = videoRef.current;
      const vw = video.videoWidth || 1920;
      const vh = video.videoHeight || 1080;

      const container = cameraContainerRef.current;
      const containerW = container?.clientWidth || window.innerWidth;
      const containerH = container?.clientHeight || window.innerHeight;

      // Capture high-res frame from video
      const frameCanvas = document.createElement('canvas');
      frameCanvas.width = vw;
      frameCanvas.height = vh;
      const frameCtx = frameCanvas.getContext('2d');
      if (!frameCtx) throw new Error('Failed to create canvas context');

      frameCtx.drawImage(video, 0, 0, vw, vh);
      const rawFrameDataUrl = frameCanvas.toDataURL('image/jpeg', 0.96);

      // Determine quad in raw video coordinates
      let quadInVideoSpace: Quad;
      if (explicitVideoQuad) {
        quadInVideoSpace = explicitVideoQuad;
      } else if (rawVideoQuadRef.current) {
        quadInVideoSpace = rawVideoQuadRef.current;
      } else {
        // Map current rendered screen quad back to video frame coordinates
        quadInVideoSpace = mapScreenQuadToVideo(
          currentRenderQuadRef.current,
          vw,
          vh,
          containerW,
          containerH
        );
      }

      // Perspective correction / quad crop from full-resolution frame
      const { croppedDataUrl, width, height } = await warpPerspectiveImage(rawFrameDataUrl, quadInVideoSpace);

      // Apply initial Color Boost ("Magic Color" CamScanner enhance)
      const enhanced = await processDocumentFilter(croppedDataUrl, 'auto_enhance', 0);

      const newPageId = `page-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
      const newPage: ScannedPage = {
        id: newPageId,
        dataUrl: enhanced.dataUrl,
        blob: enhanced.blob,
        width,
        height,
        rotation: 0,
        filter: 'auto_enhance',
        originalDataUrl: rawFrameDataUrl,
      };

      setPages((prev) => {
        const next = [...prev, newPage];
        setActivePageIndex(next.length - 1);
        return next;
      });

      // Review screen quad is in percentage of the captured raw frame
      setReviewQuads((prev) => ({
        ...prev,
        [newPageId]: quadInVideoSpace,
      }));
      setActiveReviewQuad(quadInVideoSpace);

      // Navigate to Review Screen
      setViewMode('review');
    } catch (err) {
      console.error('Document capture error:', err);
    } finally {
      setIsProcessing(false);
      isCapturingRef.current = false;
      stableStartRef.current = null;
      setAutoCaptureProgress(0);
    }
  };

  // Switch to review mode for a specific page
  const openReviewForPage = (index: number) => {
    if (index >= 0 && index < pages.length) {
      setActivePageIndex(index);
      const pageId = pages[index].id;
      const quad = reviewQuads[pageId] || DEFAULT_SCREEN_QUAD;
      setActiveReviewQuad(quad);
      setViewMode('review');
    }
  };

  // Re-detect quad boundary for active page on review screen
  const handleAutoDetectReviewCrop = async () => {
    if (pages.length === 0 || activePageIndex >= pages.length) return;
    const currentPage = pages[activePageIndex];
    try {
      const detection = await detectDocumentInImage(currentPage.originalDataUrl);
      if (detection.found && detection.quad) {
        setActiveReviewQuad(detection.quad);
      } else {
        setActiveReviewQuad(DEFAULT_SCREEN_QUAD);
      }
    } catch {
      setActiveReviewQuad(DEFAULT_SCREEN_QUAD);
    }
  };

  // Reset crop to full frame on review screen
  const handleResetReviewCrop = () => {
    setActiveReviewQuad({
      tl: { x: 2, y: 2 },
      tr: { x: 98, y: 2 },
      br: { x: 98, y: 98 },
      bl: { x: 2, y: 98 },
    });
  };

  // Apply new quad crop and perspective correction on review screen
  const handleApplyReviewCrop = async () => {
    if (pages.length === 0 || activePageIndex >= pages.length) return;
    const currentPage = pages[activePageIndex];
    setIsProcessing(true);

    try {
      const { croppedDataUrl, width, height } = await warpPerspectiveImage(
        currentPage.originalDataUrl,
        activeReviewQuad
      );

      const filtered = await processDocumentFilter(
        croppedDataUrl,
        currentPage.filter,
        currentPage.rotation
      );

      setPages((prev) => {
        const updated = [...prev];
        updated[activePageIndex] = {
          ...updated[activePageIndex],
          dataUrl: filtered.dataUrl,
          blob: filtered.blob,
          width,
          height,
        };
        return updated;
      });

      setReviewQuads((prev) => ({
        ...prev,
        [currentPage.id]: activeReviewQuad,
      }));
    } catch (err) {
      console.error('Failed to crop page:', err);
    } finally {
      setIsProcessing(false);
    }
  };

  // Change filter mode for active page (Original, B&W Document, Grayscale, Color Boost)
  const handleChangeFilter = async (filter: ScanFilterMode) => {
    if (pages.length === 0 || activePageIndex >= pages.length) return;
    const currentPage = pages[activePageIndex];
    setIsProcessing(true);

    try {
      const quad = reviewQuads[currentPage.id] || activeReviewQuad;
      const { croppedDataUrl } = await warpPerspectiveImage(currentPage.originalDataUrl, quad);
      const filtered = await processDocumentFilter(
        croppedDataUrl,
        filter,
        currentPage.rotation
      );

      setPages((prev) => {
        const updated = [...prev];
        updated[activePageIndex] = {
          ...updated[activePageIndex],
          filter,
          dataUrl: filtered.dataUrl,
          blob: filtered.blob,
          width: filtered.width,
          height: filtered.height,
        };
        return updated;
      });
      setExportSuccess(null);
    } catch (err) {
      console.error('Filter application error:', err);
    } finally {
      setIsProcessing(false);
    }
  };

  // Rotate active page 90 degrees clockwise
  const handleRotatePage = async () => {
    if (pages.length === 0 || activePageIndex >= pages.length) return;
    const currentPage = pages[activePageIndex];
    const nextRotation = (currentPage.rotation + 90) % 360;
    setIsProcessing(true);

    try {
      const quad = reviewQuads[currentPage.id] || activeReviewQuad;
      const { croppedDataUrl } = await warpPerspectiveImage(currentPage.originalDataUrl, quad);
      const filtered = await processDocumentFilter(
        croppedDataUrl,
        currentPage.filter,
        nextRotation
      );

      setPages((prev) => {
        const updated = [...prev];
        updated[activePageIndex] = {
          ...updated[activePageIndex],
          rotation: nextRotation,
          dataUrl: filtered.dataUrl,
          blob: filtered.blob,
          width: filtered.width,
          height: filtered.height,
        };
        return updated;
      });
      setExportSuccess(null);
    } catch (err) {
      console.error('Rotation error:', err);
    } finally {
      setIsProcessing(false);
    }
  };

  // Retake current page (removes it and opens live camera immediately)
  const handleRetakePage = () => {
    if (pages.length === 0) return;
    const indexToDelete = activePageIndex;
    setPages((prev) => prev.filter((_, i) => i !== indexToDelete));
    setActivePageIndex((prev) => Math.max(0, prev - 1));
    setViewMode('camera');
  };

  // Delete active page
  const handleDeletePage = (index: number) => {
    setPages((prev) => {
      const next = prev.filter((_, i) => i !== index);
      if (next.length === 0) {
        setViewMode('camera');
        setActivePageIndex(0);
      } else {
        const newIndex = Math.min(activePageIndex, next.length - 1);
        setActivePageIndex(newIndex);
        const nextId = next[newIndex]?.id;
        if (nextId && reviewQuads[nextId]) {
          setActiveReviewQuad(reviewQuads[nextId]);
        }
      }
      return next;
    });
    setExportSuccess(null);
  };

  // Reorder page in thumbnail strip
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

  // Upload image from file picker
  const handleImageUpload = (fileList: FileList | File[]) => {
    const files = Array.from(fileList).filter((f) => f.type.startsWith('image/'));
    if (files.length === 0) return;

    files.forEach((file) => {
      const reader = new FileReader();
      reader.onload = async (e) => {
        const rawDataUrl = e.target?.result as string;
        if (rawDataUrl) {
          setIsProcessing(true);
          try {
            const detection = await detectDocumentInImage(rawDataUrl);
            const quad = detection.found && detection.quad ? detection.quad : DEFAULT_SCREEN_QUAD;
            const { croppedDataUrl, width, height } = await warpPerspectiveImage(rawDataUrl, quad);
            const filtered = await processDocumentFilter(croppedDataUrl, 'auto_enhance', 0);

            const newPageId = `page-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
            const newPage: ScannedPage = {
              id: newPageId,
              dataUrl: filtered.dataUrl,
              blob: filtered.blob,
              width,
              height,
              rotation: 0,
              filter: 'auto_enhance',
              originalDataUrl: rawDataUrl,
            };

            setPages((prev) => {
              const updated = [...prev, newPage];
              setActivePageIndex(updated.length - 1);
              return updated;
            });

            setReviewQuads((prev) => ({
              ...prev,
              [newPageId]: quad,
            }));
            setActiveReviewQuad(quad);
            setViewMode('review');
          } catch (err) {
            console.error('File import error:', err);
          } finally {
            setIsProcessing(false);
          }
        }
      };
      reader.readAsDataURL(file);
    });
  };

  // Drag handler for the 4 corner handles on the review screen
  const handleStartReviewDrag = (
    handle: 'tl' | 'tr' | 'br' | 'bl',
    e: React.PointerEvent
  ) => {
    e.preventDefault();
    e.stopPropagation();
    if (!reviewContainerRef.current) return;

    setActiveHandle(handle);
    const targetElem = e.currentTarget as HTMLElement;
    try {
      targetElem.setPointerCapture?.(e.pointerId);
    } catch {}

    const rect = reviewContainerRef.current.getBoundingClientRect();

    const handlePointerMove = (moveEvt: PointerEvent) => {
      moveEvt.preventDefault();
      const currentX = ((moveEvt.clientX - rect.left) / rect.width) * 100;
      const currentY = ((moveEvt.clientY - rect.top) / rect.height) * 100;

      const clampedX = Math.round(Math.max(1, Math.min(99, currentX)) * 10) / 10;
      const clampedY = Math.round(Math.max(1, Math.min(99, currentY)) * 10) / 10;

      setActiveReviewQuad((prev) => ({
        ...prev,
        [handle]: { x: clampedX, y: clampedY },
      }));
    };

    const handlePointerUp = (upEvt: PointerEvent) => {
      try {
        targetElem.releasePointerCapture?.(upEvt.pointerId);
      } catch {}
      setActiveHandle(null);
      window.removeEventListener('pointermove', handlePointerMove);
      window.removeEventListener('pointerup', handlePointerUp);
    };

    window.addEventListener('pointermove', handlePointerMove);
    window.addEventListener('pointerup', handlePointerUp);
  };

  // Export Multi-page PDF (without confetti animation)
  const handleExportPdf = async () => {
    if (pages.length === 0) return;
    trackEvent('Scan Document Export PDF', { pageCount: pages.length, pageSize: pdfPageSize });
    setIsProcessing(true);

    try {
      const pdfBlob = await createPdfFromScannedPages(pages, {
        pageSize: pdfPageSize,
        margin: 'none',
      });
      const url = URL.createObjectURL(pdfBlob);
      const filename = `Scanned_Document_${new Date().toISOString().slice(0, 10)}.pdf`;
      setExportSuccess({ pdfBlob, url, filename });

      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    } catch (err) {
      console.error('PDF generation error:', err);
      alert('Failed to generate PDF document.');
    } finally {
      setIsProcessing(false);
    }
  };

  // Native Web Share API
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
          text: 'Scanned with ZipStream Scanner',
          files: [file],
        });
      } else {
        alert('File sharing is not supported by your browser. You can download the PDF directly.');
      }
    } catch (err: any) {
      if (err.name !== 'AbortError') {
        console.warn('Share notice:', err);
      }
    }
  };

  const activePage = pages[activePageIndex];

  return (
    <div className="fixed inset-0 z-50 bg-[#09090b] text-white flex flex-col select-none overflow-hidden font-sans">
      {/* Hidden file input for gallery upload */}
      <input
        type="file"
        ref={fileInputRef}
        accept="image/jpeg,image/png,image/webp,image/heic,image/*"
        multiple
        className="hidden"
        onChange={(e) => {
          if (e.target.files) handleImageUpload(e.target.files);
          e.target.value = '';
        }}
      />

      {/* VIEW MODE 1: FULL-SCREEN CAMERA SCANNER */}
      {viewMode === 'camera' && (
        <div
          ref={cameraContainerRef}
          className="relative flex-1 w-full h-full flex flex-col justify-between overflow-hidden bg-black"
        >
          {/* Live Edge-to-Edge Video Feed */}
          <video
            ref={setVideoRef}
            autoPlay
            playsInline
            muted
            className="absolute inset-0 w-full h-full object-cover"
          />

          {/* 60fps Smooth Canvas Overlay Layer */}
          <canvas
            ref={overlayCanvasRef}
            className="absolute inset-0 w-full h-full pointer-events-none z-20"
          />

          {/* Visual Shutter Flash Overlay */}
          {isFlashing && (
            <div className="absolute inset-0 bg-white z-50 pointer-events-none transition-opacity duration-200" />
          )}

          {/* TOP SAFE-AREA BAR: Close, Status Hint, Auto Toggle, Flip */}
          <div className="relative z-30 pt-[max(0.75rem,env(safe-area-inset-top))] px-4 flex items-center justify-between gap-2">
            {/* Close / Back Button */}
            <button
              type="button"
              onClick={onBackToHome}
              className="min-w-[44px] min-h-[44px] w-11 h-11 rounded-full bg-black/60 hover:bg-black/80 backdrop-blur-md border border-white/15 flex items-center justify-center text-white active:scale-95 transition-all cursor-pointer shadow-md"
              title="Close Scanner"
            >
              <X className="w-5 h-5" />
            </button>

            {/* Live Status Hint Pill */}
            <div className="flex-1 max-w-xs mx-auto flex justify-center pointer-events-none">
              <div
                className={`px-3.5 py-1.5 rounded-full backdrop-blur-md border text-xs font-semibold flex items-center gap-2 shadow-lg transition-all duration-300 ${
                  isDocumentLocked
                    ? 'bg-[#22c55e]/90 text-white border-[#22c55e]/30 shadow-[0_0_16px_rgba(34,197,94,0.4)]'
                    : 'bg-black/60 text-white/90 border-white/15'
                }`}
              >
                <span
                  className={`w-2 h-2 rounded-full shrink-0 ${
                    isDocumentLocked ? 'bg-white animate-pulse' : 'bg-[#9ca3af]'
                  }`}
                />
                <span className="truncate">{statusHint}</span>
              </div>
            </div>

            {/* Auto Toggle & Camera Flip */}
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setAutoCaptureEnabled((prev) => !prev)}
                className={`min-w-[44px] min-h-[44px] px-3 h-11 rounded-full backdrop-blur-md border text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer shadow-md ${
                  autoCaptureEnabled
                    ? 'bg-[#22c55e] text-white border-[#22c55e]/40 shadow-[0_0_12px_rgba(34,197,94,0.35)]'
                    : 'bg-black/60 hover:bg-black/80 text-white/70 border-white/15'
                }`}
                title={autoCaptureEnabled ? 'Auto-capture is active' : 'Auto-capture is disabled'}
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span className="hidden xs:inline">Auto</span>
              </button>

              <button
                type="button"
                onClick={toggleCameraFacing}
                className="min-w-[44px] min-h-[44px] w-11 h-11 rounded-full bg-black/60 hover:bg-black/80 backdrop-blur-md border border-white/15 flex items-center justify-center text-white active:scale-95 transition-all cursor-pointer shadow-md"
                title="Flip Camera"
              >
                <RotateCw className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* LOW-LIGHT NOTIFICATION BANNER */}
          {isLowLight && (
            <div className="relative z-30 mx-4 mt-2 flex justify-center animate-in fade-in slide-in-from-top-2 duration-200">
              <div className="px-3.5 py-1.5 rounded-full bg-amber-500/90 text-black backdrop-blur-md border border-amber-300 text-xs font-semibold flex items-center gap-2 shadow-lg">
                <span>🌙 Low light detected</span>
                {hasTorch && (
                  <button
                    type="button"
                    onClick={toggleTorch}
                    className="underline font-bold cursor-pointer hover:text-white"
                  >
                    {isTorchOn ? 'Turn off flash' : 'Turn on flash'}
                  </button>
                )}
              </div>
            </div>
          )}

          {/* PERMISSION OR HARDWARE CAMERA ERROR CARD */}
          {cameraError && (
            <div className="absolute inset-0 z-40 bg-black/90 backdrop-blur-lg flex items-center justify-center p-6 text-center">
              <div className="max-w-md w-full bg-[#18181b] p-6 sm:p-8 rounded-3xl border border-white/10 shadow-2xl space-y-4">
                <div className="w-14 h-14 mx-auto rounded-full bg-red-500/10 text-red-400 border border-red-500/20 flex items-center justify-center">
                  <AlertCircle className="w-7 h-7" />
                </div>
                <h3 className="text-lg font-bold text-white">
                  {cameraError.type === 'permission'
                    ? 'Camera Permission Denied'
                    : cameraError.type === 'no-camera'
                    ? 'No Camera Detected'
                    : 'Camera Unavailable'}
                </h3>
                <p className="text-xs sm:text-sm text-neutral-400 leading-relaxed">
                  {cameraError.message}
                </p>
                <div className="pt-2 flex flex-col sm:flex-row gap-2.5">
                  <button
                    type="button"
                    onClick={() => startCamera()}
                    className="flex-1 min-h-[44px] py-2.5 px-4 rounded-xl bg-white/10 hover:bg-white/15 text-white font-medium text-xs sm:text-sm transition-colors cursor-pointer"
                  >
                    Try Again
                  </button>
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="flex-1 min-h-[44px] py-2.5 px-4 rounded-xl bg-[#22c55e] hover:bg-[#16a34a] text-white font-semibold text-xs sm:text-sm transition-colors cursor-pointer shadow-md flex items-center justify-center gap-1.5"
                  >
                    <Upload className="w-4 h-4" />
                    <span>Upload Photos</span>
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* BOTTOM ONE-HANDED CONTROL BAR: Thumbnail, Shutter, Torch, Done */}
          <div className="relative z-30 pb-[max(1.5rem,env(safe-area-inset-bottom))] px-6 flex items-center justify-between gap-4">
            {/* Left Control: Last-Capture Thumbnail with Page-Count Badge */}
            <div className="w-16 flex items-center justify-start">
              {pages.length > 0 ? (
                <button
                  type="button"
                  onClick={() => openReviewForPage(pages.length - 1)}
                  className="relative min-w-[48px] min-h-[48px] w-12 h-14 rounded-xl overflow-hidden border-2 border-white/80 shadow-lg active:scale-95 transition-transform cursor-pointer group bg-neutral-900"
                  title="View Scanned Pages"
                >
                  <img
                    src={pages[pages.length - 1].dataUrl}
                    alt="Latest scan"
                    className="w-full h-full object-cover"
                  />
                  <span className="absolute -top-1 -right-1 px-1.5 py-0.5 rounded-full bg-[#22c55e] text-white text-[10px] font-black border border-black shadow-md">
                    {pages.length}
                  </span>
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="min-w-[44px] min-h-[44px] w-11 h-11 rounded-full bg-black/60 hover:bg-black/80 backdrop-blur-md border border-white/15 flex items-center justify-center text-white/80 hover:text-white transition-all cursor-pointer shadow-md"
                  title="Import from files"
                >
                  <Upload className="w-5 h-5" />
                </button>
              )}
            </div>

            {/* Center Control: Large Circular Shutter with Auto-Capture Radial Ring */}
            <div className="relative flex items-center justify-center">
              {/* Radial Progress Ring for Auto-Capture */}
              {autoCaptureEnabled && autoCaptureProgress > 0 && (
                <svg
                  className="absolute -inset-2 w-24 h-24 -rotate-90 pointer-events-none"
                  viewBox="0 0 100 100"
                >
                  <circle
                    cx="50"
                    cy="50"
                    r="44"
                    fill="none"
                    stroke="#22c55e"
                    strokeWidth="4"
                    strokeDasharray={276.46}
                    strokeDashoffset={276.46 * (1 - autoCaptureProgress)}
                    strokeLinecap="round"
                    className="transition-[stroke-dashoffset] duration-75"
                  />
                </svg>
              )}

              {/* Shutter Button (>= 80px target) */}
              <button
                type="button"
                onClick={() => triggerCapture()}
                disabled={isProcessing}
                className="min-w-[76px] min-h-[76px] w-20 h-20 rounded-full bg-white/20 p-1 flex items-center justify-center active:scale-90 transition-transform cursor-pointer shadow-[0_0_24px_rgba(0,0,0,0.5)] border-2 border-white/80 hover:scale-105"
                title="Capture Document"
              >
                <div className="w-16 h-16 rounded-full bg-white flex items-center justify-center shadow-inner">
                  {isProcessing ? (
                    <RefreshCw className="w-6 h-6 text-neutral-800 animate-spin" />
                  ) : (
                    <div className="w-14 h-14 rounded-full border-2 border-neutral-300 bg-white" />
                  )}
                </div>
              </button>
            </div>

            {/* Right Control: Torch Toggle (HIDDEN when unsupported) & Done Button */}
            <div className="w-16 flex items-center justify-end gap-2">
              {hasTorch && (
                <button
                  type="button"
                  onClick={toggleTorch}
                  className={`min-w-[44px] min-h-[44px] w-11 h-11 rounded-full backdrop-blur-md border flex items-center justify-center transition-all cursor-pointer shadow-md ${
                    isTorchOn
                      ? 'bg-amber-500 text-black border-amber-300 shadow-[0_0_16px_rgba(245,158,11,0.5)]'
                      : 'bg-black/60 hover:bg-black/80 text-white/80 border-white/15'
                  }`}
                  title={isTorchOn ? 'Turn Flashlight Off' : 'Turn Flashlight On'}
                >
                  {isTorchOn ? <Zap className="w-5 h-5" /> : <ZapOff className="w-5 h-5" />}
                </button>
              )}

              {pages.length > 0 && (
                <button
                  type="button"
                  onClick={() => openReviewForPage(pages.length - 1)}
                  className="min-w-[44px] min-h-[44px] px-3.5 h-11 rounded-full bg-[#22c55e] hover:bg-[#16a34a] text-white font-bold text-xs flex items-center justify-center shadow-lg active:scale-95 transition-all cursor-pointer"
                  title="Finish scanning and review"
                >
                  Done
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* VIEW MODE 2: POST-CAPTURE REVIEW & MULTI-PAGE SCREEN */}
      {viewMode === 'review' && activePage && (
        <div className="relative flex-1 w-full h-full flex flex-col justify-between overflow-y-auto bg-[#121214]">
          {/* TOP BAR: Back to Camera, Page Counter, Done / Export */}
          <div className="pt-[max(0.75rem,env(safe-area-inset-top))] px-4 pb-2 border-b border-white/10 flex items-center justify-between shrink-0 bg-[#18181b]/80 backdrop-blur-md">
            <button
              type="button"
              onClick={() => setViewMode('camera')}
              className="min-w-[44px] min-h-[44px] px-3 h-10 rounded-xl bg-white/10 hover:bg-white/15 text-white text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              <Plus className="w-4 h-4 text-[#22c55e]" />
              <span>Scan More</span>
            </button>

            <div className="text-center">
              <span className="text-xs sm:text-sm font-bold text-white">
                Page {activePageIndex + 1} of {pages.length}
              </span>
              <span className="block text-[10px] text-neutral-400">
                {formatBytes(activePage.blob.size)}
              </span>
            </div>

            <button
              type="button"
              onClick={handleExportPdf}
              disabled={isProcessing}
              className="min-w-[44px] min-h-[44px] px-4 h-10 rounded-xl bg-[#22c55e] hover:bg-[#16a34a] text-white text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer shadow-md active:scale-95"
            >
              <Download className="w-4 h-4" />
              <span>Export PDF</span>
            </button>
          </div>

          {/* MAIN REVIEW WORKSPACE: Draggable Corner Crop on Original Image */}
          <div className="relative flex-1 flex flex-col items-center justify-center p-3 sm:p-4 min-h-[280px] max-h-[56vh] sm:max-h-[60vh] overflow-hidden">
            <div
              ref={reviewContainerRef}
              className="relative inline-block max-w-full max-h-full select-none touch-none rounded-xl overflow-hidden shadow-2xl border border-white/10"
            >
              {/* Captured Frame Image */}
              <img
                src={activePage.originalDataUrl}
                alt="Document preview"
                className="max-h-[50vh] sm:max-h-[54vh] max-w-full object-contain pointer-events-none"
              />

              {/* Translucent SVG Dark Mask outside quadrilateral crop */}
              <svg className="absolute inset-0 w-full h-full pointer-events-none z-10">
                <defs>
                  <mask id="review-crop-mask">
                    <rect x="0" y="0" width="100%" height="100%" fill="white" />
                    <polygon
                      points={`${activeReviewQuad.tl.x}%,${activeReviewQuad.tl.y}% ${activeReviewQuad.tr.x}%,${activeReviewQuad.tr.y}% ${activeReviewQuad.br.x}%,${activeReviewQuad.br.y}% ${activeReviewQuad.bl.x}%,${activeReviewQuad.bl.y}%`}
                      fill="black"
                    />
                  </mask>
                </defs>
                <rect
                  x="0"
                  y="0"
                  width="100%"
                  height="100%"
                  fill="rgba(0, 0, 0, 0.55)"
                  mask="url(#review-crop-mask)"
                />
                {/* Border line */}
                <polygon
                  points={`${activeReviewQuad.tl.x}%,${activeReviewQuad.tl.y}% ${activeReviewQuad.tr.x}%,${activeReviewQuad.tr.y}% ${activeReviewQuad.br.x}%,${activeReviewQuad.br.y}% ${activeReviewQuad.bl.x}%,${activeReviewQuad.bl.y}%`}
                  fill="none"
                  stroke="#22c55e"
                  strokeWidth="2.5"
                  strokeDasharray="4 2"
                />
              </svg>

              {/* 4 Draggable Corner Handles (min 48px touch targets) */}
              {(['tl', 'tr', 'br', 'bl'] as const).map((corner) => {
                const pt = activeReviewQuad[corner];
                const isCurrentActive = activeHandle === corner;

                return (
                  <div
                    key={corner}
                    onPointerDown={(e) => handleStartReviewDrag(corner, e)}
                    className="absolute w-12 h-12 -ml-6 -mt-6 flex items-center justify-center cursor-move touch-none z-30 group"
                    style={{ left: `${pt.x}%`, top: `${pt.y}%` }}
                    title={`Drag ${corner.toUpperCase()} corner to adjust crop`}
                  >
                    <div
                      className={`w-5 h-5 rounded-full bg-[#22c55e] border-2 border-white shadow-xl flex items-center justify-center transition-transform ${
                        isCurrentActive ? 'scale-130 ring-4 ring-[#22c55e]/40' : 'group-hover:scale-115'
                      }`}
                    >
                      <div className="w-1.5 h-1.5 rounded-full bg-white" />
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Crop Action Quick Chips: Auto-Detect, Full Frame, Apply */}
            <div className="mt-2.5 flex items-center gap-2 z-20">
              <button
                type="button"
                onClick={handleAutoDetectReviewCrop}
                className="min-h-[44px] px-3 py-1.5 rounded-full bg-white/10 hover:bg-white/15 text-white/90 text-xs font-semibold border border-white/10 flex items-center gap-1.5 cursor-pointer transition-colors"
                title="Automatically snap to detected document"
              >
                <Sparkles className="w-3.5 h-3.5 text-[#22c55e]" />
                <span>Auto-Fit</span>
              </button>

              <button
                type="button"
                onClick={handleResetReviewCrop}
                className="min-h-[44px] px-3 py-1.5 rounded-full bg-white/10 hover:bg-white/15 text-white/90 text-xs font-semibold border border-white/10 flex items-center gap-1.5 cursor-pointer transition-colors"
                title="Expand to full frame"
              >
                <Maximize2 className="w-3.5 h-3.5" />
                <span>Full Frame</span>
              </button>

              <button
                type="button"
                onClick={handleApplyReviewCrop}
                disabled={isProcessing}
                className="min-h-[44px] px-4 py-1.5 rounded-full bg-[#22c55e] hover:bg-[#16a34a] text-white text-xs font-bold shadow-md flex items-center gap-1.5 cursor-pointer transition-all active:scale-95"
              >
                <Crop className="w-3.5 h-3.5" />
                <span>Apply Crop</span>
              </button>
            </div>
          </div>

          {/* EDIT TOOLS & FILTER CHIPS BAR */}
          <div className="p-3 sm:px-6 bg-[#18181b] border-t border-white/10 space-y-3 shrink-0">
            {/* Filter Chips: Original, B&W Document, Grayscale, Color Boost */}
            <div className="flex items-center justify-between gap-1.5">
              <span className="text-[11px] font-bold uppercase tracking-wider text-neutral-400">
                Filter:
              </span>
              <div className="flex items-center gap-1 overflow-x-auto scrollbar-none flex-nowrap">
                {(
                  [
                    { id: 'original', label: 'Original', icon: '🖼️' },
                    { id: 'clean_bw', label: 'B&W Document', icon: '📄' },
                    { id: 'grayscale', label: 'Grayscale', icon: '🔘' },
                    { id: 'auto_enhance', label: 'Color Boost', icon: '✨' },
                  ] as const
                ).map((f) => (
                  <button
                    key={f.id}
                    type="button"
                    onClick={() => handleChangeFilter(f.id)}
                    className={`min-h-[44px] px-3 py-2 rounded-xl text-xs font-semibold transition-all cursor-pointer whitespace-nowrap flex items-center gap-1.5 ${
                      activePage.filter === f.id
                        ? 'bg-white text-black shadow-md'
                        : 'bg-white/5 hover:bg-white/10 text-neutral-300'
                    }`}
                  >
                    <span>{f.icon}</span>
                    <span>{f.label}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Page Action Tools: Rotate, Retake, Delete */}
            <div className="flex items-center justify-between gap-2 pt-1 border-t border-white/5">
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={handleRotatePage}
                  className="min-h-[44px] min-w-[44px] px-3.5 rounded-xl bg-white/10 hover:bg-white/15 text-white text-xs font-semibold flex items-center gap-1.5 cursor-pointer transition-colors"
                  title="Rotate 90 degrees"
                >
                  <RotateCw className="w-4 h-4 text-[#22c55e]" />
                  <span>Rotate</span>
                </button>

                <button
                  type="button"
                  onClick={handleRetakePage}
                  className="min-h-[44px] min-w-[44px] px-3.5 rounded-xl bg-white/10 hover:bg-white/15 text-white text-xs font-semibold flex items-center gap-1.5 cursor-pointer transition-colors"
                  title="Discard and retake this page"
                >
                  <Undo2 className="w-4 h-4 text-amber-400" />
                  <span>Retake</span>
                </button>
              </div>

              <button
                type="button"
                onClick={() => handleDeletePage(activePageIndex)}
                className="min-h-[44px] min-w-[44px] px-3.5 rounded-xl bg-red-500/10 hover:bg-red-500/20 text-red-400 text-xs font-semibold flex items-center gap-1.5 cursor-pointer transition-colors border border-red-500/20"
                title="Delete this page"
              >
                <Trash2 className="w-4 h-4" />
                <span>Delete</span>
              </button>
            </div>
          </div>

          {/* MULTI-PAGE THUMBNAIL STRIP & EXPORT ACTIONS */}
          <div className="pb-[max(1.25rem,env(safe-area-inset-bottom))] px-4 pt-3 bg-[#111113] border-t border-white/10 space-y-3 shrink-0">
            <div className="flex items-center justify-between text-xs text-neutral-400">
              <span className="font-semibold text-white">Pages in Document ({pages.length})</span>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleSharePdf}
                  className="inline-flex items-center gap-1 text-[#22c55e] hover:underline cursor-pointer"
                >
                  <Share2 className="w-3.5 h-3.5" />
                  <span>Share</span>
                </button>
              </div>
            </div>

            {/* Horizontal Thumbnail Queue */}
            <div className="flex items-center gap-3 overflow-x-auto scrollbar-none pb-1">
              {pages.map((p, idx) => (
                <div
                  key={p.id}
                  onClick={() => openReviewForPage(idx)}
                  className={`relative group rounded-xl overflow-hidden shrink-0 border-2 transition-all cursor-pointer ${
                    idx === activePageIndex
                      ? 'border-[#22c55e] ring-2 ring-[#22c55e]/30 scale-105 shadow-lg'
                      : 'border-white/15 hover:border-white/40 opacity-70 hover:opacity-100'
                  }`}
                >
                  <img
                    src={p.dataUrl}
                    alt={`Page ${idx + 1}`}
                    className="w-14 h-18 sm:w-16 sm:h-20 object-cover bg-white"
                  />

                  {/* Page index badge */}
                  <span className="absolute bottom-1 right-1 px-1.5 py-0.5 rounded bg-black/80 text-white text-[10px] font-bold">
                    {idx + 1}
                  </span>

                  {/* Reorder Arrows on Hover / Tap */}
                  <div className="absolute inset-x-0 top-0 bg-black/70 p-1 flex items-center justify-between opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                      type="button"
                      disabled={idx === 0}
                      onClick={(e) => {
                        e.stopPropagation();
                        handleMovePage(idx, 'left');
                      }}
                      className="text-white hover:text-[#22c55e] disabled:opacity-20 cursor-pointer p-0.5"
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
                      className="text-white hover:text-[#22c55e] disabled:opacity-20 cursor-pointer p-0.5"
                    >
                      <ArrowRight className="w-3 h-3" />
                    </button>
                  </div>
                </div>
              ))}

              {/* "+ Add Page" Card */}
              <button
                type="button"
                onClick={() => setViewMode('camera')}
                className="w-14 h-18 sm:w-16 sm:h-20 rounded-xl border-2 border-dashed border-white/20 hover:border-[#22c55e] bg-white/5 hover:bg-[#22c55e]/10 flex flex-col items-center justify-center gap-1 text-neutral-400 hover:text-white shrink-0 transition-all cursor-pointer"
                title="Add Another Page"
              >
                <Camera className="w-5 h-5 text-[#22c55e]" />
                <span className="text-[10px] font-bold">+ Page</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
