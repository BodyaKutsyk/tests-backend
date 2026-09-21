import { Base } from './base.js';
import { Entity, Column, ManyToOne, JoinColumn, type Relation } from 'typeorm';
import { QuestionType } from './generation-job.js';
import { Test } from './test.js';
import { AnswerOption } from './answer-option.js';
import { Response } from './response.js'

@Entity('questions')
export class Question extends Base {
  @Column({ type: 'enum', enum: QuestionType })
  question_type: QuestionType;

  @Column({ type: 'text' })
  value: string;

  @ManyToOne(() => Test)
  @JoinColumn({ name: 'test_id' })
  test: Test;

  @ManyToOne(() => AnswerOption, (answerOption => answerOption.questions))
  answer_option: Relation<AnswerOption>;

  @ManyToOne(() => Response, (response) => response.questions)
  response: Relation<Response>;
}
