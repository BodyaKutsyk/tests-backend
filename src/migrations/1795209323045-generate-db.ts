import { MigrationInterface, QueryRunner } from "typeorm";

export class GenerateDb1795209323045 implements MigrationInterface {
    name = 'GenerateDb1795209323045'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "document_contents" DROP CONSTRAINT "FK_document_contents_document"`);
        await queryRunner.query(`CREATE TYPE "public"."documents_status_enum" AS ENUM('pending', 'completed', 'failed')`);
        await queryRunner.query(`ALTER TABLE "documents" ADD "status" "public"."documents_status_enum" NOT NULL DEFAULT 'pending'`);
        await queryRunner.query(`ALTER TABLE "documents" ADD "content_md5" character varying(32) NOT NULL`);
        await queryRunner.query(`ALTER TABLE "documents" ADD CONSTRAINT "UQ_documents_user_content_md5" UNIQUE ("user_id", "content_md5")`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "documents" DROP CONSTRAINT "UQ_documents_user_content_md5"`);
        await queryRunner.query(`ALTER TABLE "documents" DROP COLUMN "content_md5"`);
        await queryRunner.query(`ALTER TABLE "documents" DROP COLUMN "status"`);
        await queryRunner.query(`DROP TYPE "public"."documents_status_enum"`);
        await queryRunner.query(`ALTER TABLE "document_contents" ADD CONSTRAINT "FK_document_contents_document" FOREIGN KEY ("id") REFERENCES "documents"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
    }

}
