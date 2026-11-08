import { Module } from '@nestjs/common';
import { SessionService } from './session/session.service.js';
import { AuthService } from './auth.service.js';
import { RedisQueueModule } from '../redis/queue/queue.module.js';
import { AuthController } from './auth.controller.js';
import { JwtAuth } from './jwt/jwt-auth.provider.js';
import { CredentialsService } from './credentials/credentials.service.js';
import { UsersModule } from '../users/users.module.js';

@Module({
  imports: [RedisQueueModule, UsersModule],
  controllers: [AuthController],
  providers: [
    SessionService,
    AuthService,
    JwtAuth,
    CredentialsService,
  ],
  exports: [SessionService],
})
export class AuthModule {}
