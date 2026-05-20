import { NextFunction, Request, Response } from 'express';
import { ApiError } from '../errors/api-error';

/**
 * Sends consistent JSON error responses for the API.
 *
 * @param err The error raised by upstream middleware or route handlers.
 * @param _req The Express request object.
 * @param res The Express response object.
 * @param _next The next middleware callback.
 * @returns Nothing. Writes the error response and ends the request.
 *
 * @example
 * app.use(errorHandler);
 */
export function errorHandler(err: Error, _req: Request, res: Response, _next: NextFunction): void {
  if (err instanceof ApiError) {
    res.status(err.statusCode).json({
      error: {
        code: err.code,
        message: err.message,
        details: err.details ?? null,
      },
    });
    return;
  }

  res.status(500).json({
    error: {
      code: 'INTERNAL_SERVER_ERROR',
      message: 'An unexpected error occurred.',
      details: null,
    },
  });
}
