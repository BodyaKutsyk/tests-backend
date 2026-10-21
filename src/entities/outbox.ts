import {
  BeforeInsert,
  Column,
  Entity,
  Index,
  Unique,
  VersionColumn,
} from 'typeorm';
import { Base } from './base.js';

@Entity('outbox')
@Index(['publishedAt'], { where: 'published_at IS NULL' })
@Unique('UQ_AGGREGATE', ['aggregateType', 'aggregateId'])
export class Outbox extends Base {
  @Column({ type: 'varchar' })
  type: string;

  @Column({ type: 'uuid' })
  aggregateId: string;

  @Column({ type: 'varchar' })
  aggregateType: string;

  @Column({ type: 'jsonb' })
  payload: string;

  @Column({ type: 'timestamptz', nullable: true })
  publishedAt: Date | null;

  @VersionColumn()
  attempts: number;

  @BeforeInsert()
  initializeAttempts() {
    this.attempts = 0;
  }
}
