import { Inject, Injectable } from '@nestjs/common';
import {
  AuthenticationStorage,
  RefreshTokenRecord,
  RefreshTokenStore,
} from '@nestjs/authentication';
import { REDIS_QUEUE_CLIENT } from '../redis/constants.js';
import { Redis } from 'ioredis';
import {
  getRedisFamilyKey,
  getRedisRefreshTokenKey,
  getRedisSidFamilyKey,
  getRedisUserFamiliesKey,
} from '../contracts/session/constants.js';
import {
  MARK_REFRESH_TOKEN_USED,
  REVOKE_REFRESH_FAMILY,
  SAVE_REFRESH_TOKEN,
  VALIDATE_AND_TOUCH_FAMILY,
} from './constants.js';
import { Role } from '../entities/user.js';
import { UsersService } from '../users/users.service.js';

interface RefreshFamilyRecord {
  userId: string;
  sid: string;
  revoked: boolean;
  lastActiveAt: number;
  familyExpiresAt: number;
  role: Role;
}

@Injectable()
export class RedisAuthStore implements RefreshTokenStore {
  private readonly idleTtlMs = 7 * 24 * 60 * 60 * 1000;

  constructor(
    @Inject(REDIS_QUEUE_CLIENT) private readonly redisQueueClient: Redis,
    storage: AuthenticationStorage,
    private readonly userService: UsersService,
  ) {
    storage.registerSource({
      refreshTokens: this,
    });
  }

  private async getRefreshTokenRecord(id: string) {
    const raw = await this.redisQueueClient.get(getRedisRefreshTokenKey(id));

    if (!raw) {
      return undefined;
    }

    return JSON.parse(raw) as RefreshTokenRecord;
  }

  private async getFamilyRecord(familyId: string) {
    const raw = await this.redisQueueClient.get(getRedisFamilyKey(familyId));

    if (!raw) {
      return undefined;
    }

    return JSON.parse(raw) as RefreshFamilyRecord;
  }

  async getRefreshToken(id: string): Promise<RefreshTokenRecord | undefined> {
    const record = await this.getRefreshTokenRecord(id);

    if (!record) {
      return undefined;
    }

    return {
      ...record,
      createdAt: new Date(record.createdAt),
      expiresAt: new Date(record.expiresAt),
      familyExpiresAt: new Date(record.familyExpiresAt),
      usedAt: record.usedAt ? new Date(record.usedAt) : undefined,
    };
  }

  async saveRefreshToken(record: RefreshTokenRecord): Promise<void> {
    const sid = String(record.claims?.sid ?? '');
    const ttlMs = record.familyExpiresAt.getTime() - Date.now();

    const user = await this.userService.getById(record.userId);

    if (!user) {
      return undefined;
    }

    const result = Number(
      await this.redisQueueClient.eval(
        SAVE_REFRESH_TOKEN,
        4,
        getRedisFamilyKey(record.familyId),
        getRedisRefreshTokenKey(record.id),
        getRedisUserFamiliesKey(record.userId),
        getRedisSidFamilyKey(sid),
        JSON.stringify({
          userId: record.userId,
          role: user.role,
          sid,
          revoked: false,
          lastActiveAt: Date.now(),
          familyExpiresAt: record.familyExpiresAt.getTime(),
        }),
        JSON.stringify(record),
        String(ttlMs),
        String(record.familyExpiresAt.getTime()),
        String(this.idleTtlMs),
      ),
    );

    if (result !== 1 && result !== 2) {
      throw new Error(`Could not save refresh token; Redis status: ${result}`);
    }
  }

  async isSidAuthorized(sid: string, sub: string): Promise<boolean> {
    if (!sid || !sub) {
      return false;
    }

    const familyId = await this.redisQueueClient.get(getRedisSidFamilyKey(sid));

    if (!familyId) {
      return false;
    }

    const result = Number(
      await this.redisQueueClient.eval(
        VALIDATE_AND_TOUCH_FAMILY,
        1,
        getRedisFamilyKey(familyId),
        sub,
        sid,
        String(this.idleTtlMs),
      ),
    );

    return result === 1;
  }

  async markRefreshTokenUsed(id: string, at: Date): Promise<boolean> {
    const result = await this.redisQueueClient.eval(
      MARK_REFRESH_TOKEN_USED,
      1,
      getRedisRefreshTokenKey(id),
      at.toISOString(),
    );

    return result === 1;
  }

  async revokeRefreshTokenFamily(familyId: string) {
    await this.redisQueueClient.eval(
      REVOKE_REFRESH_FAMILY,
      1,
      getRedisFamilyKey(familyId),
    );
  }

  async isRefreshTokenFamilyRevoked(familyId: string): Promise<boolean> {
    const familyRecord = await this.getFamilyRecord(familyId);

    return !familyRecord || familyRecord.revoked;
  }

  async revokeUserRefreshTokens(userId: string): Promise<void> {
    const familyIds = await this.redisQueueClient.zrangebyscore(
      getRedisUserFamiliesKey(userId),
      Date.now(),
      '+inf',
    );

    for (const familyId of familyIds) {
      await this.revokeRefreshTokenFamily(familyId);
    }
  }
}
