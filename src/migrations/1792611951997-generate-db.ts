import { MigrationInterface, QueryRunner } from "typeorm";

export class GenerateDb1792611951997 implements MigrationInterface {
    name = 'GenerateDb1792611951997'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "quotas" DROP CONSTRAINT "CHK_e8b93c8a52523f915331561389"`);
        await queryRunner.query(`ALTER TABLE "documents" ADD CONSTRAINT "UQ_c0acf262e5848697810c8e9f732" UNIQUE ("storage_key")`);
        await queryRunner.query(`ALTER TABLE "quotas" ADD CONSTRAINT "CHK_quota_used_range" CHECK ("used" BETWEEN 0 AND "max_limit")`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "quotas" DROP CONSTRAINT "CHK_quota_used_range"`);
        await queryRunner.query(`ALTER TABLE "documents" DROP CONSTRAINT "UQ_c0acf262e5848697810c8e9f732"`);
        await queryRunner.query(`ALTER TABLE "quotas" ADD CONSTRAINT "CHK_e8b93c8a52523f915331561389" CHECK ((used <= max_limit))`);
    }

}
