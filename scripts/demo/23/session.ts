import { Helper } from '../22/helper.js';
import { randomUUID } from 'crypto';
import { Redis } from 'ioredis';
import { getRedisSessionKey } from '../../../src/contracts/session/constants.js';
import { User } from '../../../src/entities/user.js';
import { asyncTimeout } from '../../../src/utils/async-timeout.js';

const USERS_AMOUNT = 20;

async function login({
  email,
  password,
}: {
  email: string;
  password: string;
}): Promise<{ sessionId: string }> {
  const response = await fetch(
    `http://localhost:${Number(process.env.API_PORT || 3000)}/auth/login`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    },
  );

  return (await response.json()) as { sessionId: string };
}

async function getUsers(sessionId: string): Promise<User[]> {
  const response = await fetch(
    `http://localhost:${Number(process.env.API_PORT || 3000)}/users`,
    {
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${sessionId}`,
      },
    },
  );

  return (await response.json()) as User[];
}

async function main() {
  const helper = new Helper();
  const redisQueue = new Redis({
    port: Number(process.env.REDIS_QUEUE_PORT),
    host: process.env.REDIS_QUEUE_HOST,
    password: process.env.REDIS_PASSWORD,
  });
  await helper.dataSource.initialize();

  const users = await helper.getUsersWithDocuments(USERS_AMOUNT);
  const sessions = await Promise.allSettled(
    users.map(({ email }) =>
      login({ email, password: randomUUID().slice(0, 20) }),
    ),
  );
  const requests = sessions.filter((req) => req.status === 'fulfilled').length;
  const ttlsBefore: number[] = [];

  const sessionsInRedis = await Promise.all(
    sessions.map(async (result) => {
      if (result.status !== 'fulfilled' || !result.value.sessionId) {
        return Promise.resolve(null);
      }

      const ttl = await redisQueue.pttl(
        getRedisSessionKey(result.value.sessionId),
      );
      ttlsBefore.push(ttl);
      return redisQueue.get(getRedisSessionKey(result.value.sessionId));
    }),
  );

  await asyncTimeout(3000);

  const ttlsAfter = await Promise.all(
    sessions.map(async (result) => {
      if (result.status !== 'fulfilled' || !result.value.sessionId) {
        return Promise.resolve(0);
      }

      await getUsers(result.value.sessionId);
      return redisQueue.pttl(getRedisSessionKey(result.value.sessionId));
    }),
  );

  console.log(`requests: ${requests}`);
  console.log(`sessions: ${sessions.length}`);
  console.log(`in-redis: ${sessionsInRedis.length}`);
  console.log(`user ttl before protected call: ${ttlsBefore[0]}`);
  console.log(`user ttl after protected call: ${ttlsAfter[0]}`);

  process.exit(
    Number(
      !Boolean(ttlsBefore[0] < ttlsAfter[0] && requests === sessions.length),
    ),
  );
}

await main();
