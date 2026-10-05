import {
  PostgreSqlContainer,
  StartedPostgreSqlContainer,
} from '@testcontainers/postgresql';
import { Client } from 'pg';
import { seedUsers } from '../../db/seeds/seed-users.js';

describe('User repository (integration)', () => {
  let container: StartedPostgreSqlContainer;
  let client: Client;

  beforeAll(async () => {
    container = await new PostgreSqlContainer('postgres:17-alpine').start();
    client = new Client({
      host: container.getHost(),
      port: container.getPort(),
      database: container.getDatabase(),
      user: container.getUsername(),
      password: container.getPassword(),
    });
    await client.connect();
  });

  test('Sends response', async () => {
    const result = await client.query('SELECT 1');
    expect(result.rows[0]).toEqual({ '?column?': 1 });
  });

  test('seeds users', async () => {
    const expectedUsersCount = 100_000;
    await client.query(`CREATE TABLE users (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      email TEXT UNIQUE NOT NULL,
      first_name TEXT NOT NULL,
      last_name TEXT NOT NULL,
      password_hash TEXT NOT NULL,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW(),
      deleted_at TIMESTAMPTZ
    );`);
    await seedUsers(client);
    const usersCount: string = (
      await client.query('SELECT COUNT(*) FROM users')
    ).rows[0].count;
    expect(Number(usersCount)).toEqual(expectedUsersCount);
  });

  afterAll(async () => {
    await client?.end();
    await container?.stop();
  });
});
