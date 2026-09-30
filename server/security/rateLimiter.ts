/**
 * Production-Grade Distributed Rate Limiting
 *
 * Backed by Redis with fallback to an in-memory sliding window when Redis is offline.
 * Provides endpoint-specific categories to prevent CPU/RAM/AI exhaustion.
 */

import { Request, Response, NextFunction } from 'express';
import Redis from 'ioredis';
import { serverConfig } from '../config/env';

export type RateLimitCategory =
  | 'general'
  | 'upload'
  | 'compression'
  | 'ai'
  | 'roomCreate'
  | 'roomDocument';

interface CategoryConfig {
  windowSeconds: number;
  maxRequests: number;
  message: string;
}

const CATEGORY_LIMITS: Record<RateLimitCategory, CategoryConfig> = {
  general: {
    windowSeconds: 60,
    maxRequests: 150,
    message: 'Too many requests. Please try again shortly.',
  },
  upload: {
    windowSeconds: 60,
    maxRequests: 25,
    message: 'Upload frequency limit exceeded. Please wait before uploading more files.',
  },
  compression: {
    windowSeconds: 60,
    maxRequests: 15,
    message: 'CPU-intensive compression limit exceeded. Please wait before starting another job.',
  },
  ai: {
    windowSeconds: 60,
    maxRequests: 20,
    message: 'AI assistant request quota reached. Please wait a minute before sending another prompt.',
  },
  roomCreate: {
    windowSeconds: 300,
    maxRequests: 10,
    message: 'Room creation limit reached. Please wait a few minutes.',
  },
  roomDocument: {
    windowSeconds: 60,
    maxRequests: 30,
    message: 'Room document synchronization limit reached. Please try again shortly.',
  },
};

// In-Memory store fallback
interface MemoryRecord {
  count: number;
  resetAt: number;
}
const memoryStore = new Map<string, MemoryRecord>();

// Periodic cleanup of expired in-memory rate-limit records
setInterval(() => {
  const now = Date.now();
  for (const [key, record] of memoryStore.entries()) {
    if (record.resetAt <= now) {
      memoryStore.delete(key);
    }
  }
}, 60 * 1000);

let redisClient: Redis | null = null;
let redisHealthy = false;

function getRedisClient(): Redis | null {
  if (redisClient) return redisHealthy ? redisClient : null;

  try {
    const client = new Redis({
      host: serverConfig.redis.host,
      port: serverConfig.redis.port,
      password: serverConfig.redis.password,
      lazyConnect: true,
      maxRetriesPerRequest: 1,
      connectTimeout: 2000,
      enableOfflineQueue: false,
    });

    client.on('connect', () => {
      redisHealthy = true;
    });
    client.on('error', () => {
      redisHealthy = false;
    });

    void client.connect().then(() => {
      redisHealthy = true;
    }).catch(() => {
      redisHealthy = false;
    });

    redisClient = client;
    return redisHealthy ? redisClient : null;
  } catch {
    redisHealthy = false;
    return null;
  }
}

export function createRateLimiter(category: RateLimitCategory) {
  const config = CATEGORY_LIMITS[category] || CATEGORY_LIMITS.general;

  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    const clientIp = (req.ip || req.socket.remoteAddress || '127.0.0.1').replace(/^::ffff:/, '');
    const key = `ratelimit:${category}:${clientIp}`;
    const now = Date.now();

    // 1. Attempt Redis-backed distributed rate-limiting
    const redis = getRedisClient();
    if (redis && redisHealthy) {
      try {
        const pipeline = redis.pipeline();
        pipeline.incr(key);
        pipeline.ttl(key);
        const results = await pipeline.exec();

        if (results && results[0] && !results[0][0] && results[1] && !results[1][0]) {
          const currentCount = Number(results[0][1]);
          let ttl = Number(results[1][1]);

          if (currentCount === 1 || ttl === -1) {
            await redis.expire(key, config.windowSeconds);
            ttl = config.windowSeconds;
          }

          const remaining = Math.max(0, config.maxRequests - currentCount);
          res.setHeader('RateLimit-Limit', String(config.maxRequests));
          res.setHeader('RateLimit-Remaining', String(remaining));
          res.setHeader('RateLimit-Reset', String(ttl));

          if (currentCount > config.maxRequests) {
            res.setHeader('Retry-After', String(ttl));
            res.status(429).json({
              success: false,
              error: {
                code: 'RATE_LIMIT_EXCEEDED',
                message: config.message,
              },
              retryAfter: ttl,
            });
            return;
          }

          return next();
        }
      } catch {
        // Fall back to memoryStore on temporary Redis failure
      }
    }

    // 2. In-Memory fallback
    let record = memoryStore.get(key);
    if (!record || record.resetAt <= now) {
      record = { count: 1, resetAt: now + config.windowSeconds * 1000 };
      memoryStore.set(key, record);
    } else {
      record.count += 1;
    }

    const ttlSeconds = Math.max(1, Math.ceil((record.resetAt - now) / 1000));
    const remaining = Math.max(0, config.maxRequests - record.count);

    res.setHeader('RateLimit-Limit', String(config.maxRequests));
    res.setHeader('RateLimit-Remaining', String(remaining));
    res.setHeader('RateLimit-Reset', String(ttlSeconds));

    if (record.count > config.maxRequests) {
      res.setHeader('Retry-After', String(ttlSeconds));
      res.status(429).json({
        success: false,
        error: {
          code: 'RATE_LIMIT_EXCEEDED',
          message: config.message,
        },
        retryAfter: ttlSeconds,
      });
      return;
    }

    return next();
  };
}
