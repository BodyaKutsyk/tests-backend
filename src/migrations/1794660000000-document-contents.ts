import { MigrationInterface, QueryRunner } from 'typeorm';

export class DocumentContents1794660000000 implements MigrationInterface {
  name = 'DocumentContents1794660000000';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "document_contents" (
        "id" uuid NOT NULL,
        "version" integer NOT NULL,
        "markdown" text NOT NULL,
        "created_at" timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT "PK_document_contents" PRIMARY KEY ("id"),
        CONSTRAINT "FK_document_contents_document" FOREIGN KEY ("id")
          REFERENCES "documents"("id") ON DELETE CASCADE
      )
    `);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE "document_contents"`);
  }
}
