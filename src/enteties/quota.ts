import { Column, Entity, JoinColumn, ManyToOne } from 'typeorm';
import { Base } from './base.js';
import { User } from './user.js';

// TODO: place to the domain-owned type
enum QuotaType {
  Storage = 'storage',
  Generation = 'generation',
}

@Entity('quotas')
export class Quota extends Base {
  @Column({ enum: QuotaType })
  quota_type: QuotaType

  @Column({ type: 'int' })
  max_limit: number;

  @Column({ type: 'int', default: 0 })
  used: number;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'user_id' })
  user: User;
}

