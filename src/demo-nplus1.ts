import { dataSourceOptions } from './data-source.js';
import { Test } from './entities/test.js';
import { DataSource, Repository, Logger, QueryRunner } from 'typeorm';
import { User } from './entities/user.js';


class QueryLogger implements Logger {
  private count = 0;
  logQuery(query: string, parameters?: any[], queryRunner?: QueryRunner) {
    this.count++;
    console.log(`Count: ${this.count} Executing: ${query}`);
  }
  getCount() {
    return this.count;
  }

  resetCount() {
    this.count = 0;
  }
  logQueryError(
    error: string,
    query: string,
    parameters?: any[],
    queryRunner?: QueryRunner,
  ) {}
  logQuerySlow(
    time: number,
    query: string,
    parameters?: any[],
    queryRunner?: QueryRunner,
  ) {}
  logSchemaBuild(message: string, queryRunner?: QueryRunner) {}
  logMigration(message: string, queryRunner?: QueryRunner) {}
  log(
    level: 'log' | 'info' | 'warn',
    message: any,
    queryRunner?: QueryRunner,
  ) {}
}

type RawTest = {
  id: string,
  user_id: string
}

async function logNPlus1(testRepo: Repository<Test>, userRepo: Repository<User>) {
  const tests: RawTest[] = await testRepo.query(`
  SELECT *
  FROM tests
  WHERE user_id IS NOT NULL
  LIMIT 50
`);


  for (const test of tests) {
    const user = await userRepo.findOneBy({ id: test.user_id })
  }
}

async function logNPlus1Fix(userRepo: Repository<User>) {
  await userRepo
    .createQueryBuilder('user')
    .innerJoin('user.tests', 'test')
    .distinct(true)
    .limit(50)
    .getMany();
}

async function main () {
  const logger = new QueryLogger();
  const loggingDataSource = new DataSource({
    ...dataSourceOptions,
    logging: true,
    logger: logger
  })
  await loggingDataSource.initialize();

  try {
    const testRepository = loggingDataSource.getRepository(Test);
    const userRepo = loggingDataSource.getRepository(User);
    let nPlus1QueryCount = 0;
    let nPlus1QueryFixCount = 0;
    logger.resetCount();

    console.log("\nN+1 request\n")
    await logNPlus1(testRepository, userRepo);
    nPlus1QueryCount = logger.getCount();
    logger.resetCount()

    console.log("\nN+1 request fix\n")
    await logNPlus1Fix(userRepo);
    nPlus1QueryFixCount = logger.getCount();

    console.log(
      `\n\nSelecting 50 users that have tests.\nBefore fix: ${nPlus1QueryCount} queries\nAfter fix: ${nPlus1QueryFixCount} query`,
    );
    console.log()
    process.exit()
  } catch (e) {
    console.error(e)
  }
}

await main()

