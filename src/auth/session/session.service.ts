import { Inject, Injectable } from '@nestjs/common';
import { Redis } from 'ioredis';
import { UnauthorizedProblem } from '../../exceptions/problem-errors.js';
import { VALIDATE_AND_TOUCH } from '../constants.js';
import { randomUUID } from 'crypto';
import { REDIS_QUEUE_CLIENT } from '../../redis/constants.js';

interface AuthSession {
  userId: string;
  familyId: string;
  refreshHash: string;
  absoluteExpiresAt: number;
}

@Injectable()
export class SessionService {
  private readonly idleTtlMs = 7 * 24 * 60 * 60 * 1000;
  private readonly absoluteTtlMs = 30 * 24 * 60 * 60 * 1000;

  constructor(
    @Inject(REDIS_QUEUE_CLIENT) private readonly redisQueueClient: Redis,
  ) {
    this.redisQueueClient.defineCommand('validateAndTouch', {
      numberOfKeys: 1,
      lua: VALIDATE_AND_TOUCH,
    });
  }

  async validateAndTouch(sid: string): Promise<AuthSession> {
    const result = await this.redisQueueClient.call(
      'EVAL',
      VALIDATE_AND_TOUCH,
      1,
      `auth:session:${sid}`,
      this.idleTtlMs,
    );

    if (typeof result !== 'string') {
      throw new UnauthorizedProblem({ detail: 'Session expired' });
    }

    return JSON.parse(result) as AuthSession;
  }

  async create(
    userId: string,
    sId: string,
    refreshHash: string,
  ): Promise<void> {
    const key = `auth:session:${sId}`;
    const now = Date.now();
    const session: AuthSession = {
      userId,
      refreshHash,
      familyId: randomUUID(),
      absoluteExpiresAt: now + this.absoluteTtlMs,
    };
    const result = await this.redisQueueClient.set(
      key,
      JSON.stringify(session),
      'PX',
      this.idleTtlMs,
      'NX',
    );

    if (result !== 'OK') {
      throw new Error('Failed to create session');
    }
  }
}
