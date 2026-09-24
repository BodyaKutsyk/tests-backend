import { Column, Entity, JoinColumn, OneToOne, type Relation } from 'typeorm';
import { Base } from './base.js';
import { Attempt } from './attempt.js';

// TODO: place to the domain-owned type
enum EvaluationJobStatus {
  Queued = 'queued',
  Evaluating = 'evaluating',
  Done = 'done',
  Failed = 'failed',
}

@Entity('evaluation_jobs')
export class EvaluationJob extends Base {
  @Column({ type: 'enum', enum: EvaluationJobStatus, default: EvaluationJobStatus.Queued })
  status: EvaluationJobStatus;

  @OneToOne(() => Attempt, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'attempt_id' })
  attempt: Relation<Attempt>;
}
