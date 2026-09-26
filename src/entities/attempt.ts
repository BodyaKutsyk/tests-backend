import {
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  OneToMany,
  OneToOne,
  type Relation,
} from 'typeorm';
import { Base } from './base.js';
import { User } from './user.js';
import { Test } from './test.js';
import { Response } from './response.js';
import { EvaluationJob } from './evaluation-job.js';
import { Max, Min } from 'class-validator';

@Entity('attempts')
export class Attempt extends Base {
  @ManyToOne(() => User, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'user_id' })
  user: Relation<User>;

  @ManyToOne(() => Test, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'test_id' })
  test: Relation<Test>;

  @Column({ type: 'smallint', default: 0 })
  @Min(0)
  @Max(100)
  score: number;

  @OneToMany(() => Response, (response) => response.attempt)
  responses: Relation<Response[]>;

  @OneToOne(() => EvaluationJob, (evaluationJob) => evaluationJob.attempt)
  evaluationJob: Relation<EvaluationJob>;
}
