import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  AuthenticationStorage,
  type RefreshTokenRecord,
  type RefreshTokenStore,
} from '@nestjs/authentication';
import { createHmac } from 'node:crypto';
import { AsyncLocalStorage } from 'node:async_hooks';
import {
  DataSource,
  EntityManager,
  IsNull,
  LessThanOrEqual,
  MoreThan,
} from 'typeorm';
import { RefreshTokenError } from '@nestjs/authentication';
import { type Env } from '../config/env.schema.js';
import { RefreshFamily } from '../entities/refresh-family.js';
import { RefreshToken } from '../entities/refresh-token.js';
import { RevokedAccessToken } from '../entities/revoked-access-token.js';
import { Interval } from '@nestjs/schedule';

const IDLE_TIMEOUT_MS = 7 * 24 * 60 * 60 * 1000;

@Injectable()
export class PostgresAuthStore implements RefreshTokenStore {
  private readonly logger = new Logger(PostgresAuthStore.name);
  private readonly pepper: string;
  private readonly context = new AsyncLocalStorage<EntityManager>();

  private get manager(): EntityManager {
    return this.context.getStore() ?? this.db.manager;
  }

  async transaction<T>(operation: () => Promise<T>): Promise<T> {
    const result = await this.db.transaction((manager) =>
      this.context.run(manager, async () => {
        try {
          return { value: await operation() };
        } catch (error) {
          if (error instanceof RefreshTokenError && error.reason === 'reused')
            return { error };
          throw error;
        }
      }),
    );
    if ('error' in result) throw result.error;
    return result.value as T;
  }

  constructor(
    private readonly db: DataSource,
    config: ConfigService<Env, true>,
    storage: AuthenticationStorage,
  ) {
    this.pepper = config.get('REFRESH_TOKEN_PEPPER');
    storage.registerSource({ refreshTokens: this });
  }

  private hash(id: string): string {
    return createHmac('sha256', this.pepper).update(id).digest('hex');
  }

  async getRefreshToken(id: string): Promise<RefreshTokenRecord | undefined> {
    let token = await this.manager
      .getRepository(RefreshToken)
      .findOneBy({ tokenHash: this.hash(id) });
    if (!token) return undefined;
    if (this.context.getStore()) {
      await this.manager
        .getRepository(RefreshFamily)
        .findOne({
          where: { id: token.familyId },
          lock: { mode: 'pessimistic_write' },
        });
      token = await this.manager
        .getRepository(RefreshToken)
        .findOneBy({ tokenHash: this.hash(id) });
      if (!token) return undefined;
    }
    return {
      id,
      userId: token.userId,
      familyId: token.familyId,
      createdAt: token.createdAt,
      expiresAt: token.expiresAt,
      familyExpiresAt: token.familyExpiresAt,
      usedAt: token.usedAt ?? undefined,
      claims: token.claims ?? undefined,
    };
  }

  async saveRefreshToken(record: RefreshTokenRecord): Promise<void> {
    const sid = record.claims?.sid;
    if (typeof sid !== 'string' || !sid) throw new Error('Missing session id');
    const save = async (manager: EntityManager) => {
      const families = manager.getRepository(RefreshFamily);
      await families
        .createQueryBuilder()
        .insert()
        .values({
          id: record.familyId,
          userId: record.userId,
          sid,
          expiresAt: record.familyExpiresAt,
        })
        .orIgnore()
        .execute();
      const family = await families.findOne({
        where: { id: record.familyId },
        lock: { mode: 'pessimistic_write' },
      });
      const now = Date.now();
      if (
        !family ||
        family.revokedAt ||
        family.userId !== record.userId ||
        family.sid !== sid ||
        family.expiresAt.getTime() !== record.familyExpiresAt.getTime() ||
        family.expiresAt.getTime() <= now ||
        family.lastActiveAt.getTime() <= now - IDLE_TIMEOUT_MS
      ) {
        throw new Error('Refresh family is invalid or revoked');
      }
      await families.update({ id: family.id }, { lastActiveAt: new Date(now) });
      await manager.getRepository(RefreshToken).insert({
        tokenHash: this.hash(record.id),
        familyId: record.familyId,
        userId: record.userId,
        createdAt: record.createdAt,
        expiresAt: record.expiresAt,
        familyExpiresAt: record.familyExpiresAt,
        usedAt: record.usedAt ?? null,
        claims: (record.claims ?? null) as never,
      });
    };
    const manager = this.context.getStore();
    if (manager) await save(manager);
    else await this.db.transaction(save);
  }

  async markRefreshTokenUsed(id: string, at: Date): Promise<boolean> {
    const result = await this.manager
      .getRepository(RefreshToken)
      .update({ tokenHash: this.hash(id), usedAt: IsNull() }, { usedAt: at });
    return result.affected === 1;
  }

  async revokeRefreshTokenFamily(familyId: string): Promise<void> {
    await this.manager
      .getRepository(RefreshFamily)
      .update({ id: familyId, revokedAt: IsNull() }, { revokedAt: new Date() });
    this.logger.warn(`Refresh token family revoked: ${familyId}`);
  }

  async isRefreshTokenFamilyRevoked(familyId: string): Promise<boolean> {
    const family = await this.manager
      .getRepository(RefreshFamily)
      .findOneBy({ id: familyId });
    return (
      !family ||
      !!family.revokedAt ||
      family.expiresAt.getTime() <= Date.now() ||
      family.lastActiveAt.getTime() <= Date.now() - IDLE_TIMEOUT_MS
    );
  }

  async revokeUserRefreshTokens(userId: string): Promise<void> {
    await this.manager
      .getRepository(RefreshFamily)
      .update({ userId, revokedAt: IsNull() }, { revokedAt: new Date() });
  }

  async revokeAccessToken(jti: string, expiresAt: Date): Promise<void> {
    const repo = this.manager.getRepository(RevokedAccessToken);
    await repo
      .createQueryBuilder()
      .insert()
      .values({ jti, expiresAt })
      .orIgnore()
      .execute();
  }

  @Interval(60_000)
  async removeExpiredAccessTokens(): Promise<void> {
    await this.db
      .getRepository(RevokedAccessToken)
      .delete({ expiresAt: LessThanOrEqual(new Date()) });
  }

  async isAccessTokenRevoked(jti: string): Promise<boolean> {
    return this.manager
      .getRepository(RevokedAccessToken)
      .existsBy({ jti, expiresAt: MoreThan(new Date()) });
  }

  async isSidAuthorized(sid: string, sub: string): Promise<boolean> {
    const now = new Date();
    const result = await this.manager.getRepository(RefreshFamily).update(
      {
        sid,
        userId: sub,
        revokedAt: IsNull(),
        expiresAt: MoreThan(now),
        lastActiveAt: MoreThan(new Date(now.getTime() - IDLE_TIMEOUT_MS)),
      },
      { lastActiveAt: now },
    );
    return result.affected === 1;
  }
}
