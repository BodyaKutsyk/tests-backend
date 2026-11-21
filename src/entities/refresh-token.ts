import { Column, Entity, Index, PrimaryColumn } from 'typeorm';

@Entity('auth_refresh_tokens')
@Index('idx_auth_refresh_tokens_family', ['familyId'])
export class RefreshToken {
  @PrimaryColumn('varchar', { length: 64 })
  tokenHash: string;

  @Column('text')
  familyId: string;

  @Column('uuid')
  userId: string;

  @Column('timestamptz')
  createdAt: Date;

  @Column('timestamptz')
  expiresAt: Date;

  @Column('timestamptz')
  familyExpiresAt: Date;

  @Column('timestamptz', { nullable: true })
  usedAt: Date | null;

  @Column('jsonb', { nullable: true })
  claims: Record<string, unknown> | null;
}
