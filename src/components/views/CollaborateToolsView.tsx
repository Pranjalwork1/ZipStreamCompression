import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  Share2,
  PenTool,
  ArrowLeft,
  Copy,
  Check,
  ShieldCheck,
  Upload,
  Wifi,
  WifiOff,
  Download,
  Users,
  MessageSquare,
  Send,
  FileText,
  RefreshCw,
  Link2,
  Zap,
  Lock,
  ChevronLeft,
  ChevronRight,
  ZoomIn,
  ZoomOut,
  Radio,
  FileUp,
  Activity,
  Smartphone,
  QrCode,
  X,
  Globe,
  RotateCcw,
  Network,
  SlidersHorizontal,
} from 'lucide-react';
import { ToolMode } from '../../types';
import confetti from 'canvas-confetti';
import { Excalidraw } from '@excalidraw/excalidraw';
import '@excalidraw/excalidraw/index.css';
import { io as ioConnect, Socket } from 'socket.io-client';
import QRCode from 'qrcode';
import * as pdfjsLib from 'pdfjs-dist';

// Ensure PDF.js worker is initialized safely
if (typeof window !== 'undefined' && !pdfjsLib.GlobalWorkerOptions.workerSrc) {
  pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
}

interface CollaborateToolsViewProps {
  initialTool: ToolMode;
  onBackToHome: () => void;
}

interface NetworkInterface {
  name: string;
  ip: string;
  isDefault: boolean;
}

interface ChatMsg {
  text: string;
  senderId: string;
  timestamp: number;
  isSelf: boolean;
}

const CHUNK_SIZE = 64 * 1024; // Safe, high-throughput WebRTC chunks with ordered delivery

const RTC_CONFIG: RTCConfiguration = {
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
    { urls: 'stun:stun2.l.google.com:19302' },
    { urls: 'stun:global.stun.twilio.com:3478' },
  ],
};

function generateCryptoRoomId(): string {
  // 128-bit room IDs make guessing/brute-force access impractical while keeping
  // links short enough for QR codes and mobile sharing.
  const arr = new Uint8Array(16);
  crypto.getRandomValues(arr);
  return 'zip-' + Array.from(arr, b => b.toString(16).padStart(2, '0')).join('');
}

// Convert any binary data safely to ArrayBuffer
function normalizeToArrayBuffer(data: any): ArrayBuffer | null {
  if (!data) return null;
  if (data instanceof ArrayBuffer) return data;
  if (data instanceof Uint8Array) {
    return data.buffer.slice(data.byteOffset, data.byteOffset + data.byteLength);
  }
  if (data.buffer instanceof ArrayBuffer) {
    return data.buffer.slice(data.byteOffset || 0, (data.byteOffset || 0) + (data.byteLength || data.length));
  }
  if (Array.isArray(data.data)) {
    return new Uint8Array(data.data).buffer;
  }
  return null;
}

// Helper to convert ArrayBuffer to Base64
function arrayBufferToBase64(buffer: ArrayBuffer): string {
  let binary = '';
  const bytes = new Uint8Array(buffer);
  const len = bytes.byteLength;
  for (let i = 0; i < len; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return window.btoa(binary);
}

function base64ToArrayBuffer(base64: string): ArrayBuffer {
  const binary_string = window.atob(base64);
  const len = binary_string.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binary_string.charCodeAt(i);
  }
  return bytes.buffer;
}

async function copyTextToClipboard(text: string): Promise<boolean> {
  try {
    if (navigator.clipboard?.writeText && window.isSecureContext) {
      await navigator.clipboard.writeText(text);
      return true;
    }
  } catch (_) {}

  try {
    const area = document.createElement('textarea');
    area.value = text;
    area.setAttribute('readonly', '');
    area.style.position = 'fixed';
    area.style.left = '-9999px';
    document.body.appendChild(area);
    area.select();
    const ok = document.execCommand('copy');
    document.body.removeChild(area);
    return ok;
  } catch (_) {
    return false;
  }
}

async function sha256Hex(buffer: ArrayBuffer): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', buffer);
  return Array.from(new Uint8Array(digest)).map(b => b.toString(16).padStart(2, '0')).join('');
}

// Trigger a full-window celebration spiral splash
function triggerCelebrationSpiralSplash(type: 'connection' | 'file') {
  const duration = 2400;
  const animationEnd = Date.now() + duration;

  // Connection: Electric blue, cyan, emerald and gold
  // File added: Vibrant magenta, purple, amber, emerald, blue
  const colors = type === 'connection'
    ? ['#0071e3', '#00f2fe', '#4facfe', '#10b981', '#34d399', '#ffd700', '#ffffff']
    : ['#ff007a', '#7928ca', '#ff4d4d', '#f59e0b', '#10b981', '#0071e3', '#a855f7'];

  // 1. Initial big celebratory pop from center
  confetti({
    particleCount: 90,
    spread: 100,
    origin: { x: 0.5, y: 0.45 },
    colors,
    startVelocity: 45,
    scalar: 1.2,
    ticks: 220,
  });

  // 2. Continuous rotating spiral splash across the window
  const frame = () => {
    const timeLeft = animationEnd - Date.now();
    if (timeLeft <= 0) return;

    const progress = 1 - (timeLeft / duration);
    // 2.5 full 360-degree rotations
    const angle = progress * 360 * 2.5;
    const radius = 0.28;
    const x = 0.5 + radius * Math.cos((angle * Math.PI) / 180);
    const y = 0.45 + (radius * 0.4) * Math.sin((angle * Math.PI) / 180);

    // Rotating spiral sparkler
    confetti({
      particleCount: 4,
      angle: angle % 360,
      spread: 55,
      origin: { x, y },
      colors,
      startVelocity: 30,
      ticks: 200,
      gravity: 0.85,
      scalar: 1.1,
    });

    // Left cannon sweep
    confetti({
      particleCount: 3,
      angle: 60,
      spread: 65,
      origin: { x: 0, y: 0.75 },
      colors,
      startVelocity: 38,
      ticks: 180,
    });

    // Right cannon sweep
    confetti({
      particleCount: 3,
      angle: 120,
      spread: 65,
      origin: { x: 1, y: 0.75 },
      colors,
      startVelocity: 38,
      ticks: 180,
    });

    requestAnimationFrame(frame);
  };

  frame();
}

