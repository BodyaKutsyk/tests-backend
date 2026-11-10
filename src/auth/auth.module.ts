import { Module } from '@nestjs/common';
import { AuthService } from './auth.service.js';
import { RedisQueueModule } from '../redis/queue/queue.module.js';
import { AuthController } from './auth.controller.js';
import { JwtAuth } from './jwt/jwt-auth.provider.js';
import { CredentialsService } from './credentials/credentials.service.js';
import { UsersModule } from '../users/users.module.js';
import { RedisAuthStore } from './redis-auth-store.js';

@Module({
  imports: [RedisQueueModule, UsersModule],
  controllers: [AuthController],
  providers: [AuthService, JwtAuth, CredentialsService, RedisAuthStore],
})
export class AuthModule {}
