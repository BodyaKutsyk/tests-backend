import { Column, Entity, PrimaryColumn } from 'typeorm';

@Entity('auth_revoked_access_tokens')
export class RevokedAccessToken {
  @PrimaryColumn('text') jti: string;
  @Column('timestamptz') expiresAt: Date;
}
