import {
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  OneToOne,
  type Relation,
} from 'typeorm';
import { EvaluationJob } from './evaluation-job.js';
import { Response } from './response.js';
import { Base } from './base.js';

@Entity('evaluations')
export class Evaluation extends Base {
  @Column({ type: 'text', nullable: true })
  explanation: string | null;

  @Column({ type: 'boolean', default: false })
  is_correct: boolean;

  @ManyToOne(() => EvaluationJob, { onDelete: 'CASCADE', nullable: false })
  @JoinColumn({ name: 'evaluation_job_id' })
  evaluationJob: Relation<EvaluationJob>;

  @OneToOne(() => Response, (response) => response.evaluation, {
    onDelete: 'CASCADE',
    nullable: false,
  })
  @JoinColumn({ name: 'response_id' })
  response: Relation<Response>;
}
