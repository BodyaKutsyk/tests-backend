import { dataSourceOptions } from './data-source.js';
import { Test } from './entities/test.js';
import { DataSource, Repository, Logger, QueryRunner } from 'typeorm';
import { User } from './entities/user.js';
import { QueryLogger } from './utils/query-logger.js';

type RawTest = {
  id: string;
  user_id: string;
};

async function logNPlus1(
  testRepo: Repository<Test>,
  userRepo: Repository<User>,
  limit: number,
) {
  const tests: RawTest[] = await testRepo.query(`
  SELECT *
  FROM tests
  WHERE user_id IS NOT NULL
  LIMIT $1
`, [limit]);

  for (const test of tests) {
    await userRepo.findOneBy({ id: test.user_id });
  }
}

async function logNPlus1Fix(userRepo: Repository<User>, limit: number) {
  await userRepo
    .createQueryBuilder('user')
    .leftJoinAndSelect('user.tests', 'test')
    .limit(limit)
    .getMany();
}

async function main() {
  const limit = Number(process.argv[2] ?? 50);
  if (!Number.isSafeInteger(limit) || limit <= 0) {
    throw new Error('Pass a positive integer as the sample size');
  }

  const logger = new QueryLogger();
  const loggingDataSource = new DataSource({
    ...dataSourceOptions,
    logging: true,
    logger: logger,
  });
  await loggingDataSource.initialize();

  try {
    const testRepository = loggingDataSource.getRepository(Test);
    const userRepo = loggingDataSource.getRepository(User);
    let nPlus1QueryCount = 0;
    let nPlus1QueryFixCount = 0;
    logger.resetCount();

    console.log('\nN+1 request\n');
    await logNPlus1(testRepository, userRepo, limit);
    nPlus1QueryCount = logger.getCount();
    logger.resetCount();

    console.log('\nN+1 request fix\n');
    await logNPlus1Fix(userRepo, limit);
    nPlus1QueryFixCount = logger.getCount();

    console.log(
      `\n\nSelecting up to ${limit} tests and users.\nBefore fix: ${nPlus1QueryCount} queries\nAfter fix: ${nPlus1QueryFixCount} query`,
    );
    console.log();
    process.exit();
  } catch (e) {
    console.error(e);
  }
}

await main();
