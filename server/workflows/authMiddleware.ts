/**
 * Workflow Authentication & Session Middleware
 *
 * Derives authenticated user identity securely from signed session tokens.
 * Strictly prevents user_id spoofing from request body or query parameters.
 */

import { Request, Response, NextFunction } from 'express';
import crypto from 'crypto';

declare global {
  namespace Express {
    interface Request {
      userId?: string;
    }
  }
}

// In-memory or cryptographically signed session verification
const SESSION_SECRET = process.env.SESSION_SECRET || 'zipstream-workflow-session-secret-2026';

export function signSessionToken(userId: string): string {
  const payload = `${userId}:${Date.now()}`;
  const hmac = crypto.createHmac('sha256', SESSION_SECRET).update(payload).digest('hex');
  return Buffer.from(`${payload}:${hmac}`).toString('base64url');
}

export function verifySessionToken(token: string): string | null {
  try {
    const raw = Buffer.from(token, 'base64url').toString('utf-8');
    const parts = raw.split(':');
    if (parts.length < 3) return null;
    const [userId, timestampStr, hmac] = parts;

    // Check expiration (30 days)
    const timestamp = parseInt(timestampStr, 10);
    if (isNaN(timestamp) || Date.now() - timestamp > 30 * 24 * 60 * 60 * 1000) {
      return null;
    }

    const payload = `${userId}:${timestampStr}`;
    const expectedHmac = crypto.createHmac('sha256', SESSION_SECRET).update(payload).digest('hex');

    // Timing-safe comparison
    if (crypto.timingSafeEqual(Buffer.from(hmac), Buffer.from(expectedHmac))) {
      return userId;
    }
    return null;
  } catch {
    return null;
  }
}

export function workflowAuthMiddleware(req: Request, res: Response, next: NextFunction) {
  // 1. Check Authorization Bearer header
  const authHeader = req.headers.authorization;
  let token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7).trim() : null;

  // 2. Check fallback header
  if (!token) {
    const sessionHeader = req.headers['x-zipstream-session'];
    if (typeof sessionHeader === 'string') {
      token = sessionHeader.trim();
    }
  }

  // 3. Check Cookie
  if (!token && req.headers.cookie) {
    const match = req.headers.cookie.match(/zipstream_session=([^;]+)/);
    if (match) token = match[1];
  }

  if (token) {
    const userId = verifySessionToken(token);
    if (userId) {
      req.userId = userId;
      return next();
    }
  }

  // For unauthenticated clients, return 401
  return res.status(401).json({
    success: false,
    error: {
      code: 'UNAUTHORIZED',
      message: 'Sign in or start a secure session to manage and run workflows.',
    },
  });
}
