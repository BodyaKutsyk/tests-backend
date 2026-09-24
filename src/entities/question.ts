import { Base } from './base.js';
import { Entity, Column, ManyToOne, OneToMany, JoinColumn, type Relation } from 'typeorm';
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

  @ManyToOne(() => Test, { onDelete: "CASCADE" })
  @JoinColumn({ name: 'test_id' })
  test: Test;

  @OneToMany(() => AnswerOption, (answerOption => answerOption.questions))
  answer_option: Relation<AnswerOption[]>;

  @OneToMany(() => Response, (response) => response.questions)
  response: Relation<Response>;
}
