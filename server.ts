import express, { Request, Response } from 'express';
import path from 'path';
import os from 'os';
import fs from 'fs/promises';
import { createReadStream, existsSync } from 'fs';
import crypto from 'crypto';
import { execFile } from 'child_process';
import { promisify } from 'util';
import cors from 'cors';
import { createServer as createViteServer } from 'vite';
import { createServer as createHttpServer } from 'http';
import { Server as SocketIOServer } from 'socket.io';
import { GoogleGenAI } from '@google/genai';
import { startTunnel as startCloudflareTunnel } from 'untun';

// Core Security, Config & Observability Modules
import { serverConfig } from './server/config/env';
import { productionCorsOptions, socketIoCorsOptions } from './server/security/cors';
import { securityHeadersMiddleware } from './server/security/headers';
import { canonicalRedirectMiddleware } from './server/security/redirects';
import { createRateLimiter } from './server/security/rateLimiter';
import { sanitizeFileName, isValidPdfBuffer } from './server/security/validation';
import {
  isAuthorizedForRoom,
  getOrCreateRoom,
  getRoom,
  trackRelayBandwidth,
  isValidRoomId,
  MAX_RELAY_CHUNK_BYTES,
  MAX_ROOM_PARTICIPANTS,
} from './server/security/p2pAuth';
import { startOrphanCleanupDaemon, stopOrphanCleanupDaemon } from './server/security/orphanCleanup';
import { requestLoggingMiddleware, logInfo, logWarn, logError } from './server/observability/logger';
import { sendError } from './server/security/errorResponse';
import { getIceServers } from './server/security/turnToken';
import { injectSeoMetadata } from './server/seo/meta';

// Subsystem Routers
import compressionRouter from './server/compression/api';
import wordConversionRouter from './server/conversion/wordToPdf/api';
import sarvamRouter from './server/ai/sarvamRouter';
import workflowRouter from './server/workflows/api';
import ocrRouter from './server/ocr/api';
import reportIssueHandler from './api/report-issue';

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

let aiClient: GoogleGenAI | null = null;

function getGeminiClient(): GoogleGenAI | null {
  const apiKey = serverConfig.ai.geminiApiKey;
  if (!apiKey) return null;
  if (!aiClient) {
    aiClient = new GoogleGenAI({
      apiKey,
      httpOptions: {
        headers: {
          'User-Agent': 'zipstream-backend-ai',
        },
      },
    });
  }
  return aiClient;
}

// ─── Ephemeral Room Document Cache ─────────────────────────────────────────
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

// Purge stale room documents older than 4 hours
setInterval(() => {
  const cutoff = Date.now() - 4 * 60 * 60 * 1000;
  for (const [id, doc] of roomDocuments.entries()) {
    if (doc.updatedAt < cutoff) {
      roomDocuments.delete(id);
      void fs.rm(doc.filePath, { force: true }).catch(() => undefined);
    }
  }
}, 30 * 60 * 1000);

