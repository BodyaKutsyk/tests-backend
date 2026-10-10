import { Client } from 'pg';
import { StartedPostgreSqlContainer } from '@testcontainers/postgresql';
import { User } from '../../src/entities/user.js';
import { initializeTestDatabase } from '../utils/init-db.js';
import { DataSource } from 'typeorm';
import { Quota, QuotaType } from '../../src/entities/quota.js';

describe('Quota repository (integration)', () => {
  let container: StartedPostgreSqlContainer;
  let dataSource: DataSource;
  let client: Client;

  beforeAll(async () => {
    ({ container, client, dataSource } = await initializeTestDatabase());
  });

  test('creates storage quota for user', async () => {
    const userRepo = dataSource.getRepository(User);
    const quotaRepo = dataSource.getRepository(Quota);
    const user = await userRepo.save({
      email: 'test@test.com',
      firstName: 'John',
      lastName: 'Doe',
      passwordHash: '1234',
    });
    await quotaRepo.save({
      maxLimit: 1_024_000,
      quotaType: QuotaType.Storage,
      user: { id: user.id },
    });
    const quotas = (
      await userRepo.findOne({
        where: { id: user.id },
        relations: { quotas: true },
      })
    )?.quotas;
    expect(quotas?.length).toEqual(1);
  });
  test('forbids to create second storage quota for user', async () => {
    const userRepo = dataSource.getRepository(User);
    const quotaRepo = dataSource.getRepository(Quota);
    const user = await userRepo.save({
      email: 'test1@test.com',
      firstName: 'John',
      lastName: 'Doe',
      passwordHash: '1234',
    });
    await quotaRepo.save({
      maxLimit: 1_024_000,
      quotaType: QuotaType.Storage,
      user: { id: user.id },
    });
    await expect(
      quotaRepo.save({
        maxLimit: 1_024,
        quotaType: QuotaType.Storage,
        user: { id: user.id },
      }),
    ).rejects.toMatchObject({ code: '23505' });
  });
  test('forbids to set used quota greater than max value', async () => {
    const userRepo = dataSource.getRepository(User);
    const quotaRepo = dataSource.getRepository(Quota);
    const user = await userRepo.save({
      email: 'test3@test.com',
      firstName: 'John',
      lastName: 'Doe',
      passwordHash: '1234',
    });
    const quota = await quotaRepo.save({
      maxLimit: 1_024_000,
      quotaType: QuotaType.Storage,
      user: { id: user.id },
    });
    await expect(
      quotaRepo.update({ id: quota.id }, { used: 1_024_001 }),
    ).rejects.toThrow();
  });

  test('returns both storage and generation quotas', async () => {
    const userRepo = dataSource.getRepository(User);
    const quotaRepo = dataSource.getRepository(Quota);
    const user = await userRepo.save({
      email: 'test4@test.com',
      firstName: 'John',
      lastName: 'Doe',
      passwordHash: '1234',
    });
    await quotaRepo.save({
      maxLimit: 1_024_000,
      quotaType: QuotaType.Storage,
      user: { id: user.id },
    });
    await quotaRepo.save({
      maxLimit: 1000,
      quotaType: QuotaType.Generation,
      user: { id: user.id },
    });
    const quotas = (
      await userRepo.findOne({
        where: { id: user.id },
        relations: { quotas: true },
      })
    )?.quotas;
    expect(quotas?.length).toEqual(2);
  });

  afterAll(async () => {
    await client?.end();
    await dataSource?.destroy();
    await container?.stop();
  });
});
