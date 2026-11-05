import type { DeepPartial } from 'typeorm';
import { Quota, QuotaType } from '../../src/entities/quota.js';
import { User } from '../../src/entities/user.js';

export class QuotaBuilder {
  private readonly quota: DeepPartial<Quota>;

  private constructor(user: User) {
    this.quota = {
      user,
      quotaType: QuotaType.Storage,
      maxLimit: 1_024_000,
      used: 0,
    };
  }

  static forUser(user: User) {
    return new QuotaBuilder(user);
  }

  withType(quotaType: QuotaType) {
    this.quota.quotaType = quotaType;
    return this;
  }

  withMaxLimit(maxLimit: number) {
    this.quota.maxLimit = maxLimit;
    return this;
  }

  build(): DeepPartial<Quota> {
    return { ...this.quota };
  }
}
