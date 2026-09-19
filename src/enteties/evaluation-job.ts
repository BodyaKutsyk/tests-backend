import { Column, Entity, JoinColumn, OneToOne } from 'typeorm';
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
  @Column({ enum: EvaluationJobStatus, default: EvaluationJobStatus.Queued })
  status: EvaluationJobStatus;

  @OneToOne(() => Attempt)
  @JoinColumn({ name: 'attempt_id' })
  attempt: Attempt;
}
