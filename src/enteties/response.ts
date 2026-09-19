import { Column, Entity, JoinColumn, ManyToOne, OneToMany } from 'typeorm';
import { Base } from './base.js';
import { AnswerOption } from './answer-option.js';
import { Question } from './question.js';
import { Attempt } from './attempt.js';
import { Evaluation } from './evaluation.js';

@Entity('responses')
export class Response extends Base {
  @Column({ type: 'text', nullable: true })
  value: string;

  @OneToMany(() => Question, (question) => question.response)
  @JoinColumn({ name: 'question_id' })
  questions: Question;

  @OneToMany(() => AnswerOption, (answerOption) => answerOption.response, { nullable: true })
  @JoinColumn({ name: 'answer_option_id' })
  answerOption: AnswerOption;

  @ManyToOne(() => Attempt)
  @JoinColumn({ name: 'attempt_id' })
  attempt: Attempt;

  @ManyToOne(() => Evaluation, (evaluation) => evaluation.response)
  evaluation: Evaluation;
}
