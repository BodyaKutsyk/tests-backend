import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Redis } from 'ioredis';
import { RedisCacheService } from './cache.service.js';
import { REDIS_CACHE_CLIENT } from '../constants.js';
import { Env } from '../../config/env.schema.js';

@Module({
  providers: [
    RedisCacheService,
    {
      provide: REDIS_CACHE_CLIENT,
      inject: [ConfigService],
      useFactory: (configService: ConfigService<Env, true>) => {
        return new Redis({
          host: configService.get('REDIS_CACHE_HOST'),
          port: configService.get('REDIS_CACHE_PORT'),
          password: configService.get('REDIS_PASSWORD'),
        });
      },
    },
  ],
  exports: [RedisCacheService],
})
export class RedisCacheModule {}
