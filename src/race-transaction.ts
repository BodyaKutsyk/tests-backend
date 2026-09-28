import { QueryLogger } from './utils/query-logger.js';
import { DataSource } from 'typeorm';
import { dataSourceOptions } from './data-source.js';
import { User } from './entities/user.js';
import { Quota, QuotaType } from './entities/quota.js';
import { randomUUID } from 'crypto';

const AMOUNT_TO_INCREASE = 1_024;
const MAX_LIMIT = 10_240;

async function increaseUserUsedStorage(dataSource: DataSource, userId: string) {
  const queryRunner = dataSource.createQueryRunner();
  await queryRunner.connect();
  await queryRunner.startTransaction();

  const updatedQuota = await queryRunner.manager
    .createQueryBuilder()
    .update(Quota)
    .set({ used: () => '"used" + :amount' })
    .setParameters({ amount: AMOUNT_TO_INCREASE })
    .where('user_id = :id', { id: userId })
    .andWhere('quota_type = :type', { type: QuotaType.Storage })
    .andWhere('used <= max_limit - :amount', { amount: AMOUNT_TO_INCREASE })
    .returning('used, max_limit')
    .execute();

  await queryRunner.commitTransaction();
  await queryRunner.release();
  return updatedQuota.raw;
}

async function raceTransaction() {
  try {
    const logger = new QueryLogger();
    const dataSource = new DataSource({
      ...dataSourceOptions,
      logger,
    });
    await dataSource.initialize();
    const id = randomUUID();

    const userRepo = dataSource.getRepository(User);
    const user = await userRepo.save(
      userRepo.create({
        first_name: 'Test',
        last_name: 'User',
        email: `user-${id}@testing.com`,
        password_hash: '12345678',
        quotas: [
          {
            max_limit: String(MAX_LIMIT),
            quota_type: QuotaType.Storage,
          },
          {
            max_limit: '100',
            quota_type: QuotaType.Generation,
          },
        ],
      }),
    );
    const promises = Array.from({ length: 50 }, () =>
      increaseUserUsedStorage(dataSource, user.id),
    );

    const expectedSuccessful = MAX_LIMIT / AMOUNT_TO_INCREASE;
    const results = await Promise.all(promises);
    const quota = await dataSource
      .createQueryBuilder(Quota, 'quota')
      .where('user_id = :id', { id: user.id })
      .andWhere('quota_type = :type', { type: QuotaType.Storage })
      .getOneOrFail();

    const maxStorage = quota.max_limit;
    const used = quota.used;
    let attempts = 0;
    let successful = 0;
    let rejected = 0;
    results.forEach((result) => {
      attempts++;
      result.length > 0 ? successful++ : rejected++;
    });

    console.log(
      `Attempts: ${attempts}\nSuccessful: ${successful}\nRejected: ${rejected}\nFinal used: ${used}\nMax limit: ${maxStorage}`,
    );

    process.exit(
      Number(!(expectedSuccessful === successful && used <= maxStorage)),
    );
  } catch (e) {
    console.log(e);
  }
}

await raceTransaction();
