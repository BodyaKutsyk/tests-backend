import { type MigrationInterface, type QueryRunner } from 'typeorm';

export class RevokedAccessTokens1795030000001 implements MigrationInterface {
  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      'CREATE TABLE auth_revoked_access_tokens (jti text PRIMARY KEY, expires_at timestamptz NOT NULL)',
    );
    await queryRunner.query(
      'CREATE INDEX idx_auth_revoked_access_expires ON auth_revoked_access_tokens (expires_at)',
    );
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('DROP TABLE auth_revoked_access_tokens');
  }
}
