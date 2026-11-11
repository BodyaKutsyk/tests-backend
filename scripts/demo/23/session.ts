import { Helper } from '../22/helper.js';
import { Redis } from 'ioredis';
import { getRedisSessionKey } from '../../../src/contracts/session/constants.js';
import { asyncTimeout } from '../../../src/utils/async-timeout.js';

async function login({
  email,
  password,
}: {
  email: string;
  password: string;
}): Promise<{ sessionId: string }> {
  const response = await fetch(
    `http://localhost:${Number(process.env.API_PORT)}/auth/login`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    },
  );

  if (!response.ok) {
    throw new Error(`Login failed with HTTP ${response.status}`);
  }
  return (await response.json()) as { sessionId: string };
}

async function getUsers(sessionId: string): Promise<void> {
  const response = await fetch(
    `http://localhost:${Number(process.env.API_PORT)}/users`,
    {
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${sessionId}`,
      },
    },
  );

  if (!response.ok) {
    throw new Error(`Protected request failed with HTTP ${response.status}`);
  }
}

async function main() {
  const helper = new Helper();
  const redisQueue = new Redis({
    port: Number(process.env.REDIS_QUEUE_PORT),
    host: process.env.REDIS_QUEUE_HOST,
    password: process.env.REDIS_PASSWORD,
  });
  try {
    await helper.dataSource.initialize();
    const [user] = await helper.getUsersWithDocuments(1);
    if (!user) throw new Error('Seeded user was not found');

    const { sessionId } = await login({
      email: user.email,
      password: 'Test123456',
    });
    const sessionKey = getRedisSessionKey(sessionId);
    const inRedis = Number((await redisQueue.exists(sessionKey)) === 1);
    let requests = 0;
    await getUsers(sessionId);
    requests++;
    await asyncTimeout(3000);
    const ttlBefore = await redisQueue.pttl(sessionKey);
    await getUsers(sessionId);
    requests++;
    const ttlAfter = await redisQueue.pttl(sessionKey);
    await getUsers(sessionId);
    requests++;

    const ttlRenewed = Number(ttlAfter > ttlBefore);
    console.log(`requests=${requests}`);
    console.log('sessions=1');
    console.log(`in-redis=${inRedis}`);
    console.log(`ttl-renewed=${ttlRenewed}`);
    process.exitCode = Number(inRedis !== 1 || ttlRenewed !== 1);
  } catch (e) {
    console.error(e);
    process.exitCode = 1;
  } finally {
    redisQueue.disconnect();
    if (helper.dataSource.isInitialized) await helper.dataSource.destroy();
  }
}

await main();
