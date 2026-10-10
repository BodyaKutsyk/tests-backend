import {
  Check,
  Column,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  type Relation,
} from 'typeorm';
import { Base } from './base.js';
import { User } from './user.js';

// TODO: place to the domain-owned type
export enum QuotaType {
  Storage = 'storage',
  Generation = 'generation',
}

@Check(`"used" <= "max_limit"`)
@Index(['user', 'quotaType'], { unique: true })
@Entity('quotas')
export class Quota extends Base {
  @Column({ type: 'enum', enum: QuotaType })
  quotaType: QuotaType;

  @Column({
    type: 'bigint',
    transformer: {
      from: (val: string) => Number(val),
      to: (val: number) => val,
    },
  })
  maxLimit: number;

  @Column({
    type: 'bigint',
    default: '0',
    transformer: {
      from: (val: string) => Number(val),
      to: (val: number) => val,
    },
  })
  used: number;

  @ManyToOne(() => User, { onDelete: 'RESTRICT', nullable: false })
  @JoinColumn({ name: 'user_id' })
  user: Relation<User>;
}
