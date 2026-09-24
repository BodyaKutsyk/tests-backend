import {
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  OneToMany,
  type Relation,
} from 'typeorm';
import { Base } from './base.js';
import { Question } from './question.js';
import { Response } from './response.js';

@Entity('answer_options')
export class AnswerOption extends Base {
  @Column({ type: 'text' })
  value: string;

  @Column({ type: 'boolean', default: false })
  is_correct: boolean;

  @ManyToOne(() => Question, (question) => question.answerOptions, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'question_id' })
  question: Relation<Question>;

  @OneToMany(() => Response, (response) => response.answerOption)
  responses: Relation<Response[]>;
}
