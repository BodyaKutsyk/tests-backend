import { MigrationInterface, QueryRunner } from 'typeorm';

export class GenerationCheckpoint1794800000000 implements MigrationInterface {
  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      'ALTER TABLE "generation_jobs" ADD "generation_checkpoint" jsonb',
    );
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      'ALTER TABLE "generation_jobs" DROP COLUMN "generation_checkpoint"',
    );
  }
}
