/**
 * P2P Room Cryptographic Capability & Authorization Manager
 *
 * Enforces room capability tokens, room lifetimes, participant quotas,
 * document authorization, and relay bandwidth abuse prevention.
 */

import crypto from 'crypto';

export interface RoomMember {
  socketId: string;
  role: 'host' | 'peer';
  joinedAt: number;
}

export interface RoomState {
  roomId: string;
  roomToken: string;        // Cryptographic capability secret token required for document access
  hostSocketId: string | null;
  createdAt: number;
  updatedAt: number;
  bytesRelayed: number;
  members: Map<string, RoomMember>;
}

// Global active room store
const activeRooms = new Map<string, RoomState>();

// Security limits
export const MAX_ROOM_LIFETIME_MS = 4 * 60 * 60 * 1000; // 4 hours maximum room lifetime
export const MAX_ROOM_IDLE_MS = 60 * 60 * 1000;         // 1 hour idle timeout
export const MAX_ROOM_PARTICIPANTS = 8;
export const MAX_ROOM_RELAY_BYTES = 500 * 1024 * 1024;  // 500 MB max relay fallback per room
export const MAX_RELAY_CHUNK_BYTES = 128 * 1024;        // 128 KB max per relay chunk

/**
 * Generate a cryptographically secure 256-bit token
 */
export function generateCapabilityToken(): string {
  return crypto.randomBytes(32).toString('hex');
}

/**
 * Validates room ID format: alphanumeric with dashes/underscores, 4-64 chars
 */
export function isValidRoomId(roomId: string): boolean {
  return /^[a-zA-Z0-9_-]{4,64}$/.test(roomId);
}

/**
 * Create or retrieve an active room with capability token
 */
export function getOrCreateRoom(roomId: string, providedToken?: string): RoomState {
  let room = activeRooms.get(roomId);
  const now = Date.now();

  if (room) {
    if (now - room.createdAt > MAX_ROOM_LIFETIME_MS) {
      activeRooms.delete(roomId);
      room = undefined;
    }
  }

  if (!room) {
    const token = providedToken && providedToken.length >= 16 ? providedToken : generateCapabilityToken();
    room = {
      roomId,
      roomToken: token,
      hostSocketId: null,
      createdAt: now,
      updatedAt: now,
      bytesRelayed: 0,
      members: new Map(),
    };
    activeRooms.set(roomId, room);
  }

  return room;
}

export function getRoom(roomId: string): RoomState | undefined {
  const room = activeRooms.get(roomId);
  if (!room) return undefined;
  if (Date.now() - room.createdAt > MAX_ROOM_LIFETIME_MS) {
    activeRooms.delete(roomId);
    return undefined;
  }
  return room;
}

/**
 * Verifies that a client has the valid cryptographic token for this room.
 * Uses timingSafeEqual to prevent timing attacks.
 */
export function isAuthorizedForRoom(roomId: string, token: string | undefined): boolean {
  if (!token || typeof token !== 'string') return false;
  const room = getRoom(roomId);
  if (!room) return false;

  const expected = Buffer.from(room.roomToken, 'utf8');
  const received = Buffer.from(token, 'utf8');

  if (expected.length !== received.length) return false;
  return crypto.timingSafeEqual(expected, received);
}

/**
 * Track chunk relay bandwidth. Returns false if the room exceeded relay quotas.
 */
export function trackRelayBandwidth(roomId: string, chunkBytes: number): boolean {
  if (chunkBytes > MAX_RELAY_CHUNK_BYTES) return false;

  const room = getRoom(roomId);
  if (!room) return false;

  room.bytesRelayed += chunkBytes;
  room.updatedAt = Date.now();

  return room.bytesRelayed <= MAX_ROOM_RELAY_BYTES;
}

/**
 * Periodic room cleanup daemon
 */
setInterval(() => {
  const now = Date.now();
  for (const [roomId, room] of activeRooms.entries()) {
    const isExpired = now - room.createdAt > MAX_ROOM_LIFETIME_MS;
    const isIdle = now - room.updatedAt > MAX_ROOM_IDLE_MS && room.members.size === 0;

    if (isExpired || isIdle) {
      activeRooms.delete(roomId);
    }
  }
}, 10 * 60 * 1000);
