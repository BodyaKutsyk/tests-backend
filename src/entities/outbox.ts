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
export class Outbox extends Base {
  // used for routing-key persisting
  @Column({ type: 'varchar' })
  type: string;

  @Column({ type: 'uuid' })
  aggregateId: string;

  // service name
  @Column({ type: 'varchar' })
  aggregateType: string;

  @Column({ type: 'varchar' })
  exchange: string;

  @Column({ type: 'jsonb' })
  payload: object;

  @Column({ type: 'timestamptz', nullable: true })
  publishedAt: Date | null = null;

  @Column({ type: 'int', default: 0 })
  attempts: number;
}
