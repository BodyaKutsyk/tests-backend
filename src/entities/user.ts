import { Column, Entity, Index, OneToMany, type Relation } from 'typeorm';
import { BaseWithDeleted } from './base.js';
import { Test } from './test.js';
import { Attempt } from './attempt.js';
import { Document } from './document.js';
import { GenerationJob } from './generation-job.js';
import { Quota } from './quota.js';

@Index(['created_at'])
@Entity('users')
export class User extends BaseWithDeleted {
  @Column({ unique: true, type: 'varchar', length: 254 })
  email: string;

  @Column({ type: 'varchar', length: 100 })
  first_name: string;

  @Column({ type: 'varchar', length: 100 })
  last_name: string;

  @Column({ type: 'varchar', length: 150 })
  password_hash: string;

  @OneToMany(() => Test, (test) => test.user)
  tests: Relation<Test[]>;

  @OneToMany(() => Attempt, (attempt) => attempt.user)
  attempts: Relation<Attempt[]>;

  @OneToMany(() => Document, (document) => document.user)
  documents: Relation<Document[]>;

  @OneToMany(() => GenerationJob, (generationJob) => generationJob.user)
  generationJobs: Relation<GenerationJob[]>;

  @OneToMany(() => Quota, (quota) => quota.user)
  quotas: Relation<Quota[]>;
}
