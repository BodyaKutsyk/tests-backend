import { Column, Entity, JoinColumn, ManyToOne, OneToMany } from 'typeorm';
import { Base } from './base.js';
import { Question } from './question.js';
import { Response } from './response.js'

@Entity('answer_options')
export class AnswerOption extends Base {
  @Column({ type: 'text' })
  value: string;

  @Column({ type: 'boolean', default: false })
  is_correct: boolean;

  @OneToMany(() => Question, (question) => question.answer_option)
  @JoinColumn({ name: 'question_id' })
  question: Question;

  @ManyToOne(() => Response, (response) => response.answerOption)
  response: Response;
}
