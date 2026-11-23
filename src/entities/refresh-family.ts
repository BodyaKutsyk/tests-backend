import { Column, Entity, Index, PrimaryColumn } from 'typeorm';

@Entity('auth_refresh_families')
@Index('idx_auth_refresh_families_user', ['userId'])
export class RefreshFamily {
  @PrimaryColumn('text')
  id: string;

  @Column('uuid')
  userId: string;

  @Column('text', { unique: true })
  sid: string;

  @Column('timestamptz')
  expiresAt: Date;

  @Column('timestamptz', { default: () => 'now()' })
  lastActiveAt: Date;

  @Column('timestamptz', { nullable: true })
  revokedAt: Date | null;
}
