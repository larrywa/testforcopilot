import express, { NextFunction, Request, Response } from 'express';
import { randomUUID } from 'node:crypto';
import { ApiError } from './errors/api-error';
import { errorHandler } from './middleware/error-handler';
import { requestLogger } from './middleware/request-logger';
import { validateTaskInput } from './middleware/validate-task';
import { Task, TaskInput } from './types/task';

const tasks: Task[] = [];

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
   * Lists all tasks currently stored by the API.
   *
   * @param _req - Express request object. This endpoint does not accept route parameters.
   * @param res - Express response object that sends `{ data: Task[] }`.
   * @returns Sends a JSON response shaped as `{ data: Task[] }`.
   *
   * @example
   * curl -X GET http://localhost:3000/tasks
   */
  const listTasksHandler = (_req: Request, res: Response) => {
    res.json({ data: tasks });
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
