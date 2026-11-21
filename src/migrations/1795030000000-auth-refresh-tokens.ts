import { type MigrationInterface, type QueryRunner } from 'typeorm';

export class AuthRefreshTokens1795030000000 implements MigrationInterface {
  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TABLE auth_refresh_families (id text PRIMARY KEY, user_id uuid NOT NULL REFERENCES users(id), sid text NOT NULL UNIQUE, expires_at timestamptz NOT NULL, last_active_at timestamptz NOT NULL DEFAULT now(), revoked_at timestamptz)`,
    );
    await queryRunner.query(
      `CREATE INDEX idx_auth_refresh_families_user ON auth_refresh_families (user_id)`,
    );
    await queryRunner.query(
      `CREATE TABLE auth_refresh_tokens (token_hash varchar(64) PRIMARY KEY, family_id text NOT NULL REFERENCES auth_refresh_families(id) ON DELETE CASCADE, user_id uuid NOT NULL REFERENCES users(id), created_at timestamptz NOT NULL, expires_at timestamptz NOT NULL, family_expires_at timestamptz NOT NULL, used_at timestamptz, claims jsonb)`,
    );
    await queryRunner.query(
      `CREATE INDEX idx_auth_refresh_tokens_family ON auth_refresh_tokens (family_id)`,
    );
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('DROP TABLE auth_refresh_tokens');
    await queryRunner.query('DROP TABLE auth_refresh_families');
  }
}
