import { MigrationInterface, QueryRunner } from 'typeorm';

export class GenerateDb1794756752523 implements MigrationInterface {
  name = 'GenerateDb1794756752523';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TYPE "public"."generation_jobs_status_enum" RENAME TO "generation_jobs_status_enum_old"`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."generation_jobs_status_enum" AS ENUM('queued', 'generated', 'done', 'failed')`,
    );
    await queryRunner.query(
      `ALTER TABLE "generation_jobs" ALTER COLUMN "status" DROP DEFAULT`,
    );
    await queryRunner.query(
      `ALTER TABLE "generation_jobs" ALTER COLUMN "status" TYPE "public"."generation_jobs_status_enum" USING "status"::"text"::"public"."generation_jobs_status_enum"`,
    );
    await queryRunner.query(
      `ALTER TABLE "generation_jobs" ALTER COLUMN "status" SET DEFAULT 'queued'`,
    );
    await queryRunner.query(
      `DROP TYPE "public"."generation_jobs_status_enum_old"`,
    );
    await queryRunner.query(
      `ALTER TABLE "document_contents" ADD CONSTRAINT "FK_df836cc733bff6e502c32f984fa" FOREIGN KEY ("id") REFERENCES "documents"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TYPE "public"."generation_jobs_status_enum_old" AS ENUM('queued', 'parsing', 'generating', 'done', 'failed')`,
    );
    await queryRunner.query(
      `ALTER TABLE "generation_jobs" ALTER COLUMN "status" DROP DEFAULT`,
    );
    await queryRunner.query(
      `ALTER TABLE "generation_jobs" ALTER COLUMN "status" TYPE "public"."generation_jobs_status_enum_old" USING "status"::"text"::"public"."generation_jobs_status_enum_old"`,
    );
    await queryRunner.query(
      `ALTER TABLE "generation_jobs" ALTER COLUMN "status" SET DEFAULT 'queued'`,
    );
    await queryRunner.query(`DROP TYPE "public"."generation_jobs_status_enum"`);
    await queryRunner.query(
      `ALTER TYPE "public"."generation_jobs_status_enum_old" RENAME TO "generation_jobs_status_enum"`,
    );
    await queryRunner.query(
      `ALTER TABLE "document_contents" ADD CONSTRAINT "FK_document_contents_document" FOREIGN KEY ("id") REFERENCES "documents"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
  }
}
