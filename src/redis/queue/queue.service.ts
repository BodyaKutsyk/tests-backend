import { Inject, Injectable, OnModuleDestroy } from '@nestjs/common';
import { REDIS_QUEUE_CLIENT } from '../constants.js';
import { Redis } from 'ioredis';

@Injectable()
export class RedisQueueService implements OnModuleDestroy {
  constructor(
    @Inject(REDIS_QUEUE_CLIENT) private readonly redisQueueClient: Redis,
  ) {}

  onModuleDestroy() {
    this.redisQueueClient.disconnect();
  }

  async set(key: string, value: any, ttl?: number): Promise<void> {
    const stringifiedValue = JSON.stringify(value);

    if (ttl) {
      await this.redisQueueClient.set(key, stringifiedValue, 'EX', ttl);
    } else {
      await this.redisQueueClient.set(key, stringifiedValue);
    }
  }

  async del(key: string): Promise<void> {
    await this.redisQueueClient.del(key);
  }

  async get<T>(key: string): Promise<T | null> {
    const data = await this.redisQueueClient.get(key);

    if (!data) {
      return null;
    }

    return JSON.parse(data) as T;
  }
}
