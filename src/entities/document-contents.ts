import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryColumn,
} from 'typeorm';
import { Document } from './document.js';

@Entity('document_contents')
export class DocumentContents {
  @PrimaryColumn('uuid')
  id: string;

  @Column({ type: 'int' })
  version: number;

  @ManyToOne(() => Document, { onDelete: 'CASCADE', nullable: false })
  @JoinColumn({
    name: 'id',
    referencedColumnName: 'id',
  })
  document: Document;

  @Column({ type: 'text' })
  markdown: string;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt: Date;
}
