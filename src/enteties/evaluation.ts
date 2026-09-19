import { Column, Entity, JoinColumn, OneToMany, OneToOne } from 'typeorm';
import { EvaluationJob } from './evaluation-job.js';
import { Response } from './response.js'

@Entity('evaluations')
export class Evaluation {
  @Column({ type: 'text', nullable: true })
  explanation: string;

  @Column({ type: 'boolean', default: false })
  is_correct: boolean;

  @OneToOne(() => EvaluationJob)
  @JoinColumn({ name: 'evaluation_job_id' })
  evaluationJob: EvaluationJob;

  @OneToMany(() => Response, (response) => response.evaluation)
  @JoinColumn({ name: 'response_id' })
  response: Response;
}
