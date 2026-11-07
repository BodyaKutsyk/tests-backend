import { Redis } from 'ioredis';
import { Helper } from '../22/helper.js';
import {
  getRedisUserTestsCacheKey,
  getRedisUserTestsLockKey,
} from '../../../src/contracts/generation/constants.js';

const CONCURRENT_CALLS_FOR_USER = 20;

async function concurrentCall(amount: number, cb: () => any) {
  return await Promise.allSettled(Array.from({ length: amount }, cb));
}

async function main() {
  try {
    const redisCache = new Redis({
      port: Number(process.env.REDIS_CACHE_PORT),
      host: process.env.REDIS_CACHE_HOST,
      password: process.env.REDIS_PASSWORD,
    });
    const helper = new Helper();
    await helper.dataSource.initialize();
    const [, policy] = (await redisCache.call(
      'CONFIG',
      'GET',
      'maxmemory-policy',
    )) as string[];
    const [, maxMemoryRaw] = (await redisCache.call(
      'CONFIG',
      'GET',
      'maxmemory',
    )) as string[];
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
    const redisTtl = await Promise.all(
      usersWithDocuments.map(({ id }) =>
        redisCache.ttl(getRedisUserTestsCacheKey(id)),
      ),
    );

    const ttlDistinct = new Set(redisTtl).size;
    const warmedKeys = redisTtl.length;
    const user = usersWithDocuments[0];
    await redisCache.del(getRedisUserTestsCacheKey(user.id));
    await helper.resetDbCounter();

    const concurrentCalls = await concurrentCall(
      CONCURRENT_CALLS_FOR_USER,
      () => helper.getUserTest(user.id),
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

    console.log(`cache-lru=${cacheLru}`);
    console.log(`cache-maxmemory=${cacheMaxMemory}`);
    console.log(`warmed=${warmedKeys}`);
    console.log(`ttl-distinct=${ttlDistinct}`);
    console.log(`concurrent=${successCalls}`);
    console.log(`db-calls=${queriesCount}`);
    console.log(`db-calls-warm=${queriesCountWarm}`);

    process.exit(
      Number(
        !(
          cacheLru === 1 &&
          cacheMaxMemory === 1 &&
          warmedKeys >= 50 &&
          ttlDistinct >= 5 &&
          successCalls >= 20 &&
          queriesCount === 1 &&
          queriesCountWarm === 0
        ),
      ),
    );
  } catch (e) {
    console.error(e);
    process.exit(1);
  }
}

await main();
