/**
 * Standardized Production Error Responses
 *
 * Ensures errors follow a consistent structure without leaking stack traces,
 * file paths, or internal infrastructure details to the client.
 */

import { Response } from 'express';
import { logError } from '../observability/logger';

export interface StandardErrorPayload {
  success: false;
  error: {
    code: string;
    message: string;
  };
  requestId?: string;
  retryAfter?: number;
}

export function sendError(
  res: Response,
  statusCode: number,
  code: string,
  userMessage: string,
  internalError?: any,
  requestId?: string
): void {
  if (internalError) {
    logError(`[${code}] ${userMessage}`, internalError, requestId);
  }

  const payload: StandardErrorPayload = {
    success: false,
    error: {
      code,
      message: userMessage,
    },
    requestId,
  };

  res.status(statusCode).json(payload);
}
