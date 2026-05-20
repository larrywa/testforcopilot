import express, { NextFunction, Request, Response } from 'express';
import { randomUUID } from 'node:crypto';
import { ApiError } from './errors/api-error';
import { errorHandler } from './middleware/error-handler';
import { rateLimit } from './middleware/rate-limit';
import { requestLogger } from './middleware/request-logger';
import { validateTaskInput } from './middleware/validate-task';
import { Task, TaskInput } from './types/task';

const tasks: Task[] = [];
const DEFAULT_TASK_LIMIT = 20;
const MAX_TASK_LIMIT = 100;

function getSingleQueryValue(value: Request['query'][string]): string | undefined {
  return typeof value === 'string' ? value : undefined;
}

function parseLimit(value: Request['query'][string]): number {
  const rawLimit = getSingleQueryValue(value);

  if (rawLimit === undefined) {
    return DEFAULT_TASK_LIMIT;
  }

  const parsedLimit = Number(rawLimit);

  if (!Number.isInteger(parsedLimit) || parsedLimit < 1 || parsedLimit > MAX_TASK_LIMIT) {
    throw new ApiError(
      `limit must be an integer between 1 and ${MAX_TASK_LIMIT}`,
      400,
      'VALIDATION_ERROR',
      {
        errors: [`limit must be an integer between 1 and ${MAX_TASK_LIMIT}`],
      },
    );
  }

  return parsedLimit;
}

function encodeCursor(taskId: string): string {
  return Buffer.from(taskId, 'utf8').toString('base64');
}

function decodeCursor(cursor: string): string | null {
  try {
    const decodedValue = Buffer.from(cursor, 'base64').toString('utf8');

    if (!decodedValue) {
      return null;
    }

    const normalizedInput = cursor.replace(/=+$/, '');
    const normalizedEncodedValue = encodeCursor(decodedValue).replace(/=+$/, '');

    return normalizedInput === normalizedEncodedValue ? decodedValue : null;
  } catch {
    return null;
  }
}

function listTasksInDescendingCreatedOrder(): Task[] {
  return tasks
    .map((task, index) => ({ task, index }))
    .sort((left, right) => {
      const createdAtComparison = right.task.createdAt.localeCompare(left.task.createdAt);

      if (createdAtComparison !== 0) {
        return createdAtComparison;
      }

      return right.index - left.index;
    })
    .map(({ task }) => task);
}

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
  app.use(rateLimit);
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
   * Lists tasks currently stored by the API using cursor pagination.
   *
   * @param req - Express request object that may include `limit` and `cursor` query parameters.
   * @param res - Express response object that sends `{ data: Task[], nextCursor: string | null, hasMore: boolean }`.
   * @param next - Express next callback used to forward validation errors.
   * @returns Sends a paginated JSON response shaped as `{ data: Task[], nextCursor: string | null, hasMore: boolean }`.
   *
   * @example
   * curl -X GET http://localhost:3000/tasks?limit=20
   */
  const listTasksHandler = (req: Request, res: Response, next: NextFunction) => {
    try {
      const limit = parseLimit(req.query.limit);
      const cursor = getSingleQueryValue(req.query.cursor);
      const sortedTasks = listTasksInDescendingCreatedOrder();

      let startIndex = 0;

      if (cursor !== undefined) {
        const taskId = decodeCursor(cursor);

        if (!taskId) {
          throw new ApiError('cursor must be a valid base64-encoded task ID', 400, 'VALIDATION_ERROR', {
            errors: ['cursor must be a valid base64-encoded task ID'],
          });
        }

        const cursorIndex = sortedTasks.findIndex((task) => task.id === taskId);

        if (cursorIndex === -1) {
          throw new ApiError('cursor must reference an existing task', 400, 'VALIDATION_ERROR', {
            errors: ['cursor must reference an existing task'],
          });
        }

        startIndex = cursorIndex + 1;
      }

      const paginatedTasks = sortedTasks.slice(startIndex, startIndex + limit);
      const hasMore = startIndex + limit < sortedTasks.length;
      const nextCursor = hasMore ? encodeCursor(paginatedTasks[paginatedTasks.length - 1]!.id) : null;

      res.json({
        data: paginatedTasks,
        nextCursor,
        hasMore,
      });
    } catch (error) {
      next(error);
    }
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
