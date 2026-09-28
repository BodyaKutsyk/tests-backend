import { QueryLogger } from './utils/query-logger.js';
import { DataSource, QueryFailedError } from 'typeorm';
import { dataSourceOptions } from './data-source.js';
import { User } from './entities/user.js';
import { Quota, QuotaType } from './entities/quota.js';
import { randomUUID } from 'crypto';
import { WorkersManager } from './utils/workers-manager.js';
import { asyncTimeout } from './utils/async-timeout.js';

const AMOUNT_TO_INCREASE = 1_024;
const MAX_LIMIT = 20_480;

async function increaseUserUsedStorage(
  dataSource: DataSource,
  userId: string,
): Promise<boolean> {
  const queryRunner = dataSource.createQueryRunner();
  await queryRunner.connect();
  await queryRunner.startTransaction('SERIALIZABLE');

  try {
    const quota = await queryRunner.manager
      .createQueryBuilder(Quota, 'quota')
      .setLock('pessimistic_write')
      .select()
      .where('user_id = :id', { id: userId })
      .andWhere('quota_type = :type', { type: QuotaType.Storage })
      .andWhere('used <= max_limit - :amount', { amount: AMOUNT_TO_INCREASE })
      .getOneOrFail();

    const amount = quota?.used + AMOUNT_TO_INCREASE;

    const updatedQuota = await queryRunner.manager
      .createQueryBuilder()
      .update(Quota)
      .set({ used: () => ':amount' })
      .setParameters({ amount })
      .where('id = :id', { id: quota?.id })
      .returning('*')
      .execute();

    await queryRunner.commitTransaction();
    return updatedQuota.raw.length > 0;
  } catch (e) {
    await queryRunner.rollbackTransaction();
    throw e;
  } finally {
    await queryRunner.release();
  }
}

async function executeWithRetry(retries: number, cb: () => Promise<boolean>) {
  for (let i = 0; i <= retries; i++) {
    try {
      return await cb();
    } catch (e) {
      if (e instanceof QueryFailedError) {
        const { code } = e.driverError;
        if (code === '40001' || code === '40P01') {
          console.log(`retry ${i + 1}, error: ${code}`);
          await asyncTimeout(10);
          continue;
        }
      }
      return false;
    }
  }
  return false;
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
    const workersManager = new WorkersManager(2);
    const results = await workersManager.run(() =>
      executeWithRetry(10, () => increaseUserUsedStorage(dataSource, user.id)),
    );
    const totalAttempts = results.reduce(
      (prev, curr) => (prev += curr.count),
      0,
    );
    const quota = await dataSource
      .createQueryBuilder(Quota, 'quota')
      .where('user_id = :id', { id: user.id })
      .andWhere('quota_type = :type', { type: QuotaType.Storage })
      .getOneOrFail();

    const maxStorage = quota.max_limit;
    const used = quota.used;

    console.log(
      `Attempts: ${totalAttempts}\nFinal used: ${used}\nMax limit: ${maxStorage}`,
    );

    // process.exit(
    //   Number(!(expectedSuccessful === successful && used <= maxStorage)),
    // );
  } catch (e) {
    console.log(e);
  }
}

await raceTransaction();
