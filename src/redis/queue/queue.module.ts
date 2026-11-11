import { Global, Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Redis } from 'ioredis';
import { Env } from '../../config/env.schema.js';
import { REDIS_QUEUE_CLIENT } from '../constants.js';
import { RedisQueueService } from './queue.service.js';

@Global()
@Module({
  providers: [
    RedisQueueService,
    {
      provide: REDIS_QUEUE_CLIENT,
      inject: [ConfigService],
      useFactory: (configService: ConfigService<Env, true>) => {
        return new Redis({
          host: configService.get('REDIS_QUEUE_HOST'),
          port: configService.get('REDIS_QUEUE_PORT'),
          password: configService.get('REDIS_PASSWORD'),
        });
      },
    },
  ],
  exports: [RedisQueueService, REDIS_QUEUE_CLIENT],
})
export class RedisQueueModule {}
