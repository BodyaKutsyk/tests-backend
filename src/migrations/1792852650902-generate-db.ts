import { MigrationInterface, QueryRunner } from "typeorm";

export class GenerateDb1792852650902 implements MigrationInterface {
    name = 'GenerateDb1792852650902'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TABLE "inbox" ("message_id" uuid NOT NULL, "consumer" character varying NOT NULL, "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "PK_8902b2c18e35f1ba5a650a69c2f" PRIMARY KEY ("message_id", "consumer"))`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`DROP TABLE "inbox"`);
    }

}
