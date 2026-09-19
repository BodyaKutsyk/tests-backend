import { BaseWithDeleted } from './base.js';
import { Column, Entity, Index, JoinColumn,  ManyToMany, ManyToOne } from 'typeorm';
import { User } from './user.js';
import { Document } from './document.js'


@Entity('tests')
export class Test extends BaseWithDeleted {
  @Column({ type: 'varchar', length: 255 })
  name: string;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'user_id' })
  user: User;

  @ManyToMany(() => Document)
  document: Document;

  @Index('idx_tests_search_vector', { synchronize: false })
  @Column({ type: 'tsvector', generatedType: 'STORED', asExpression: "to_tsvector('simple', name || '')"})
  searchVector: string;
}
