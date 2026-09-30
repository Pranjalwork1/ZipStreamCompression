import { describe, it, expect, vi } from 'vitest';
import { createRateLimiter } from '../security/rateLimiter';
import { Request, Response, NextFunction } from 'express';

describe('Rate Limiter Test Suite', () => {
  it('should allow requests within limit and block when exceeded', async () => {
    const limiter = createRateLimiter('ai'); // max 20 requests per min

    const mockReq = {
      ip: '198.51.100.42',
      socket: { remoteAddress: '198.51.100.42' },
      headers: {},
    } as unknown as Request;

    const headers: Record<string, string> = {};
    let statusCode = 200;
    let jsonResponse: any = null;

    const mockRes = {
      setHeader: (key: string, val: string) => {
        headers[key] = val;
      },
      status: (code: number) => {
        statusCode = code;
        return mockRes;
      },
      json: (data: any) => {
        jsonResponse = data;
        return mockRes;
      },
    } as unknown as Response;

    const nextFn = vi.fn() as unknown as NextFunction;

    // First request should succeed
    await limiter(mockReq, mockRes, nextFn);
    expect(nextFn).toHaveBeenCalled();
    expect(headers['RateLimit-Limit']).toBe('20');
    expect(Number(headers['RateLimit-Remaining'])).toBeLessThanOrEqual(20);

    // Send 25 consecutive requests to exhaust quota
    for (let i = 0; i < 25; i++) {
      await limiter(mockReq, mockRes, nextFn);
    }

    // Now it should return 429
    expect(statusCode).toBe(429);
    expect(jsonResponse?.success).toBe(false);
    expect(jsonResponse?.error?.code).toBe('RATE_LIMIT_EXCEEDED');
  });
});
