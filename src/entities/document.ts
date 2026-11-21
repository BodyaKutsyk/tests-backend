import { BaseWithDeleted } from './base.js';
import {
  Column,
  Entity,
  Index,
  JoinColumn,
  JoinTable,
  ManyToMany,
  ManyToOne,
  type Relation,
  Unique,
} from 'typeorm';
import { User } from './user.js';
import { Test } from './test.js';
import { GenerationJob } from './generation-job.js';

export enum DocumentStatus {
  Pending = 'pending',
  Completed = 'completed',
  Failed = 'failed',
}

@Unique('UQ_documents_user_content_md5', ['user', 'contentMd5'])
@Index(['createdAt', 'mimeType'])
@Entity('documents')
export class Document extends BaseWithDeleted {
  @Column({ type: 'varchar', length: 512, unique: true })
  storageKey: string;

  @Index('idx_document_file_name_length', { synchronize: false })
  @Column({ type: 'varchar', length: 254 })
  name: string;

  @Column({ type: 'varchar', length: 100 })
  mimeType: string;

  @Column({
    type: 'bigint',
    transformer: {
      from: (val: string) => Number(val),
      to: (val: number) => val,
    },
  })
  size: number;

  @Column({
    type: 'enum',
    enum: DocumentStatus,
    default: DocumentStatus.Pending,
  })
  status: DocumentStatus;

  @Column({
    type: 'varchar',
    length: 32,
  })
  contentMd5: string;

  @ManyToOne(() => User, { onDelete: 'RESTRICT', nullable: false })
  @JoinColumn({ name: 'user_id' })
  @Index()
  user: Relation<User>;

  @ManyToMany(() => Test, (test) => test.documents, { onDelete: 'CASCADE' })
  @JoinTable({
    name: 'test_documents',
    joinColumn: {
      name: 'document_id',
      referencedColumnName: 'id',
    },
    inverseJoinColumn: {
      name: 'test_id',
      referencedColumnName: 'id',
    },
  })
  tests: Relation<Test[]>;

  @ManyToMany(() => GenerationJob, (generationJob) => generationJob.documents)
  generationJobs: Relation<GenerationJob[]>;
}
