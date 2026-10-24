import { CreateDateColumn, Entity, PrimaryColumn } from 'typeorm';

@Entity()
export class Inbox {
  @PrimaryColumn({ type: 'uuid' })
  messageId: string;
  @PrimaryColumn({ type: 'varchar' })
  consumer: string;
  @CreateDateColumn({ type: 'timestamptz' })
  createdAt: Date;
}
