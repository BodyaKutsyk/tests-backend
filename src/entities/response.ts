import {
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  OneToOne,
  type Relation,
} from 'typeorm';
import { Base } from './base.js';
import { AnswerOption } from './answer-option.js';
import { Question } from './question.js';
import { Attempt } from './attempt.js';
import { Evaluation } from './evaluation.js';

@Entity('responses')
export class Response extends Base {
  @Column({ type: 'text', nullable: true })
  value: string;

  @ManyToOne(() => Question, (question) => question.response, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'question_id' })
  questions: Relation<Question>;

  @ManyToOne(() => AnswerOption, (answerOption) => answerOption.response, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'answer_option_id' })
  answerOptions: Relation<AnswerOption[]>;

  @ManyToOne(() => Attempt, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'attempt_id' })
  attempt: Relation<Attempt>;

  @OneToOne(() => Evaluation, (evaluation) => evaluation.response)
  evaluation: Relation<Evaluation>;
}
