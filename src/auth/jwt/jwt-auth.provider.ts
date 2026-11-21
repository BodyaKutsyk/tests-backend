import { Injectable } from '@nestjs/common';
import {
  AuthenticationRegistry,
  JwtBearerProvider,
  JwtClaims,
} from '@nestjs/authentication';
import { User } from '../../entities/user.js';
import { UsersService } from '../../users/users.service.js';
import { RedisAuthStore } from '../redis-auth-store.js';

@Injectable()
export class JwtAuth extends JwtBearerProvider<User> {
  constructor(
    private readonly usersService: UsersService,
    private readonly authStore: RedisAuthStore,
    registry: AuthenticationRegistry,
  ) {
    super();
    registry.registerProvider(this);
  }

  async validate(claims: JwtClaims): Promise<User | null> {
    const { sid, sub } = claims as JwtClaims & { sid?: string };

    if (typeof sub !== 'string' || typeof sid !== 'string') {
      return null;
    }

    const isSidAuthorized = await this.authStore.isSidAuthorized(sid, sub);

    if (!isSidAuthorized) {
      return null;
    }

    return this.usersService.getById(sub);
  }
}
