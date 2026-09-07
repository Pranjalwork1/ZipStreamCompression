// server.js - P2P WebRTC Signaling & WebSocket Fallback Relay Server
import express from 'express';
import http from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import crypto from 'crypto';
import { createReadStream } from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
app.use(cors());
app.use(express.json({ limit: '70mb' }));
app.use(express.urlencoded({ extended: true, limit: '70mb' }));

const server = http.createServer(app);
const io = new Server(server, {
  cors: { origin: '*', methods: ['GET', 'POST'] },
  maxHttpBufferSize: 1e8, // 100MB buffer for fallback relay
});

// Serve static assets from public/
app.use(express.static(path.join(__dirname, 'public')));

// Support direct room URL navigation (e.g. /room/abc-123)
app.get('/room/:roomId', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Ephemeral Room Registry: roomId -> { hostSocketId, peers: Set<socketId> }
const activeRooms = new Map();
const roomDocuments = new Map();
const MAX_ROOM_DOCUMENT_BYTES = Number(process.env.MAX_ROOM_DOCUMENT_BYTES || 250 * 1024 * 1024);
setInterval(() => {
  const cutoff = Date.now() - 4 * 60 * 60 * 1000;
  for (const [roomId, doc] of roomDocuments.entries()) {
    if (doc.updatedAt < cutoff) roomDocuments.delete(roomId);
  }
}, 30 * 60 * 1000);

app.post('/api/rooms/:roomId/document', (req, res) => {
  const { roomId } = req.params;
  if (!/^[a-zA-Z0-9_-]{4,64}$/.test(roomId)) return res.status(400).json({ error: 'Invalid room ID' });
  const { fileName, fileSize, fileType, dataBase64 } = req.body || {};
  if (typeof dataBase64 !== 'string' || !dataBase64) return res.status(400).json({ error: 'Valid base64 document data is required' });
  const estimatedBytes = Math.floor((dataBase64.replace(/=+$/, '').length * 3) / 4);
  if (estimatedBytes > MAX_ROOM_DOCUMENT_BYTES) return res.status(413).json({ error: 'File size exceeds maximum allowed room document limit (50MB)' });
  const rawBuffer = Buffer.from(dataBase64, 'base64');
  if (Number(fileSize) && Number(fileSize) !== rawBuffer.length) return res.status(400).json({ error: 'File size does not match payload' });
  const doc = { fileName: fileName || 'Shared Document', fileSize: rawBuffer.length, fileType: fileType || 'application/octet-stream', dataBase64, updatedAt: Date.now(), sha256: crypto.createHash('sha256').update(rawBuffer).digest('hex') };
  roomDocuments.set(roomId, doc);
  io.to(roomId).emit('room-document-available', { fileName: doc.fileName, fileSize: doc.fileSize, fileType: doc.fileType, hasDocument: true });
  res.set('Cache-Control', 'no-store').json({ success: true });
});

app.get('/api/rooms/:roomId/document/raw', (req, res) => {
  const { roomId } = req.params;
  if (!/^[a-zA-Z0-9_-]{4,64}$/.test(roomId)) return res.status(400).json({ error: 'Invalid room ID' });
  const doc = roomDocuments.get(roomId);
  if (!doc) return res.status(404).json({ error: 'No document active in this room' });
  const buffer = Buffer.from(doc.dataBase64, 'base64');
  res.set({ 'Cache-Control': 'no-store, no-cache, must-revalidate', 'Content-Type': doc.fileType || 'application/octet-stream', 'Content-Length': String(buffer.length), 'X-File-Sha256': doc.sha256 || crypto.createHash('sha256').update(buffer).digest('hex'), 'X-File-Name': encodeURIComponent(doc.fileName), 'Access-Control-Expose-Headers': 'Content-Length, X-File-Sha256, X-File-Name' });
  return res.end(buffer);
});

app.get('/api/rooms/:roomId/document', (req, res) => {
  const { roomId } = req.params;
  if (!/^[a-zA-Z0-9_-]{4,64}$/.test(roomId)) return res.status(400).json({ error: 'Invalid room ID' });
  const doc = roomDocuments.get(roomId);
  if (!doc) return res.status(404).json({ error: 'No document active in this room' });
  const includeData = req.query.includeData === '1' || req.query.includeData === 'true';
  res.set({ 'Cache-Control': 'no-store, no-cache, must-revalidate', 'Content-Type': 'application/json; charset=utf-8' });
  return res.json({ fileName: doc.fileName, fileSize: doc.fileSize, fileType: doc.fileType, ...(includeData ? { dataBase64: doc.dataBase64 } : {}), updatedAt: doc.updatedAt, sha256: doc.sha256 });
});

io.on('connection', (socket) => {
  console.log(`[Socket] Client connected: ${socket.id}`);

  // 1. Join / Initialize Room
  socket.on('join-room', ({ roomId, isHost }) => {
    socket.join(roomId);

    if (!activeRooms.has(roomId)) {
      activeRooms.set(roomId, { hostSocketId: socket.id, peers: new Set() });
    }

    const room = activeRooms.get(roomId);
    if (isHost) {
      room.hostSocketId = socket.id;
    } else {
      room.peers.add(socket.id);
    }

    const totalCount = (room.hostSocketId ? 1 : 0) + room.peers.size;
    const activeDoc = roomDocuments.get(roomId);
    if (activeDoc) socket.emit('room-document-available', { fileName: activeDoc.fileName, fileSize: activeDoc.fileSize, fileType: activeDoc.fileType, hasDocument: true });
    io.to(roomId).emit('room-presence', {
      roomId,
      peerCount: totalCount,
      hasHost: !!room.hostSocketId,
    });

    // Notify the host to initiate WebRTC SDP offer
    if (!isHost && room.hostSocketId) {
      io.to(room.hostSocketId).emit('peer-joined', { peerId: socket.id });
    }
  });

  // 2. WebRTC SDP Offer / Answer / ICE Relays
  socket.on('signal-offer', ({ targetPeerId, sdp }) => {
    io.to(targetPeerId).emit('signal-offer', { senderId: socket.id, sdp });
  });

  socket.on('signal-answer', ({ targetPeerId, sdp }) => {
    io.to(targetPeerId).emit('signal-answer', { senderId: socket.id, sdp });
  });

  socket.on('signal-ice', ({ targetPeerId, candidate }) => {
    io.to(targetPeerId).emit('signal-ice', { senderId: socket.id, candidate });
  });

  // 3. Real-Time Viewport Sync Relay
  socket.on('sync-state', ({ roomId, event }) => {
    socket.to(roomId).emit('sync-state', event);
  });

  // 4. WebSocket Binary Chunk Relay (Fallback when strict NAT blocks P2P)
  socket.on('relay-chunk-fallback', ({ roomId, chunk, index, total, metadata }) => {
    socket.to(roomId).emit('relay-chunk-fallback', { chunk, index, total, metadata });
  });

  // 5. Cleanup on Disconnection
  socket.on('disconnect', () => {
    activeRooms.forEach((room, roomId) => {
      let isModified = false;

      if (room.hostSocketId === socket.id) {
        room.hostSocketId = null;
        isModified = true;
        io.to(roomId).emit('host-disconnected');
      } else if (room.peers.has(socket.id)) {
        room.peers.delete(socket.id);
        isModified = true;
        io.to(roomId).emit('peer-disconnected', { peerId: socket.id });
      }

      if (isModified) {
        if (!room.hostSocketId && room.peers.size === 0) {
          activeRooms.delete(roomId);
        } else {
          const count = (room.hostSocketId ? 1 : 0) + room.peers.size;
          io.to(roomId).emit('room-presence', { roomId, peerCount: count, hasHost: !!room.hostSocketId });
        }
      }
    });
  });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`[P2P File Share Server] Listening at http://localhost:${PORT}`);
});
