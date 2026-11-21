import { MigrationInterface, QueryRunner } from "typeorm";

export class GenerateDb1795285486915 implements MigrationInterface {
    name = 'GenerateDb1795285486915'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "document_contents" DROP CONSTRAINT "FK_document_contents_document"`);
        await queryRunner.query(`CREATE TYPE "public"."documents_status_enum" AS ENUM('pending', 'completed', 'failed')`);
        await queryRunner.query(`ALTER TABLE "documents" ADD "status" "public"."documents_status_enum" NOT NULL DEFAULT 'pending'`);
        await queryRunner.query(`ALTER TABLE "documents" ADD "content_md5" character varying(32) NOT NULL`);
        await queryRunner.query(`CREATE TYPE "public"."documents_upload_type_enum" AS ENUM('single', 'multipart')`);
        await queryRunner.query(`ALTER TABLE "documents" ADD "upload_type" "public"."documents_upload_type_enum" NOT NULL DEFAULT 'single'`);
        await queryRunner.query(`ALTER TABLE "documents" ADD "upload_id" text`);
        await queryRunner.query(`ALTER TABLE "documents" ADD "part_size" integer`);
        await queryRunner.query(`ALTER TABLE "documents" ADD CONSTRAINT "UQ_documents_user_content_md5" UNIQUE ("user_id", "content_md5")`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "documents" DROP CONSTRAINT "UQ_documents_user_content_md5"`);
        await queryRunner.query(`ALTER TABLE "documents" DROP COLUMN "part_size"`);
        await queryRunner.query(`ALTER TABLE "documents" DROP COLUMN "upload_id"`);
        await queryRunner.query(`ALTER TABLE "documents" DROP COLUMN "upload_type"`);
        await queryRunner.query(`DROP TYPE "public"."documents_upload_type_enum"`);
        await queryRunner.query(`ALTER TABLE "documents" DROP COLUMN "content_md5"`);
        await queryRunner.query(`ALTER TABLE "documents" DROP COLUMN "status"`);
        await queryRunner.query(`DROP TYPE "public"."documents_status_enum"`);
        await queryRunner.query(`ALTER TABLE "document_contents" ADD CONSTRAINT "FK_document_contents_document" FOREIGN KEY ("id") REFERENCES "documents"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
    }

}
