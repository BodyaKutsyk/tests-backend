import {
  Column,
  Entity,
  JoinColumn,
  JoinTable,
  ManyToMany,
  ManyToOne,
  OneToMany,
  OneToOne,
  type Relation,
} from 'typeorm';
import { Base } from './base.js';
import { User } from './user.js';
import { Test } from './test.js';
import { Document } from './document.js';

// TODO: place to the domain-owned type
export enum QuestionType {
  OpenEnded = 'open-ended',
  MultipleChoice = 'multiple-choice',
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
  @Column({ enum: QuestionType, type: 'enum' })
  question_type: QuestionType;

  @Column({ type: 'enum', enum: JobStatus, default: JobStatus.Queued })
  status: JobStatus;

  @Column({ type: 'int' })
  question_count: number;

  @OneToOne(() => Test, (test) => test.generationJob, {
    nullable: true,
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'test_id' })
  test: Relation<Test | null>;

  @ManyToOne(() => User, (user) => user.generationJobs, {
    onDelete: 'RESTRICT',
  })
  @JoinColumn({ name: 'user_id' })
  user: Relation<User>;

  @ManyToMany(() => Document, (document) => document.generationJobs)
  @JoinTable({
    name: 'generation_job_documents',
    joinColumn: {
      name: 'generation_job_id',
      referencedColumnName: 'id',
    },
    inverseJoinColumn: {
      name: 'document_id',
      referencedColumnName: 'id',
    },
  })
  documents: Relation<Document[]>;
}
