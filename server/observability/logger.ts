/**
 * Privacy-Preserving Structured Logger
 *
 * Emits structured JSON or formatted logs with request tracking.
 * STRICTLY REDACTS all API keys, bearer tokens, passwords, and file contents.
 */

import { Request, Response, NextFunction } from 'express';
import crypto from 'crypto';

export interface LogEntry {
  timestamp: string;
  level: 'info' | 'warn' | 'error';
  requestId?: string;
  method?: string;
  url?: string;
  status?: number;
  durationMs?: number;
  message: string;
  metadata?: Record<string, any>;
}

const REDACTED_KEYS = new Set([
  'authorization',
  'api-key',
  'x-api-key',
  'token',
  'secret',
  'password',
  'turn_credential',
  'gemini_api_key',
  'sarvam_api_key',
  'x-room-token',
]);

export function sanitizeLogData(obj: any, depth = 0): any {
  if (depth > 4 || !obj) return obj;
  if (typeof obj !== 'object') return obj;

  if (Array.isArray(obj)) {
    return obj.map(item => sanitizeLogData(item, depth + 1));
  }

  const clean: Record<string, any> = {};
  for (const [key, val] of Object.entries(obj)) {
    const lowerKey = key.toLowerCase();
    if (REDACTED_KEYS.has(lowerKey) || lowerKey.includes('key') || lowerKey.includes('token') || lowerKey.includes('secret')) {
      clean[key] = '[REDACTED]';
    } else if (lowerKey.includes('buffer') || lowerKey.includes('base64') || lowerKey.includes('payload')) {
      clean[key] = `[BINARY_DATA_${typeof val === 'string' ? val.length : 'PAYLOAD'}]`;
    } else {
      clean[key] = sanitizeLogData(val, depth + 1);
    }
  }
  return clean;
}

export function logInfo(message: string, metadata?: Record<string, any>, requestId?: string): void {
  const entry: LogEntry = {
    timestamp: new Date().toISOString(),
    level: 'info',
    requestId,
    message,
    metadata: metadata ? sanitizeLogData(metadata) : undefined,
  };
  console.log(`[INFO] ${entry.timestamp} ${requestId ? `[${requestId}] ` : ''}${message}${metadata ? ' ' + JSON.stringify(entry.metadata) : ''}`);
}

export function logWarn(message: string, metadata?: Record<string, any>, requestId?: string): void {
  const entry: LogEntry = {
    timestamp: new Date().toISOString(),
    level: 'warn',
    requestId,
    message,
    metadata: metadata ? sanitizeLogData(metadata) : undefined,
  };
  console.warn(`[WARN] ${entry.timestamp} ${requestId ? `[${requestId}] ` : ''}${message}${metadata ? ' ' + JSON.stringify(entry.metadata) : ''}`);
}

export function logError(message: string, error?: any, requestId?: string): void {
  const errorDetails = error instanceof Error
    ? { name: error.name, message: error.message }
    : { message: String(error) };

  const entry: LogEntry = {
    timestamp: new Date().toISOString(),
    level: 'error',
    requestId,
    message,
    metadata: sanitizeLogData(errorDetails),
  };
  console.error(`[ERROR] ${entry.timestamp} ${requestId ? `[${requestId}] ` : ''}${message} ${JSON.stringify(entry.metadata)}`);
}

/**
 * Express middleware to attach unique Request ID and log completion timing
 */
export function requestLoggingMiddleware(req: Request, res: Response, next: NextFunction): void {
  const requestId = (req.header('x-request-id') || crypto.randomUUID()) as string;
  req.headers['x-request-id'] = requestId;
  res.setHeader('X-Request-Id', requestId);

  // Skip noisy static asset / favicon logs
  if (req.path.startsWith('/assets') || req.path.endsWith('.png') || req.path.endsWith('.ico') || req.path === '/api/health') {
    return next();
  }

  const startTime = Date.now();

  res.on('finish', () => {
    const durationMs = Date.now() - startTime;
    const level = res.statusCode >= 500 ? 'error' : res.statusCode >= 400 ? 'warn' : 'info';

    if (level === 'error') {
      logError(`HTTP ${req.method} ${req.originalUrl} responded with ${res.statusCode}`, undefined, requestId);
    } else if (level === 'warn') {
      logWarn(`HTTP ${req.method} ${req.originalUrl} responded with ${res.statusCode} (${durationMs}ms)`, undefined, requestId);
    } else {
      logInfo(`HTTP ${req.method} ${req.originalUrl} ${res.statusCode} (${durationMs}ms)`, undefined, requestId);
    }
  });

  next();
}
