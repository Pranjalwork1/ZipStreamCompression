/**
 * WebRTC STUN/TURN ICE Configuration Provider
 *
 * Supports public STUN servers and time-limited HMAC-SHA1 TURN credentials
 * (RFC 5766) when a TURN_SECRET is configured, preventing static credential draining.
 */

import crypto from 'crypto';
import { serverConfig } from '../config/env';

export interface IceServerConfig {
  urls: string | string[];
  username?: string;
  credential?: string;
}

export function getIceServers(): IceServerConfig[] {
  const publicStunServers: IceServerConfig[] = [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
    { urls: 'stun:stun2.l.google.com:19302' },
    { urls: 'stun:stun.cloudflare.com:3478' },
    { urls: 'stun:global.stun.twilio.com:3478' },
  ];

  const { turnUrl, turnUsername, turnCredential, turnSecret } = serverConfig.webrtc;

  if (!turnUrl) {
    return publicStunServers;
  }

  const urls = turnUrl.split(',').map(u => u.trim());

  // 1. Time-limited dynamic TURN credentials (RFC 5766) if secret is provided
  if (turnSecret) {
    const ttlSeconds = 3600; // 1 hour validity
    const expiryTimestamp = Math.floor(Date.now() / 1000) + ttlSeconds;
    const dynamicUsername = `${expiryTimestamp}:zipstream-client`;
    const hmac = crypto.createHmac('sha1', turnSecret);
    hmac.update(dynamicUsername);
    const dynamicCredential = hmac.digest('base64');

    return [
      {
        urls,
        username: dynamicUsername,
        credential: dynamicCredential,
      },
      ...publicStunServers,
    ];
  }

  // 2. Static TURN credentials (fallback)
  if (turnUsername && turnCredential) {
    return [
      {
        urls,
        username: turnUsername,
        credential: turnCredential,
      },
      ...publicStunServers,
    ];
  }

  return publicStunServers;
}
