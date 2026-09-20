import { Column, Entity, JoinColumn, OneToMany, OneToOne, type Relation } from 'typeorm';
import { Base } from './base.js';
import { User } from './user.js';
import { Test } from './test.js';
import { Document } from './document.js';

// TODO: place to the domain-owned type
export enum QuestionType {
  OpenEnded = 'open-ended',
  MultipleChoice = 'multiple-choice'
}

enum JobStatus {
  Queued = 'queued',
  Parsing = 'parsing',
  Generating = 'generating',
  Done = 'done',
  Failed = 'failed',
}

@Entity('generation_jobs')
export class GenerationJob extends Base {
  @Column({ enum: QuestionType })
  question_type: QuestionType;

  @Column({ enum: JobStatus, default: JobStatus.Queued })
  status: JobStatus;

  @Column({ type: 'int' })
  question_count: number;

  @OneToOne(() => Test, { nullable: true })
  @JoinColumn({ name: 'test_id' })
  test: Relation<Test>;

  @OneToMany(() => User, (user) => user.generationJobs)
  @JoinColumn({ name: 'user_id' })
  users: Relation<User[]>;

  @OneToMany(() => Document, (document) => document.generationJob)
  documents: Relation<Document[]>;
}
