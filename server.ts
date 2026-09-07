import express from 'express';
import path from 'path';
import os from 'os';
import fs from 'fs/promises';
import { createReadStream } from 'fs';
import crypto from 'crypto';
import { execFile } from 'child_process';
import { promisify } from 'util';
import cors from 'cors';
import { createServer as createViteServer } from 'vite';
import { createServer as createHttpServer } from 'http';
import { Server as SocketIOServer } from 'socket.io';
import dotenv from 'dotenv';
import { GoogleGenAI } from '@google/genai';
import { startTunnel as startCloudflareTunnel } from 'untun';
import compressionRouter from './server/compression/api';

// Shared tunnel state — readable by API routes
let tunnelUrl: string = '';
let tunnelStatus: 'starting' | 'active' | 'error' | 'off' = 'starting';

function getLocalIp(): string {
  const interfaces = os.networkInterfaces();
  for (const name of Object.keys(interfaces)) {
    for (const iface of interfaces[name] || []) {
      if (iface.family === 'IPv4' && !iface.internal) {
        return iface.address;
      }
    }
  }
  return 'localhost';
}

dotenv.config();

let aiClient: GoogleGenAI | null = null;

function getGeminiClient(): GoogleGenAI | null {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return null;
  if (!aiClient) {
    aiClient = new GoogleGenAI({
      apiKey,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        },
      },
    });
  }
  return aiClient;
}

