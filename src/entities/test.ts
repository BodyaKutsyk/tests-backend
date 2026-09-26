import { BaseWithDeleted } from './base.js';
import {
  Column,
  Entity,
  Index,
  JoinColumn,
  ManyToMany,
  ManyToOne,
  OneToMany,
  OneToOne,
  type Relation,
} from 'typeorm';
import { User } from './user.js';
import { Document } from './document.js';
import { GenerationJob } from './generation-job.js';
import { Attempt } from './attempt.js';

@Entity('tests')
export class Test extends BaseWithDeleted {
  @Column({ type: 'varchar', length: 255 })
  name: string;

  @ManyToOne(() => User, { onDelete: 'RESTRICT', nullable: false })
  @JoinColumn({ name: 'user_id' })
  user: Relation<User>;

  @ManyToMany(() => Document, (document) => document.tests)
  documents: Relation<Document[]>;

  @OneToOne(() => GenerationJob, (generationJob) => generationJob.test)
  generationJob: Relation<GenerationJob>;

  @OneToMany(() => Attempt, (attempt) => attempt.test)
  attempts: Relation<Attempt[]>;

  @Index('idx_tests_search_vector', { synchronize: false })
  @Column({
    type: 'tsvector',
    generatedType: 'STORED',
    asExpression: "to_tsvector('simple', name || '')",
  })
  searchVector: string;
}
