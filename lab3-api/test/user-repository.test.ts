import { describe, expect, it, jest } from '@jest/globals';
import { DatabaseClient, UserRepository } from '../src/repositories/user-repository';
import { User } from '../src/types/user';

describe('UserRepository', () => {
  it('fetches all users', async () => {
    const storedUsers: readonly User[] = [
      {
        id: 'user-123',
        email: 'alice@example.com',
      },
      {
        id: 'user-456',
        email: 'bob@example.com',
      },
    ];
    const allMock = jest.fn(async <T>() => storedUsers as readonly T[]);
    const database: DatabaseClient = {
      get: jest.fn(async <T>() => undefined as T | undefined) as DatabaseClient['get'],
      all: allMock as DatabaseClient['all'],
    };
    const repository = new UserRepository(database);

    const result = await repository.findAll();

    expect(result).toEqual(storedUsers);
    expect(allMock).toHaveBeenCalledWith(
      'SELECT id, email FROM users ORDER BY email ASC',
      [],
    );
  });

  it('fetches a user by normalized email address', async () => {
    const storedUser: User = {
      id: 'user-123',
      email: 'alice@example.com',
    };
    const getMock = jest.fn(async <T>() => storedUser as T | undefined);
    const allMock = jest.fn(async <T>() => [] as readonly T[]);
    const database: DatabaseClient = {
      get: getMock as DatabaseClient['get'],
      all: allMock as DatabaseClient['all'],
    };
    const repository = new UserRepository(database);

    const result = await repository.findByEmail('  Alice@Example.com  ');

    expect(result).toEqual(storedUser);
    expect(getMock).toHaveBeenCalledWith(
      'SELECT id, email FROM users WHERE email = ? LIMIT 1',
      ['alice@example.com'],
    );
  });

  it('returns null when no user matches the email address', async () => {
    const getMock = jest.fn(async <T>() => undefined as T | undefined);
    const allMock = jest.fn(async <T>() => [] as readonly T[]);
    const database: DatabaseClient = {
      get: getMock as DatabaseClient['get'],
      all: allMock as DatabaseClient['all'],
    };
    const repository = new UserRepository(database);

    const result = await repository.findByEmail('missing@example.com');

    expect(result).toBeNull();
  });

  it('rejects blank email addresses', async () => {
    const getMock = jest.fn(async <T>() => undefined as T | undefined);
    const allMock = jest.fn(async <T>() => [] as readonly T[]);
    const database: DatabaseClient = {
      get: getMock as DatabaseClient['get'],
      all: allMock as DatabaseClient['all'],
    };
    const repository = new UserRepository(database);

    await expect(repository.findByEmail('   ')).rejects.toThrow('email must be a non-empty string');
    expect(getMock).not.toHaveBeenCalled();
  });
});