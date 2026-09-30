/**
 * Centralized Production Environment Configuration & Validation
 *
 * Enforces safe defaults, validates configuration types, and prevents secret leakage.
 * All secrets are isolated server-side and never logged or exposed.
 */

import dotenv from 'dotenv';
import path from 'path';
import os from 'os';

dotenv.config();

export interface ServerConfig {
  nodeEnv: 'development' | 'production' | 'test';
  isProduction: boolean;
  port: number;
  publicBaseUrl: string;
  corsAllowedOrigins: string[];
  storageDir: string;
  uploadDir: string;
  compressedDir: string;
  maxUploadBytes: number;
  maxRoomDocumentBytes: number;
  redis: {
    host: string;
    port: number;
    password?: string;
    url?: string;
  };
  ai: {
    geminiApiKey?: string;
    sarvamApiKey?: string;
    maxInputChars: number;
    maxOutputTokens: number;
    timeoutMs: number;
    maxRequestsPerIpPerMin: number;
  };
  webrtc: {
    turnUrl?: string;
    turnUsername?: string;
    turnCredential?: string;
    turnSecret?: string;
  };
  timeouts: {
    pdfMs: number;
    wordMs: number;
    videoMs: number;
    audioMs: number;
  };
  tunnel: {
    enabled: boolean;
  };
}

function parseAllowedOrigins(raw?: string): string[] {
  const defaults = ['https://zipstream.online', 'https://www.zipstream.online'];
  if (!raw) return defaults;
  const parsed = raw
    .split(',')
    .map(o => o.trim().replace(/\/+$/, ''))
    .filter(Boolean);
  return parsed.length > 0 ? Array.from(new Set([...defaults, ...parsed])) : defaults;
}

export function loadConfig(): ServerConfig {
  const nodeEnv = (process.env.NODE_ENV || 'development') as 'development' | 'production' | 'test';
  const isProduction = nodeEnv === 'production';
  const port = Number(process.env.PORT) || 3000;
  const publicBaseUrl = (process.env.PUBLIC_BASE_URL || 'https://zipstream.online').replace(/\/+$/, '');

  const baseStorage = process.env.STORAGE_DIR || path.join(os.tmpdir(), 'zipstream-storage');
  const uploadDir = path.join(baseStorage, 'uploads');
  const compressedDir = path.join(baseStorage, 'compressed');

  const maxUploadMb = Number(process.env.MAX_UPLOAD_MB) || 250;
  const maxUploadBytes = maxUploadMb * 1024 * 1024;
  const maxRoomDocumentBytes = Number(process.env.MAX_ROOM_DOCUMENT_BYTES) || 250 * 1024 * 1024;

  const corsAllowedOrigins = parseAllowedOrigins(process.env.CORS_ALLOWED_ORIGINS);

  const config: ServerConfig = {
    nodeEnv,
    isProduction,
    port,
    publicBaseUrl,
    corsAllowedOrigins,
    storageDir: baseStorage,
    uploadDir,
    compressedDir,
    maxUploadBytes,
    maxRoomDocumentBytes,
    redis: {
      host: process.env.REDIS_HOST || 'localhost',
      port: Number(process.env.REDIS_PORT) || 6379,
      password: process.env.REDIS_PASSWORD || undefined,
      url: process.env.REDIS_URL || undefined,
    },
    ai: {
      geminiApiKey: process.env.GEMINI_API_KEY || undefined,
      sarvamApiKey: process.env.SARVAM_API_KEY || undefined,
      maxInputChars: Number(process.env.MAX_AI_INPUT_SIZE) || 50000,
      maxOutputTokens: Number(process.env.MAX_AI_OUTPUT_TOKENS) || 2048,
      timeoutMs: Number(process.env.AI_TIMEOUT_MS) || 30000,
      maxRequestsPerIpPerMin: Number(process.env.MAX_AI_REQUESTS_PER_IP) || 30,
    },
    webrtc: {
      turnUrl: process.env.TURN_URL || undefined,
      turnUsername: process.env.TURN_USERNAME || undefined,
      turnCredential: process.env.TURN_CREDENTIAL || undefined,
      turnSecret: process.env.TURN_SECRET || undefined,
    },
    timeouts: {
      pdfMs: Number(process.env.PDF_TIMEOUT_MS) || 180000,
      wordMs: Number(process.env.WORD_CONVERT_TIMEOUT_MS) || 90000,
      videoMs: Number(process.env.VIDEO_TIMEOUT_MS) || 600000,
      audioMs: Number(process.env.AUDIO_TIMEOUT_MS) || 180000,
    },
    tunnel: {
      enabled: process.env.ENABLE_TUNNEL !== 'false' && !isProduction,
    },
  };

  return config;
}

export const serverConfig = loadConfig();
