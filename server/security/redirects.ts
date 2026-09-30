/**
 * Canonical Host & Protocol Enforcement Middleware
 *
 * Enforces canonical HTTPS apex domain redirects using PUBLIC_BASE_URL.
 * NEVER trusts incoming Host headers for constructing redirect locations.
 */

import { Request, Response, NextFunction } from 'express';
import { serverConfig } from '../config/env';

export function canonicalRedirectMiddleware(req: Request, res: Response, next: NextFunction): void {
  // Always let health checks and readiness probes pass through without redirection
  if (req.path === '/api/health' || req.path === '/api/ready') {
    return next();
  }

  const host = req.headers.host || '';
  const proto = (req.headers['x-forwarded-proto'] as string) || req.protocol;
  const isWww = /^www\./i.test(host);
  const isHttp = proto === 'http';
  const isLocal = /^(localhost|127\.0\.0\.1|0\.0\.0\.0)(:\d+)?$/i.test(host);

  // In production or when accessed via public domain, redirect http -> https and www -> apex
  if (!isLocal && (isWww || isHttp)) {
    const targetUrl = new URL(req.originalUrl, serverConfig.publicBaseUrl);
    return res.redirect(301, targetUrl.toString());
  }

  next();
}