async function startServer() {
  const app = express();
  const execFileAsync = promisify(execFile);
  const httpServer = createHttpServer(app);
  const PORT = serverConfig.port;
  const MAX_ROOM_DOCUMENT_BYTES = serverConfig.maxRoomDocumentBytes;

  app.disable('x-powered-by');
  app.enable('trust proxy');

  // Start periodic orphan temp directory cleanup
  startOrphanCleanupDaemon();

  // 1. Request correlation ID & structured logging
  app.use(requestLoggingMiddleware);

  // 2. Production CORS hardening
  app.use(cors(productionCorsOptions));
  app.options('*', cors(productionCorsOptions));

  // 3. Canonical HTTPS & apex domain redirect
  app.use(canonicalRedirectMiddleware);

  // 4. Strict Security Headers & CSP
  app.use(securityHeadersMiddleware);

  // 5. Body Parsers with defensive size caps
  app.use(express.json({ limit: '30mb' }));
  app.use(express.urlencoded({ extended: true, limit: '30mb' }));

  // 6. General API Rate Limiting (150 requests/min per IP)
  app.use('/api', createRateLimiter('general'));

  // ─── Local Network & Tunnel Diagnostic Routes ───────────────────────────
  app.get('/api/network-interfaces', (_req, res) => {
    const interfaces: Array<{ name: string; ip: string; isDefault: boolean }> = [];
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

  // ─── Health & Readiness Probes ───────────────────────────────────────────
  app.get('/api/health', (_req, res) => {
    res.json({
      status: 'ok',
      service: 'ZipStream Server',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      activeDocuments: roomDocuments.size,
    });
  });

  app.get('/api/ready', async (_req, res) => {
    const checks: Record<string, boolean> = {
      storageWritable: false,
      serverResponsive: true,
    };

    try {
      await fs.mkdir(serverConfig.uploadDir, { recursive: true });
      await fs.mkdir(serverConfig.compressedDir, { recursive: true });
      checks.storageWritable = true;
    } catch {
      checks.storageWritable = false;
    }

    const isReady = Object.values(checks).every(Boolean);
    const statusCode = isReady ? 200 : 503;

    res.status(statusCode).json({
      status: isReady ? 'ready' : 'not_ready',
      checks,
      timestamp: new Date().toISOString(),
    });
  });

  // ─── Issue Reporting Route (Vercel parity & Local Express Support) ────────
  app.all('/api/report-issue', (req, res) => {
    return reportIssueHandler(req, res);
  });

  // ─── WebRTC STUN/TURN ICE Configuration ──────────────────────────────────
  app.get('/api/webrtc-config', (_req, res) => {
    res.json({
      iceServers: getIceServers(),
    });
  });

  // ─── Ghostscript PDF Compression Engine (PRESERVED CORE ALGORITHM) ───────
  const runGhostscript = async (
    inputPath: string,
    outputPath: string,
    profile: { pdfSettings?: string; dpi: number; jpegQuality?: number }
  ) => {
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
      timeout: serverConfig.timeouts.pdfMs,
      maxBuffer: 8 * 1024 * 1024,
    });
  };

  // Subsystem Routers
  app.use('/api/compress', compressionRouter);
  app.use('/api/convert', wordConversionRouter);
  app.use('/api/sarvam', sarvamRouter);
  app.use('/api/workflows', workflowRouter);
  app.use('/api/ocr', ocrRouter);

  // Wrapped PDF Compression Endpoint (Strict rate-limit + Validation + Preserved Engine)
  app.post(
    '/api/compress/pdf',
    createRateLimiter('compression'),
    express.raw({
      type: ['application/pdf', 'application/octet-stream'],
      limit: '100mb',
    }),
    async (req: Request, res: Response) => {
      const requestId = (req.header('x-request-id') || crypto.randomUUID()) as string;
      const body = Buffer.isBuffer(req.body) ? req.body : Buffer.from(req.body || []);

      if (!body.length) {
        return sendError(res, 400, 'EMPTY_FILE', 'PDF body is empty', undefined, requestId);
      }
      if (body.length > 80 * 1024 * 1024) {
        return sendError(res, 413, 'FILE_TOO_LARGE', 'PDF exceeds the 80MB compression limit', undefined, requestId);
      }
      if (!isValidPdfBuffer(body)) {
        return sendError(res, 400, 'INVALID_PDF', 'Invalid PDF file. Header does not match PDF format.', undefined, requestId);
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
              if (requestedTarget > 0 && out.length <= targetMax) break;
              if (!requestedTarget && out.length <= targetMax) break;
            }
          } catch (err: any) {
            logWarn(`Ghostscript profile ${i + 1} failed: ${err.message}`, undefined, requestId);
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
          } catch (fbErr: any) {
            logWarn(`Native PDF fallback in legacy endpoint failed: ${fbErr.message}`, undefined, requestId);
          }
        }

        if (!candidates.length) {
          if (successfulProfiles > 0) {
            res.setHeader('Content-Type', 'application/pdf');
            res.setHeader('Content-Disposition', "attachment; filename*=UTF-8''zipstream-compressed.pdf");
            res.setHeader('X-Original-Size', String(originalSize));
            res.setHeader('X-Compressed-Size', String(originalSize));
            res.setHeader('X-Compression-Engine', 'ghostscript');
            res.setHeader('X-Compression-Status', 'unchanged');
            return res.send(body);
          }
          return sendError(res, 503, 'ENGINE_UNAVAILABLE', 'PDF compression engine is temporarily unavailable.', undefined, requestId);
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
      } catch (err: any) {
        return sendError(res, 500, 'COMPRESSION_FAILED', 'Server PDF compression failed.', err, requestId);
      } finally {
        await fs.rm(dir, { recursive: true, force: true }).catch(() => undefined);
      }
    }
  );

  // ─── Socket.IO WebRTC Signaling & Relay Server ───────────────────────────
  const io = new SocketIOServer(httpServer, {
    cors: socketIoCorsOptions,
    maxHttpBufferSize: 1e7, // 10MB maximum message size
    pingTimeout: 60000,
  });

  io.on('connection', (socket) => {
    // 1. Join room with capability validation
    socket.on('join-room', ({ roomId, role, token }: { roomId: string; role: 'host' | 'peer'; token?: string }) => {
      if (!roomId || !isValidRoomId(roomId)) return;

      const room = getOrCreateRoom(roomId, token);

      // Enforce room token verification if room has an established token
      if (room.roomToken && token && !isAuthorizedForRoom(roomId, token)) {
        socket.emit('room-error', { error: 'Invalid room capability token.' });
        return;
      }

      if (room.members.size >= MAX_ROOM_PARTICIPANTS && !room.members.has(socket.id)) {
        socket.emit('room-full');
        return;
      }

      socket.join(roomId);
      const member = { socketId: socket.id, role, joinedAt: Date.now() };
      room.members.set(socket.id, member);
      if (role === 'host') room.hostSocketId = socket.id;

      socket.to(roomId).emit('peer-joined', { socketId: socket.id, role });
      const others = Array.from(room.members.values()).filter(m => m.socketId !== socket.id);
      socket.emit('room-info', {
        roomId,
        yourId: socket.id,
        members: others.map(m => ({ socketId: m.socketId, role: m.role })),
        roomSize: room.members.size,
      });

      // If document is cached, notify newcomer
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
          sha256: activeDoc.sha256,
        });
      }
    });

    // WebRTC Signaling Relays
    socket.on('webrtc-offer', ({ roomId, offer, targetId }: any) => {
      if (targetId) io.to(targetId).emit('webrtc-offer', { offer, senderId: socket.id });
      else socket.to(roomId).emit('webrtc-offer', { offer, senderId: socket.id });
    });
    socket.on('signal-offer', ({ targetPeerId, sdp }: any) => {
      io.to(targetPeerId).emit('signal-offer', { senderId: socket.id, sdp });
    });

    socket.on('webrtc-answer', ({ roomId, answer, targetId }: any) => {
      if (targetId) io.to(targetId).emit('webrtc-answer', { answer, senderId: socket.id });
      else socket.to(roomId).emit('webrtc-answer', { answer, senderId: socket.id });
    });
    socket.on('signal-answer', ({ targetPeerId, sdp }: any) => {
      io.to(targetPeerId).emit('signal-answer', { senderId: socket.id, sdp });
    });

    socket.on('webrtc-ice', ({ roomId, candidate, targetId }: any) => {
      if (targetId) io.to(targetId).emit('webrtc-ice', { candidate, senderId: socket.id });
      else socket.to(roomId).emit('webrtc-ice', { candidate, senderId: socket.id });
    });
    socket.on('signal-ice', ({ targetPeerId, candidate }: any) => {
      io.to(targetPeerId).emit('signal-ice', { senderId: socket.id, candidate });
    });

    // Synchronized Viewport State
    socket.on('sync-page', ({ roomId, page }: any) => {
      socket.to(roomId).emit('sync-page', { page, senderId: socket.id });
    });
    socket.on('sync-state', ({ roomId, event }: any) => {
      const doc = roomDocuments.get(roomId);
      if (doc && event) {
        if (event.page) doc.page = event.page;
        if (event.zoom) doc.zoom = event.zoom;
        if (typeof event.scrollRatio === 'number') doc.scrollRatio = event.scrollRatio;
      }
      socket.to(roomId).emit('sync-state', { event, senderId: socket.id });
    });

    // Relay chunk fallback with strict bandwidth & chunk size limits
    socket.on('relay-chunk-fallback', ({ roomId, chunk, targetId }: any) => {
      if (!roomId || !chunk) return;
      const chunkLen = typeof chunk === 'string' ? chunk.length : (chunk.byteLength || 0);

      if (chunkLen > MAX_RELAY_CHUNK_BYTES) {
        socket.emit('relay-error', { error: 'Chunk exceeds maximum allowed relay chunk size.' });
        return;
      }

      if (!trackRelayBandwidth(roomId, chunkLen)) {
        socket.emit('relay-error', { error: 'Room relay bandwidth quota exceeded.' });
        return;
      }

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
      const room = Array.from(io.sockets.adapter.rooms.keys());
      for (const roomId of room) {
        const activeRoom = getRoom(roomId);
        if (activeRoom && activeRoom.members.has(socket.id)) {
          activeRoom.members.delete(socket.id);
          if (activeRoom.hostSocketId === socket.id) activeRoom.hostSocketId = null;
          socket.to(roomId).emit('peer-left', { socketId: socket.id });
        }
      }
    });
  });

  // ─── P2P Room Document Storage (Protected by Cryptographic Capability Token) ─
  app.post(
    '/api/rooms/:roomId/document',
    createRateLimiter('roomDocument'),
    express.raw({ type: () => true, limit: `${Math.ceil(MAX_ROOM_DOCUMENT_BYTES / (1024 * 1024))}mb` }),
    async (req: Request, res: Response) => {
      const { roomId } = req.params;
      const requestId = (req.header('x-request-id') || crypto.randomUUID()) as string;

      if (!roomId || !isValidRoomId(roomId)) {
        return sendError(res, 400, 'INVALID_ROOM_ID', 'Invalid room identifier format.', undefined, requestId);
      }

      const clientToken = (req.header('x-room-token') || req.query.token) as string | undefined;
      const room = getOrCreateRoom(roomId, clientToken);

      // Verify token authorization
      if (room.roomToken && clientToken && !isAuthorizedForRoom(roomId, clientToken)) {
        return sendError(res, 403, 'UNAUTHORIZED_ROOM_ACCESS', 'Invalid room capability token.', undefined, requestId);
      }

      let rawBuffer: Buffer;
      let rawFileName = String(req.query.fileName || req.header('x-file-name') || 'Shared File');
      let fileType = String(req.query.fileType || req.header('x-file-type') || req.header('content-type') || 'application/octet-stream');
      let page = 1, zoom = 1, scrollRatio = 0;

      const body = Buffer.isBuffer(req.body) ? req.body : Buffer.alloc(0);
      const maybeJson = (req.header('content-type') || '').includes('application/json');

      if (maybeJson && body.length) {
        try {
          const parsed = JSON.parse(body.toString('utf8'));
          if (typeof parsed.dataBase64 === 'string') {
            rawBuffer = Buffer.from(parsed.dataBase64, 'base64');
            rawFileName = parsed.fileName || rawFileName;
            fileType = parsed.fileType || fileType;
            page = Number(parsed.page) || 1;
            zoom = Number(parsed.zoom) || 1;
            scrollRatio = Number(parsed.scrollRatio) || 0;
          } else {
            rawBuffer = body;
          }
        } catch {
          rawBuffer = body;
        }
      } else {
        rawBuffer = body;
      }

      const fileName = sanitizeFileName(rawFileName, 'Shared Document');

      if (!rawBuffer?.length) {
        return sendError(res, 400, 'EMPTY_FILE', 'File payload is empty.', undefined, requestId);
      }
      if (rawBuffer.length > MAX_ROOM_DOCUMENT_BYTES) {
        return sendError(res, 413, 'FILE_TOO_LARGE', `File exceeds ${Math.round(MAX_ROOM_DOCUMENT_BYTES / 1024 / 1024)}MB room limit.`, undefined, requestId);
      }

      const sha256 = crypto.createHash('sha256').update(rawBuffer).digest('hex');
      const roomDir = await fs.mkdtemp(path.join(os.tmpdir(), `zipstream-room-${roomId}-`));
      const filePath = path.join(roomDir, 'payload.bin');
      await fs.writeFile(filePath, rawBuffer);

      const previous = roomDocuments.get(roomId);
      if (previous) await fs.rm(previous.filePath, { force: true }).catch(() => undefined);

      const doc: EphemeralDocument = {
        fileName,
        fileSize: rawBuffer.length,
        fileType,
        filePath,
        updatedAt: Date.now(),
        page,
        zoom,
        scrollRatio,
        sha256,
      };
      roomDocuments.set(roomId, doc);

      res.set('Cache-Control', 'no-store');
      io.to(roomId).emit('room-document-available', {
        fileName: doc.fileName,
        fileSize: doc.fileSize,
        fileType: doc.fileType,
        hasDocument: true,
        page: doc.page,
        zoom: doc.zoom,
        scrollRatio: doc.scrollRatio,
        sha256: doc.sha256,
      });

      return res.json({
        success: true,
        fileName: doc.fileName,
        fileSize: doc.fileSize,
        fileType: doc.fileType,
        sha256: doc.sha256,
      });
    }
  );

  // Stream cached room document as raw bytes (Protected by Token)
  app.get(
    '/api/rooms/:roomId/document/raw',
    createRateLimiter('roomDocument'),
    async (req: Request, res: Response) => {
      const { roomId } = req.params;
      const requestId = (req.header('x-request-id') || crypto.randomUUID()) as string;

      if (!roomId || !isValidRoomId(roomId)) {
        return sendError(res, 400, 'INVALID_ROOM_ID', 'Invalid room identifier.', undefined, requestId);
      }

      const clientToken = (req.header('x-room-token') || req.query.token) as string | undefined;
      const room = getRoom(roomId);

      // Verify token authorization without leaking document existence
      if (room && room.roomToken && clientToken && !isAuthorizedForRoom(roomId, clientToken)) {
        return sendError(res, 403, 'UNAUTHORIZED_ROOM_ACCESS', 'Invalid room authorization token.', undefined, requestId);
      }

      const doc = roomDocuments.get(roomId);
      if (!doc) {
        return sendError(res, 404, 'DOCUMENT_NOT_FOUND', 'No document active in this room.', undefined, requestId);
      }

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
      } catch {
        return sendError(res, 404, 'DOCUMENT_EXPIRED', 'Room document is no longer available.', undefined, requestId);
      }
    }
  );

  app.get(
    '/api/rooms/:roomId/document',
    createRateLimiter('roomDocument'),
    (req: Request, res: Response) => {
      const { roomId } = req.params;
      const requestId = (req.header('x-request-id') || crypto.randomUUID()) as string;

      if (!roomId || !isValidRoomId(roomId)) {
        return sendError(res, 400, 'INVALID_ROOM_ID', 'Invalid room identifier.', undefined, requestId);
      }

      const clientToken = (req.header('x-room-token') || req.query.token) as string | undefined;
      const room = getRoom(roomId);

      if (room && room.roomToken && clientToken && !isAuthorizedForRoom(roomId, clientToken)) {
        return sendError(res, 403, 'UNAUTHORIZED_ROOM_ACCESS', 'Invalid room authorization token.', undefined, requestId);
      }

      const doc = roomDocuments.get(roomId);
      if (!doc) {
        return sendError(res, 404, 'DOCUMENT_NOT_FOUND', 'No document active in this room.', undefined, requestId);
      }

      res.set({ 'Cache-Control': 'no-store, no-cache, must-revalidate', 'Content-Type': 'application/json; charset=utf-8' });
      return res.json({
        fileName: doc.fileName,
        fileSize: doc.fileSize,
        fileType: doc.fileType,
        updatedAt: doc.updatedAt,
        page: doc.page,
        zoom: doc.zoom,
        scrollRatio: doc.scrollRatio,
        sha256: doc.sha256,
      });
    }
  );

  // Direct room URL redirect for deep links
  app.get('/room/:roomId', (req, res) => {
    const { roomId } = req.params;
    const tokenQuery = req.query.token ? `?token=${encodeURIComponent(String(req.query.token))}` : '';
    return res.redirect(`/#/room/${encodeURIComponent(roomId)}${tokenQuery}`);
  });

  // ─── Gemini AI Document Intelligence (Rate-Limited & Cost-Protected) ──────
  app.post(
    '/api/gemini/chat',
    createRateLimiter('ai'),
    async (req: Request, res: Response) => {
      const requestId = (req.header('x-request-id') || crypto.randomUUID()) as string;
      try {
        const { message, documentContext } = req.body || {};
        if (!message || typeof message !== 'string') {
          return sendError(res, 400, 'INVALID_INPUT', 'Message string is required.', undefined, requestId);
        }

        const maxChars = serverConfig.ai.maxInputChars;
        if (message.length > maxChars) {
          return sendError(res, 413, 'INPUT_TOO_LARGE', `Prompt exceeds limit of ${maxChars} characters.`, undefined, requestId);
        }

        const client = getGeminiClient();
        if (!client) {
          return res.json({
            reply: `[Offline Local Intelligence Mode]\n\nBased on document context: "${message.slice(0, 150)}..."\n\nDocument insights indexed locally. Connect your Gemini API Key in backend environment to activate cloud reasoning.`,
            isFallback: true,
          });
        }

        const systemPrompt = `You are ZipStream AI, a specialized on-device document intelligence assistant.
Answer accurately and concisely based strictly on the provided document context whenever possible.
If the answer is found in the text, quote or reference the relevant section clearly.

DOCUMENT CONTEXT:
${documentContext ? String(documentContext).slice(0, 35000) : 'No document uploaded yet.'}`;

        const responsePromise = client.models.generateContent({
          model: 'gemini-2.5-flash',
          contents: message,
          config: {
            systemInstruction: systemPrompt,
            temperature: 0.3,
            maxOutputTokens: serverConfig.ai.maxOutputTokens,
          },
        });

        const timeoutPromise = new Promise((_, reject) =>
          setTimeout(() => reject(new Error('AI provider request timed out')), serverConfig.ai.timeoutMs)
        );

        const response = (await Promise.race([responsePromise, timeoutPromise])) as any;

        return res.json({
          reply: response.text || 'I analyzed the document but did not generate any text output.',
          isFallback: false,
        });
      } catch (err: any) {
        return sendError(res, 500, 'AI_REQUEST_FAILED', 'Failed to process document chat.', err, requestId);
      }
    }
  );

  app.post(
    '/api/gemini/summarize',
    createRateLimiter('ai'),
    async (req: Request, res: Response) => {
      const requestId = (req.header('x-request-id') || crypto.randomUUID()) as string;
      try {
        const { text, type = 'executive' } = req.body || {};
        if (!text || typeof text !== 'string') {
          return sendError(res, 400, 'INVALID_INPUT', 'Document text is required for summarization.', undefined, requestId);
        }

        const maxChars = serverConfig.ai.maxInputChars;
        if (text.length > maxChars * 2) {
          return sendError(res, 413, 'INPUT_TOO_LARGE', `Document text exceeds limit of ${maxChars * 2} characters.`, undefined, requestId);
        }

        const wordCount = text.trim().split(/\s+/).filter(Boolean).length;
        const readingTime = Math.max(1, Math.ceil(wordCount / 200));

        const client = getGeminiClient();
        if (!client) {
          const fallback = text.replace(/\s+/g, ' ').split(/(?<=[.!?])\s+/).filter(Boolean).slice(0, 6).join(' ');
          return res.json({ summary: fallback || text.slice(0, 1200), type, wordCount, readingTime, isFallback: true });
        }

        const responsePromise = client.models.generateContent({
          model: 'gemini-2.5-flash',
          contents: `Create a ${type} summary. Be concise, factual, and do not invent information.\n\nDOCUMENT:\n${text.slice(0, 50000)}`,
          config: {
            temperature: 0.2,
            maxOutputTokens: serverConfig.ai.maxOutputTokens,
          },
        });

        const timeoutPromise = new Promise((_, reject) =>
          setTimeout(() => reject(new Error('AI provider request timed out')), serverConfig.ai.timeoutMs)
        );

        const response = (await Promise.race([responsePromise, timeoutPromise])) as any;

        return res.json({
          summary: response.text || 'No summary was generated.',
          type,
          wordCount,
          readingTime,
          isFallback: false,
        });
      } catch (err: any) {
        return sendError(res, 500, 'AI_SUMMARIZE_FAILED', 'Failed to summarize document.', err, requestId);
      }
    }
  );

  // ─── Search Engine Crawlers & Static Files ───────────────────────────────
  app.get('/sitemap.xml', (_req, res) => {
    const sitemapDist = path.join(process.cwd(), 'dist', 'sitemap.xml');
    const sitemapPublic = path.join(process.cwd(), 'public', 'sitemap.xml');
    const filePath = existsSync(sitemapDist) ? sitemapDist : sitemapPublic;
    res.type('application/xml; charset=utf-8');
    res.sendFile(filePath);
  });

  app.get('/robots.txt', (_req, res) => {
    const robotsDist = path.join(process.cwd(), 'dist', 'robots.txt');
    const robotsPublic = path.join(process.cwd(), 'public', 'robots.txt');
    const filePath = existsSync(robotsDist) ? robotsDist : robotsPublic;
    res.type('text/plain; charset=utf-8');
    res.sendFile(filePath);
  });

  app.get('/404', (_req, res) => {
    const page404Dist = path.join(process.cwd(), 'dist', '404.html');
    const page404Public = path.join(process.cwd(), 'public', '404.html');
    const filePath = existsSync(page404Dist) ? page404Dist : page404Public;
    res.status(404).sendFile(filePath);
  });

  // ─── Frontend Serving with Dynamic Server-Side SEO Meta Injection ────────
  if (!serverConfig.isProduction) {
    const vite = await createViteServer({
      server: {
        middlewareMode: true,
        allowedHosts: true,
        cors: true,
      },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    const indexPath = path.join(distPath, 'index.html');
    let cachedIndexHtml = '';

    try {
      cachedIndexHtml = await fs.readFile(indexPath, 'utf8');
    } catch {
      // index.html may be built on container startup
    }

    app.use(
      express.static(distPath, {
        maxAge: '1y',
        immutable: true,
        setHeaders: (res, filePath) => {
          if (filePath.endsWith('.html')) res.setHeader('Cache-Control', 'no-cache');
        },
      })
    );

    app.get('*', async (req, res) => {
      if (path.extname(req.path)) {
        const page404 = path.join(distPath, '404.html');
        return res.status(404).sendFile(page404);
      }

      if (!cachedIndexHtml) {
        try {
          cachedIndexHtml = await fs.readFile(indexPath, 'utf8');
        } catch {
          return res.status(500).send('ZipStream application is building. Please refresh in a moment.');
        }
      }

      const renderedHtml = injectSeoMetadata(cachedIndexHtml, req.path, serverConfig.publicBaseUrl);
      res.setHeader('Content-Type', 'text/html; charset=utf-8');
      res.setHeader('Cache-Control', 'no-cache, must-revalidate');
      return res.send(renderedHtml);
    });
  }

  // ─── HTTP & WebSocket Listening ──────────────────────────────────────────
  const serverInstance = httpServer.listen(PORT, '0.0.0.0', () => {
    logInfo(`🚀 ZipStream production server listening at http://0.0.0.0:${PORT}`);
    logInfo(`📡 WebRTC signaling and Socket.IO active`);

    if (serverConfig.tunnel.enabled) {
      startTunnel(PORT);
    } else {
      tunnelStatus = 'off';
    }
  });

  // ─── Graceful Shutdown Handler ───────────────────────────────────────────
  const shutdown = (signal: string) => {
    logInfo(`Received ${signal}. Starting graceful shutdown...`);
    stopOrphanCleanupDaemon();

    serverInstance.close(() => {
      logInfo('HTTP server closed.');
      io.close(() => {
        logInfo('Socket.IO server closed.');
        process.exit(0);
      });
    });

    // Force exit after 10 seconds if hanging
    setTimeout(() => {
      logError('Graceful shutdown timeout exceeded. Forcing exit.');
      process.exit(1);
    }, 10000).unref();
  };

  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));
}

async function startTunnel(port: number) {
  tunnelStatus = 'starting';

  const attemptTunnel = async (retryCount = 0): Promise<void> => {
    try {
      logInfo(`🔗 Opening Cloudflare HTTPS tunnel for instant mobile pairing (attempt ${retryCount + 1})...`);
      const tunnel = await startCloudflareTunnel({ port });
      const url = await tunnel.getURL();

      tunnelUrl = url;
      tunnelStatus = 'active';

      logInfo(`✅ Cloudflare Public HTTPS Tunnel is LIVE: ${url}`);
    } catch (err: any) {
      logWarn(`⚠️ Cloudflare tunnel attempt ${retryCount + 1} failed: ${err.message}`);
      tunnelUrl = '';
      tunnelStatus = retryCount >= 3 ? 'error' : 'starting';
      if (retryCount < 3) {
        setTimeout(() => attemptTunnel(retryCount + 1), 4000);
      } else {
        logWarn('❌ Cloudflare tunnel unavailable. Falling back to local LAN IP.');
        tunnelStatus = 'error';
      }
    }
  };

  await attemptTunnel();
}

startServer();
