import { Column, Entity, Index, OneToMany, type Relation } from 'typeorm';
import { BaseWithDeleted } from './base.js';
import { Test } from './test.js';
import { Attempt } from './attempt.js';
import { Document } from './document.js';
import { GenerationJob } from './generation-job.js';
import { Quota } from './quota.js';

export enum Role {
  Customer = 'customer',
  Admin = 'admin',
}

@Index(['createdAt'])
@Entity('users')
export class User extends BaseWithDeleted {
  @Column({ unique: true, type: 'varchar', length: 254 })
  email: string;

  @Column({ type: 'varchar', length: 100, nullable: true })
  firstName: string;

  @Column({ type: 'varchar', length: 100, nullable: true })
  lastName: string;

  @Column({ type: 'varchar', length: 150, select: false })
  passwordHash: string;

  @Column({ type: 'enum', default: Role.Customer, enum: Role })
  role: Role;

  @OneToMany(() => Test, (test) => test.user)
  tests: Relation<Test[]>;

  @OneToMany(() => Attempt, (attempt) => attempt.user)
  attempts: Relation<Attempt[]>;

  @OneToMany(() => Document, (document) => document.user, {
    cascade: ['insert'],
  })
  documents: Relation<Document[]>;

  @OneToMany(() => GenerationJob, (generationJob) => generationJob.user)
  generationJobs: Relation<GenerationJob[]>;

  @OneToMany(() => Quota, (quota) => quota.user, { cascade: ['insert'] })
  quotas: Relation<Quota[]>;
}
