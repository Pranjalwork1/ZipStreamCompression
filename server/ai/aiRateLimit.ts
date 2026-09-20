import { Request, Response, NextFunction } from 'express';

interface RateLimitRecord {
  count: number;
  resetAt: number;
}

export type AiRouteType = 'chat' | 'summarize' | 'translate' | 'stt' | 'tts' | 'insights';

export function getRouteLimit(type: AiRouteType): number {
  switch (type) {
    case 'chat':
      return Number(process.env.SARVAM_CHAT_RATE_LIMIT) || 20;
    case 'summarize':
      return Number(process.env.SARVAM_SUMMARY_RATE_LIMIT) || 5;
    case 'translate':
      return Number(process.env.SARVAM_TRANSLATE_RATE_LIMIT) || 20;
    case 'stt':
      return Number(process.env.SARVAM_STT_RATE_LIMIT) || 10;
    case 'tts':
      return Number(process.env.SARVAM_TTS_RATE_LIMIT) || 15;
    case 'insights':
      return Number(process.env.SARVAM_SUMMARY_RATE_LIMIT) || 5;
    default:
      return 20;
  }
}

// In-memory sliding window store per route type
const routeBuckets = new Map<string, Map<string, RateLimitRecord>>();

// Periodic cleanup of expired rate limit records (every 10 minutes)
setInterval(() => {
  const now = Date.now();
  for (const bucket of routeBuckets.values()) {
    for (const [key, record] of bucket.entries()) {
      if (record.resetAt <= now) {
        bucket.delete(key);
      }
    }
  }
}, 10 * 60 * 1000);

/**
 * Creates an Express middleware to enforce in-memory route-specific AI rate limits.
 * Returns HTTP 429 when limit is exceeded with user-friendly error message.
 */
export function createAiRateLimiter(routeType: AiRouteType) {
  if (!routeBuckets.has(routeType)) {
    routeBuckets.set(routeType, new Map());
  }
  const bucket = routeBuckets.get(routeType)!;

  return (req: Request, res: Response, next: NextFunction) => {
    const limit = getRouteLimit(routeType);
    const ip = req.ip || req.socket.remoteAddress || 'unknown';
    const now = Date.now();

    const record = bucket.get(ip);
    if (!record || record.resetAt <= now) {
      bucket.set(ip, { count: 1, resetAt: now + 60_000 });
      return next();
    }

    record.count += 1;
    if (record.count > limit) {
      res.setHeader('Retry-After', Math.ceil((record.resetAt - now) / 1000));
      return res.status(429).json({
        error: 'AI request limit reached. Please try again shortly.',
      });
    }

    return next();
  };
}

/**
 * Helper to reset bucket state during testing.
 */
export function clearRateLimits(): void {
  routeBuckets.clear();
}
