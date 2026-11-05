import { Client } from 'pg';
import { StartedPostgreSqlContainer } from '@testcontainers/postgresql';
import { User } from '../../src/entities/user.js';
import { initializeTestDatabase } from '../utils/init-db.js';
import { DataSource } from 'typeorm';
import { Quota, QuotaType } from '../../src/entities/quota.js';
import { UserBuilder } from '../builders/user.builder.js';
import { QuotaBuilder } from '../builders/quota.builder.js';

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
    const user = await userRepo.save(UserBuilder.aUser().build());
    await quotaRepo.save(QuotaBuilder.forUser(user).build());
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
    const user = await userRepo.save(UserBuilder.aUser().build());
    await quotaRepo.save(QuotaBuilder.forUser(user).build());
    await expect(
      quotaRepo.save(
        QuotaBuilder.forUser(user).withMaxLimit(1_024).build(),
      ),
    ).rejects.toMatchObject({ code: '23505' });
  });
  test('forbids to set used quota greater than max value', async () => {
    const userRepo = dataSource.getRepository(User);
    const quotaRepo = dataSource.getRepository(Quota);
    const user = await userRepo.save(UserBuilder.aUser().build());
    const quota = await quotaRepo.save(QuotaBuilder.forUser(user).build());
    await expect(
      quotaRepo.update({ id: quota.id }, { used: 1_024_001 }),
    ).rejects.toThrow();
  });

  test('returns both storage and generation quotas', async () => {
    const userRepo = dataSource.getRepository(User);
    const quotaRepo = dataSource.getRepository(Quota);
    const user = await userRepo.save(UserBuilder.aUser().build());
    await quotaRepo.save(QuotaBuilder.forUser(user).build());
    await quotaRepo.save(
      QuotaBuilder.forUser(user)
        .withType(QuotaType.Generation)
        .withMaxLimit(1000)
        .build(),
    );
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
