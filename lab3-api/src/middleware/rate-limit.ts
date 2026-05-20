import { NextFunction, Request, Response } from 'express';

const RATE_LIMIT_WINDOW_MS = 60_000;
const RATE_LIMIT_MAX_REQUESTS = 100;

type RequestWindow = number[];

const requestLogByIp = new Map<string, RequestWindow>();

function cleanupExpiredRequests(now: number): void {
  for (const [ipAddress, timestamps] of requestLogByIp.entries()) {
    const activeTimestamps = timestamps.filter((timestamp) => now - timestamp < RATE_LIMIT_WINDOW_MS);

    if (activeTimestamps.length === 0) {
      requestLogByIp.delete(ipAddress);
      continue;
    }

    requestLogByIp.set(ipAddress, activeTimestamps);
  }
}

function getClientIp(req: Request): string {
  return req.ip || req.socket.remoteAddress || 'unknown';
}

/**
 * Clears in-memory rate-limit state. Intended for tests.
 *
 * @returns Nothing.
 */
export function resetRateLimitState(): void {
  requestLogByIp.clear();
}

/**
 * Applies a per-IP sliding-window rate limit and emits standard headers.
 *
 * @param req - The incoming Express request.
 * @param res - The outgoing Express response.
 * @param next - The next middleware callback.
 * @returns Nothing. Either forwards the request or sends HTTP 429.
 *
 * @example
 * app.use(rateLimit);
 */
export function rateLimit(req: Request, res: Response, next: NextFunction): void {
  const now = Date.now();

  cleanupExpiredRequests(now);

  const ipAddress = getClientIp(req);
  const timestamps = requestLogByIp.get(ipAddress) ?? [];
  const activeTimestamps = timestamps.filter((timestamp) => now - timestamp < RATE_LIMIT_WINDOW_MS);
  const remainingRequests = Math.max(RATE_LIMIT_MAX_REQUESTS - activeTimestamps.length - 1, 0);
  const resetTimestampMs = activeTimestamps.length > 0
    ? activeTimestamps[0]! + RATE_LIMIT_WINDOW_MS
    : now + RATE_LIMIT_WINDOW_MS;
  const resetTimestampSeconds = Math.ceil(resetTimestampMs / 1000);

  res.setHeader('X-RateLimit-Limit', RATE_LIMIT_MAX_REQUESTS.toString());
  res.setHeader('X-RateLimit-Remaining', remainingRequests.toString());
  res.setHeader('X-RateLimit-Reset', resetTimestampSeconds.toString());

  if (activeTimestamps.length >= RATE_LIMIT_MAX_REQUESTS) {
    const retryAfterSeconds = Math.max(Math.ceil((resetTimestampMs - now) / 1000), 0);

    res.setHeader('Retry-After', retryAfterSeconds.toString());
    res.status(429).json({
      error: {
        code: 'RATE_LIMIT_EXCEEDED',
        message: 'Too many requests.',
        details: null,
      },
    });
    return;
  }

  activeTimestamps.push(now);
  requestLogByIp.set(ipAddress, activeTimestamps);
  next();
}