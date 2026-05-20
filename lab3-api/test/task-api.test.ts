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