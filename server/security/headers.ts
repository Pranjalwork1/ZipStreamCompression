/**
 * Production Security Headers & Content-Security-Policy (CSP)
 *
 * Implements strict defense-in-depth HTTP headers tailored to ZipStream's
 * React SPA, WebRTC data channels, PDF.js, Google Analytics, Umami, and Google Fonts.
 */

import { Request, Response, NextFunction } from 'express';
import { serverConfig } from '../config/env';

export function securityHeadersMiddleware(_req: Request, res: Response, next: NextFunction): void {
  // Prevent MIME-sniffing
  res.setHeader('X-Content-Type-Options', 'nosniff');

  // Prevent clickjacking
  res.setHeader('X-Frame-Options', 'SAMEORIGIN');

  // Isolation & Referrer policy
  res.setHeader('Cross-Origin-Opener-Policy', 'same-origin-allow-popups');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');

  // Restrict sensitive device capabilities
  res.setHeader('Permissions-Policy', 'camera=(self), microphone=(self), geolocation=()');

  // Enforce HSTS in production
  if (serverConfig.isProduction) {
    res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains; preload');
  }

  // Content-Security-Policy (CSP)
  const cspDirectives = [
    "default-src 'self'",
    "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://cloud.umami.is https://www.googletagmanager.com https://pagead2.googlesyndication.com https://ep2.adtrafficquality.google https://cdnjs.cloudflare.com",
    "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
    "font-src 'self' data: https://fonts.gstatic.com",
    "img-src 'self' data: blob: https://zipstream.online https://cloud.umami.is https://pagead2.googlesyndication.com https://*.google.com",
    "connect-src 'self' ws: wss: https: blob: http://localhost:* ws://localhost:*",
    "media-src 'self' blob: data:",
    "worker-src 'self' blob: https://cdnjs.cloudflare.com",
    "frame-src 'self' https://googleads.g.doubleclick.net https://pagead2.googlesyndication.com",
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
  ];

  res.setHeader('Content-Security-Policy', cspDirectives.join('; '));

  next();
}
