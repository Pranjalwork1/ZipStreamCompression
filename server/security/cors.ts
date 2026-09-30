/**
 * Production-Hardened CORS Configuration
 *
 * Restricts cross-origin requests to trusted origins in production.
 * Allows local development hosts only when NODE_ENV !== 'production'.
 */

import { CorsOptions } from 'cors';
import { serverConfig } from '../config/env';

export function isOriginAllowed(origin: string | undefined): boolean {
  if (!origin) return true; // Same-origin or non-browser client

  const normalized = origin.trim().replace(/\/+$/, '').toLowerCase();

  // 1. Check configured production whitelist
  if (serverConfig.corsAllowedOrigins.some(allowed => allowed.toLowerCase() === normalized)) {
    return true;
  }

  // 2. In non-production, permit local development addresses
  if (!serverConfig.isProduction) {
    if (
      /^https?:\/\/(localhost|127\.0\.0\.1|0\.0\.0\.0)(:\d+)?$/.test(normalized) ||
      /^https?:\/\/192\.168\.\d+\.\d+(:\d+)?$/.test(normalized) ||
      /^https?:\/\/10\.\d+\.\d+\.\d+(:\d+)?$/.test(normalized) ||
      normalized.endsWith('.trycloudflare.com')
    ) {
      return true;
    }
  }

  return false;
}

export const productionCorsOptions: CorsOptions = {
  origin: (origin, callback) => {
    if (isOriginAllowed(origin)) {
      callback(null, true);
    } else {
      callback(new Error(`CORS blocked: Origin ${origin} is not allowed by ZipStream policy.`));
    }
  },
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: [
    'Content-Type',
    'X-Target-Size-Bytes',
    'X-Compression-Level',
    'X-File-Name',
    'X-File-Type',
    'X-File-Sha256',
    'X-File-Size',
    'X-Room-Token',
    'Authorization',
    'X-Requested-With',
    'Accept',
    'Origin',
  ],
  exposedHeaders: [
    'Content-Disposition',
    'Content-Length',
    'Content-Type',
    'X-Original-Size',
    'X-Compressed-Size',
    'X-Reduction-Percentage',
    'X-Compression-Engine',
    'X-Compression-Status',
    'X-File-Name',
    'X-File-Type',
    'X-File-Sha256',
    'X-File-Size',
    'X-Room-Token',
  ],
  credentials: true,
  maxAge: 86400,
};

export const socketIoCorsOptions = {
  origin: (origin: string | undefined, callback: (err: Error | null, allow?: boolean) => void) => {
    if (isOriginAllowed(origin)) {
      callback(null, true);
    } else {
      callback(new Error('Socket.IO connection rejected by CORS policy.'));
    }
  },
  methods: ['GET', 'POST'],
  credentials: true,
};
