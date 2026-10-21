import { MigrationInterface, QueryRunner } from "typeorm";

export class GenerateDb1792612940365 implements MigrationInterface {
    name = 'GenerateDb1792612940365'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TABLE "outbox" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "type" character varying NOT NULL, "aggregate_id" uuid NOT NULL, "aggregate_type" character varying NOT NULL, "payload" jsonb NOT NULL, "published_at" TIMESTAMP WITH TIME ZONE, "attempts" integer NOT NULL, CONSTRAINT "UQ_AGGREGATE" UNIQUE ("aggregate_type", "aggregate_id"), CONSTRAINT "PK_340ab539f309f03bdaa14aa7649" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE INDEX "IDX_ef53db130642f658df4403eea1" ON "outbox"  ("published_at") WHERE published_at IS NULL`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`DROP INDEX "public"."IDX_ef53db130642f658df4403eea1"`);
        await queryRunner.query(`DROP TABLE "outbox"`);
    }

}
