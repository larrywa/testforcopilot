import { NextFunction, Request, Response } from 'express';
import { ApiError } from '../errors/api-error';
import { TaskInput, TaskStatus } from '../types/task';

const validStatuses: TaskStatus[] = ['todo', 'in-progress', 'done'];

function toTaskInput(payload: Partial<TaskInput>): TaskInput {
  return {
    title: payload.title!.trim(),
    description: payload.description!.trim(),
    status: payload.status!,
  };
}

/**
 * Validates task payloads for create and update operations.
 *
 * @param req The Express request containing the JSON body.
 * @param _res The Express response object.
 * @param next The next middleware callback.
 * @returns Nothing. Passes control to the next middleware when valid.
 * @throws {ApiError} Throws when the payload is missing required fields or contains invalid values.
 *
 * @example
 * app.post('/tasks', validateTaskInput, handler);
 */
export function validateTaskInput(req: Request, _res: Response, next: NextFunction): void {
  const payload = req.body as Partial<TaskInput>;
  const errors: string[] = [];

  if (typeof payload.title !== 'string' || payload.title.trim().length === 0) {
    errors.push('title must be a non-empty string');
  }

  if (typeof payload.description !== 'string' || payload.description.trim().length === 0) {
    errors.push('description must be a non-empty string');
  }

  if (typeof payload.status !== 'string' || !validStatuses.includes(payload.status as TaskStatus)) {
    errors.push("status must be one of 'todo', 'in-progress', or 'done'");
  }

  if (errors.length > 0) {
    next(new ApiError('Invalid task payload.', 400, 'VALIDATION_ERROR', { errors }));
    return;
  }

  req.body = toTaskInput(payload);

  next();
}
