import { describe, it, expect, beforeAll, afterAll, beforeEach, afterEach } from 'vitest';
import express from 'express';
import http from 'http';
import sarvamRouter from '../sarvamRouter';
import { clearRateLimits } from '../aiRateLimit';

describe('sarvamRouter endpoints and security', () => {
  let server: http.Server;
  let baseUrl: string;

  beforeAll(async () => {
    const app = express();
    app.use(express.json());
    app.use('/api/sarvam', sarvamRouter);

    await new Promise<void>((resolve) => {
      server = app.listen(0, () => {
        const addr = server.address();
        const port = typeof addr === 'object' && addr ? addr.port : 0;
        baseUrl = `http://localhost:${port}`;
        resolve();
      });
    });
  });

  afterAll(async () => {
    await new Promise<void>((resolve) => {
      server.close(() => resolve());
    });
  });

  beforeEach(() => {
    clearRateLimits();
  });

  const origSarvamEnabled = process.env.SARVAM_ENABLED;
  const origSarvamKey = process.env.SARVAM_API_KEY;

  afterEach(() => {
    process.env.SARVAM_ENABLED = origSarvamEnabled;
    if (origSarvamKey) process.env.SARVAM_API_KEY = origSarvamKey;
    else delete process.env.SARVAM_API_KEY;
  });

  it('GET /api/sarvam/health should return 200 with safe flags and never leak secrets', async () => {
    process.env.SARVAM_ENABLED = 'false';
    const res = await fetch(`${baseUrl}/api/sarvam/health`);
    expect(res.status).toBe(200);

    const cacheControl = res.headers.get('cache-control');
    expect(cacheControl).toContain('no-store');

    const data = await res.json();
    expect(data.enabled).toBe(false);
    expect(typeof data.configured).toBe('boolean');
    expect(data.features).toBeDefined();
    expect(data.features.chat).toBe(false);

    // Verify secret safety: response must never contain any secret keys
    const rawText = JSON.stringify(data);
    expect(rawText).not.toContain('SARVAM_API_KEY');
    expect(rawText).not.toContain('authorization');
    expect(rawText).not.toContain('Bearer');
  });

  it('POST /api/sarvam/chat should reject missing message with 400', async () => {
    const res = await fetch(`${baseUrl}/api/sarvam/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({}),
    });

    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.error).toContain('Message text is required');
  });

  it('POST /api/sarvam/chat should reject oversized messages with 413', async () => {
    const oversized = 'a'.repeat(15000);
    const res = await fetch(`${baseUrl}/api/sarvam/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message: oversized }),
    });

    expect(res.status).toBe(413);
  });

  it('POST /api/sarvam/summarize should reject missing text with 400', async () => {
    const res = await fetch(`${baseUrl}/api/sarvam/summarize`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({}),
    });

    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.error).toContain('Document text is required');
  });

  it('POST /api/sarvam/translate should reject with 403 when Sarvam is disabled', async () => {
    process.env.SARVAM_ENABLED = 'false';
    const res = await fetch(`${baseUrl}/api/sarvam/translate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ input: 'Hello', targetLanguageCode: 'hi-IN' }),
    });

    expect(res.status).toBe(403);
    const data = await res.json();
    expect(data.error).toContain('disabled');
  });

  it('POST /api/sarvam/stt should reject missing audio file with 400', async () => {
    process.env.SARVAM_ENABLED = 'true';
    process.env.SARVAM_API_KEY = 'mock-test-key';
    const res = await fetch(`${baseUrl}/api/sarvam/stt`, {
      method: 'POST',
      body: new FormData(), // Empty form data without 'file'
    });

    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.error).toContain('No audio data received');
  });

  it('Rate limiter should respond with HTTP 429 when threshold is exceeded', async () => {
    // Force a small rate limit for test
    const origLimit = process.env.SARVAM_CHAT_RATE_LIMIT;
    process.env.SARVAM_CHAT_RATE_LIMIT = '2';

    try {
      // 1st request
      await fetch(`${baseUrl}/api/sarvam/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: 'Hello 1' }),
      });

      // 2nd request
      await fetch(`${baseUrl}/api/sarvam/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: 'Hello 2' }),
      });

      // 3rd request should hit 429
      const rateLimitedRes = await fetch(`${baseUrl}/api/sarvam/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: 'Hello 3' }),
      });

      expect(rateLimitedRes.status).toBe(429);
      const data = await rateLimitedRes.json();
      expect(data.error).toContain('AI request limit reached');
    } finally {
      process.env.SARVAM_CHAT_RATE_LIMIT = origLimit;
    }
  });
});
