import { Module } from '@nestjs/common';
import { SessionService } from './session/session.service.js';
import { AuthService } from './auth.service.js';
import { TypeOrmModule } from '@nestjs/typeorm';
import { User } from '../entities/user.js';
import { RedisQueueModule } from '../redis/queue/queue.module.js';
import { AuthController } from './auth.controller.js';

@Module({
  imports: [RedisQueueModule, TypeOrmModule.forFeature([User])],
  controllers: [AuthController],
  providers: [SessionService, AuthService],
  exports: [SessionService],
})
export class AuthModule {}
