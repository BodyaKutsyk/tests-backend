import { Injectable, UnauthorizedException } from '@nestjs/common';
import { createHash, createPublicKey, randomUUID } from 'crypto';
import { JwtVerifier, TokenService } from '@nestjs/authentication';
import { ConfigService } from '@nestjs/config';
import { type Env } from '../config/env.schema.js';
import { getSigningKey } from './jwt/signing-key.js';
import { PostgresAuthStore } from './postgres-auth-store.js';

@Injectable()
export class AuthService {
  private readonly verifier: JwtVerifier;

  constructor(
    private readonly tokenService: TokenService,
    private readonly store: PostgresAuthStore,
    config: ConfigService<Env, true>,
  ) {
    const key = getSigningKey(
      config.get('JWT_PRIVATE_KEY'),
      config.get('JWT_PUBLIC_KEY'),
    );
    this.verifier = new JwtVerifier({
      key: createPublicKey(key),
      algorithms: ['ES256'],
      issuer: 'test-generator',
      audience: 'test-generator-api',
    });
  }

  async signIn(userId: string) {
    const sid = randomUUID();

    return this.tokenService.issue(userId, {
      method: 'password',
      claims: { sid },
    });
  }

  async signUp(userId: string) {
    const sid = randomUUID();

    return this.tokenService.issue(userId, {
      method: 'password',
      claims: { sid },
    });
  }

  async refresh(refreshToken: string) {
    return this.store.transaction(() =>
      this.tokenService.refresh(refreshToken),
    );
  }

  async signOut(refreshToken: string, accessToken: string) {
    let claims;
    try {
      claims = await this.verifier.verify(accessToken);
    } catch {
      throw new UnauthorizedException();
    }
    if (
      typeof claims.jti !== 'string' ||
      typeof claims.exp !== 'number' ||
      typeof claims.sid !== 'string' ||
      typeof claims.sub !== 'string' ||
      typeof refreshToken !== 'string'
    )
      throw new UnauthorizedException();
    const { jti, exp, sid, sub } = claims;
    await this.store.transaction(async () => {
      const id = createHash('sha256').update(refreshToken).digest('base64url');
      const record = await this.store.getRefreshToken(id);
      if (
        !record ||
        record.userId !== sub ||
        record.claims?.sid !== sid ||
        (await this.store.isRefreshTokenFamilyRevoked(record.familyId))
      )
        throw new UnauthorizedException();
      await this.store.revokeRefreshTokenFamily(record.familyId);
      await this.store.revokeAccessToken(jti, new Date(exp * 1000));
    });
  }
}
