import { NextFunction, Request, Response } from 'express';

/**
 * Logs each request after the response finishes.
 *
 * @param req - The incoming Express request.
 * @param res - The outgoing Express response.
 * @param next - The next middleware callback.
 * @returns Nothing. Registers response logging and passes control to the next middleware.
 *
 * @example
 * app.use(requestLogger);
 */
export function requestLogger(req: Request, res: Response, next: NextFunction): void {
  const startedAt = performance.now();
  const timestamp = new Date().toISOString();

  res.on('finish', () => {
    const responseTimeMs = performance.now() - startedAt;

    console.log(
      `${timestamp} ${req.method} ${req.originalUrl} ${res.statusCode} ${responseTimeMs.toFixed(2)}ms`,
    );
  });

  next();
}