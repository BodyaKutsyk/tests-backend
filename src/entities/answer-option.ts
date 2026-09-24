import {
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  type Relation,
} from 'typeorm';
import { Base } from './base.js';
import { Question } from './question.js';
import { Response } from './response.js'

@Entity('answer_options')
export class AnswerOption extends Base {
  @Column({ type: 'text' })
  value: string;

  @Column({ type: 'boolean', default: false })
  is_correct: boolean;

  @ManyToOne(() => Question, (question) => question.answer_option, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'question_id' })
  questions: Relation<Question[]>;

  @ManyToOne(() => Response, (response) => response.answerOptions)
  response: Relation<Response>;
}
