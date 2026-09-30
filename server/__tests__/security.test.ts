import { describe, it, expect } from 'vitest';
import { sanitizeFileName, isValidPdfBuffer, isPathInsideDirectory } from '../security/validation';
import { isOriginAllowed } from '../security/cors';
import {
  generateCapabilityToken,
  isValidRoomId,
  getOrCreateRoom,
  isAuthorizedForRoom,
  trackRelayBandwidth,
  MAX_RELAY_CHUNK_BYTES,
} from '../security/p2pAuth';
import path from 'path';

describe('Security Validation Suite', () => {
  describe('Filename Sanitization & Path Traversal Prevention', () => {
    it('should sanitize path traversal attempts', () => {
      expect(sanitizeFileName('../../etc/passwd')).toBe('etc_passwd');
      expect(sanitizeFileName('..\\..\\windows\\system32')).toBe('windows_system32');
      expect(sanitizeFileName('/root/secret.pdf')).toBe('root_secret.pdf');
    });

    it('should preserve valid multilingual filenames', () => {
      expect(sanitizeFileName('résumé.pdf')).toBe('résumé.pdf');
      expect(sanitizeFileName('हिंदी_दस्तावेज़.pdf')).toBe('हिंदी_दस्तावेज़.pdf');
      expect(sanitizeFileName('document (1).pdf')).toBe('document (1).pdf');
      expect(sanitizeFileName('project-final-v2.pdf')).toBe('project-final-v2.pdf');
    });

    it('should fall back to default for empty or dangerous strings', () => {
      expect(sanitizeFileName('')).toBe('file');
      expect(sanitizeFileName('...')).toBe('file');
    });

    it('should enforce path boundaries correctly', () => {
      const allowedDir = path.resolve('/tmp/zipstream-test');
      const safeChild = path.resolve('/tmp/zipstream-test/job-1/output.pdf');
      const escapedChild = path.resolve('/tmp/other-dir/output.pdf');

      expect(isPathInsideDirectory(safeChild, allowedDir)).toBe(true);
      expect(isPathInsideDirectory(escapedChild, allowedDir)).toBe(false);
    });
  });

  describe('PDF Magic Byte Inspection', () => {
    it('should validate valid PDF headers', () => {
      const validHeader = Buffer.from('%PDF-1.7\n%âãÏÓ\n');
      expect(isValidPdfBuffer(validHeader)).toBe(true);
    });

    it('should reject malformed or non-PDF headers', () => {
      expect(isValidPdfBuffer(Buffer.from('PK\x03\x04'))).toBe(false);
      expect(isValidPdfBuffer(Buffer.from('<html><body>'))).toBe(false);
      expect(isValidPdfBuffer(Buffer.from(''))).toBe(false);
      expect(isValidPdfBuffer(Buffer.from('%PD'))).toBe(false);
    });
  });

  describe('CORS Origin Filtering', () => {
    it('should allow production canonical domains', () => {
      expect(isOriginAllowed('https://zipstream.online')).toBe(true);
      expect(isOriginAllowed('https://www.zipstream.online')).toBe(true);
    });

    it('should reject unauthorized third-party origins in production', () => {
      // In production mode test
      expect(isOriginAllowed('https://evil-attacker.com')).toBe(false);
      expect(isOriginAllowed('https://phishing-zipstream.online.fake.com')).toBe(false);
    });
  });

  describe('P2P Room Cryptographic Capability Authorization', () => {
    it('should validate room ID patterns strictly', () => {
      expect(isValidRoomId('zip-abc1234567890')).toBe(true);
      expect(isValidRoomId('room_1234')).toBe(true);
      expect(isValidRoomId('bad')).toBe(false); // too short (<4)
      expect(isValidRoomId('a'.repeat(65))).toBe(false); // too long (>64)
      expect(isValidRoomId('room;drop table;')).toBe(false);
    });

    it('should authorize access only with the matching capability token', () => {
      const roomId = 'zip-test-auth-' + Date.now();
      const token = generateCapabilityToken();
      getOrCreateRoom(roomId, token);

      expect(isAuthorizedForRoom(roomId, token)).toBe(true);
      expect(isAuthorizedForRoom(roomId, 'wrong-token')).toBe(false);
      expect(isAuthorizedForRoom(roomId, undefined)).toBe(false);
      expect(isAuthorizedForRoom('non-existent-room', token)).toBe(false);
    });

    it('should enforce relay chunk and room bandwidth caps', () => {
      const roomId = 'zip-relay-test-' + Date.now();
      getOrCreateRoom(roomId);

      // Normal chunk within limit
      expect(trackRelayBandwidth(roomId, 64 * 1024)).toBe(true);

      // Oversized chunk rejected
      expect(trackRelayBandwidth(roomId, MAX_RELAY_CHUNK_BYTES + 1024)).toBe(false);
    });
  });
});
