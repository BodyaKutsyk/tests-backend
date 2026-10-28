import { MigrationInterface, QueryRunner } from "typeorm";

export class GenerateDb1792233183260 implements MigrationInterface {
    name = 'GenerateDb1792233183260'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "tests" RENAME COLUMN "searchVector" TO "search_vector"`);
        await queryRunner.query(`UPDATE "typeorm_metadata" SET "name" = $1 WHERE "type" = $2 AND "name" = $3 AND "database" = $4 AND "schema" = $5 AND "table" = $6`, ["search_vector","GENERATED_COLUMN","searchVector","my_db","public","tests"]);
        await queryRunner.query(`ALTER TABLE "attempts" DROP CONSTRAINT "FK_1f23e642cf6e009c61cc2c214e2"`);
        await queryRunner.query(`ALTER TABLE "attempts" DROP CONSTRAINT "FK_a5e4bc5034f5ac069defae66d13"`);
        await queryRunner.query(`ALTER TABLE "attempts" ALTER COLUMN "user_id" SET NOT NULL`);
        await queryRunner.query(`ALTER TABLE "attempts" ALTER COLUMN "test_id" SET NOT NULL`);
        await queryRunner.query(`ALTER TABLE "answer_options" DROP CONSTRAINT "FK_8162ab2d61e1aa77f41ea951dc9"`);
        await queryRunner.query(`ALTER TABLE "answer_options" ALTER COLUMN "question_id" SET NOT NULL`);
        await queryRunner.query(`ALTER TABLE "attempts" ADD CONSTRAINT "CHK_attempts_score" CHECK ("score" BETWEEN 0 AND 100)`);
        await queryRunner.query(`ALTER TABLE "attempts" ADD CONSTRAINT "FK_1f23e642cf6e009c61cc2c214e2" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "attempts" ADD CONSTRAINT "FK_a5e4bc5034f5ac069defae66d13" FOREIGN KEY ("test_id") REFERENCES "tests"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "answer_options" ADD CONSTRAINT "FK_8162ab2d61e1aa77f41ea951dc9" FOREIGN KEY ("question_id") REFERENCES "questions"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "answer_options" DROP CONSTRAINT "FK_8162ab2d61e1aa77f41ea951dc9"`);
        await queryRunner.query(`ALTER TABLE "attempts" DROP CONSTRAINT "FK_a5e4bc5034f5ac069defae66d13"`);
        await queryRunner.query(`ALTER TABLE "attempts" DROP CONSTRAINT "FK_1f23e642cf6e009c61cc2c214e2"`);
        await queryRunner.query(`ALTER TABLE "attempts" DROP CONSTRAINT "CHK_attempts_score"`);
        await queryRunner.query(`ALTER TABLE "answer_options" ALTER COLUMN "question_id" DROP NOT NULL`);
        await queryRunner.query(`ALTER TABLE "answer_options" ADD CONSTRAINT "FK_8162ab2d61e1aa77f41ea951dc9" FOREIGN KEY ("question_id") REFERENCES "questions"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "attempts" ALTER COLUMN "test_id" DROP NOT NULL`);
        await queryRunner.query(`ALTER TABLE "attempts" ALTER COLUMN "user_id" DROP NOT NULL`);
        await queryRunner.query(`ALTER TABLE "attempts" ADD CONSTRAINT "FK_a5e4bc5034f5ac069defae66d13" FOREIGN KEY ("test_id") REFERENCES "tests"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "attempts" ADD CONSTRAINT "FK_1f23e642cf6e009c61cc2c214e2" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE NO ACTION`);
        await queryRunner.query(`UPDATE "typeorm_metadata" SET "name" = $1 WHERE "type" = $2 AND "name" = $3 AND "database" = $4 AND "schema" = $5 AND "table" = $6`, ["searchVector","GENERATED_COLUMN","search_vector","my_db","public","tests"]);
        await queryRunner.query(`ALTER TABLE "tests" RENAME COLUMN "search_vector" TO "searchVector"`);
    }

}
