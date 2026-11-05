import { StartedPostgreSqlContainer } from '@testcontainers/postgresql';
import { seedUsers } from '../../db/seeds/seed-users.js';
import { DataSource } from 'typeorm';
import { Client } from 'pg';
import { User } from '../../src/entities/user.js';
import { initializeTestDatabase } from '../utils/init-db.js';

describe('User repository (integration)', () => {
  let container: StartedPostgreSqlContainer;
  let dataSource: DataSource;
  let client: Client;

  beforeAll(async () => {
    ({ container, dataSource, client } = await initializeTestDatabase());
  });

  test('Sends response', async () => {
    const result = await client.query('SELECT 1');
    expect(result.rows[0]).toEqual({ '?column?': 1 });
  });

  test('Seeds 100 users', async () => {
    const expectedUsersCount = 100;
    const userRepo = dataSource.getRepository(User);

    await seedUsers(client, expectedUsersCount);
    const usersCount = await userRepo.count();

    expect(Number(usersCount)).toEqual(expectedUsersCount);
  }, 10_000);
  test('Throws 23505 error on duplicate emails', async () => {
    const email = 'test@gmail.com';
    const userRepo = dataSource.getRepository(User);

    await userRepo.save({
      email,
      firstName: 'John',
      lastName: 'Doe',
      passwordHash: '12345',
    });

    await expect(
      userRepo.save({
        email,
        firstName: 'Duplicate',
        lastName: 'Doe',
        passwordHash: '12345',
      }),
    ).rejects.toMatchObject({ code: '23505' });
  });

  afterAll(async () => {
    await client?.end();
    await dataSource?.destroy();
    await container?.stop();
  });
});
