import { QueryLogger } from './utils/query-logger.js';
import { DataSource } from 'typeorm';
import { dataSourceOptions } from './data-source.js';
import { User } from './entities/user.js';
import { Quota, QuotaType } from './entities/quota.js';
import { randomUUID } from 'crypto';
import { createTestTransaction } from './create-test-transaction.js';

const ATTEMPTS = 50;
const AMOUNT_PER_TEST = 1024;
const MAX_LIMIT = 10 * AMOUNT_PER_TEST;

async function raceTransaction() {
  const logger = new QueryLogger();
  const dataSource = new DataSource({
    ...dataSourceOptions,
    logger,
  });
  await dataSource.initialize();
  try {
    const userRepo = dataSource.getRepository(User);
    const quotaRepo = dataSource.getRepository(Quota);
    const user = await userRepo.findOneOrFail({
      where: {},
    });

    let quota = await quotaRepo.findOne({
      where: {
        user: { id: user.id },
        quotaType: QuotaType.Storage,
      },
    });

    if (!quota) {
      quota = quotaRepo.create({
        user: { id: user.id },
        quotaType: QuotaType.Storage,
        used: 0,
        maxLimit: MAX_LIMIT,
      });
    } else {
      quota.used = 0;
      quota.maxLimit = MAX_LIMIT;
    }

    await quotaRepo.save(quota);

    const results = await Promise.allSettled(
      Array.from({ length: ATTEMPTS }, () => createTestTransaction(dataSource)),
    );

    const successful = results.filter(
      (result) => result.status === 'fulfilled',
    ).length;

    const failed = results.filter(
      (result) => result.status === 'rejected',
    ).length;

    const finalQuota = await quotaRepo.findOneOrFail({
      where: {
        user: { id: user.id },
        quotaType: QuotaType.Storage,
      },
    });

    const remaining = finalQuota.maxLimit - finalQuota.used;

    const overLimitCount = await quotaRepo
      .createQueryBuilder('quota')
      .where('"quota"."used" > "quota"."max_limit"')
      .getCount();

    console.log(`Attempts: ${ATTEMPTS}`);
    console.log(`Successful: ${successful}`);
    console.log(`Failed: ${failed}`);
    console.log(`Final used: ${finalQuota.used}`);
    console.log(`Final remaining quota: ${remaining}`);
    console.log(`Over limit rows: ${overLimitCount}`);

    const invariantHolds =
      successful === 10 &&
      finalQuota.used === MAX_LIMIT &&
      remaining === 0 &&
      overLimitCount === 0;

    if (!invariantHolds) {
      console.error('Race condition invariant failed');
      process.exitCode = 1;
    } else {
      console.log('Race condition invariant passed');
    }
  } finally {
    await dataSource.destroy();
  }
}

await raceTransaction();
