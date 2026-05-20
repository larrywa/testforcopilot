import { afterEach, beforeEach, expect, jest } from '@jest/globals';
import { Express } from 'express';
import request from 'supertest';
import { createApp } from '../src/app';
import { Task, TaskInput } from '../src/types/task';

export type TaskApiClient = ReturnType<typeof request>;

export interface TaskApiTestContext {
  app: Express;
  client: TaskApiClient;
}

beforeEach(() => {
  jest.spyOn(console, 'log').mockImplementation(() => undefined);
});

afterEach(() => {
  jest.restoreAllMocks();
});

/**
 * Creates a fresh Express app instance and HTTP client for integration tests.
 *
 * @returns The app instance and its paired supertest client.
 */
export function createTestContext(): TaskApiTestContext {
  const app = createApp();

  return {
    app,
    client: request(app),
  };
}

/**
 * Builds a valid task request payload for tests.
 *
 * @param overrides - Optional field overrides for the default payload.
 * @returns A valid task payload object.
 */
export function createTaskPayload(overrides: Partial<TaskInput> = {}): TaskInput {
  return {
    title: 'Write tests',
    description: 'Verify the task API behaves correctly.',
    status: 'todo',
    ...overrides,
  };
}

/**
 * Creates a task through the API and returns the persisted record.
 *
 * @param client - Supertest client bound to the app under test.
 * @param overrides - Optional field overrides for the default payload.
 * @returns The created task record from the API response.
 */
export async function createTask(
  client: TaskApiClient,
  overrides: Partial<TaskInput> = {},
): Promise<Task> {
  const response = await client.post('/tasks').send(createTaskPayload(overrides));

  expect(response.status).toBe(201);

  return response.body.data as Task;
}

/**
 * Deletes all currently persisted tasks to isolate integration tests.
 *
 * @param client - Supertest client bound to the app under test.
 * @returns A promise that resolves after all tasks are removed.
 */
export async function clearTasks(client: TaskApiClient): Promise<void> {
  const response = await client.get('/tasks');

  expect(response.status).toBe(200);

  const tasks = response.body.data as Task[];

  for (const task of tasks) {
    await client.delete(`/tasks/${task.id}`).expect(204);
  }
}