export const CollaborateToolsView: React.FC<CollaborateToolsViewProps> = ({
  initialTool,
  onBackToHome,
}) => {
  const [activeSubTool, setActiveSubTool] = useState<ToolMode>(initialTool);

  // ─── Ephemeral Room ID & Host Identification ───────────────────────────
  const getRoomIdFromLocation = useCallback(() => {
    const hash = window.location.hash;
    const path = window.location.pathname;
    const query = new URLSearchParams(window.location.search);
    const matchHash = hash.match(/\/room\/([a-zA-Z0-9_-]+)/);
    const matchPath = path.match(/\/room\/([a-zA-Z0-9_-]+)/);
    const queryId = query.get('session') || query.get('room');
    return matchHash?.[1] || matchPath?.[1] ||
      (queryId && /^[a-zA-Z0-9_-]{4,64}$/.test(queryId) ? queryId : null);
  }, []);

  const [roomId, setRoomId] = useState<string>(() => {
    const existing = getRoomIdFromLocation();
    if (existing) return existing;
    const newId = generateCryptoRoomId();
    sessionStorage.setItem(`zip_host_${newId}`, 'true');
    return newId;
  });

  const [isHost, setIsHost] = useState<boolean>(() => {
    const existing = getRoomIdFromLocation();
    return existing ? sessionStorage.getItem(`zip_host_${existing}`) === 'true' : true;
  });
  const [sessionInput, setSessionInput] = useState('');
  const [copiedSessionId, setCopiedSessionId] = useState(false);
  const backendBaseUrl = (() => {
    const configured = (import.meta as any).env?.VITE_BACKEND_URL?.trim();
    if (configured) return configured.replace(/\/$/, '');
    const host = window.location.hostname;
    const isVercel = host.endsWith('.vercel.app') || host === 'zipstream.online' || host === 'www.zipstream.online';
    return isVercel ? 'https://zipstream-compression-production-848e.up.railway.app' : window.location.origin;
  })();

  useEffect(() => {
    if (isHost && roomId) {
      sessionStorage.setItem(`zip_host_${roomId}`, 'true');
    }
  }, [isHost, roomId]);

  // ─── Dynamic Network Interfaces & Public Tunnel QR ─────────────────────
  const [networkInterfaces, setNetworkInterfaces] = useState<NetworkInterface[]>([]);
  const [selectedIp, setSelectedIp] = useState<string>('');
  const [customHost, setCustomHost] = useState<string>('');
  const [isCustomHostMode, setIsCustomHostMode] = useState<boolean>(false);
  const [serverPort, setServerPort] = useState<number>(3000);
  const [isRefreshingNet, setIsRefreshingNet] = useState<boolean>(false);
  const [qrDataUrl, setQrDataUrl] = useState<string>('');
  const [copiedLink, setCopiedLink] = useState(false);
  const [showQrModal, setShowQrModal] = useState(false);

  // Tunnel state — public HTTPS URL auto-provisioned by localtunnel
  const [tunnelUrl, setTunnelUrl] = useState<string>('');
  const [tunnelStatus, setTunnelStatus] = useState<'starting' | 'active' | 'error' | 'off'>('starting');

  // Poll /api/tunnel every 3 seconds until active
  useEffect(() => {
    // Never wait for a local tunnel on Vercel/zipstream.online.
    // The hosted origin itself is the public share URL.
    const host = window.location.hostname;
    const isHosted = window.location.protocol === 'https:' ||
      host === 'zipstream.online' || host === 'www.zipstream.online' || host.endsWith('.vercel.app');
    if (isHosted) {
      setTunnelUrl('');
      setTunnelStatus('off');
      return;
    }

    let stopped = false;
    const poll = async () => {
      try {
        const res = await fetch('/api/tunnel');
        if (!res.ok) throw new Error('Tunnel API unavailable');
        const data = await res.json();
        if (!stopped) {
          setTunnelUrl(data.url || '');
          setTunnelStatus(data.status || 'off');
        }
      } catch (_) {
        if (!stopped) setTunnelStatus('off');
      }
    };
    poll();
    const interval = setInterval(poll, 3000);
    return () => { stopped = true; clearInterval(interval); };
  }, []);

  // Fetch active network interfaces dynamically
  const refreshNetworks = useCallback(async () => {
    setIsRefreshingNet(true);
    try {
      const res = await fetch('/api/network-interfaces');
      const data = await res.json();
      if (data.interfaces && Array.isArray(data.interfaces)) {
        setNetworkInterfaces(data.interfaces);
        if (data.port) setServerPort(data.port);
        setSelectedIp(currentIp => {
          const currentInterface = data.interfaces.find((iface: NetworkInterface) => iface.ip === currentIp);
          if (currentInterface) return currentIp;
          const nextInterface = data.interfaces.find((iface: NetworkInterface) => iface.ip !== '127.0.0.1')
            || data.interfaces[0];
          return nextInterface?.ip || '';
        });
      }
    } catch (err) {
      console.warn('Network discovery error:', err);
    } finally {
      setIsRefreshingNet(false);
    }
  }, []);

  useEffect(() => {
    refreshNetworks();
    // Poll network interfaces every 10 seconds to auto-adjust when user switches Wi-Fi/Hotspot
    const interval = setInterval(refreshNetworks, 10000);
    return () => clearInterval(interval);
  }, [refreshNetworks]);

  // Compute a link that is actually reachable from the device that scans it.
  // On hosted production the public app origin is always authoritative; never
  // leak localhost/LAN/tunnel addresses into a production QR code.
  const computeShareUrl = useCallback(() => {
    const configuredPublic = (import.meta as any).env?.VITE_PUBLIC_APP_URL?.trim();
    const host = window.location.hostname;
    const isLocalHost = host === 'localhost' || host === '127.0.0.1' || host === '0.0.0.0';
    const isProductionHost = host === 'zipstream.online' || host === 'www.zipstream.online' || host.endsWith('.vercel.app');

    if (configuredPublic) {
      return `${configuredPublic.replace(/\/$/, '')}/room/${roomId}`;
    }
    if (isProductionHost || (!isLocalHost && window.location.protocol === 'https:')) {
      return `${window.location.origin}/room/${roomId}`;
    }
    if (isCustomHostMode && customHost.trim()) {
      const trimmed = customHost.trim().replace(/\/$/, '');
      const prefix = /^https?:\/\//i.test(trimmed) ? '' : 'http://';
      return `${prefix}${trimmed}/room/${roomId}`;
    }
    if (tunnelUrl && tunnelStatus === 'active') {
      return `${tunnelUrl.replace(/\/$/, '')}/room/${roomId}`;
    }
    const hostIp = selectedIp && selectedIp !== '127.0.0.1' ? selectedIp : window.location.hostname;
    const port = window.location.port || String(serverPort);
    return `http://${hostIp}:${port}/room/${roomId}`;
  }, [isCustomHostMode, customHost, tunnelUrl, tunnelStatus, selectedIp, serverPort, roomId]);

  const shareUrl = computeShareUrl();
  const isHostedPublicOrigin = window.location.protocol === 'https:' && !['localhost', '127.0.0.1', '0.0.0.0'].includes(window.location.hostname);
  const isUsingTunnel = tunnelStatus === 'active' && shareUrl.startsWith(tunnelUrl);

  // Generate QR Code dynamically whenever the shareUrl adjusts
  useEffect(() => {
    let cancelled = false;
    setQrDataUrl('');
    QRCode.toDataURL(shareUrl, {
      width: 320,
      margin: 2,
      color: { dark: '#09090b', light: '#ffffff' },
      errorCorrectionLevel: 'H',
    })
      .then(url => { if (!cancelled) setQrDataUrl(url); })
      .catch(err => console.warn('QR generation failed:', err));
    return () => { cancelled = true; };
  }, [shareUrl]);

  // ─── Connection & WebRTC State ──────────────────────────────────────────
  const [peerCount, setPeerCount] = useState(0);
  const [connectionStatus, setConnectionStatus] = useState<'idle' | 'connecting' | 'connected' | 'error'>('idle');
  const [statusMessage, setStatusMessage] = useState<string>('Initializing P2P Room…');

  const socketRef = useRef<Socket | null>(null);
  const pcRef = useRef<RTCPeerConnection | null>(null);
  const dataChannelRef = useRef<RTCDataChannel | null>(null);
  const peerSocketId = useRef<string>('');
  const iceCandidatesQueue = useRef<RTCIceCandidateInit[]>([]);
  const incomingFileRef = useRef<{ fileName: string; fileSize: number; fileType: string; chunks: ArrayBuffer[]; receivedBytes: number; transferId?: string; sha256?: string } | null>(null);
  const transferFallbackTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastDownloadedHashRef = useRef<string>('');
  const publishedHashRef = useRef<string>('');
  const pendingTransferAckRef = useRef<((ok: boolean) => void) | null>(null);
  const rtcConfigRef = useRef<RTCConfiguration>({ iceServers: RTC_CONFIG.iceServers });
  const reconnectOfferRef = useRef<((targetId: string) => void) | null>(null);
  const reconnectTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const reconnectingRef = useRef(false);
  const hasCelebratedConnectionRef = useRef<boolean>(false);
  // Tracks the last file name that triggered a celebration — prevents zoom/sync re-renders from re-firing
  const lastCelebratedFileRef = useRef<string>('');

  // Trigger celebration spiral splash exactly one time per peer connection
  const celebrateConnectionOnce = useCallback(() => {
    if (!hasCelebratedConnectionRef.current) {
      hasCelebratedConnectionRef.current = true;
      triggerCelebrationSpiralSplash('connection');
    }
  }, []);

  // Trigger celebration spiral splash once per unique new file (never on zoom or sync re-renders)
  const celebrateNewFileOnce = useCallback((fileName: string) => {
    if (fileName && fileName !== lastCelebratedFileRef.current) {
      lastCelebratedFileRef.current = fileName;
      triggerCelebrationSpiralSplash('file');
    }
  }, []);

  // ─── Active Document & Co-Viewer State ─────────────────────────────────
  const [loadedPdfBlob, setLoadedPdfBlob] = useState<Blob | null>(null);
  const loadedPdfBlobRef = useRef<Blob | null>(null);
  loadedPdfBlobRef.current = loadedPdfBlob;

  const [activeFileName, setActiveFileName] = useState<string>('shared-document.pdf');
  const [activeFileType, setActiveFileType] = useState<string>('application/pdf');
  const [imagePreviewUrl, setImagePreviewUrl] = useState<string | null>(null);

  const [transferState, setTransferState] = useState<{
    fileName: string;
    fileSize: number;
    progress: number;
    status: 'idle' | 'streaming' | 'complete';
  }>({
    fileName: '',
    fileSize: 0,
    progress: 0,
    status: 'idle',
  });

  const fileInputRef = useRef<HTMLInputElement>(null);
  const [pdfDoc, setPdfDoc] = useState<pdfjsLib.PDFDocumentProxy | null>(null);
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [totalPages, setTotalPages] = useState<number>(1);
  const [zoomScale, setZoomScale] = useState<number>(1.0);
  const [hostSyncMode, setHostSyncMode] = useState<boolean>(false);
  const [isApplyingSync, setIsApplyingSync] = useState<boolean>(false);

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const canvasContainerRef = useRef<HTMLDivElement | null>(null);
  const renderTaskRef = useRef<any>(null);

  // Sync hash in address bar
  useEffect(() => {
    if (roomId) {
      const expectedHash = `#/room/${roomId}`;
      if (window.location.hash !== expectedHash && !window.location.pathname.startsWith('/room/')) {
        window.history.replaceState(null, '', `/#/room/${roomId}`);
      }
    }
  }, [roomId]);

  useEffect(() => {
    const onLocationChange = () => {
      const id = getRoomIdFromLocation();
      if (id && id !== roomId) {
        setIsHost(sessionStorage.getItem(`zip_host_${id}`) === 'true');
        setRoomId(id);
      }
    };
    window.addEventListener('hashchange', onLocationChange);
    window.addEventListener('popstate', onLocationChange);
    return () => {
      window.removeEventListener('hashchange', onLocationChange);
      window.removeEventListener('popstate', onLocationChange);
    };
  }, [getRoomIdFromLocation, roomId]);

  const joinBySessionId = useCallback(() => {
    const raw = sessionInput.trim();
    const extracted = raw.match(/(?:session=|#\/room\/|\/room\/)([a-zA-Z0-9_-]{4,64})/)?.[1] || raw;
    if (!/^[a-zA-Z0-9_-]{4,64}$/.test(extracted)) {
      setStatusMessage('Invalid Session ID. Use 4–64 letters, numbers, _ or -.');
      return;
    }
    socketRef.current?.disconnect();
    pcRef.current?.close();
    peerSocketId.current = '';
    sessionStorage.removeItem(`zip_host_${extracted}`);
    setIsHost(false);
    setRoomId(extracted);
    setSessionInput(extracted);
    window.history.replaceState(null, '', `/#/room/${extracted}`);
    setConnectionStatus('connecting');
    setStatusMessage('Joining Session…');
  }, [sessionInput]);

  // Chat State
  const [chatMessages, setChatMessages] = useState<ChatMsg[]>([]);
  const [chatInput, setChatInput] = useState('');
  const [showChat, setShowChat] = useState(false);
  const chatBottomRef = useRef<HTMLDivElement>(null);

  // Process queued ICE candidates
  const processQueuedIceCandidates = async (pc: RTCPeerConnection) => {
    while (iceCandidatesQueue.current.length > 0) {
      const candidate = iceCandidatesQueue.current.shift();
      if (candidate) {
        try {
          await pc.addIceCandidate(new RTCIceCandidate(candidate));
        } catch (err) {
          console.warn('ICE candidate addition failed:', err);
        }
      }
    }
  };

  // Viewport Sync Action
  const broadcastSync = useCallback((page: number, zoom: number, scrollRatio: number) => {
    const payload = JSON.stringify({
      type: 'SYNC_STATE',
      page,
      zoom,
      scrollRatio,
    });

    // Fast path: WebRTC DataChannel
    if (dataChannelRef.current && dataChannelRef.current.readyState === 'open') {
      try {
        dataChannelRef.current.send(payload);
      } catch (_) {}
    }

    // Always keep signaling server state synchronized
    if (socketRef.current) {
      socketRef.current.emit('sync-state', { roomId, event: { page, zoom, scrollRatio } });
    }
  }, [roomId]);

  const applyViewportSync = useCallback((state: { page?: number; zoom?: number; scrollRatio?: number }) => {
    if (!hostSyncMode) return;
    setIsApplyingSync(true);

    if (state.page && state.page !== currentPage) {
      setCurrentPage(state.page);
    }
    if (state.zoom && Math.abs(state.zoom - zoomScale) > 0.05) {
      setZoomScale(state.zoom);
    }
    if (canvasContainerRef.current && typeof state.scrollRatio === 'number') {
      const targetScroll = state.scrollRatio * canvasContainerRef.current.scrollHeight;
      canvasContainerRef.current.scrollTo({ top: targetScroll, behavior: 'smooth' });
    }

    setTimeout(() => setIsApplyingSync(false), 100);
  }, [hostSyncMode, isHost, currentPage, zoomScale]);

  // Load document into active state
  const loadDocumentBlob = useCallback((blob: Blob, fileName?: string, fileType?: string) => {
    setLoadedPdfBlob(blob);
    const resolvedType = fileType || blob.type || 'application/pdf';
    setActiveFileType(resolvedType);
    if (fileName) setActiveFileName(fileName);
    if (resolvedType.startsWith('image/')) {
      setImagePreviewUrl(URL.createObjectURL(blob));
    } else {
      setImagePreviewUrl(null);
    }
  }, []);

  // Fetch the room document as a streaming raw response. This avoids large Base64
  // JSON allocations and gives us a real byte-progress signal on mobile/desktop.
  const fetchRoomDocumentFromServer = useCallback(async (reason = 'sync') => {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 120000);
    try {
      setTransferState({ fileName: reason === 'fallback' ? 'Recovering shared file…' : 'Syncing Room File…', fileSize: 0, progress: 5, status: 'streaming' });
      const metaRes = await fetch(`${backendBaseUrl}/api/rooms/${roomId}/document`, { cache: 'no-store', signal: controller.signal });
      if (!metaRes.ok) {
        if (metaRes.status === 404) {
          setTransferState({ fileName: '', fileSize: 0, progress: 0, status: 'idle' });
        }
        return false;
      }
      const meta = await metaRes.json();
      const response = await fetch(`${backendBaseUrl}/api/rooms/${roomId}/document/raw`, { cache: 'no-store', signal: controller.signal });
      if (!response.ok || !response.body) throw new Error(`Room file download failed (${response.status})`);

      const total = Number(response.headers.get('content-length') || meta.fileSize || 0);
      const reader = response.body.getReader();
      const parts: Uint8Array[] = [];
      let received = 0;

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        if (value && value.byteLength) {
          parts.push(value);
          received += value.byteLength;
          const pct = total > 0 ? Math.min(99, Math.round((received / total) * 100)) : 25;
          setTransferState({ fileName: meta.fileName || 'shared-file', fileSize: total, progress: pct, status: 'streaming' });
        }
      }

      const merged = new Uint8Array(received);
      let offset = 0;
      for (const part of parts) { merged.set(part, offset); offset += part.byteLength; }
      const arrayBuffer = merged.buffer;

      if (total > 0 && received !== total) throw new Error(`Incomplete room file: ${received}/${total} bytes`);
      const expectedHash = response.headers.get('X-File-Sha256') || meta.sha256 || '';
      if (expectedHash) {
        const actualHash = await sha256Hex(arrayBuffer);
        if (actualHash !== expectedHash) throw new Error('Room file integrity check failed');
        lastDownloadedHashRef.current = actualHash;
      }

      const detectedType = meta.fileType || 'application/octet-stream';
      const blob = new Blob([arrayBuffer], { type: detectedType });
      loadDocumentBlob(blob, meta.fileName || 'shared-file', detectedType);
      if (hostSyncMode) {
        if (meta.page) setCurrentPage(meta.page);
        if (meta.zoom) setZoomScale(meta.zoom);
      }
      setTransferState({ fileName: meta.fileName || 'shared-file', fileSize: blob.size, progress: 100, status: 'complete' });
      pendingTransferAckRef.current?.(true);
      celebrateNewFileOnce(meta.fileName || 'shared-file');
      return true;
    } catch (err) {
      console.warn('Room file download failed:', err);
      setStatusMessage(reason === 'fallback' ? 'Automatic recovery failed — retrying…' : 'Waiting for shared file…');
      return false;
    } finally {
      clearTimeout(timeout);
    }
  }, [roomId, loadDocumentBlob, celebrateNewFileOnce, hostSyncMode, backendBaseUrl]);

  // Process chunk from data channel or socket relay
  const processIncomingChunk = useCallback((chunk: ArrayBuffer, headerMeta?: { fileName?: string; fileSize?: number; fileType?: string }) => {
    const incomingFile = incomingFileRef.current;
    if (!incomingFile || !chunk.byteLength) return;

    incomingFile.chunks.push(chunk);
    incomingFile.receivedBytes += chunk.byteLength;
    const progress = incomingFile.fileSize > 0
      ? Math.min(99, Math.floor((incomingFile.receivedBytes / incomingFile.fileSize) * 100))
      : 0;
    setTransferState(prev => ({ ...prev, progress, status: 'streaming' }));
  }, []);

  const finalizeIncomingTransfer = useCallback(async () => {
    const incomingFile = incomingFileRef.current;
    if (!incomingFile) return false;
    const blob = new Blob(incomingFile.chunks, { type: incomingFile.fileType || 'application/octet-stream' });
    if (incomingFile.fileSize > 0 && blob.size !== incomingFile.fileSize) {
      await fetchRoomDocumentFromServer('fallback');
      return false;
    }
    if (incomingFile.sha256) {
      const buffer = await blob.arrayBuffer();
      const actualHash = await sha256Hex(buffer);
      if (actualHash !== incomingFile.sha256) {
        incomingFileRef.current = null;
        await fetchRoomDocumentFromServer('fallback');
        return false;
      }
      lastDownloadedHashRef.current = actualHash;
    }
    const fileName = incomingFile.fileName;
    const fileType = incomingFile.fileType;
    const transferId = incomingFile.transferId;
    incomingFileRef.current = null;
    lastDownloadedHashRef.current = incomingFile.sha256 || lastDownloadedHashRef.current;
    loadDocumentBlob(blob, fileName, fileType);
    setTransferState({ fileName, fileSize: blob.size, progress: 100, status: 'complete' });
    celebrateNewFileOnce(fileName);
    if (socketRef.current?.connected && transferId) {
      socketRef.current.emit('relay-file-ack', { roomId, transferId, ok: true });
    }
    if (dataChannelRef.current?.readyState === 'open' && transferId) {
      try { dataChannelRef.current.send(JSON.stringify({ type: 'FILE_ACK', transferId, ok: true })); } catch (_) {}
    }
    if (transferFallbackTimerRef.current) clearTimeout(transferFallbackTimerRef.current);
    return true;
  }, [loadDocumentBlob, celebrateNewFileOnce, fetchRoomDocumentFromServer]);

  // Setup WebRTC DataChannel
  const setupDataChannel = useCallback((dc: RTCDataChannel) => {
    dataChannelRef.current = dc;
    dc.binaryType = 'arraybuffer';

    dc.onopen = () => {
      setConnectionStatus('connected');
      setStatusMessage('Direct P2P Encrypted');
      celebrateConnectionOnce();

      // WebRTC is the fast path. The room cache remains the reliable recovery path.
      if (isHost && loadedPdfBlobRef.current) {
        streamFileOverDataChannel(loadedPdfBlobRef.current);
      }
    };

    dc.onclose = () => {
      setStatusMessage('P2P Channel Closed');
    };

    dc.onmessage = async (event) => {
      const data = event.data;
      if (typeof data === 'string') {
        try {
          const msg = JSON.parse(data);
          if (msg.type === 'FILE_ACK') {
            pendingTransferAckRef.current?.(msg.ok === true);
          } else if (msg.type === 'SYNC_STATE') {
            applyViewportSync(msg);
          } else if (msg.type === 'FILE_HEADER') {
            // If the verified room-cache copy is already loaded, do not start a second
            // progress bar for the same file and risk showing a misleading 96% stall.
            if (msg.sha256 && msg.sha256 === lastDownloadedHashRef.current) return;
            incomingFileRef.current = {
              fileName: msg.fileName || 'shared-file',
              fileSize: Number(msg.fileSize) || 0,
              fileType: msg.fileType || 'application/octet-stream',
              transferId: msg.transferId,
              sha256: msg.sha256,
              chunks: [],
              receivedBytes: 0,
            };
            setTransferState({
              fileName: msg.fileName || 'shared-file',
              fileSize: Number(msg.fileSize) || 0,
              progress: 0,
              status: 'streaming',
            });
            if (transferFallbackTimerRef.current) clearTimeout(transferFallbackTimerRef.current);
            transferFallbackTimerRef.current = setTimeout(() => {
              if (incomingFileRef.current) {
                void fetchRoomDocumentFromServer('fallback');
              }
            }, 12000);
          } else if (msg.type === 'FILE_END') {
            void finalizeIncomingTransfer();
          }
        } catch (_) {}
        return;
      }

      const chunk = data instanceof Blob ? await data.arrayBuffer() : normalizeToArrayBuffer(data);
      if (chunk) {
        processIncomingChunk(chunk);
      }
    };
  }, [isHost, applyViewportSync, processIncomingChunk, celebrateConnectionOnce, finalizeIncomingTransfer, fetchRoomDocumentFromServer]);

  // Create WebRTC PeerConnection
  const createPeerConnection = useCallback((targetId: string) => {
    if (pcRef.current) {
      try { pcRef.current.close(); } catch (_) {}
    }

    const pc = new RTCPeerConnection(rtcConfigRef.current);
    pcRef.current = pc;

    pc.onicecandidate = (event) => {
      if (event.candidate && socketRef.current) {
        socketRef.current.emit('signal-ice', { targetPeerId: targetId, candidate: event.candidate });
      }
    };

    pc.onconnectionstatechange = () => {
      const state = pc.connectionState;
      if (state === 'connected') {
        if (reconnectTimerRef.current) clearTimeout(reconnectTimerRef.current);
        reconnectTimerRef.current = null;
        reconnectingRef.current = false;
        setConnectionStatus('connected');
        setStatusMessage('Direct P2P Encrypted');
        celebrateConnectionOnce();
      } else if (state === 'connecting') {
        setConnectionStatus('connecting');
        setStatusMessage('Negotiating P2P Tunnel…');
      } else if (state === 'failed' || state === 'disconnected') {
        setConnectionStatus('error');
        setStatusMessage('Reconnecting P2P…');
        hasCelebratedConnectionRef.current = false;
        if (isHost && targetId && !reconnectingRef.current) {
          reconnectingRef.current = true;
          reconnectTimerRef.current = setTimeout(() => {
            reconnectingRef.current = false;
            reconnectOfferRef.current?.(targetId);
          }, state === 'failed' ? 500 : 2000);
        }
      }
    };

    pc.oniceconnectionstatechange = () => {
      if (isHost && pc.iceConnectionState === 'failed' && !reconnectingRef.current) {
        reconnectingRef.current = true;
        pc.restartIce();
        reconnectTimerRef.current = setTimeout(() => {
          reconnectingRef.current = false;
          reconnectOfferRef.current?.(targetId);
        }, 1000);
      }
    };

    return pc;
  }, [isHost]);

  // Initiate WebRTC Offer
  const initiateOffer = useCallback(async (targetSocketId: string) => {
    if (!socketRef.current) return;
    peerSocketId.current = targetSocketId;
    setConnectionStatus('connecting');
    setStatusMessage('Connecting via WebRTC…');

    const pc = createPeerConnection(targetSocketId);
    const dc = pc.createDataChannel('p2p-stream', { ordered: true });
    setupDataChannel(dc);

    const offer = await pc.createOffer();
    await pc.setLocalDescription(offer);
    socketRef.current.emit('signal-offer', { targetPeerId: targetSocketId, sdp: offer });
  }, [createPeerConnection, setupDataChannel]);

  reconnectOfferRef.current = initiateOffer;

  // Connect to Signaling Server
  const initSignaling = useCallback(() => {
    if (socketRef.current?.connected) return;

    const socket = ioConnect(backendBaseUrl, {
      path: '/socket.io',
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionAttempts: Infinity,
      reconnectionDelay: 500,
      reconnectionDelayMax: 5000,
      timeout: 10000,
    });
    socketRef.current = socket;

    fetch(`${backendBaseUrl}/api/webrtc-config`)
      .then(response => response.ok ? response.json() : null)
      .then(config => {
        if (config?.iceServers?.length) rtcConfigRef.current = { iceServers: config.iceServers };
      })
      .catch(() => undefined);

    socket.on('connect', () => {
      socket.emit('join-room', { roomId, role: isHost ? 'host' : 'peer', isHost });
      setStatusMessage(isHost ? 'Waiting for Peer to Scan QR…' : 'Connecting to Host Session…');
    });

    socket.on('room-info', async ({ members, roomSize }: any) => {
      setPeerCount(Math.max(0, roomSize - 1));
      // Reliability path: guests fetch the authoritative room cache immediately after joining,
      // instead of waiting for WebRTC negotiation or a separate document event.
      if (!isHost) {
        await fetchRoomDocumentFromServer();
      }
      if (members?.length > 0) {
        const peer = members[0];
        peerSocketId.current = peer.socketId;

        // If I am Host and peer is already present, negotiate WebRTC
        if (isHost) {
          await initiateOffer(peer.socketId);
        }
      }
    });

    // Notify Guest that a document is already live in this room
    socket.on('room-document-available', async ({ fileName, page, zoom }: any) => {
      setStatusMessage('Document Available. Loading…');
      await fetchRoomDocumentFromServer();
      if (hostSyncMode) {
        if (page) setCurrentPage(page);
        if (zoom) setZoomScale(zoom);
      }
    });

    // Host receives new peer join
    socket.on('peer-joined', async ({ socketId }: any) => {
      peerSocketId.current = socketId;
      setPeerCount(c => c + 1);

      if (isHost) {
        await initiateOffer(socketId);
      }
    });

    // Guest receives Offer
    socket.on('signal-offer', async ({ senderId, sdp }: any) => {
      peerSocketId.current = senderId;
      setConnectionStatus('connecting');
      setStatusMessage('Direct P2P Handshake…');

      const pc = createPeerConnection(senderId);
      pc.ondatachannel = (e) => setupDataChannel(e.channel);

      await pc.setRemoteDescription(new RTCSessionDescription(sdp));
      await processQueuedIceCandidates(pc);

      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);
      socket.emit('signal-answer', { targetPeerId: senderId, sdp: answer });
    });

    // Host receives Answer
    socket.on('signal-answer', async ({ sdp }: any) => {
      const pc = pcRef.current;
      if (pc && pc.signalingState !== 'stable') {
        await pc.setRemoteDescription(new RTCSessionDescription(sdp));
        await processQueuedIceCandidates(pc);
      }
    });

    // ICE Candidate Relay
    socket.on('signal-ice', async ({ candidate }: any) => {
      const pc = pcRef.current;
      if (pc && pc.remoteDescription && pc.remoteDescription.type) {
        try {
          await pc.addIceCandidate(new RTCIceCandidate(candidate));
        } catch (err) {
          console.warn('ICE add candidate error:', err);
        }
      } else {
        iceCandidatesQueue.current.push(candidate);
      }
    });

    // Real-time Viewport Sync
    socket.on('sync-state', (event: any) => {
      if (hostSyncMode && event?.senderId !== socket.id) applyViewportSync(event);
    });

    // Fallback chunk relay over socket when WebRTC data channels are blocked
    socket.on('relay-chunk-fallback', ({ chunk }: any) => {
      if (!chunk) return;
      if (chunk.type === 'FILE_HEADER') {
        if (chunk.sha256 && chunk.sha256 === lastDownloadedHashRef.current) return;
        incomingFileRef.current = {
          fileName: chunk.fileName || 'shared-file',
          fileSize: Number(chunk.fileSize) || 0,
          fileType: chunk.fileType || 'application/octet-stream',
          transferId: chunk.transferId,
          sha256: chunk.sha256,
          chunks: [],
          receivedBytes: 0,
        };
        setTransferState({
          fileName: chunk.fileName || 'shared-file',
          fileSize: Number(chunk.fileSize) || 0,
          progress: 0,
          status: 'streaming',
        });
      } else if (chunk.type === 'FILE_SLICE' && chunk.data) {
        const sliceBuffer = base64ToArrayBuffer(chunk.data);
        processIncomingChunk(sliceBuffer);
      } else if (chunk.type === 'FILE_END') {
        void finalizeIncomingTransfer();
      }
    });

    socket.on('room-message', ({ text, senderId, timestamp }: any) => {
      setChatMessages(prev => [...prev, { text, senderId, timestamp, isSelf: senderId === socket.id }]);
    });

    socket.on('peer-left', () => {
      setPeerCount(c => Math.max(0, c - 1));
      setStatusMessage('Peer Left Room');
      hasCelebratedConnectionRef.current = false;
    });

    socket.on('disconnect', () => {
      setConnectionStatus('error');
      setStatusMessage('Connection interrupted — your room file remains recoverable.');
      hasCelebratedConnectionRef.current = false;
      if (!isHost) void fetchRoomDocumentFromServer('fallback');
    });

    socket.on('connect_error', () => {
      setConnectionStatus('error');
      setStatusMessage('Retrying session connection…');
    });

    socket.on('room-full', () => {
      setConnectionStatus('error');
      setStatusMessage('Room is full');
    });
  }, [roomId, isHost, initiateOffer, createPeerConnection, setupDataChannel, applyViewportSync, fetchRoomDocumentFromServer, processIncomingChunk, finalizeIncomingTransfer, backendBaseUrl, hostSyncMode]);

  useEffect(() => {
    if (activeSubTool === 'p2p_share') {
      initSignaling();
    }
    return () => {
      if (reconnectTimerRef.current) clearTimeout(reconnectTimerRef.current);
      if (transferFallbackTimerRef.current) clearTimeout(transferFallbackTimerRef.current);
      reconnectTimerRef.current = null;
      reconnectingRef.current = false;
      socketRef.current?.disconnect();
      pcRef.current?.close();
    };
  }, [activeSubTool, initSignaling]);

  // ─── Dual-Stream Upload: RAM Cache + WebRTC Channel + Socket Relay Fallback ───
  const uploadAndStreamDocument = async (file: File) => {
    if (!file) return;

    const fileType = file.type || (file.name.toLowerCase().endsWith('.pdf') ? 'application/pdf' : 'application/octet-stream');
    setActiveFileName(file.name);
    setActiveFileType(fileType);
    setLoadedPdfBlob(file);

    if (fileType.startsWith('image/')) {
      setImagePreviewUrl(URL.createObjectURL(file));
    } else {
      setImagePreviewUrl(null);
    }

    setTransferState({
      fileName: file.name,
      fileSize: file.size,
      progress: 10,
      status: 'streaming',
    });

    // 1. Store a verified binary copy on Railway. The server cache is the authoritative
    // recovery path, so WebRTC can be optimized for speed without risking file loss.
    try {
      setTransferState(prev => ({ ...prev, progress: 15 }));
      const uploadResponse = await fetch(`${backendBaseUrl}/api/rooms/${roomId}/document`, {
        method: 'POST',
        headers: {
          'Content-Type': fileType,
          'X-File-Name': encodeURIComponent(file.name),
          'X-File-Type': fileType,
        },
        body: file,
      });
      if (!uploadResponse.ok) {
        const message = await uploadResponse.text().catch(() => 'Unable to cache room file');
        throw new Error(message || `Room upload failed (${uploadResponse.status})`);
      }
      const uploaded = await uploadResponse.json();
      publishedHashRef.current = uploaded.sha256 || '';
      setTransferState(prev => ({ ...prev, progress: 35, status: 'streaming' }));
      celebrateNewFileOnce(file.name);
    } catch (err) {
      console.error('Failed to cache document on room:', err);
      setStatusMessage('Could not publish the file. Check the Railway connection and retry.');
      setTransferState(prev => ({ ...prev, status: 'idle' }));
      return;
    }

    // 2. WebRTC remains the acceleration path. Do not preload the entire file into RAM.
    void streamFileOverDataChannel(file);
  };

  const streamFileOverDataChannel = async (fileOrBlob: Blob | File) => {
    const dc = dataChannelRef.current;
    const fileName = (fileOrBlob as File).name || activeFileName || 'shared-file';
    const fileType = fileOrBlob.type || activeFileType || 'application/octet-stream';
    const fileSize = fileOrBlob.size;

    try {
      let sha256 = publishedHashRef.current;
      if (!sha256) {
        sha256 = await sha256Hex(await fileOrBlob.arrayBuffer());
      }
      const transferId = crypto.randomUUID();
      const header = { type: 'FILE_HEADER', transferId, fileName, fileSize, fileType, sha256 };

      if (dc && dc.readyState === 'open') {
        dc.send(JSON.stringify(header));
        for (let offset = 0; offset < fileSize; offset += CHUNK_SIZE) {
          while (dc.bufferedAmount > CHUNK_SIZE * 12) {
            await new Promise<void>(resolve => {
              const check = () => dc.bufferedAmount <= CHUNK_SIZE * 4 ? resolve() : setTimeout(check, 12);
              check();
            });
          }
          const piece = await fileOrBlob.slice(offset, Math.min(offset + CHUNK_SIZE, fileSize)).arrayBuffer();
          dc.send(piece);
        }
        dc.send(JSON.stringify({ type: 'FILE_END', transferId, fileSize, sha256 }));
        // Receiver sends FILE_ACK only after size + SHA-256 verification.
        await new Promise<boolean>(resolve => {
          const timer = window.setTimeout(() => {
            pendingTransferAckRef.current = null;
            resolve(false);
          }, 15000);
          pendingTransferAckRef.current = ok => {
            window.clearTimeout(timer);
            pendingTransferAckRef.current = null;
            resolve(ok);
          };
        });
        return;
      }

      // Signaling relay is a compatibility path only; the binary room cache remains the source of truth.
      if (socketRef.current?.connected) {
        socketRef.current.emit('relay-file-request', { roomId, transferId, fileName, fileSize, fileType, sha256 });
      }
    } catch (err) {
      console.warn('Fast P2P stream interrupted; room-cache recovery remains available:', err);
    }
  };

  // ─── Render PDF with PDF.js on HTML5 Canvas ───────────────────────────
  useEffect(() => {
    if (!loadedPdfBlob || activeFileType !== 'application/pdf') { setPdfDoc(null); return; }

    let isMounted = true;
    (async () => {
      try {
        const arrayBuf = await loadedPdfBlob.arrayBuffer();
        const doc = await pdfjsLib.getDocument({
          data: new Uint8Array(arrayBuf),
          useSystemFonts: true,
          cMapUrl: 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/cmaps/',
          cMapPacked: true,
        }).promise;

        if (isMounted) {
          setPdfDoc(doc);
          setTotalPages(doc.numPages);
          setCurrentPage(1);
        }
      } catch (err) {
        console.error('Failed to parse PDF document:', err);
      }
    })();

    return () => {
      isMounted = false;
    };
  }, [loadedPdfBlob, activeFileType]);

  // Page Render onto Canvas
  useEffect(() => {
    if (!pdfDoc || !canvasRef.current) return;

    let isCancelled = false;
    (async () => {
      try {
        if (renderTaskRef.current) {
          try { await renderTaskRef.current.cancel(); } catch (_) {}
        }

        const page = await pdfDoc.getPage(currentPage);
        if (isCancelled) return;

        const dpr = window.devicePixelRatio || 1;
        const containerWidth = canvasContainerRef.current ? Math.max(280, canvasContainerRef.current.clientWidth - 32) : 750;
        const baseViewport = page.getViewport({ scale: 1.0 });
        const autoFitScale = Math.min(1.5, Math.max(0.6, containerWidth / baseViewport.width));
        const effectiveScale = autoFitScale * zoomScale;

        const viewport = page.getViewport({ scale: effectiveScale });

        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        canvas.width = Math.floor(viewport.width * dpr);
        canvas.height = Math.floor(viewport.height * dpr);
        canvas.style.width = `${Math.floor(viewport.width)}px`;
        canvas.style.height = `${Math.floor(viewport.height)}px`;

        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

        const task = page.render({
          canvasContext: ctx,
          viewport: viewport,
          background: 'rgb(255, 255, 255)',
        });
        renderTaskRef.current = task;
        await task.promise;
      } catch (err: any) {
        if (err?.name !== 'RenderingCancelledException') {
          console.warn('PDF canvas render warning:', err);
        }
      }
    })();

    return () => {
      isCancelled = true;
    };
  }, [pdfDoc, currentPage, zoomScale]);

  const downloadLoadedFile = useCallback(() => {
    const blob = loadedPdfBlobRef.current;
    if (!blob) return;
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = activeFileName || 'shared-document.pdf';
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    window.setTimeout(() => URL.revokeObjectURL(url), 1000);
  }, [activeFileName]);

  // Page Navigation Handlers
  const handlePageChange = (newPage: number) => {
    if (newPage < 1 || newPage > totalPages) return;
    setCurrentPage(newPage);
    if (hostSyncMode) {
      const scrollRatio = canvasContainerRef.current && canvasContainerRef.current.scrollHeight > 0
        ? canvasContainerRef.current.scrollTop / canvasContainerRef.current.scrollHeight
        : 0;
      broadcastSync(newPage, zoomScale, scrollRatio);
    }
  };

  const handleZoomChange = (delta: number) => {
    const newZoom = Math.min(2.5, Math.max(0.6, +(zoomScale + delta).toFixed(2)));
    setZoomScale(newZoom);
    if (hostSyncMode) {
      const scrollRatio = canvasContainerRef.current && canvasContainerRef.current.scrollHeight > 0
        ? canvasContainerRef.current.scrollTop / canvasContainerRef.current.scrollHeight
        : 0;
      broadcastSync(currentPage, newZoom, scrollRatio);
    }
  };

  const handleReconnect = () => {
    if (peerSocketId.current) {
      initiateOffer(peerSocketId.current);
    } else if (socketRef.current) {
      socketRef.current.emit('join-room', { roomId, role: isHost ? 'host' : 'peer', isHost });
    }
  };

  const handleSendChat = () => {
    if (!chatInput.trim() || !socketRef.current) return;
    socketRef.current.emit('room-message', { roomId, text: chatInput.trim() });
    setChatInput('');
  };

  const subTools = [
    { id: 'p2p_share' as ToolMode, label: 'P2P File Share', icon: Share2, desc: 'Zero-install camera pairing, encrypted streaming & live co-viewing' },
    { id: 'collab_whiteboard' as ToolMode, label: 'Excalidraw Whiteboard', icon: PenTool, desc: 'Real-time collaborative whiteboard' },
  ];

  return (
    <div className="space-y-5 max-w-7xl mx-auto w-full animate-in fade-in duration-200">
      
      {/* Top Header & Connection Indicators */}
      <div className="flex items-center justify-between pb-3 border-b border-black/[0.06] dark:border-white/[0.08] flex-wrap gap-2">
        <button
          onClick={onBackToHome}
          className="flex items-center gap-2 text-[14px] font-semibold text-[#0071e3] dark:text-[#2997ff] hover:opacity-80 transition-opacity cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to All Tools</span>
        </button>

        <div className="flex items-center gap-2 flex-wrap">
          {activeSubTool === 'p2p_share' && (
            <>
              {/* Role Badge */}
              <span className={`px-2.5 py-1 rounded-full text-[11px] font-bold uppercase tracking-wider ${
                isHost
                  ? 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20'
                  : 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20'
              }`}>
                {isHost ? 'Host' : 'Guest'}
              </span>

              {/* Status Indicator */}
              <span className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-[11.5px] font-bold ${
                connectionStatus === 'connected'
                  ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20'
                  : connectionStatus === 'connecting'
                  ? 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20'
                  : 'bg-black/[0.05] dark:bg-white/[0.05] text-[#86868b] border border-black/[0.08] dark:border-white/[0.1]'
              }`}>
                {connectionStatus === 'connected' ? (
                  <Wifi className="w-3.5 h-3.5 text-emerald-500" />
                ) : connectionStatus === 'connecting' ? (
                  <RefreshCw className="w-3.5 h-3.5 text-amber-500 animate-spin" />
                ) : (
                  <WifiOff className="w-3.5 h-3.5 text-[#86868b]" />
                )}
                <span>{statusMessage}</span>
              </span>

              {/* Peer count */}
              {peerCount > 0 && (
                <span className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-blue-500/10 text-blue-600 dark:text-blue-400 text-[11px] font-bold border border-blue-500/20">
                  <Users className="w-3 h-3" />
                  <span>{peerCount} peer{peerCount > 1 ? 's' : ''}</span>
                </span>
              )}

              {/* Retry button */}
              {connectionStatus === 'error' && (
                <button
                  onClick={handleReconnect}
                  className="p-1.5 rounded-lg bg-red-500/10 hover:bg-red-500/20 text-red-500 transition-colors cursor-pointer"
                  title="Retry Connection"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                </button>
              )}
            </>
          )}
        </div>
      </div>

      {/* Sub-tool Switcher */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
        {subTools.map((tool) => {
          const ToolIcon = tool.icon;
          const isActive = activeSubTool === tool.id;
          return (
            <button
              key={tool.id}
              onClick={() => setActiveSubTool(tool.id)}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-[13px] font-medium whitespace-nowrap transition-all cursor-pointer ${
                isActive
                  ? 'bg-[#0071e3] text-white shadow-sm font-semibold'
                  : 'bg-white dark:bg-[#1c1c1e] text-[#6e6e73] dark:text-[#a1a1a6] hover:text-[#1d1d1f] dark:hover:text-[#f5f5f7] border border-black/[0.06] dark:border-white/[0.08]'
              }`}
            >
              <ToolIcon className="w-4 h-4" />
              <span>{tool.label}</span>
            </button>
          );
        })}
      </div>

      {/* WHITEBOARD SUB-TOOL */}
      {activeSubTool === 'collab_whiteboard' && (
        <div className="w-full rounded-2xl overflow-hidden border border-black/[0.1] dark:border-white/[0.15] bg-[#fafafc] dark:bg-[#121214]" style={{ height: 'calc(100vh - 250px)', minHeight: '650px' }}>
          <Excalidraw theme="light" />
        </div>
      )}

      {/* P2P FILE SHARE MAIN CONTAINER */}
      {activeSubTool === 'p2p_share' && (
        <div className="space-y-6">

          {/* LOBBY & PAIRING STAGE (Shown when no document loaded) */}
          {!loadedPdfBlob && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              
              {/* QR Code & Auto-Adjusting Network Card */}
              <div className="p-6 sm:p-8 rounded-3xl bg-white dark:bg-[#1c1c1e] border border-black/[0.08] dark:border-white/[0.1] shadow-md flex flex-col items-center justify-between text-center space-y-4">
                
                <div className="space-y-1">
                  <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-bold bg-blue-500/10 text-blue-600 dark:text-blue-400 mb-1">
                    <Smartphone className="w-3.5 h-3.5" />
                    Zero-Install Mobile Camera Pairing
                  </div>
                  <h3 className="text-lg font-bold text-[#1d1d1f] dark:text-[#f5f5f7]">
                    Scan with iPhone or Android Camera
                  </h3>
                  {/* Tunnel Status Badge */}
                  <div className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold mt-1 ${
                    isUsingTunnel
                      ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20'
                      : tunnelStatus === 'starting'
                      ? 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20'
                      : 'bg-orange-500/10 text-orange-600 dark:text-orange-400 border border-orange-500/20'
                  }`}>
                    {isHostedPublicOrigin ? (
                      <><ShieldCheck className="w-3 h-3" /> Public HTTPS link ready — scan from any device</>
                    ) : isUsingTunnel ? (
                      <><ShieldCheck className="w-3 h-3" /> Public tunnel active — cross-network access ready</>
                    ) : tunnelStatus === 'starting' ? (
                      <><RefreshCw className="w-3 h-3 animate-spin" /> Preparing local public link…</>
                    ) : (
                      <><Globe className="w-3 h-3" /> LAN link active — same Wi-Fi only</>
                    )}
                  </div>
                </div>

                {/* QR Code */}
                <div className="p-3 bg-white rounded-2xl shadow-md border border-black/[0.08] relative">
                  {qrDataUrl ? (
                    <img src={qrDataUrl} alt="Room QR Code" width={220} height={220} className="rounded-xl block mx-auto" />
                  ) : (
                    <div className="w-[220px] h-[220px] flex flex-col items-center justify-center gap-2 text-[#86868b]">
                      <RefreshCw className="w-6 h-6 animate-spin text-amber-500" />
                      <p className="text-[11px] text-center font-medium px-4">
                        Generating your secure share QR…
                      </p>
                    </div>
                  )}
                </div>

                {/* Network details — secondary section, shown as collapsible */}
                <div className="w-full space-y-2.5 text-left">
                  {/* Active tunnel URL or LAN selector */}
                  {isUsingTunnel ? (
                    <div className="p-2.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-800/30 text-[11px]">
                      <p className="font-semibold text-emerald-800 dark:text-emerald-300 flex items-center gap-1">
                        <Globe className="w-3.5 h-3.5" /> Public Tunnel URL:
                      </p>
                      <p className="font-mono text-emerald-700 dark:text-emerald-400 break-all mt-0.5">{tunnelUrl}</p>
                      <p className="text-emerald-600 dark:text-emerald-500 mt-1">
                        This URL works from any phone on any network, including 4G/5G cellular data.
                      </p>
                    </div>
                  ) : (
                   <div className="flex items-center justify-between text-[11px] text-[#86868b] px-1">
                      <span className="flex items-center gap-1 font-semibold text-[#1d1d1f] dark:text-[#f5f5f7]">
                        <Network className="w-3.5 h-3.5 text-[#0071e3]" />
                        Local network fallback:
                      </span>
                      <button
                        onClick={refreshNetworks}
                        disabled={isRefreshingNet}
                        className="flex items-center gap-1 text-[#0071e3] hover:underline cursor-pointer font-semibold disabled:opacity-50"
                      >
                        <RefreshCw className={`w-3 h-3 ${isRefreshingNet ? 'animate-spin' : ''}`} />
                        <span>Refresh</span>
                      </button>
                    </div>
                  )}

                    <div className="p-3 rounded-2xl bg-[#0071e3]/5 border border-[#0071e3]/15 space-y-2">
                     <div className="flex items-center justify-between gap-2">
                       <span className="text-[12px] font-bold text-[#1d1d1f] dark:text-[#f5f5f7]">Connect via Session ID</span>
                       <span className="text-[10px] text-[#86868b]">Paste ID or shared link</span>
                     </div>
                     <div className="flex gap-2">
                       <input value={sessionInput} onChange={e => setSessionInput(e.target.value)}
                         onKeyDown={e => { if (e.key === 'Enter') joinBySessionId(); }}
                         placeholder="e.g. A7k9_x2Pq"
                         className="min-w-0 flex-1 bg-white dark:bg-[#1c1c1e] border border-black/[0.08] dark:border-white/[0.1] rounded-xl px-3 py-2 text-[12px] font-mono outline-none focus:border-[#0071e3]"
                         aria-label="Session ID" />
                       <button onClick={joinBySessionId} className="px-3 py-2 rounded-xl bg-[#0071e3] text-white text-[12px] font-semibold cursor-pointer">Join</button>
                     </div>
                   </div>

                  {/* Network Adapter Dropdown (only shown when not using tunnel) */}
                  {!isUsingTunnel && !isCustomHostMode && (
                    <div className="flex items-center gap-2">
                      <select
                        value={selectedIp}
                        onChange={(e) => setSelectedIp(e.target.value)}
                        className="w-full bg-[#fafafc] dark:bg-[#252528] border border-black/[0.08] dark:border-white/[0.1] rounded-xl px-3 py-2 text-[12px] font-medium text-[#1d1d1f] dark:text-[#f5f5f7] outline-none cursor-pointer focus:border-[#0071e3]"
                      >
                        {networkInterfaces.map((iface) => (
                          <option key={iface.ip} value={iface.ip}>
                            {iface.name}
                          </option>
                        ))}
                      </select>
                      <button
                        onClick={() => setIsCustomHostMode(true)}
                        className="px-2.5 py-2 rounded-xl bg-black/[0.04] dark:bg-white/[0.08] text-[11px] font-semibold text-[#6e6e73] dark:text-[#a1a1a6] hover:text-[#1d1d1f] dark:hover:text-[#f5f5f7] whitespace-nowrap cursor-pointer"
                        title="Enter Custom URL"
                      >
                        Custom URL
                      </button>
                    </div>
                  )}

                  {isCustomHostMode && (
                    <div className="flex items-center gap-2">
                      <input
                        type="text"
                        value={customHost}
                        onChange={(e) => setCustomHost(e.target.value)}
                        placeholder="e.g. 192.168.1.100:3000 or myapp.ngrok.io"
                        className="flex-1 bg-[#fafafc] dark:bg-[#252528] border border-black/[0.08] dark:border-white/[0.1] rounded-xl px-3 py-2 text-[12px] text-[#1d1d1f] dark:text-[#f5f5f7] outline-none focus:border-[#0071e3]"
                      />
                      <button
                        onClick={() => setIsCustomHostMode(false)}
                        className="px-2.5 py-2 rounded-xl bg-black/[0.04] dark:bg-white/[0.08] text-[11px] font-semibold text-[#6e6e73] cursor-pointer"
                      >
                        Cancel
                      </button>
                    </div>
                  )}

                  {/* Shareable Link Bar */}
                  <div className="flex items-center gap-2 p-1.5 rounded-2xl bg-[#fafafc] dark:bg-[#252528] border border-black/[0.08] dark:border-white/[0.1]">
                    <div className="flex items-center gap-1.5 px-2 text-[11px] font-mono font-bold text-[#86868b] truncate flex-1">
                      <Lock className="w-3.5 h-3.5 text-[#0071e3] shrink-0" />
                      <span className="truncate">{shareUrl}</span>
                    </div>
                    <button
                      onClick={() => {
                        void copyTextToClipboard(shareUrl).then(ok => { setCopiedLink(ok); });
                        setTimeout(() => setCopiedLink(false), 2000);
                      }}
                      className="px-3 py-1.5 rounded-xl bg-[#0071e3] hover:bg-[#0071e3]/90 text-white text-[12px] font-semibold flex items-center gap-1 transition-opacity cursor-pointer shrink-0"
                    >
                      {copiedLink ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                      <span>{copiedLink ? 'Copied' : 'Copy'}</span>
                    </button>
                  </div>

                  <div className="flex items-center justify-between text-[11px] text-[#86868b] px-1">
                    <div className="flex items-center gap-2 min-w-0">
                       <span className="truncate">Session: <strong className="font-mono text-[#1d1d1f] dark:text-[#f5f5f7]">{roomId}</strong></span>
                       <button onClick={() => { void copyTextToClipboard(roomId).then(ok => { if (ok) { setCopiedSessionId(true); setTimeout(() => setCopiedSessionId(false), 2000); } }); }}
                         className="inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-black/[0.04] dark:bg-white/[0.08] text-[10px] font-semibold cursor-pointer shrink-0">
                         {copiedSessionId ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}{copiedSessionId ? 'Copied' : 'Copy ID'}
                       </button>
                     </div>
                    <span className="flex items-center gap-1 text-emerald-600 dark:text-emerald-400 font-semibold">
                      <ShieldCheck className="w-3.5 h-3.5" /> Encrypted transport + integrity check
                    </span>
                  </div>
                </div>
              </div>

              {/* Host Upload Dropzone */}
              <div className="p-6 sm:p-8 rounded-3xl bg-white dark:bg-[#1c1c1e] border border-black/[0.08] dark:border-white/[0.1] shadow-md flex flex-col justify-between space-y-5">
                <div className="space-y-1">
                  <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-bold bg-purple-500/10 text-purple-600 dark:text-purple-400 mb-1">
                    <Zap className="w-3.5 h-3.5" />
                    Encrypted P2P File & Document Streaming
                  </div>
                  <h3 className="text-lg font-bold text-[#1d1d1f] dark:text-[#f5f5f7]">
                    Upload File to Synchronize with Room
                  </h3>
                  <p className="text-[12.5px] text-[#6e6e73] dark:text-[#8e8e93]">
                    Drop any PDF, image, archive or document to instantly stream it directly to connected peers and phones scanning the QR code.
                  </p>
                </div>

                <div
                  onClick={() => fileInputRef.current?.click()}
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={(e) => {
                    e.preventDefault();
                    if (e.dataTransfer.files?.[0]) {
                      uploadAndStreamDocument(e.dataTransfer.files[0]);
                    }
                  }}
                  className="border-2 border-dashed border-[#0071e3]/30 hover:border-[#0071e3] bg-[#0071e3]/5 hover:bg-[#0071e3]/10 rounded-2xl p-8 flex flex-col items-center justify-center text-center cursor-pointer transition-all space-y-3"
                >
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="*/*"
                    onChange={(e) => {
                      if (e.target.files?.[0]) uploadAndStreamDocument(e.target.files[0]);
                    }}
                    className="hidden"
                  />
                  <div className="w-12 h-12 rounded-2xl bg-[#0071e3]/10 text-[#0071e3] flex items-center justify-center">
                    <FileUp className="w-6 h-6" />
                  </div>
                  <div>
                    <p className="font-bold text-[14px] text-[#1d1d1f] dark:text-[#f5f5f7]">
                      Choose or Drag & Drop File
                    </p>
                    <p className="text-[12px] text-[#86868b] mt-0.5">
                      PDF, Images, ZIP, Word, Excel, and All Formats
                    </p>
                  </div>
                </div>

                {/* Privacy Badge */}
                <div className="p-3.5 rounded-2xl bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-800/30 flex items-start gap-3">
                  <ShieldCheck className="w-5 h-5 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
                  <div className="text-[12px]">
                    <span className="font-bold text-emerald-900 dark:text-emerald-300 block">Session Privacy Guarantee</span>
                    <p className="text-emerald-700 dark:text-emerald-500 leading-relaxed text-[11.5px]">
                      Document bytes are held in ephemeral room volatile memory only while participants are present, and never saved to permanent disk storage.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* STREAMING PROGRESS BAR */}
          {transferState.status === 'streaming' && (
            <div className="p-4 rounded-2xl bg-white dark:bg-[#1c1c1e] border border-black/[0.08] dark:border-white/[0.1] shadow-md space-y-2">
              <div className="flex items-center justify-between text-[13px] font-semibold">
                <span className="flex items-center gap-2 text-[#1d1d1f] dark:text-[#f5f5f7]">
                  <Activity className="w-4 h-4 text-[#0071e3] animate-spin" />
                  <span>Streaming <strong>{transferState.fileName}</strong></span>
                </span>
                <span className="font-mono text-[#0071e3] dark:text-[#2997ff] font-bold">
                  {transferState.progress}%
                </span>
              </div>
              <div className="w-full h-2 bg-black/[0.06] dark:bg-white/[0.08] rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-[#0071e3] to-emerald-500 transition-all duration-150 rounded-full"
                  style={{ width: `${transferState.progress}%` }}
                />
              </div>
            </div>
          )}

          {/* SYNCHRONIZED DOCUMENT & FILE VIEWPORT STAGE */}
          {loadedPdfBlob && (
            <div className="rounded-3xl border border-black/[0.08] dark:border-white/[0.1] bg-white dark:bg-[#1c1c1e] overflow-hidden shadow-xl space-y-0">
              
              {/* Controls Toolbar */}
              <div className="p-3.5 bg-[#f5f5f7] dark:bg-[#252528] border-b border-black/[0.06] dark:border-white/[0.08] flex items-center justify-between flex-wrap gap-2.5">
                
                {/* Host Sync & QR Modal Button */}
                <div className="flex items-center gap-2 flex-wrap">
                  <button
                    onClick={() => setHostSyncMode(v => !v)}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[12px] font-semibold transition-all cursor-pointer ${
                      hostSyncMode
                        ? 'bg-blue-600 text-white shadow-xs'
                        : 'bg-black/[0.05] dark:bg-white/[0.08] text-[#86868b]'
                    }`}
                  >
                    <Radio className={`w-3.5 h-3.5 ${hostSyncMode ? 'animate-pulse' : ''}`} />
                    <span>{hostSyncMode ? 'Host Sync Mode (Active)' : 'Free Scroll (Independent)'}</span>
                  </button>

                  <button
                    onClick={() => setShowQrModal(true)}
                    className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-white dark:bg-[#1c1c1e] border border-black/[0.08] dark:border-white/[0.1] text-[12px] text-[#1d1d1f] dark:text-[#f5f5f7] font-semibold shadow-2xs cursor-pointer hover:bg-black/[0.02]"
                  >
                    <QrCode className="w-3.5 h-3.5 text-[#0071e3]" />
                    <span>Room QR</span>
                  </button>

                  <button
                    onClick={() => {
                      setLoadedPdfBlob(null);
                      setPdfDoc(null);
                      setImagePreviewUrl(null);
                    }}
                    className="text-[12px] text-[#86868b] hover:text-red-500 px-2 py-1 transition-colors cursor-pointer"
                  >
                    Close File
                  </button>
                </div>

                {/* Controls Area */}
                <div className="flex items-center gap-2">
                  {/* PDF Page Controls (when PDF is active) */}
                  {pdfDoc && (
                    <div className="flex items-center bg-white dark:bg-[#1c1c1e] rounded-xl border border-black/[0.08] dark:border-white/[0.1] p-0.5 shadow-2xs">
                      <button
                        onClick={() => handlePageChange(currentPage - 1)}
                        disabled={currentPage <= 1}
                        className="p-1.5 hover:bg-black/[0.04] dark:hover:bg-white/[0.08] rounded-lg disabled:opacity-30 cursor-pointer"
                      >
                        <ChevronLeft className="w-4 h-4" />
                      </button>
                      <span className="px-2.5 font-mono font-bold text-[12px] text-[#1d1d1f] dark:text-[#f5f5f7]">
                        {currentPage} / {totalPages}
                      </span>
                      <button
                        onClick={() => handlePageChange(currentPage + 1)}
                        disabled={currentPage >= totalPages}
                        className="p-1.5 hover:bg-black/[0.04] dark:hover:bg-white/[0.08] rounded-lg disabled:opacity-30 cursor-pointer"
                      >
                        <ChevronRight className="w-4 h-4" />
                      </button>
                    </div>
                  )}

                  {/* Zoom Controls (for PDF or Image) */}
                  {(pdfDoc || imagePreviewUrl) && (
                    <div className="flex items-center bg-white dark:bg-[#1c1c1e] rounded-xl border border-black/[0.08] dark:border-white/[0.1] p-0.5 shadow-2xs">
                      <button
                        onClick={() => handleZoomChange(-0.2)}
                        disabled={zoomScale <= 0.6}
                        className="p-1.5 hover:bg-black/[0.04] dark:hover:bg-white/[0.08] rounded-lg disabled:opacity-30 cursor-pointer"
                      >
                        <ZoomOut className="w-4 h-4" />
                      </button>
                      <span className="px-2 font-mono text-[12px] font-medium text-[#1d1d1f] dark:text-[#f5f5f7]">
                        {Math.round(zoomScale * 100)}%
                      </span>
                      <button
                        onClick={() => handleZoomChange(0.2)}
                        disabled={zoomScale >= 2.5}
                        className="p-1.5 hover:bg-black/[0.04] dark:hover:bg-white/[0.08] rounded-lg disabled:opacity-30 cursor-pointer"
                      >
                        <ZoomIn className="w-4 h-4" />
                      </button>
                    </div>
                  )}

                  {/* Save Local Copy */}
                  {loadedPdfBlob && (
                    <button type="button" onClick={downloadLoadedFile}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#0071e3] text-white hover:bg-[#0071e3]/90 text-[12px] font-semibold cursor-pointer shadow-xs"
                      title="Download PDF / shared file">
                      <Download className="w-4 h-4" />
                      <span>Download {activeFileType === 'application/pdf' ? 'PDF' : 'File'}</span>
                      <span className="opacity-80 font-mono">{(loadedPdfBlob.size / (1024 * 1024)).toFixed(2)} MB</span>
                    </button>
                  )}
                </div>
              </div>

              {/* Viewport Content */}
              {imagePreviewUrl ? (
                <div
                  ref={canvasContainerRef}
                  className="overflow-auto p-4 sm:p-8 flex items-center justify-center bg-[#fafafc] dark:bg-[#151518] min-h-[500px] max-h-[calc(100vh-270px)] scrollbar-thin"
                >
                  <div
                    className="shadow-2xl rounded-2xl overflow-hidden border border-black/[0.1] dark:border-white/[0.1] transition-transform duration-150"
                    style={{ transform: `scale(${zoomScale})`, transformOrigin: 'center center' }}
                  >
                    <img src={imagePreviewUrl} alt={activeFileName} className="max-w-full max-h-[650px] object-contain block" />
                  </div>
                </div>
              ) : pdfDoc ? (
                <div
                  ref={canvasContainerRef}
                  onScroll={() => {
                    if (isHost && hostSyncMode && !isApplyingSync && canvasContainerRef.current) {
                      const scrollRatio = canvasContainerRef.current.scrollTop / canvasContainerRef.current.scrollHeight;
                      broadcastSync(currentPage, zoomScale, scrollRatio);
                    }
                  }}
                  className="overflow-auto p-4 sm:p-8 flex items-center justify-center bg-[#fafafc] dark:bg-[#151518] min-h-[550px] max-h-[calc(100vh-270px)] scrollbar-thin"
                >
                  <div className="shadow-2xl rounded-xl overflow-hidden border border-black/[0.1] dark:border-white/[0.1] bg-white transition-all">
                    <canvas ref={canvasRef} className="block max-w-full h-auto" />
                  </div>
                </div>
              ) : (
                <div className="p-8 sm:p-12 flex flex-col items-center justify-center text-center space-y-4 bg-[#fafafc] dark:bg-[#151518] min-h-[400px]">
                  <div className="w-16 h-16 rounded-3xl bg-[#0071e3]/10 text-[#0071e3] flex items-center justify-center">
                    <FileText className="w-8 h-8" />
                  </div>
                  <div className="space-y-1 max-w-md">
                    <h4 className="text-base font-bold text-[#1d1d1f] dark:text-[#f5f5f7] break-all">
                      {activeFileName}
                    </h4>
                    <p className="text-[12px] text-[#86868b]">
                      File transferred and verified with full cryptographic hash integrity.
                    </p>
                  </div>
                  <a
                    href={loadedPdfBlob ? URL.createObjectURL(loadedPdfBlob) : '#'}
                    download={activeFileName}
                    className="inline-flex items-center gap-2 px-5 py-2.5 rounded-2xl bg-[#0071e3] hover:bg-[#0071e3]/90 text-white font-semibold text-[13px] shadow-sm transition-transform active:scale-95"
                  >
                    <Download className="w-4 h-4" />
                    <span>Download File ({loadedPdfBlob ? (loadedPdfBlob.size / (1024 * 1024)).toFixed(2) + ' MB' : ''})</span>
                  </a>
                </div>
              )}
            </div>
          )}

          {/* Persistent QR Code Modal */}
          {showQrModal && (
            <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center z-50 p-4">
              <div className="bg-white dark:bg-[#1c1c1e] rounded-3xl p-6 max-w-sm w-full border border-black/[0.1] dark:border-white/[0.1] shadow-2xl space-y-4 text-center">
                <div className="flex items-center justify-between pb-2 border-b border-black/[0.06] dark:border-white/[0.08]">
                  <span className="font-bold text-[14px] text-[#1d1d1f] dark:text-[#f5f5f7]">Invite Peer to Session</span>
                  <button
                    onClick={() => setShowQrModal(false)}
                    className="p-1 rounded-lg hover:bg-black/[0.05] dark:hover:bg-white/[0.05] cursor-pointer"
                  >
                    <X className="w-4 h-4 text-[#86868b]" />
                  </button>
                </div>

                <div className="p-3 bg-white rounded-2xl shadow-md border border-black/[0.08] inline-block mx-auto">
                  <img src={qrDataUrl} alt="Room QR Code" width={220} height={220} className="rounded-xl block" />
                </div>

                <p className="text-[12px] text-[#86868b]">
                  Scan with iPhone or Android camera to join this session. Viewing is independent by default; Follow Host is optional.
                </p>

                <button
                  onClick={() => {
                    void copyTextToClipboard(shareUrl).then(ok => { setCopiedLink(ok); });
                    setTimeout(() => setCopiedLink(false), 2000);
                  }}
                  className="w-full py-2.5 rounded-xl bg-[#0071e3] text-white text-[13px] font-semibold cursor-pointer"
                >
                  {copiedLink ? 'Copied Room Link!' : 'Copy Room Link'}
                </button>
              </div>
            </div>
          )}

          {/* Real-time In-Session Chat */}
          <div className="border-t border-black/[0.06] dark:border-white/[0.08] pt-4">
            <button
              onClick={() => setShowChat(c => !c)}
              className="flex items-center gap-2 text-[13px] font-semibold text-[#0071e3] dark:text-[#2997ff] hover:opacity-80 transition-opacity cursor-pointer"
            >
              <MessageSquare className="w-4 h-4" />
              {showChat ? 'Hide Session Chat' : 'Open Session Chat'}
              {chatMessages.length > 0 && (
                <span className="px-1.5 py-0.5 rounded-full bg-[#0071e3] text-white text-[10px] font-bold">
                  {chatMessages.length}
                </span>
              )}
            </button>

            {showChat && (
              <div className="mt-3 rounded-2xl border border-black/[0.08] dark:border-white/[0.1] bg-white dark:bg-[#1c1c1e] overflow-hidden shadow-sm">
                <div className="max-h-44 overflow-y-auto p-3 space-y-2 scrollbar-thin">
                  {chatMessages.length === 0 && (
                    <p className="text-[12px] text-center text-[#86868b] py-3">No messages yet. Send a note to connected peers! 👋</p>
                  )}
                  {chatMessages.map((msg, i) => (
                    <div key={i} className={`flex ${msg.isSelf ? 'justify-end' : 'justify-start'}`}>
                      <div className={`max-w-[75%] px-3 py-1.5 rounded-xl text-[12px] ${
                        msg.isSelf
                          ? 'bg-[#0071e3] text-white'
                          : 'bg-[#fafafc] dark:bg-[#252528] border border-black/[0.06] dark:border-white/[0.08] text-[#1d1d1f] dark:text-[#f5f5f7]'
                      }`}>
                        {msg.text}
                      </div>
                    </div>
                  ))}
                  <div ref={chatBottomRef} />
                </div>
                <div className="flex items-center gap-2 p-2.5 border-t border-black/[0.06] dark:border-white/[0.08]">
                  <input
                    type="text"
                    value={chatInput}
                    onChange={e => setChatInput(e.target.value)}
                    onKeyDown={e => { if (e.key === 'Enter') handleSendChat(); }}
                    placeholder="Type message to room participants…"
                    className="flex-1 bg-transparent text-[13px] outline-none text-[#1d1d1f] dark:text-[#f5f5f7] placeholder:text-[#86868b]"
                  />
                  <button
                    onClick={handleSendChat}
                    disabled={!chatInput.trim()}
                    className="p-1.5 rounded-lg bg-[#0071e3] text-white disabled:opacity-40 hover:opacity-90 transition-opacity cursor-pointer"
                  >
                    <Send className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}
          </div>

        </div>
      )}
    </div>
  );
};
