import { BaseWithDeleted } from './base.js';
import {
  Column,
  Entity,
  Index,
  JoinColumn,
  JoinTable,
  ManyToMany,
  ManyToOne,
} from 'typeorm';
import { User } from './user.js';
import { Test } from './test.js';
import { GenerationJob } from './generation-job.js';

@Index(['created_at', 'mime_type'])
@Entity('documents')
export class Document extends BaseWithDeleted {
  @Column({ type: 'varchar', length: 512 })
  storage_key: string;

  @Index('idx_document_file_name_length', { synchronize: false })
  @Column({ type: 'varchar', length: 254 })
  name: string;

  @Column({ type: 'varchar', length: 100 })
  mime_type: string;

  @Column({ type: 'bigint' })
  size: string;

  @Index()
  @ManyToOne(() => User)
  @JoinColumn({ name: 'user_id' })
  user: User;

  @ManyToMany(() => Test)
  @JoinTable({ name: 'documents_tests' })
  test: Test;

  @ManyToOne(() => GenerationJob)
  generationJob: GenerationJob;
}
