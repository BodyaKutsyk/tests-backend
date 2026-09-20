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

  @ManyToOne(() => User)
  @JoinColumn({ name: 'user_id' })
  @Index()
  user: Relation<User>;

  @ManyToMany(() => Test)
  @JoinTable({ name: 'documents_tests' })
  tests: Relation<Test[]>;

  @ManyToOne(() => GenerationJob)
  generationJob: Relation<GenerationJob>;
}
