// server.js - P2P WebRTC Signaling & WebSocket Fallback Relay Server
import express from 'express';
import http from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
app.use(cors());

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
