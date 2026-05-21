import { User } from '../types/user';

export interface DatabaseClient {
  get<T>(sql: string, params: readonly unknown[]): Promise<T | undefined>;
  all<T>(sql: string, params: readonly unknown[]): Promise<readonly T[]>;
}

/**
 * Provides user-specific data access helpers.
 */
export class UserRepository {
  public constructor(private readonly database: DatabaseClient) {}

  /**
   * Fetches all users from the database.
   *
   * @returns The persisted users ordered by email address.
   */
  public async findAll(): Promise<readonly User[]> {
    return this.database.all<User>(
      'SELECT id, email FROM users ORDER BY email ASC',
      [],
    );
  }

  /**
   * Fetches a user from the database by email address.
   *
   * @param email - The email address to look up.
   * @returns The matching user when one exists; otherwise `null`.
   * @throws Error When the email is blank after trimming.
   */
  public async findByEmail(email: string): Promise<User | null> {
    const normalizedEmail = email.trim().toLowerCase();

    if (normalizedEmail.length === 0) {
      throw new Error('email must be a non-empty string');
    }

    const user = await this.database.get<User>(
      'SELECT id, email FROM users WHERE email = ? LIMIT 1',
      [normalizedEmail],
    );

    return user ?? null;
  }
}