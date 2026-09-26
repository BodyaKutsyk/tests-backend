import {
  Column,
  Entity,
  JoinColumn,
  OneToMany,
  OneToOne,
  type Relation,
} from 'typeorm';
import { Base } from './base.js';
import { Attempt } from './attempt.js';
import { Evaluation } from './evaluation.js';

// TODO: place to the domain-owned type
enum EvaluationJobStatus {
  Queued = 'queued',
  Evaluating = 'evaluating',
  Done = 'done',
  Failed = 'failed',
}

@Entity('evaluation_jobs')
export class EvaluationJob extends Base {
  @Column({
    type: 'enum',
    enum: EvaluationJobStatus,
    default: EvaluationJobStatus.Queued,
  })
  status: EvaluationJobStatus;

  @OneToMany(() => Evaluation, (evaluation) => evaluation.evaluationJob)
  evaluations: Relation<Evaluation[]>;

  @OneToOne(() => Attempt, (attempt) => attempt.evaluationJob, {
    onDelete: 'CASCADE',
    nullable: false,
  })
  @JoinColumn({ name: 'attempt_id' })
  attempt: Relation<Attempt>;
}