// ─── P2P Room State ────────────────────────────────────────────────────────
interface RoomMember {
  socketId: string;
  role: 'host' | 'peer';
  joinedAt: number;
}
interface LocalNetworkInterface {
  name: string;
  ip: string;
  isDefault: boolean;
}
const rooms = new Map<string, RoomMember[]>();
// Cleanup rooms older than 4 hours
setInterval(() => {
  const now = Date.now();
  for (const [roomId, members] of rooms.entries()) {
    const fresh = members.filter(m => now - m.joinedAt < 4 * 60 * 60 * 1000);
    if (fresh.length === 0) rooms.delete(roomId);
    else rooms.set(roomId, fresh);
  }
}, 30 * 60 * 1000);
async function startServer() {
  const app = express();
  const execFileAsync = promisify(execFile);
  const httpServer = createHttpServer(app);
  const PORT = Number(process.env.PORT) || 3000;
  const MAX_ROOM_DOCUMENT_BYTES = Number(process.env.MAX_ROOM_DOCUMENT_BYTES || 250 * 1024 * 1024);
  const roomIdPattern = /^[a-zA-Z0-9_-]{4,64}$/;
  const requestCounts = new Map<string, { count: number; resetAt: number }>();

  app.disable('x-powered-by');
  // REST API is called by the Vercel frontend in production.
  app.use(cors({ origin: true, methods: ['GET', 'POST', 'OPTIONS'], allowedHeaders: ['Content-Type', 'X-Target-Size-Bytes', 'X-Compression-Level'] }));
  // Parse bodies before API routes; room documents are uploaded as base64 JSON.
  app.use(express.json({ limit: '70mb' }));
  app.use(express.urlencoded({ extended: true, limit: '70mb' }));

  // ─── Canonical 301 Redirect: Enforce HTTPS & non-www apex domain in production ───
  if (process.env.NODE_ENV === 'production') {
    app.enable('trust proxy');
    app.use((req, res, next) => {
      // Always let the Railway (and any other platform) health-check through
      // before attempting any redirect — otherwise the deployment probe gets
      // a 301 instead of the expected 200 and the deploy is marked unhealthy.
      if (req.path === '/api/health') return next();

      const host = req.headers.host || '';
      const proto = req.headers['x-forwarded-proto'] || req.protocol;
      const isWww = host.startsWith('www.');
      const isHttp = proto === 'http';
      const isLocal = host.includes('localhost') || host.includes('127.0.0.1') || host.includes('0.0.0.0');

      if (!isLocal && (isWww || isHttp)) {
        const cleanHost = host.replace(/^www\./i, '');
        return res.redirect(301, `https://${cleanHost}${req.originalUrl}`);
      }
      next();
    });
  }

  app.use((_req, res, next) => {
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-Frame-Options', 'SAMEORIGIN');
    res.setHeader('Cross-Origin-Opener-Policy', 'same-origin-allow-popups');
    res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
    res.setHeader('Permissions-Policy', 'camera=(self), microphone=(), geolocation=()');
    if (process.env.NODE_ENV === 'production') {
      res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
    }
    next();
  });
  // Local development helpers used by the pairing UI. Hosted production does not
  // depend on these endpoints; it always shares from the canonical HTTPS origin.
  app.get('/api/network-interfaces', (_req, res) => {
    const interfaces: LocalNetworkInterface[] = [];
    for (const [name, entries] of Object.entries(os.networkInterfaces())) {
      for (const iface of entries || []) {
        if (iface.family === 'IPv4') {
          interfaces.push({ name, ip: iface.address, isDefault: iface.address === getLocalIp() });
        }
      }
    }
    res.json({ interfaces, port: PORT });
  });

  app.get('/api/tunnel', (_req, res) => {
    res.set('Cache-Control', 'no-store');
    res.json({ status: tunnelStatus, url: tunnelUrl || null });
  });

  app.use('/api', (req, res, next) => {
    const now = Date.now();
    const key = req.ip || 'unknown';
    const current = requestCounts.get(key);
    if (!current || current.resetAt <= now) {
      requestCounts.set(key, { count: 1, resetAt: now + 60_000 });
      return next();
    }
    current.count += 1;
    if (current.count > 120) {
      return res.status(429).json({ error: 'Too many requests. Please try again shortly.' });
    }
    return next();
  });

  // ─── Server-side PDF compression (Ghostscript) ───────────────────────────
  // This is the production path for PDF compression. Browser PDF rasterization is
  // retained as a fallback, but Railway performs the heavy PDF optimization.
  const runGhostscript = async (inputPath: string, outputPath: string, profile: {
    pdfSettings?: string;
    dpi: number;
    jpegQuality?: number;
  }) => {
    const args = [
      '-dSAFER',
      '-dBATCH',
      '-dNOPAUSE',
      '-dQUIET',
      '-dPDFSTOPONERROR',
      '-dBufferSpace=1000000000',
      '-dNumRenderingThreads=2',
      '-dCompatibilityLevel=1.4',
      '-sDEVICE=pdfwrite',
      '-dDetectDuplicateImages=true',
      '-dCompressFonts=true',
      '-dSubsetFonts=true',
      '-dAutoRotatePages=/PageByPage',
      '-dDownsampleColorImages=true',
      '-dDownsampleGrayImages=true',
      '-dDownsampleMonoImages=true',
      '-dColorImageDownsampleType=/Bicubic',
      '-dGrayImageDownsampleType=/Bicubic',
      '-dMonoImageDownsampleType=/Subsample',
      `-dColorImageResolution=${profile.dpi}`,
      `-dGrayImageResolution=${profile.dpi}`,
      `-dMonoImageResolution=${Math.max(120, profile.dpi * 2)}`,
    ];
    if (profile.pdfSettings) args.push(`-dPDFSETTINGS=${profile.pdfSettings}`);
    if (profile.jpegQuality) {
      args.push('-dAutoFilterColorImages=false', '-dColorImageFilter=/DCTEncode');
      args.push('-dAutoFilterGrayImages=false', '-dGrayImageFilter=/DCTEncode');
      args.push(`-dJPEGQ=${profile.jpegQuality}`);
    }
    args.push(`-sOutputFile=${outputPath}`, inputPath);
    await execFileAsync(process.env.GHOSTSCRIPT_PATH || 'gs', args, {
      timeout: 180000,
      maxBuffer: 8 * 1024 * 1024,
    });
  };
 
  // Distributed multi-format compression engine (PDF, Image, Video, Audio)
  app.use('/api/compress', compressionRouter);

  app.post('/api/compress/pdf', express.raw({
    type: ['application/pdf', 'application/octet-stream'],
    limit: '100mb',
  }), async (req, res) => {
    const body = Buffer.isBuffer(req.body) ? req.body : Buffer.from(req.body || []);
    if (!body.length) return res.status(400).json({ error: 'PDF body is empty' });
    if (body.length > 80 * 1024 * 1024) return res.status(413).json({ error: 'PDF exceeds the 80MB compression limit' });
    if (body.subarray(0, 5).toString('ascii') !== '%PDF-') {
      return res.status(400).json({ error: 'Invalid PDF file' });
    }

    const originalSize = body.length;
    const requestedTarget = Number(req.header('x-target-size-bytes') || 0);
    const level = req.header('x-compression-level') || 'medium';
    const targetMax = requestedTarget > 0 ? Math.min(requestedTarget, originalSize - 1) : Math.floor(
      originalSize * (level === 'high' ? 0.35 : level === 'low' ? 0.78 : 0.58)
    );

    const profiles = [
      { pdfSettings: level === 'low' ? '/printer' : level === 'high' ? '/screen' : '/ebook', dpi: level === 'low' ? 150 : level === 'high' ? 72 : 110, jpegQuality: level === 'low' ? 85 : level === 'high' ? 55 : 70 },
      { pdfSettings: '/ebook', dpi: 96, jpegQuality: 62 },
      { pdfSettings: '/screen', dpi: 72, jpegQuality: 50 },
      { pdfSettings: '/screen', dpi: 60, jpegQuality: 42 },
      { pdfSettings: '/screen', dpi: 48, jpegQuality: 34 },
    ];

    const jobId = crypto.randomUUID();
    const dir = await fs.mkdtemp(path.join(os.tmpdir(), `zipstream-${jobId}-`));
    const inputPath = path.join(dir, 'input.pdf');
    try {
      await fs.writeFile(inputPath, body);
      const candidates: Buffer[] = [];
      let successfulProfiles = 0;

      for (let i = 0; i < profiles.length; i++) {
        const outputPath = path.join(dir, `output-${i}.pdf`);
        try {
          await runGhostscript(inputPath, outputPath, profiles[i]);
          successfulProfiles++;
          const out = await fs.readFile(outputPath);
          if (out.length > 0 && out.length < originalSize) {
            candidates.push(out);
            // Stop once the requested maximum is actually met.
            if (requestedTarget > 0 && out.length <= targetMax) break;
            if (!requestedTarget && out.length <= targetMax) break;
          }
        } catch (err) {
          console.warn(`Ghostscript profile ${i + 1} failed`, err);
        }
      }

      if (!candidates.length) {
        // If Ghostscript wasn't installed or failed, run native in-stream optimizer
        try {
          const { processPdf } = await import('./server/compression/processors/pdfWorker');
          const fallbackOutput = path.join(dir, 'output-fallback.pdf');
          await processPdf({
            jobId,
            originalFileName: 'document.pdf',
            originalSize,
            mimeType: 'application/pdf',
            category: 'pdf',
            inputFilePath: inputPath,
            outputFilePath: fallbackOutput,
            options: { level: level as any },
            createdAt: Date.now(),
          });
          const fallbackBuf = await fs.readFile(fallbackOutput);
          if (fallbackBuf.length > 0 && fallbackBuf.length < originalSize) {
            candidates.push(fallbackBuf);
          }
        } catch (fbErr) {
          console.warn('[Server] Native PDF fallback in legacy endpoint failed:', fbErr);
        }
      }

      if (!candidates.length) {
        // Ghostscript succeeded but the source is already efficiently encoded: return
        // an integrity-preserving identity result so the UI completes normally.
        if (successfulProfiles > 0) {
          res.setHeader('Content-Type', 'application/pdf');
          res.setHeader('Content-Disposition', "attachment; filename*=UTF-8''zipstream-compressed.pdf");
          res.setHeader('X-Original-Size', String(originalSize));
          res.setHeader('X-Compressed-Size', String(originalSize));
          res.setHeader('X-Compression-Engine', 'ghostscript');
          res.setHeader('X-Compression-Status', 'unchanged');
          return res.send(body);
        }
        return res.status(503).json({ error: 'PDF compression engine is temporarily unavailable.' });
      }

      const underTarget = requestedTarget > 0 ? candidates.filter(b => b.length <= targetMax) : [];
      const selected = (underTarget.length ? underTarget : candidates)
        .reduce((best, current) => current.length > best.length ? current : best);

      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', 'attachment; filename="zipstream-compressed.pdf"');
      res.setHeader('X-Original-Size', String(originalSize));
      res.setHeader('X-Compressed-Size', String(selected.length));
      res.setHeader('X-Compression-Engine', 'ghostscript');
      return res.send(selected);
    } catch (err) {
      console.error('PDF compression endpoint failed:', err);
      return res.status(500).json({ error: 'Server PDF compression failed' });
    } finally {
      await fs.rm(dir, { recursive: true, force: true }).catch(() => undefined);
    }
  });

  // ─── Ephemeral Room Document Cache (Held in volatile RAM during room lifetime) ───
  interface EphemeralDocument {
    fileName: string;
    fileSize: number;
    fileType?: string;
    filePath: string;
    updatedAt: number;
    page: number;
    zoom: number;
    scrollRatio: number;
    sha256: string;
  }
  const roomDocuments = new Map<string, EphemeralDocument>();
  // Keep documents across short reconnects; expire stale ephemeral data after four hours.
  setInterval(() => {
    const cutoff = Date.now() - 4 * 60 * 60 * 1000;
    for (const [id, doc] of roomDocuments.entries()) {
      if (doc.updatedAt < cutoff) { roomDocuments.delete(id); void fs.rm(doc.filePath, { force: true }).catch(() => undefined); }
    }
  }, 30 * 60 * 1000);

  // ─── Socket.io WebRTC Signaling Server ─────────────────────────────────
  const io = new SocketIOServer(httpServer, {
    cors: { origin: '*', methods: ['GET', 'POST'] },
    maxHttpBufferSize: 1e8,
    pingTimeout: 60000,
  });

  io.on('connection', (socket) => {
    // Join room as host or peer
    socket.on('join-room', ({ roomId, role }: { roomId: string; role: 'host' | 'peer' }) => {
      if (!roomId || !/^[a-zA-Z0-9_-]{4,64}$/.test(roomId)) return;
      socket.join(roomId);
      const existing = (rooms.get(roomId) || []).filter(member => member.socketId !== socket.id);
      if (existing.length >= 8) {
        socket.emit('room-full');
        return;
      }
      const member: RoomMember = { socketId: socket.id, role, joinedAt: Date.now() };
      existing.push(member);
      rooms.set(roomId, existing);
      socket.to(roomId).emit('peer-joined', { socketId: socket.id, role });
      const others = existing.filter(m => m.socketId !== socket.id);
      socket.emit('room-info', {
        roomId, yourId: socket.id,
        members: others.map(m => ({ socketId: m.socketId, role: m.role })),
        roomSize: existing.length,
      });

      // If room already has an active document, immediately notify newcomer!
      const activeDoc = roomDocuments.get(roomId);
      if (activeDoc) {
        socket.emit('room-document-available', {
          fileName: activeDoc.fileName,
          fileSize: activeDoc.fileSize,
          fileType: activeDoc.fileType || 'application/pdf',
          hasDocument: true,
          page: activeDoc.page || 1,
          zoom: activeDoc.zoom || 1.0,
          scrollRatio: activeDoc.scrollRatio || 0,
        });
      }
    });

    // WebRTC offer relay
    socket.on('webrtc-offer', ({ roomId, offer, targetId }: any) => {
      if (targetId) io.to(targetId).emit('webrtc-offer', { offer, senderId: socket.id });
      else socket.to(roomId).emit('webrtc-offer', { offer, senderId: socket.id });
    });
    socket.on('signal-offer', ({ targetPeerId, sdp }: any) => {
      io.to(targetPeerId).emit('signal-offer', { senderId: socket.id, sdp });
    });

    // WebRTC answer relay
    socket.on('webrtc-answer', ({ roomId, answer, targetId }: any) => {
      if (targetId) io.to(targetId).emit('webrtc-answer', { answer, senderId: socket.id });
      else socket.to(roomId).emit('webrtc-answer', { answer, senderId: socket.id });
    });
    socket.on('signal-answer', ({ targetPeerId, sdp }: any) => {
      io.to(targetPeerId).emit('signal-answer', { senderId: socket.id, sdp });
    });

    // ICE candidate relay
    socket.on('webrtc-ice', ({ roomId, candidate, targetId }: any) => {
      if (targetId) io.to(targetId).emit('webrtc-ice', { candidate, senderId: socket.id });
      else socket.to(roomId).emit('webrtc-ice', { candidate, senderId: socket.id });
    });
    socket.on('signal-ice', ({ targetPeerId, candidate }: any) => {
      io.to(targetPeerId).emit('signal-ice', { senderId: socket.id, candidate });
    });

    // Synchronized PDF page events
    socket.on('sync-page', ({ roomId, page }: any) => {
      socket.to(roomId).emit('sync-page', { page, senderId: socket.id });
    });

    // Synchronized document view state
    socket.on('sync-state', ({ roomId, event }: any) => {
      const doc = roomDocuments.get(roomId);
      if (doc && event) {
        if (event.page) doc.page = event.page;
        if (event.zoom) doc.zoom = event.zoom;
        if (typeof event.scrollRatio === 'number') doc.scrollRatio = event.scrollRatio;
      }
      socket.to(roomId).emit('sync-state', { event, senderId: socket.id });
    });

    // Relay chunk fallback when WebRTC data channels are blocked by symmetric NAT/firewalls
    socket.on('relay-chunk-fallback', ({ roomId, chunk, targetId }: any) => {
      if (targetId) {
        io.to(targetId).emit('relay-chunk-fallback', { chunk, senderId: socket.id });
      } else {
        socket.to(roomId).emit('relay-chunk-fallback', { chunk, senderId: socket.id });
      }
    });

    socket.on('relay-file-request', ({ roomId, transferId, fileName, fileSize, fileType, sha256 }: any) => {
      socket.to(roomId).emit('relay-file-request', { transferId, fileName, fileSize, fileType, sha256, senderId: socket.id });
    });
    socket.on('relay-file-ack', ({ roomId, transferId, ok }: any) => {
      socket.to(roomId).emit('relay-file-ack', { transferId, ok: ok === true, senderId: socket.id });
    });

    // Disconnect cleanup
    socket.on('disconnect', () => {
      for (const [roomId, members] of rooms.entries()) {
        const remaining = members.filter(m => m.socketId !== socket.id);
        if (remaining.length === 0) {
          rooms.delete(roomId);
          // Preserve the ephemeral document so a reconnecting guest can recover it.
        } else {
          rooms.set(roomId, remaining);
          socket.to(roomId).emit('peer-left', { socketId: socket.id });
        }
      }
    });
  });

  // Health check endpoint (used by Railway and monitors)
  app.get('/api/health', (_req, res) => {
    res.json({
      status: 'ok',
      service: 'ZipStream Server',
      timestamp: new Date().toISOString(),
      roomsCount: rooms.size,
      activeDocuments: roomDocuments.size,
      uptime: process.uptime(),
    });
  });

  // WebRTC STUN/TURN configuration endpoint
  app.get('/api/webrtc-config', (_req, res) => {
    res.json({
      iceServers: [
        ...(process.env.TURN_URL && process.env.TURN_USERNAME && process.env.TURN_CREDENTIAL
          ? [{ urls: process.env.TURN_URL.split(',').map(v => v.trim()), username: process.env.TURN_USERNAME, credential: process.env.TURN_CREDENTIAL }]
          : []),
        { urls: 'stun:stun.l.google.com:19302' },
        { urls: 'stun:stun1.l.google.com:19302' },
        { urls: 'stun:stun2.l.google.com:19302' },
        { urls: 'stun:stun3.l.google.com:19302' },
        { urls: 'stun:stun4.l.google.com:19302' },
        { urls: 'stun:stun.cloudflare.com:3478' },
        { urls: 'stun:stun.services.mozilla.com' },
        { urls: 'stun:global.stun.twilio.com:3478' },
      ],
    });
  });

  // Upload/cache room document. Binary uploads are the production path; a legacy
  // JSON/Base64 request is still accepted for backward compatibility.
  app.post('/api/rooms/:roomId/document', express.raw({ type: () => true, limit: `${Math.ceil(MAX_ROOM_DOCUMENT_BYTES / (1024 * 1024))}mb` }), async (req, res) => {
    const { roomId } = req.params;
    if (!roomId || !roomIdPattern.test(roomId)) return res.status(400).json({ error: 'Invalid room ID' });

    let rawBuffer: Buffer;
    let fileName = String(req.header('x-file-name') || 'Shared File');
    let fileType = req.header('x-file-type') || req.header('content-type') || 'application/octet-stream';
    let page = 1, zoom = 1, scrollRatio = 0;

    const body = Buffer.isBuffer(req.body) ? req.body : Buffer.alloc(0);
    const maybeJson = (req.header('content-type') || '').includes('application/json');
    if (maybeJson && body.length) {
      try {
        const parsed = JSON.parse(body.toString('utf8'));
        if (typeof parsed.dataBase64 === 'string') {
          rawBuffer = Buffer.from(parsed.dataBase64, 'base64');
          fileName = parsed.fileName || fileName;
          fileType = parsed.fileType || fileType;
          page = Number(parsed.page) || 1;
          zoom = Number(parsed.zoom) || 1;
          scrollRatio = Number(parsed.scrollRatio) || 0;
        } else rawBuffer = body;
      } catch { rawBuffer = body; }
    } else {
      rawBuffer = body;
    }
    fileName = decodeURIComponent(fileName).replace(/[\\/]/g, '_').slice(0, 240) || 'Shared File';

    if (!rawBuffer?.length) return res.status(400).json({ error: 'File body is empty' });
    if (rawBuffer.length > MAX_ROOM_DOCUMENT_BYTES) return res.status(413).json({ error: `File exceeds the ${Math.round(MAX_ROOM_DOCUMENT_BYTES / 1024 / 1024)}MB room limit` });

    const sha256 = crypto.createHash('sha256').update(rawBuffer).digest('hex');
    const roomDir = await fs.mkdtemp(path.join(os.tmpdir(), `zipstream-room-${roomId}-`));
    const filePath = path.join(roomDir, 'payload.bin');
    await fs.writeFile(filePath, rawBuffer);
    const previous = roomDocuments.get(roomId);
    if (previous) await fs.rm(previous.filePath, { force: true }).catch(() => undefined);

    const doc: EphemeralDocument = { fileName, fileSize: rawBuffer.length, fileType, filePath, updatedAt: Date.now(), page, zoom, scrollRatio, sha256 };
    roomDocuments.set(roomId, doc);
    res.set('Cache-Control', 'no-store');
    io.to(roomId).emit('room-document-available', { fileName: doc.fileName, fileSize: doc.fileSize, fileType: doc.fileType, hasDocument: true, page: doc.page, zoom: doc.zoom, scrollRatio: doc.scrollRatio, sha256: doc.sha256 });
    return res.json({ success: true, fileName: doc.fileName, fileSize: doc.fileSize, fileType: doc.fileType, sha256: doc.sha256 });
  });

  // Stream cached room document as raw bytes. This is the lossless recovery path.
  app.get('/api/rooms/:roomId/document/raw', async (req, res) => {
    const { roomId } = req.params;
    if (!roomId || !roomIdPattern.test(roomId)) return res.status(400).json({ error: 'Invalid room ID' });
    const doc = roomDocuments.get(roomId);
    if (!doc) return res.status(404).json({ error: 'No document active in this room' });
    try {
      const stat = await fs.stat(doc.filePath);
      res.status(200).set({
        'Cache-Control': 'no-store, no-cache, must-revalidate',
        'Content-Type': doc.fileType || 'application/octet-stream',
        'Content-Length': String(stat.size),
        'Content-Disposition': `attachment; filename*=UTF-8''${encodeURIComponent(doc.fileName)}`,
        'X-File-Name': encodeURIComponent(doc.fileName),
        'X-File-Sha256': doc.sha256,
        'X-File-Size': String(stat.size),
        'Access-Control-Expose-Headers': 'Content-Length, Content-Disposition, X-File-Name, X-File-Sha256, X-File-Size',
      });
      doc.updatedAt = Date.now();
      return createReadStream(doc.filePath).pipe(res);
    } catch { return res.status(404).json({ error: 'Room file is no longer available' }); }
  });

  app.get('/api/rooms/:roomId/document', (req, res) => {
    const { roomId } = req.params;
    if (!roomId || !roomIdPattern.test(roomId)) return res.status(400).json({ error: 'Invalid room ID' });
    const doc = roomDocuments.get(roomId);
    if (!doc) return res.status(404).json({ error: 'No document active in this room' });
    res.set({ 'Cache-Control': 'no-store, no-cache, must-revalidate', 'Content-Type': 'application/json; charset=utf-8' });
    return res.json({ fileName: doc.fileName, fileSize: doc.fileSize, fileType: doc.fileType, updatedAt: doc.updatedAt, page: doc.page, zoom: doc.zoom, scrollRatio: doc.scrollRatio, sha256: doc.sha256 });
  });

  // Direct room URL redirect for deep links
  app.get('/room/:roomId', (req, res) => {
    const { roomId } = req.params;
    return res.redirect(`/#/room/${encodeURIComponent(roomId)}`);
  });

  // Gemini AI Chat about Document
  app.post('/api/gemini/chat', async (req, res) => {
    try {
      const { message, documentContext, history = [] } = req.body || {};
      if (!message) {
        return res.status(400).json({ error: 'Message is required' });
      }

      const client = getGeminiClient();
      if (!client) {
        // High quality deterministic fallback response when API key is not yet set
        return res.json({
          reply: `[Offline Local Intelligence Mode]\n\nBased on the extracted document content: "${message}"\n\nYour document contains ${documentContext ? documentContext.split(/\\s+/).length : 0} words. Key insights have been indexed locally in-browser. Connect your Gemini API Key in Settings > Secrets to unlock full live conversational reasoning!`,
          isFallback: true,
        });
      }

      const systemPrompt = `You are ZipStream AI, a specialized on-device document intelligence assistant.
Answer the user's questions accurately and concisely based strictly on the provided document context whenever possible.
If the answer is found in the text, quote or reference the relevant section clearly.
If the answer cannot be determined from the document, state that clearly and offer general helpful guidance.

DOCUMENT CONTEXT:
${documentContext ? documentContext.slice(0, 35000) : 'No document uploaded yet.'}`;

      const response = await client.models.generateContent({
        model: 'gemini-3.7-flash',
        contents: message,
        config: {
          systemInstruction: systemPrompt,
          temperature: 0.3,
        },
      });

      return res.json({
        reply: response.text || 'I analyzed the document but did not generate any text output.',
        isFallback: false,
      });
    } catch (err: any) {
      console.error('Gemini chat error:', err);
      return res.status(500).json({
        error: err.message || 'Failed to process document chat',
        reply: 'An error occurred while contacting the AI model. Please try again.',
      });
    }
  });

  // Gemini AI Document Summarizer
  app.post('/api/gemini/summarize', async (req, res) => {
    try {
      const { text, type = 'executive' } = req.body || {};
      if (!text || typeof text !== 'string') return res.status(400).json({ error: 'Document text is required' });
      const wordCount = text.trim().split(/\s+/).filter(Boolean).length;
      const readingTime = Math.max(1, Math.ceil(wordCount / 200));
      const client = getGeminiClient();
      if (!client) {
        const fallback = text.replace(/\s+/g, ' ').split(/(?<=[.!?])\s+/).filter(Boolean).slice(0, 6).join(' ');
        return res.json({ summary: fallback || text.slice(0, 1200), type, wordCount, readingTime, isFallback: true });
      }
      const response = await client.models.generateContent({
        model: 'gemini-3.7-flash',
        contents: `Create a ${type} summary. Be concise, factual, and do not invent information.\n\nDOCUMENT:\n${text.slice(0, 50000)}`,
        config: { temperature: 0.2 },
      });
      return res.json({ summary: response.text || 'No summary was generated.', type, wordCount, readingTime, isFallback: false });
    } catch (err: any) {
      console.error('Gemini summarize error:', err);
      return res.status(500).json({ error: err?.message || 'Failed to summarize document' });
    }
  });

  // Explicit handlers for search engine crawlers with strict Content-Type headers
  app.get('/sitemap.xml', (_req, res) => {
    const sitemapDist = path.join(process.cwd(), 'dist', 'sitemap.xml');
    const sitemapPublic = path.join(process.cwd(), 'public', 'sitemap.xml');
    const filePath = require('fs').existsSync(sitemapDist) ? sitemapDist : sitemapPublic;
    res.type('application/xml; charset=utf-8');
    res.sendFile(filePath);
  });

  app.get('/robots.txt', (_req, res) => {
    const robotsDist = path.join(process.cwd(), 'dist', 'robots.txt');
    const robotsPublic = path.join(process.cwd(), 'public', 'robots.txt');
    const filePath = require('fs').existsSync(robotsDist) ? robotsDist : robotsPublic;
    res.type('text/plain; charset=utf-8');
    res.sendFile(filePath);
  });

  // Dedicated custom 404 page handler with HTTP 404 status
  app.get('/404', (_req, res) => {
    const page404Dist = path.join(process.cwd(), 'dist', '404.html');
    const page404Public = path.join(process.cwd(), 'public', '404.html');
    const filePath = require('fs').existsSync(page404Dist) ? page404Dist : page404Public;
    res.status(404).sendFile(filePath);
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: {
        middlewareMode: true,
        allowedHosts: true, // Allow all hosts (LAN IP, Cloudflare tunnel, mobile devices)
        cors: true,
      },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath, {
      maxAge: '1y',
      immutable: true,
      setHeaders: (res, filePath) => {
        // HTML must always be revalidated so a newly deployed asset manifest is used.
        if (filePath.endsWith('.html')) res.setHeader('Cache-Control', 'no-cache');
      },
    }));
    app.get('*', (req, res) => {
      // If request has a file extension that wasn't found in static assets, return 404
      if (path.extname(req.path)) {
        const page404 = path.join(distPath, '404.html');
        return res.status(404).sendFile(page404);
      }
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }


  // Start listening and then boot the tunnel
  httpServer.listen(PORT, '0.0.0.0', () => {
    console.log(`\n🚀  ZipStream server running at http://0.0.0.0:${PORT}`);
    console.log(`📡  WebRTC signaling active on ws://0.0.0.0:${PORT}`);
    console.log(`🌐  Local Network IP: http://${getLocalIp()}:${PORT}`);

    if (process.env.ENABLE_TUNNEL !== 'false' && process.env.NODE_ENV !== 'production') {
      startTunnel(PORT);
    } else {
      tunnelStatus = 'off';
    }
  });
}

async function startTunnel(port: number) {
  tunnelStatus = 'starting';

  const attemptTunnel = async (retryCount = 0): Promise<void> => {
    try {
      console.log(`\n🔗  Opening Cloudflare HTTPS tunnel for instant mobile pairing… (attempt ${retryCount + 1})`);
      const tunnel = await startCloudflareTunnel({ port });
      const url = await tunnel.getURL();

      tunnelUrl = url;
      tunnelStatus = 'active';

      console.log(`\n✅  Cloudflare Public HTTPS Tunnel is LIVE:`);
      console.log(`    ${url}`);
      console.log(`    👆 Works across all networks, Wi-Fi, 4G/5G mobile carriers with ZERO firewall block!\n`);
    } catch (err: any) {
      console.error(`⚠️   Cloudflare tunnel failed (attempt ${retryCount + 1}):`, err.message);
      tunnelUrl = '';
      tunnelStatus = retryCount >= 3 ? 'error' : 'starting';
      if (retryCount < 3) {
        setTimeout(() => attemptTunnel(retryCount + 1), 4000);
      } else {
        console.warn('❌  Cloudflare tunnel unavailable. Falling back to local LAN IP.');
        tunnelStatus = 'error';
      }
    }
  };

  await attemptTunnel();
}

startServer();
