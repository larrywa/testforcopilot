import express, { NextFunction, Request, Response } from 'express';
import { randomUUID } from 'node:crypto';
import { ApiError } from './errors/api-error';
import { errorHandler } from './middleware/error-handler';
import { requestLogger } from './middleware/request-logger';
import { validateTaskInput } from './middleware/validate-task';
import { Task, TaskInput } from './types/task';

const tasks: Task[] = [];
const DEFAULT_TASK_LIST_LIMIT = 20;
const MAX_TASK_LIST_LIMIT = 100;

/**
 * Creates the Express application and registers API routes.
 *
 * @returns The configured Express application.
 *
 * @example
 * const app = createApp();
 * app.listen(3000);
 */
export function createApp() {
  const app = express();

  app.use(express.json());
  app.use(requestLogger);

  /**
   * Returns the API health status and the server timestamp.
   *
   * @param _req - Express request object. This endpoint does not accept route parameters.
   * @param res - Express response object that sends `{ status: 'ok', timestamp: string }`.
   * @returns Sends a JSON response shaped as `{ status: 'ok', timestamp: string }`.
   *
   * @example
   * curl -X GET http://localhost:3000/health
   */
  const healthHandler = (_req: Request, res: Response) => {
    res.json({
      status: 'ok',
      timestamp: new Date().toISOString(),
    });
  };

  /**
   * Lists tasks using cursor-based pagination sorted by newest creation date first.
   *
   * @param req - Express request object that optionally accepts `limit` and `cursor` query parameters.
   * @param res - Express response object that sends `{ data: Task[], nextCursor: string | null, hasMore: boolean }`.
   * @param next - Express next callback used to forward validation API errors for invalid query parameters.
   * @returns Sends a paginated task response, or forwards `INVALID_QUERY_PARAMETER` to error middleware.
   *
   * @example
   * curl -X GET "http://localhost:3000/tasks?limit=20"
   */
  const listTasksHandler = (req: Request, res: Response, next: NextFunction) => {
    const limitQuery = req.query.limit;
    const cursorQuery = req.query.cursor;

    if (Array.isArray(limitQuery) || (limitQuery !== undefined && typeof limitQuery !== 'string')) {
      next(
        new ApiError(
          'Invalid limit query parameter. Expected a positive integer between 1 and 100.',
          400,
          'INVALID_QUERY_PARAMETER',
        ),
      );
      return;
    }

    let limit = DEFAULT_TASK_LIST_LIMIT;
    if (limitQuery !== undefined) {
      const parsedLimit = Number(limitQuery);
      if (!Number.isInteger(parsedLimit) || parsedLimit < 1 || parsedLimit > MAX_TASK_LIST_LIMIT) {
        next(
          new ApiError(
            'Invalid limit query parameter. Expected a positive integer between 1 and 100.',
            400,
            'INVALID_QUERY_PARAMETER',
          ),
        );
        return;
      }
      limit = parsedLimit;
    }

    if (Array.isArray(cursorQuery) || (cursorQuery !== undefined && typeof cursorQuery !== 'string')) {
      next(
        new ApiError('Invalid cursor query parameter. Expected a single base64-encoded task id.', 400, 'INVALID_QUERY_PARAMETER'),
      );
      return;
    }

    const sortedTasks = [...tasks].sort((left, right) => right.createdAt.localeCompare(left.createdAt));

    let startIndex = 0;
    if (cursorQuery !== undefined) {
      let cursorTaskId = '';
      try {
        cursorTaskId = Buffer.from(cursorQuery, 'base64').toString('utf8');
      } catch {
        next(
          new ApiError(
            'Invalid cursor query parameter. Expected a base64-encoded task id.',
            400,
            'INVALID_QUERY_PARAMETER',
          ),
        );
        return;
      }

      if (cursorTaskId.length === 0) {
        next(
          new ApiError(
            'Invalid cursor query parameter. Expected a base64-encoded task id.',
            400,
            'INVALID_QUERY_PARAMETER',
          ),
        );
        return;
      }

      const cursorTaskIndex = sortedTasks.findIndex((task) => task.id === cursorTaskId);
      if (cursorTaskIndex === -1) {
        next(
          new ApiError(
            'Invalid cursor query parameter. Cursor does not reference an existing task.',
            400,
            'INVALID_QUERY_PARAMETER',
          ),
        );
        return;
      }
      startIndex = cursorTaskIndex + 1;
    }

    const data = sortedTasks.slice(startIndex, startIndex + limit);
    const hasMore = startIndex + limit < sortedTasks.length;
    const nextCursor = hasMore && data.length > 0 ? Buffer.from(data[data.length - 1]!.id).toString('base64') : null;

    res.json({ data, nextCursor, hasMore });
  };

  /**
   * Returns a single task by its unique identifier.
   *
   * @param req - Express request object with the route parameter `id` in `req.params`.
   * @param res - Express response object that sends `{ data: Task }` when the task exists.
   * @param next - Express next callback used to forward a 404 API error when the task is missing.
   * @returns Sends a JSON response shaped as `{ data: Task }`, or forwards `TASK_NOT_FOUND` to error middleware.
   *
   * @example
   * curl -X GET http://localhost:3000/tasks/123e4567-e89b-12d3-a456-426614174000
   */
  const getTaskByIdHandler = (
    req: Request<{ id: string }>,
    res: Response,
    next: NextFunction,
  ) => {
    const task = tasks.find((item) => item.id === req.params.id);

    if (!task) {
      next(new ApiError('Task not found.', 404, 'TASK_NOT_FOUND'));
      return;
    }

    res.json({ data: task });
  };

  /**
   * Creates a new task from the validated request body.
   *
   * @param req - Express request object whose body must match `TaskInput` with `title`, `description`, and `status`.
   * @param res - Express response object that sends `{ data: Task }` with HTTP 201.
   * @returns Sends a JSON response shaped as `{ data: Task }` after persisting the new task.
   *
   * @example
   * curl -X POST http://localhost:3000/tasks -H "Content-Type: application/json" -d '{"title":"Write docs","description":"Add route handler JSDoc","status":"pending"}'
   */
  const createTaskHandler = (req: Request, res: Response) => {
    const payload = req.body as TaskInput;
    const timestamp = new Date().toISOString();
    const task: Task = {
      id: randomUUID(),
      title: payload.title,
      description: payload.description,
      status: payload.status,
      createdAt: timestamp,
      updatedAt: timestamp,
    };

    tasks.push(task);
    res.status(201).json({ data: task });
  };

  /**
   * Replaces an existing task with the validated request body.
   *
   * @param req - Express request object with route parameter `id` in `req.params` and a `TaskInput` body.
   * @param res - Express response object that sends `{ data: Task }` with the updated task.
   * @param next - Express next callback used to forward a 404 API error when the task is missing.
   * @returns Sends a JSON response shaped as `{ data: Task }`, or forwards `TASK_NOT_FOUND` to error middleware.
   *
   * @example
   * curl -X PUT http://localhost:3000/tasks/123e4567-e89b-12d3-a456-426614174000 -H "Content-Type: application/json" -d '{"title":"Write docs","description":"Update route handler JSDoc","status":"completed"}'
   */
  const updateTaskHandler = (
    req: Request<{ id: string }>,
    res: Response,
    next: NextFunction,
  ) => {
    const taskIndex = tasks.findIndex((item) => item.id === req.params.id);

    if (taskIndex === -1) {
      next(new ApiError('Task not found.', 404, 'TASK_NOT_FOUND'));
      return;
    }

    const payload = req.body as TaskInput;
    const existingTask = tasks[taskIndex]!;
    const updatedTask: Task = {
      ...existingTask,
      title: payload.title,
      description: payload.description,
      status: payload.status,
      updatedAt: new Date().toISOString(),
    };

    tasks[taskIndex] = updatedTask;
    res.json({ data: updatedTask });
  };

  /**
   * Deletes a task by its unique identifier.
   *
   * @param req - Express request object with the route parameter `id` in `req.params`.
   * @param res - Express response object that sends HTTP 204 with no response body.
   * @param next - Express next callback used to forward a 404 API error when the task is missing.
   * @returns Sends an empty HTTP 204 response, or forwards `TASK_NOT_FOUND` to error middleware.
   *
   * @example
   * curl -X DELETE http://localhost:3000/tasks/123e4567-e89b-12d3-a456-426614174000
   */
  const deleteTaskHandler = (
    req: Request<{ id: string }>,
    res: Response,
    next: NextFunction,
  ) => {
    const taskIndex = tasks.findIndex((item) => item.id === req.params.id);

    if (taskIndex === -1) {
      next(new ApiError('Task not found.', 404, 'TASK_NOT_FOUND'));
      return;
    }

    tasks.splice(taskIndex, 1);
    res.status(204).send();
  };

  app.get('/health', healthHandler);

  app.get('/tasks', listTasksHandler);

  app.get('/tasks/:id', getTaskByIdHandler);

  app.post('/tasks', validateTaskInput, createTaskHandler);

  app.put('/tasks/:id', validateTaskInput, updateTaskHandler);

  app.delete('/tasks/:id', deleteTaskHandler);

  app.use((_req: Request, _res: Response, next: NextFunction) => {
    next(new ApiError('Route not found.', 404, 'ROUTE_NOT_FOUND'));
  });

  app.use(errorHandler);

  return app;
}
