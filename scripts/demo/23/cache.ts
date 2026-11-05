import { QueryLogger } from '../../../src/utils/query-logger.js';
import { Redis } from 'ioredis';
import { Helper } from '../22/helper.js';
import {
  getRedisUserTestsCacheKey,
  getRedisUserTestsLockKey,
} from '../../../src/contracts/generation/constants.js';

const CONCURRENT_CALLS_FOR_USER = 20;

async function concurrentCall(amount: number, cb: () => any) {
  return await Promise.allSettled(
    Array.from({ length: CONCURRENT_CALLS_FOR_USER }, cb),
  );
}

async function main() {
  const redisCache = new Redis({
    port: Number(process.env.REDIS_CACHE_PORT),
    host: process.env.REDIS_CACHE_HOST,
    password: process.env.REDIS_PASSWORD,
  });
  const helper = new Helper();
  await helper.dataSource.initialize();
  const [, policy] = await redisCache.config('GET', 'maxmemory-policy');
  const [, maxMemoryRaw] = await redisCache.config('GET', 'maxmemory');
  const maxMemory = Number(maxMemoryRaw);
  const cacheLru = policy === 'allkeys-lru' ? 1 : 0;
  const cacheMaxMemory = Number(maxMemory) > 0 ? 1 : 0;
  const usersWithDocuments = await helper.getUsersWithDocuments(50);

  await Promise.all(
    usersWithDocuments.map(({ id }) =>
      redisCache.del(
        getRedisUserTestsCacheKey(id),
        getRedisUserTestsLockKey(id),
      ),
    ),
  );

  await Promise.all(
    usersWithDocuments.map((user) => helper.getUserTest(user.id)),
  );
  const redisTTl = await Promise.all(
    usersWithDocuments.map(({ id }) =>
      redisCache.ttl(getRedisUserTestsCacheKey(id)),
    ),
  );

  const ttlDistinct = [...new Set(redisTTl)].length;
  const warmedKeys = redisTTl.length;
  const user = usersWithDocuments[0];
  await redisCache.del(getRedisUserTestsCacheKey(user.id));
  await helper.resetDbCounter();

  const concurrentCalls = await concurrentCall(CONCURRENT_CALLS_FOR_USER, () =>
    helper.getUserTest(user.id),
  );

  const successCalls = concurrentCalls.filter(
    (call) => call.status === 'fulfilled',
  ).length;

  const { count: queriesCount } = await helper.getDbCounter();
  await helper.resetDbCounter();
  await concurrentCall(CONCURRENT_CALLS_FOR_USER * 5, () =>
    helper.getUserTest(user.id),
  );
  const { count: queriesCountWarm } = await helper.getDbCounter();

  console.log(
    `maxmemory-policy: ${policy}\nmax-memory: ${maxMemory} bytes\nwarmed: ${warmedKeys}\nttl-distinct: ${ttlDistinct}\nconcurrent: ${successCalls}\ndb-calls: ${queriesCount}\ndb-calls-warm: ${queriesCountWarm}`,
  );

  process.exit(Number(!Boolean(cacheLru && cacheMaxMemory)));
}

await main();
