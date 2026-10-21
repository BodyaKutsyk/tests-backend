import { MigrationInterface, QueryRunner } from "typeorm";

export class GenerateDb1791204903718 implements MigrationInterface {
    name = 'GenerateDb1791204903718'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "evaluation_jobs" ADD "processed" integer NOT NULL DEFAULT '0'`);
        await queryRunner.query(`ALTER TABLE "generation_jobs" ADD "processed" integer NOT NULL DEFAULT '0'`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "generation_jobs" DROP COLUMN "processed"`);
        await queryRunner.query(`ALTER TABLE "evaluation_jobs" DROP COLUMN "processed"`);
    }

}
