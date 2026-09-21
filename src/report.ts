import dataSource from './data-source.js';
import { User } from './entities/user.js';

async function report() {
  await dataSource.initialize();
  const userRepo = dataSource.getRepository(User);
  const userQueryBuilder = userRepo.createQueryBuilder('user');
  const users = await userQueryBuilder
    .select('user')
    .addSelect('COUNT(test.id)', 'user_total_relations')
    .leftJoin('user.tests', 'test')
    .where('test.user_id IS NOT NULL')
    .groupBy('user.id, test.id')
    .orderBy('count(test.id)', 'DESC')
    .limit(10)
    .getRawMany();

  console.log(users);

  return users;
}

await report().then(() => process.exit())
