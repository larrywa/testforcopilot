import { beforeEach, describe, expect, it } from '@jest/globals';
import { clearTasks, createTask, createTaskPayload, createTestContext, TaskApiClient } from './setup';

describe('Task API', () => {
  let client: TaskApiClient;

  beforeEach(async () => {
    ({ client } = createTestContext());
    await clearTasks(client);
  });

  describe('CRUD happy path', () => {
    it('returns the task collection with HTTP 200', async () => {
      const createdTask = await createTask(client);

      const response = await client.get('/tasks');

      expect(response.status).toBe(200);
      expect(response.headers['x-ratelimit-limit']).toBe('100');
      expect(response.headers['x-ratelimit-remaining']).toBe('98');
      expect(response.headers['x-ratelimit-reset']).toEqual(expect.any(String));
      expect(response.body.hasMore).toBe(false);
      expect(response.body.nextCursor).toBeNull();
      expect(response.body.data).toHaveLength(1);
      expect(response.body.data[0]).toEqual(expect.objectContaining({ ...createdTask }));
    });

    it('creates a task with HTTP 201', async () => {
      const payload = createTaskPayload();

      const response = await client.post('/tasks').send(payload);

      expect(response.status).toBe(201);
      expect(response.body.data).toEqual(expect.objectContaining({ ...payload }));
      expect(response.body.data.id).toEqual(expect.any(String));
      expect(response.body.data.createdAt).toEqual(expect.any(String));
      expect(response.body.data.updatedAt).toEqual(expect.any(String));
    });

    it('returns a single task with HTTP 200', async () => {
      const task = await createTask(client);

      const response = await client.get(`/tasks/${task.id}`);

      expect(response.status).toBe(200);
      expect(response.body.data).toEqual(expect.objectContaining({ ...task }));
    });

    it('updates an existing task with HTTP 200', async () => {
      const task = await createTask(client);
      const payload = createTaskPayload({
        title: 'Review PR',
        description: 'Confirm the updated task payload is persisted.',
        status: 'done',
      });

      const response = await client.put(`/tasks/${task.id}`).send(payload);

      expect(response.status).toBe(200);
      expect(response.body.data).toMatchObject({
        id: task.id,
        createdAt: task.createdAt,
        ...payload,
      });
      expect(response.body.data.updatedAt).not.toBe(task.updatedAt);
    });

    it('deletes an existing task with HTTP 204', async () => {
      const task = await createTask(client);

      const deleteResponse = await client.delete(`/tasks/${task.id}`);
      const getResponse = await client.get(`/tasks/${task.id}`);

      expect(deleteResponse.status).toBe(204);
      expect(deleteResponse.text).toBe('');
      expect(getResponse.status).toBe(404);
    });
  });

  describe('validation errors', () => {
    it.each(['/tasks?limit=0', '/tasks?limit=101', '/tasks?limit=abc'])('rejects an invalid limit with HTTP 400 for %s', async (path) => {
      const response = await client.get(path);

      expect(response.status).toBe(400);
      expect(response.body.error.code).toBe('VALIDATION_ERROR');
      expect(response.body.error.details.errors).toContain('limit must be an integer between 1 and 100');
    });

    it('rejects missing required fields with HTTP 400', async () => {
      const response = await client.post('/tasks').send({});

      expect(response.status).toBe(400);
      expect(response.body.error.code).toBe('VALIDATION_ERROR');
      expect(response.body.error.details.errors).toEqual(
        expect.arrayContaining([
          'title must be a non-empty string',
          'description must be a non-empty string',
          "status must be one of 'todo', 'in-progress', or 'done'",
        ]),
      );
    });

    it('rejects invalid field types with HTTP 400', async () => {
      const response = await client.post('/tasks').send({
        title: 123,
        description: { text: 'invalid' },
        status: false,
      });

      expect(response.status).toBe(400);
      expect(response.body.error.code).toBe('VALIDATION_ERROR');
      expect(response.body.error.details.errors).toEqual(
        expect.arrayContaining([
          'title must be a non-empty string',
          'description must be a non-empty string',
          "status must be one of 'todo', 'in-progress', or 'done'",
        ]),
      );
    });

    it('rejects invalid updates with HTTP 400', async () => {
      const task = await createTask(client);

      const response = await client.put(`/tasks/${task.id}`).send({
        title: '   ',
        description: 'Still present',
        status: 'archived',
      });

      expect(response.status).toBe(400);
      expect(response.body.error.code).toBe('VALIDATION_ERROR');
      expect(response.body.error.details.errors).toEqual(
        expect.arrayContaining([
          'title must be a non-empty string',
          "status must be one of 'todo', 'in-progress', or 'done'",
        ]),
      );
    });
  });

  describe('404 responses', () => {
    it('returns HTTP 404 for a missing task lookup', async () => {
      const response = await client.get('/tasks/does-not-exist');

      expect(response.status).toBe(404);
      expect(response.body.error.code).toBe('TASK_NOT_FOUND');
    });

    it('returns HTTP 404 for a missing task update', async () => {
      const response = await client.put('/tasks/does-not-exist').send(createTaskPayload());

      expect(response.status).toBe(404);
      expect(response.body.error.code).toBe('TASK_NOT_FOUND');
    });

    it('returns HTTP 404 for a missing task delete', async () => {
      const response = await client.delete('/tasks/does-not-exist');

      expect(response.status).toBe(404);
      expect(response.body.error.code).toBe('TASK_NOT_FOUND');
    });
  });

  describe('edge cases', () => {
    it('returns HTTP 429 with retry headers after exceeding the per-IP limit', async () => {
      jest.useFakeTimers();

      try {
        jest.setSystemTime(new Date('2026-01-01T00:00:00.000Z'));

        for (let index = 0; index < 100; index += 1) {
          const response = await client.get('/health');

          expect(response.status).toBe(200);
        }

        const throttledResponse = await client.get('/health');

        expect(throttledResponse.status).toBe(429);
        expect(throttledResponse.headers['x-ratelimit-limit']).toBe('100');
        expect(throttledResponse.headers['x-ratelimit-remaining']).toBe('0');
        expect(throttledResponse.headers['x-ratelimit-reset']).toBe('1767225660');
        expect(throttledResponse.headers['retry-after']).toBe('60');
        expect(throttledResponse.body.error.code).toBe('RATE_LIMIT_EXCEEDED');
      } finally {
        jest.useRealTimers();
      }
    });

    it('returns paginated tasks sorted by createdAt descending', async () => {
      jest.useFakeTimers();

      try {
        jest.setSystemTime(new Date('2026-01-01T00:00:00.000Z'));
        const oldestTask = await createTask(client, { title: 'Oldest task' });

        jest.setSystemTime(new Date('2026-01-01T00:00:01.000Z'));
        const middleTask = await createTask(client, { title: 'Middle task' });

        jest.setSystemTime(new Date('2026-01-01T00:00:02.000Z'));
        const newestTask = await createTask(client, { title: 'Newest task' });

        const firstPageResponse = await client.get('/tasks?limit=2');

        expect(firstPageResponse.status).toBe(200);
        expect(firstPageResponse.body.data.map((task: { id: string }) => task.id)).toEqual([
          newestTask.id,
          middleTask.id,
        ]);
        expect(firstPageResponse.body.hasMore).toBe(true);
        expect(firstPageResponse.body.nextCursor).toBe(Buffer.from(middleTask.id, 'utf8').toString('base64'));

        const secondPageResponse = await client.get(
          `/tasks?limit=2&cursor=${encodeURIComponent(firstPageResponse.body.nextCursor as string)}`,
        );

        expect(secondPageResponse.status).toBe(200);
        expect(secondPageResponse.body.data.map((task: { id: string }) => task.id)).toEqual([oldestTask.id]);
        expect(secondPageResponse.body.hasMore).toBe(false);
        expect(secondPageResponse.body.nextCursor).toBeNull();
      } finally {
        jest.useRealTimers();
      }
    });

    it('rejects an empty title with HTTP 400', async () => {
      const response = await client.post('/tasks').send(
        createTaskPayload({
          title: '   ',
        }),
      );

      expect(response.status).toBe(400);
      expect(response.body.error.details.errors).toContain('title must be a non-empty string');
    });

    it('accepts a very long description', async () => {
      const longDescription = 'a'.repeat(10000);

      const response = await client.post('/tasks').send(
        createTaskPayload({
          description: longDescription,
        }),
      );

      expect(response.status).toBe(201);
      expect(response.body.data.description).toBe(longDescription);
      expect(response.body.data.description).toHaveLength(10000);
    });
  });
});