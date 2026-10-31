import { Inject, Injectable, OnModuleDestroy } from '@nestjs/common';
import { REDIS_CACHE_CLIENT } from '../constants.js';
import { Redis } from 'ioredis';
import { asyncTimeout } from '../../utils/async-timeout.js';

const RETRY_TIMEOUT = 300;

@Injectable()
export class RedisCacheService implements OnModuleDestroy {
  constructor(
    @Inject(REDIS_CACHE_CLIENT) private readonly redisCacheClient: Redis,
  ) {}

  onModuleDestroy() {
    this.redisCacheClient.disconnect();
  }

  async set(key: string, value: any, ttl?: number): Promise<void> {
    const stringifiedValue = JSON.stringify(value);

    if (ttl) {
      await this.redisCacheClient.set(key, stringifiedValue, 'EX', ttl);
    } else {
      await this.redisCacheClient.set(key, stringifiedValue);
    }
  }

  async del(key: string): Promise<void> {
    await this.redisCacheClient.del(key);
  }

  async get<T>(key: string): Promise<T | null> {
    const data = await this.redisCacheClient.get(key);

    if (!data) {
      return null;
    }

    return JSON.parse(data) as T;
  }

  async acquireLock(lockKey: string, token: string, ttlMs: number) {
    const result = await this.redisCacheClient.set(
      lockKey,
      token,
      'PX',
      ttlMs,
      'NX',
    );

    return result === 'OK';
  }
  async releaseLock(lockKey: string, token: string): Promise<boolean> {
    const luaScript = `
      if redis.call("get", KEYS[1]) == ARGV[1] then
        return redis.call("del", KEYS[1])
      else
        return 0
      end
    `;
    const result = await this.redisCacheClient.eval(
      luaScript,
      1,
      lockKey,
      token,
    );
    return result === 1;
  }

  async waitAndRead<T>(
    cacheKey: string,
    lockKey: string,
    retries: number = 10,
  ): Promise<T | null> {
    for (let i = 0; i <= retries; i++) {
      const cached = await this.get<T>(cacheKey);

      if (cached) {
        return cached;
      }

      const lockExists = await this.get(lockKey);

      if (lockExists === 0) {
        return this.get<T>(cacheKey);
      }
      await asyncTimeout(RETRY_TIMEOUT);
    }

    return this.get<T>(cacheKey);
  }
}
