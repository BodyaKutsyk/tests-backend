import { dataSourceOptions } from './data-source.js';
import { Test } from './entities/test.js';
import { DataSource, Repository } from 'typeorm';
import { User } from './entities/user.js';

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

  let queryCount = 1; // select from tests

  for (const test of tests) {
    const user = await userRepo.findOneBy({ id: test.user_id })
    queryCount++
  }

  return queryCount;
}

async function logNPlus1Fix(userRepo: Repository<User>) {
  await userRepo
    .createQueryBuilder('user')
    .innerJoin('user.tests', 'test')
    .distinct(true)
    .limit(50)
    .getMany();

  return 1;
}

async function main () {
  const loggingDataSource = new DataSource({
    ...dataSourceOptions,
    logging: ['query']
  })
  await loggingDataSource.initialize();

  try {
    const testRepository = loggingDataSource.getRepository(Test);
    const userRepo = loggingDataSource.getRepository(User);
    console.log("\nN+1 request\n")
    const usersN1Count = await logNPlus1(testRepository, userRepo);

    console.log("\nN+1 request fix\n")
    const usersN1FixCount = await logNPlus1Fix(userRepo);

    console.log(`\n\nSelecting 50 users that have tests.\nBefore fix: ${usersN1Count} queries\nAfter fix: ${usersN1FixCount} query`)
    process.exit()
  } catch (e) {
    console.error(e)
  }
}

await main()

