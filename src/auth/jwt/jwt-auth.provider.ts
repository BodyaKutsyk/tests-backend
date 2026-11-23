import { Injectable } from '@nestjs/common';
import {
  AuthenticationRegistry,
  JwtBearerProvider,
  JwtClaims,
} from '@nestjs/authentication';
import { User } from '../../entities/user.js';
import { UsersService } from '../../users/users.service.js';
import { PostgresAuthStore } from '../postgres-auth-store.js';
import { ConfigService } from '@nestjs/config';
import { createPublicKey } from 'node:crypto';
import { type Env } from '../../config/env.schema.js';
import { getSigningKey } from './signing-key.js';

@Injectable()
export class JwtAuth extends JwtBearerProvider<User> {
  constructor(
    private readonly usersService: UsersService,
    private readonly authStore: PostgresAuthStore,
    registry: AuthenticationRegistry,
    config: ConfigService<Env, true>,
  ) {
    const key = getSigningKey(
      config.get('JWT_PRIVATE_KEY'),
      config.get('JWT_PUBLIC_KEY'),
    );
    super({
      key: createPublicKey(key),
      algorithms: ['ES256'],
      issuer: 'test-generator',
      audience: 'test-generator-api',
    });
    registry.registerProvider(this);
  }

  async validate(claims: JwtClaims): Promise<User | null> {
    const { sid, sub, jti } = claims as JwtClaims & { sid?: string };

    if (
      typeof sub !== 'string' ||
      typeof sid !== 'string' ||
      typeof jti !== 'string'
    ) {
      return null;
    }

    if (await this.authStore.isAccessTokenRevoked(jti)) return null;
    const isSidAuthorized = await this.authStore.isSidAuthorized(sid, sub);

    if (!isSidAuthorized) {
      return null;
    }

    return this.usersService.getById(sub);
  }
}
