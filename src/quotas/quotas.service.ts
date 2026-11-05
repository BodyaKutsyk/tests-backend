import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Quota, QuotaType } from '../entities/quota.js';
import { Repository } from 'typeorm';
import {
  BadRequestProblem,
  NotFoundProblem,
} from '../exceptions/problem-errors.js';

@Injectable()
export class QuotasService {
  constructor(
    @InjectRepository(Quota) private readonly quotaRepo: Repository<Quota>,
  ) {}
  async getUserQuota(userId: string, quotaType: QuotaType): Promise<Quota> {
    const quota = await this.quotaRepo.findOneOrFail({
      where: { user: { id: userId }, quotaType },
    });

    if (!quota) {
      throw new NotFoundProblem({
        detail: `${quotaType} quota with user id ${userId} not found`,
      });
    }

    return quota;
  }
  async getUserQuotas(userId: string): Promise<Quota[]> {
    const quotas = await this.quotaRepo.find({
      where: { user: { id: userId } },
    });

    if (!quotas.length) {
      throw new NotFoundProblem({
        detail: `Quotas with user id ${userId} not found`,
      });
    }

    return quotas;
  }
  async checkUserQuota(
    userId: string,
    quotaType: QuotaType,
    bytes: number,
  ): Promise<boolean> {
    const quota = await this.quotaRepo.findOneOrFail({
      where: { user: { id: userId }, quotaType },
    });

    if (!quota) {
      throw new NotFoundProblem({
        detail: `${quotaType} quota with user id ${userId} not found`,
      });
    }

    return quota.used + bytes < quota.maxLimit;
  }

  async reserveStorage(
    userId: string,
    quotaType: QuotaType,
    bytes: number,
  ): Promise<Quota> {
    const result = await this.quotaRepo
      .createQueryBuilder()
      .update(Quota)
      .set({ used: () => `"used" + :bytes` })
      .setParameter('bytes', bytes)
      .where('user_id = :id', { id: userId })
      .andWhere('quota_type = :quotaType', { quotaType })
      .andWhere('"used" + :bytes <= "max_limit"')
      .returning('*')
      .execute();

    if (result.affected === 0) {
      throw new BadRequestProblem({
        detail: `User ${quotaType} quota is exceeded`,
      });
    }

    return result.raw[0] as Quota;
  }
  async releaseStorage(userId: string, quotaType: QuotaType, bytes: number) {
    if (!Number.isSafeInteger(bytes) || bytes < 0) {
      throw new BadRequestProblem({ detail: 'Invalid bytes amount' });
    }

    if (bytes === 0) return;
    const result = await this.quotaRepo
      .createQueryBuilder()
      .update(Quota)
      .set({ used: () => `"used" - :bytes` })
      .setParameter('bytes', bytes)
      .where('user_id = :id', { id: userId })
      .andWhere('quota_type = :quotaType', { quotaType })
      .returning('*')
      .execute();

    if (result.affected === 0) {
      throw new BadRequestProblem({
        detail: `Insufficient used ${quotaType} quota to release`,
      });
    }

    return result.raw[0] as Quota;
  }
}
