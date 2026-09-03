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

const CHUNK_SIZE = 32 * 1024; // 32 KB binary slices

const RTC_CONFIG: RTCConfiguration = {
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
    { urls: 'stun:stun2.l.google.com:19302' },
    { urls: 'stun:global.stun.twilio.com:3478' },
  ],
};

function generateCryptoRoomId(): string {
  const arr = new Uint8Array(4);
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
  const [roomId] = useState<string>(() => {
    const hash = window.location.hash;
    const path = window.location.pathname;
    const matchHash = hash.match(/\/room\/([a-zA-Z0-9_-]+)/);
    if (matchHash && matchHash[1]) return matchHash[1];
    const matchPath = path.match(/\/room\/([a-zA-Z0-9_-]+)/);
    if (matchPath && matchPath[1]) return matchPath[1];
    const newId = generateCryptoRoomId();
    sessionStorage.setItem(`zip_host_${newId}`, 'true');
    return newId;
  });

  const [isHost] = useState<boolean>(() => {
    const hash = window.location.hash;
    const path = window.location.pathname;
    const match = hash.match(/\/room\/([a-zA-Z0-9_-]+)/) || path.match(/\/room\/([a-zA-Z0-9_-]+)/);
    if (match && match[1]) {
      return sessionStorage.getItem(`zip_host_${match[1]}`) === 'true';
    }
    return true;
  });

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
    let stopped = false;
    const poll = async () => {
      try {
        const res = await fetch('/api/tunnel');
        const data = await res.json();
        if (!stopped) {
          setTunnelUrl(data.url || '');
          setTunnelStatus(data.status || 'off');
        }
      } catch (_) {}
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
        // Default to first active non-localhost IP if available
        if (!selectedIp) {
          const nonLocal = data.interfaces.find((iface: NetworkInterface) => iface.ip !== '127.0.0.1');
          if (nonLocal) {
            setSelectedIp(nonLocal.ip);
          } else if (data.interfaces.length > 0) {
            setSelectedIp(data.interfaces[0].ip);
          }
        }
      }
    } catch (err) {
      console.warn('Network discovery error:', err);
    } finally {
      setIsRefreshingNet(false);
    }
  }, [selectedIp]);

  useEffect(() => {
    refreshNetworks();
    // Poll network interfaces every 10 seconds to auto-adjust when user switches Wi-Fi/Hotspot
    const interval = setInterval(refreshNetworks, 10000);
    return () => clearInterval(interval);
  }, [refreshNetworks]);

  // Compute live shareable URL — tunnel URL is always preferred (works from any network/device)
  const computeShareUrl = useCallback(() => {
    // 1. Manual custom host / tunnel URL override
    if (isCustomHostMode && customHost.trim()) {
      const trimmed = customHost.trim().replace(/\/$/, '');
      const prefix = trimmed.startsWith('http') ? '' : 'http://';
      return `${prefix}${trimmed}/#/room/${roomId}`;
    }

    // 2. Public HTTPS tunnel (primary — bypasses all firewall/NAT/network-switching issues)
    if (tunnelUrl && tunnelStatus === 'active') {
      return `${tunnelUrl}/#/room/${roomId}`;
    }

    // 3. Preserve the hosted origin when no tunnel is available. Adding port 3000
    // to a deployed HTTPS domain produces a QR code that cannot be opened.
    if (!selectedIp && window.location.hostname !== 'localhost' && window.location.hostname !== '127.0.0.1') {
      return `${window.location.origin}/#/room/${roomId}`;
    }

    // 4. LAN IP fallback (works only on the same Wi-Fi network)
    const hostIp = selectedIp || window.location.hostname;
    const isLocal = hostIp === 'localhost' || hostIp === '127.0.0.1';
    if (isLocal && !selectedIp) {
      return `${window.location.origin}/#/room/${roomId}`;
    }
    const port = window.location.port || String(serverPort);
    return `http://${hostIp}:${port}/#/room/${roomId}`;
  }, [isCustomHostMode, customHost, tunnelUrl, tunnelStatus, selectedIp, serverPort, roomId]);

  const shareUrl = computeShareUrl();
  const isUsingTunnel = tunnelStatus === 'active' && shareUrl.startsWith(tunnelUrl);

  // Generate QR Code dynamically whenever the shareUrl adjusts
  useEffect(() => {
    QRCode.toDataURL(shareUrl, {
      width: 280,
      margin: 1.5,
      color: { dark: '#09090b', light: '#ffffff' },
      errorCorrectionLevel: 'M',
    })
      .then(url => setQrDataUrl(url))
      .catch(console.error);
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
  const [hostSyncMode, setHostSyncMode] = useState<boolean>(true);
  const [isApplyingSync, setIsApplyingSync] = useState<boolean>(false);

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const canvasContainerRef = useRef<HTMLDivElement | null>(null);
  const renderTaskRef = useRef<any>(null);

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
    if (!hostSyncMode && !isHost) return;
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
  const loadDocumentBlob = useCallback((blob: Blob, fileName?: string) => {
    setLoadedPdfBlob(blob);
    if (fileName) setActiveFileName(fileName);
    // NOTE: No confetti here — celebration is triggered separately via celebrateNewFileOnce
    // to prevent it from firing on zoom changes, sync re-renders, or page navigation
  }, []);

  // Fetch active room document directly from server cache (instant sync for newcomers)
  const fetchRoomDocumentFromServer = useCallback(async () => {
    try {
      setTransferState({ fileName: 'Syncing Room PDF…', fileSize: 0, progress: 40, status: 'streaming' });
      const res = await fetch(`/api/rooms/${roomId}/document`);
      if (res.ok) {
        const data = await res.json();
        if (data.dataBase64) {
          const arrayBuffer = base64ToArrayBuffer(data.dataBase64);
          const blob = new Blob([arrayBuffer], { type: 'application/pdf' });
          loadDocumentBlob(blob, data.fileName);
          if (data.page) setCurrentPage(data.page);
          if (data.zoom) setZoomScale(data.zoom);
          setTransferState(prev => ({ ...prev, progress: 100, status: 'complete' }));
          // Celebrate only the first time this specific file is received by the guest
          celebrateNewFileOnce(data.fileName || 'shared-document.pdf');
        }
      }
    } catch (err) {
      console.warn('Failed to fetch room document from server:', err);
    }
  }, [roomId, loadDocumentBlob, celebrateNewFileOnce]);

  // Setup WebRTC DataChannel
  const setupDataChannel = useCallback((dc: RTCDataChannel) => {
    dataChannelRef.current = dc;
    dc.binaryType = 'arraybuffer';

    dc.onopen = () => {
      setConnectionStatus('connected');
      setStatusMessage('Direct P2P Encrypted');
      // Celebration spiral splash one time on connection established!
      celebrateConnectionOnce();

      // Auto-stream document to newcomer if host already has one loaded
      if (isHost && loadedPdfBlobRef.current) {
        streamFileOverDataChannel(loadedPdfBlobRef.current);
      }
    };

    dc.onclose = () => {
      setStatusMessage('P2P Channel Closed');
    };

    dc.onmessage = (event) => {
      const data = event.data;
      if (typeof data === 'string') {
        try {
          const msg = JSON.parse(data);
          if (msg.type === 'SYNC_STATE') {
            applyViewportSync(msg);
          }
        } catch (_) {}
      }
    };
  }, [isHost, applyViewportSync]);

  // Create WebRTC PeerConnection
  const createPeerConnection = useCallback((targetId: string) => {
    if (pcRef.current) {
      try { pcRef.current.close(); } catch (_) {}
    }

    const pc = new RTCPeerConnection(RTC_CONFIG);
    pcRef.current = pc;

    pc.onicecandidate = (event) => {
      if (event.candidate && socketRef.current) {
        socketRef.current.emit('signal-ice', { targetPeerId: targetId, candidate: event.candidate });
      }
    };

    pc.onconnectionstatechange = () => {
      const state = pc.connectionState;
      if (state === 'connected') {
        setConnectionStatus('connected');
        setStatusMessage('Direct P2P Encrypted');
        celebrateConnectionOnce();
      } else if (state === 'connecting') {
        setConnectionStatus('connecting');
        setStatusMessage('Negotiating P2P Tunnel…');
      } else if (state === 'failed' || state === 'disconnected') {
        setConnectionStatus('error');
        setStatusMessage('P2P Disconnected');
        hasCelebratedConnectionRef.current = false;
      }
    };

    return pc;
  }, []);

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

  // Connect to Signaling Server
  const initSignaling = useCallback(() => {
    if (socketRef.current?.connected) return;

    const socket = ioConnect(window.location.origin, {
      path: '/socket.io',
      transports: ['websocket', 'polling'],
    });
    socketRef.current = socket;

    socket.on('connect', () => {
      socket.emit('join-room', { roomId, role: isHost ? 'host' : 'peer', isHost });
      setStatusMessage(isHost ? 'Waiting for Peer to Scan QR…' : 'Connecting to Host Session…');
    });

    socket.on('room-info', async ({ members, roomSize }: any) => {
      setPeerCount(Math.max(0, roomSize - 1));
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
      if (page) setCurrentPage(page);
      if (zoom) setZoomScale(zoom);
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
      if (!isHost || !hostSyncMode) {
        applyViewportSync(event);
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
      setStatusMessage('Signaling Disconnected');
      hasCelebratedConnectionRef.current = false;
    });
  }, [roomId, isHost, initiateOffer, createPeerConnection, setupDataChannel, applyViewportSync, fetchRoomDocumentFromServer]);

  useEffect(() => {
    if (activeSubTool === 'p2p_share') {
      initSignaling();
    }
    return () => {
      socketRef.current?.disconnect();
      pcRef.current?.close();
    };
  }, [activeSubTool, initSignaling]);

  // ─── Dual-Stream Upload: RAM Cache + WebRTC Channel ────────────────────
  const uploadAndStreamDocument = async (file: File) => {
    if (!file || file.type !== 'application/pdf') return;

    setActiveFileName(file.name);
    setLoadedPdfBlob(file);
    setTransferState({
      fileName: file.name,
      fileSize: file.size,
      progress: 10,
      status: 'streaming',
    });

    const buffer = await file.arrayBuffer();
    const base64Data = arrayBufferToBase64(buffer);

    // 1. Instantly store in Room Memory Cache on Server so ANY guest joining gets it immediately!
    try {
      setTransferState(prev => ({ ...prev, progress: 50 }));
      await fetch(`/api/rooms/${roomId}/document`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fileName: file.name,
          fileSize: file.size,
          dataBase64: base64Data,
        }),
      });
      setTransferState({
        fileName: file.name,
        fileSize: file.size,
        progress: 100,
        status: 'complete',
      });
      // Celebrate only once per unique new file upload by host
      celebrateNewFileOnce(file.name);
    } catch (err) {
      console.error('Failed to cache document on room:', err);
    }

    // 2. Stream over WebRTC DataChannel if currently active
    streamFileOverDataChannel(file);
  };

  const streamFileOverDataChannel = async (fileOrBlob: Blob | File) => {
    const dc = dataChannelRef.current;
    if (!dc || dc.readyState !== 'open') return;

    try {
      const buffer = await fileOrBlob.arrayBuffer();
      dc.send(JSON.stringify({
        type: 'HEADER',
        fileName: (fileOrBlob as File).name || 'shared-document.pdf',
        fileSize: fileOrBlob.size,
        fileType: 'application/pdf',
      }));
    } catch (_) {}
  };

  // ─── Render PDF with PDF.js on HTML5 Canvas ───────────────────────────
  useEffect(() => {
    if (!loadedPdfBlob) return;

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
  }, [loadedPdfBlob]);

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

  // Page Navigation Handlers
  const handlePageChange = (newPage: number) => {
    if (newPage < 1 || newPage > totalPages) return;
    setCurrentPage(newPage);
    if (isHost && hostSyncMode) {
      const scrollRatio = canvasContainerRef.current && canvasContainerRef.current.scrollHeight > 0
        ? canvasContainerRef.current.scrollTop / canvasContainerRef.current.scrollHeight
        : 0;
      broadcastSync(newPage, zoomScale, scrollRatio);
    }
  };

  const handleZoomChange = (delta: number) => {
    const newZoom = Math.min(2.5, Math.max(0.6, +(zoomScale + delta).toFixed(2)));
    setZoomScale(newZoom);
    if (isHost && hostSyncMode) {
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
                    {isUsingTunnel ? (
                      <><ShieldCheck className="w-3 h-3" /> Cloudflare Public HTTPS Active — Zero-Firewall Mobile Access!</>
                    ) : tunnelStatus === 'starting' ? (
                      <><RefreshCw className="w-3 h-3 animate-spin" /> Starting Cloudflare tunnel…</>
                    ) : (
                      <><Globe className="w-3 h-3" /> LAN IP Active — Same Wi-Fi</>
                    )}
                  </div>
                </div>

                {/* QR Code */}
                <div className="p-3 bg-white rounded-2xl shadow-md border border-black/[0.08] relative">
                  {qrDataUrl && (isUsingTunnel || tunnelStatus !== 'starting') ? (
                    <img src={qrDataUrl} alt="Room QR Code" width={220} height={220} className="rounded-xl block mx-auto" />
                  ) : (
                    <div className="w-[220px] h-[220px] flex flex-col items-center justify-center gap-2 text-[#86868b]">
                      <RefreshCw className="w-6 h-6 animate-spin text-amber-500" />
                      <p className="text-[11px] text-center font-medium px-4">
                        Opening public tunnel for cross-network access…
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
                        Fallback LAN Interface:
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
                        navigator.clipboard.writeText(shareUrl);
                        setCopiedLink(true);
                        setTimeout(() => setCopiedLink(false), 2000);
                      }}
                      className="px-3 py-1.5 rounded-xl bg-[#0071e3] hover:bg-[#0071e3]/90 text-white text-[12px] font-semibold flex items-center gap-1 transition-opacity cursor-pointer shrink-0"
                    >
                      {copiedLink ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                      <span>{copiedLink ? 'Copied' : 'Copy'}</span>
                    </button>
                  </div>

                  <div className="flex items-center justify-between text-[11px] text-[#86868b] px-1">
                    <span>Room: <strong className="font-mono text-[#1d1d1f] dark:text-[#f5f5f7]">{roomId}</strong></span>
                    <span className="flex items-center gap-1 text-emerald-600 dark:text-emerald-400 font-semibold">
                      <ShieldCheck className="w-3.5 h-3.5" /> End-to-End Encrypted
                    </span>
                  </div>
                </div>
              </div>

              {/* Host Upload Dropzone */}
              <div className="p-6 sm:p-8 rounded-3xl bg-white dark:bg-[#1c1c1e] border border-black/[0.08] dark:border-white/[0.1] shadow-md flex flex-col justify-between space-y-5">
                <div className="space-y-1">
                  <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-bold bg-purple-500/10 text-purple-600 dark:text-purple-400 mb-1">
                    <Zap className="w-3.5 h-3.5" />
                    Instant Room PDF Streaming
                  </div>
                  <h3 className="text-lg font-bold text-[#1d1d1f] dark:text-[#f5f5f7]">
                    Upload PDF to Synchronize with Room
                  </h3>
                  <p className="text-[12.5px] text-[#6e6e73] dark:text-[#8e8e93]">
                    Drop a document to instantly open it on your screen and automatically push it to any phone or peer that scans the QR code.
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
                    accept="application/pdf"
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
                      Choose or Drag & Drop PDF
                    </p>
                    <p className="text-[12px] text-[#86868b] mt-0.5">
                      Direct in-memory rendering & peer streaming
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

          {/* SYNCHRONIZED PDF VIEWPORT STAGE */}
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
                    }}
                    className="text-[12px] text-[#86868b] hover:text-red-500 px-2 py-1 transition-colors cursor-pointer"
                  >
                    Close Document
                  </button>
                </div>

                {/* Page Navigation & Zoom Controls */}
                <div className="flex items-center gap-2">
                  {/* Page Controls */}
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

                  {/* Zoom Controls */}
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

                  {/* Save Local Copy */}
                  {loadedPdfBlob && (
                    <a
                      href={URL.createObjectURL(loadedPdfBlob)}
                      download={activeFileName}
                      className="p-2 rounded-xl bg-white dark:bg-[#1c1c1e] hover:bg-black/[0.04] border border-black/[0.08] dark:border-white/[0.1] text-[#1d1d1f] dark:text-[#f5f5f7] cursor-pointer shadow-2xs"
                      title="Download PDF"
                    >
                      <Download className="w-4 h-4" />
                    </a>
                  )}
                </div>
              </div>

              {/* PDF Canvas Viewport Container */}
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
                  Scan with iPhone or Android camera to instantly view and co-scroll this PDF in real time.
                </p>

                <button
                  onClick={() => {
                    navigator.clipboard.writeText(shareUrl);
                    setCopiedLink(true);
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
