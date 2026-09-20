import { MigrationInterface, QueryRunner } from "typeorm";

export class GenerateDb1789893856012 implements MigrationInterface {
    name = 'GenerateDb1789893856012'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TABLE "documents" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "created_at" TIMESTAMP NOT NULL DEFAULT now(), "updated_at" TIMESTAMP NOT NULL DEFAULT now(), "deleted_at" TIMESTAMP, "storage_key" character varying(512) NOT NULL, "name" character varying(254) NOT NULL, "mime_type" character varying(100) NOT NULL, "size" bigint NOT NULL, "user_id" uuid, "generationJobId" uuid, CONSTRAINT "PK_ac51aa5181ee2036f5ca482857c" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE INDEX "IDX_c7481daf5059307842edef74d7" ON "documents"  ("user_id") `);
        await queryRunner.query(`CREATE INDEX "IDX_bf4703f6ca8d2e8aa1b707c353" ON "documents"  ("created_at", "mime_type") `);
        await queryRunner.query(`INSERT INTO "typeorm_metadata"("database", "schema", "table", "type", "name", "value") VALUES ($1, $2, $3, $4, $5, $6)`, ["my_db","public","tests","GENERATED_COLUMN","searchVector","to_tsvector('simple', name || '')"]);
        await queryRunner.query(`CREATE TABLE "tests" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "created_at" TIMESTAMP NOT NULL DEFAULT now(), "updated_at" TIMESTAMP NOT NULL DEFAULT now(), "deleted_at" TIMESTAMP, "name" character varying(255) NOT NULL, "searchVector" tsvector GENERATED ALWAYS AS (to_tsvector('simple', name || '')) STORED NOT NULL, "user_id" uuid, CONSTRAINT "PK_4301ca51edf839623386860aed2" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE TABLE "evaluation_jobs" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "created_at" TIMESTAMP NOT NULL DEFAULT now(), "updated_at" TIMESTAMP NOT NULL DEFAULT now(), "status" character varying NOT NULL DEFAULT 'queued', "attempt_id" uuid, CONSTRAINT "REL_ed5eedc480674f5054a942b2ad" UNIQUE ("attempt_id"), CONSTRAINT "PK_25d723fd13ed62b277c1166f106" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE TABLE "evaluations" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "created_at" TIMESTAMP NOT NULL DEFAULT now(), "updated_at" TIMESTAMP NOT NULL DEFAULT now(), "explanation" text, "is_correct" boolean NOT NULL DEFAULT false, "evaluation_job_id" uuid, CONSTRAINT "REL_c2677cf34db1b3075f903d91f0" UNIQUE ("evaluation_job_id"), CONSTRAINT "PK_f683b433eba0e6dae7e19b29e29" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE TABLE "responses" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "created_at" TIMESTAMP NOT NULL DEFAULT now(), "updated_at" TIMESTAMP NOT NULL DEFAULT now(), "value" text, "attempt_id" uuid, "evaluationId" uuid, CONSTRAINT "PK_be3bdac59bd243dff421ad7bf70" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE TABLE "attempts" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "created_at" TIMESTAMP NOT NULL DEFAULT now(), "updated_at" TIMESTAMP NOT NULL DEFAULT now(), "score" smallint NOT NULL DEFAULT '0', "user_id" uuid, "test_id" uuid, CONSTRAINT "REL_a5e4bc5034f5ac069defae66d1" UNIQUE ("test_id"), CONSTRAINT "PK_295ca261e361fd2fd217754dcac" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE TABLE "quotas" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "created_at" TIMESTAMP NOT NULL DEFAULT now(), "updated_at" TIMESTAMP NOT NULL DEFAULT now(), "quota_type" character varying NOT NULL, "max_limit" integer NOT NULL, "used" integer NOT NULL DEFAULT '0', "user_id" uuid, CONSTRAINT "PK_5f54877798333ca833245a100d1" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE TABLE "users" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "created_at" TIMESTAMP NOT NULL DEFAULT now(), "updated_at" TIMESTAMP NOT NULL DEFAULT now(), "deleted_at" TIMESTAMP, "email" character varying(254) NOT NULL, "first_name" character varying(100) NOT NULL, "last_name" character varying(100) NOT NULL, "password_hash" character varying(150) NOT NULL, CONSTRAINT "UQ_97672ac88f789774dd47f7c8be3" UNIQUE ("email"), CONSTRAINT "PK_a3ffb1c0c8416b9fc6f907b7433" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE INDEX "IDX_c9b5b525a96ddc2c5647d7f7fa" ON "users"  ("created_at") `);
        await queryRunner.query(`CREATE TABLE "generation_jobs" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "created_at" TIMESTAMP NOT NULL DEFAULT now(), "updated_at" TIMESTAMP NOT NULL DEFAULT now(), "question_type" character varying NOT NULL, "status" character varying NOT NULL DEFAULT 'queued', "question_count" integer NOT NULL, "test_id" uuid, CONSTRAINT "REL_c7f60f9fddb0ab38af5ca4f082" UNIQUE ("test_id"), CONSTRAINT "PK_6b6b705e0fed45c8440c1d7d637" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE TABLE "questions" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "created_at" TIMESTAMP NOT NULL DEFAULT now(), "updated_at" TIMESTAMP NOT NULL DEFAULT now(), "question_type" character varying NOT NULL, "value" text NOT NULL, "test_id" uuid, "answerOptionId" uuid, "responseId" uuid, CONSTRAINT "PK_08a6d4b0f49ff300bf3a0ca60ac" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE TABLE "answer_options" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "created_at" TIMESTAMP NOT NULL DEFAULT now(), "updated_at" TIMESTAMP NOT NULL DEFAULT now(), "value" text NOT NULL, "is_correct" boolean NOT NULL DEFAULT false, "responseId" uuid, CONSTRAINT "PK_6f7aad84d76ce387af24c1231cb" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE TABLE "documents_tests" ("documentsId" uuid NOT NULL, "testsId" uuid NOT NULL, CONSTRAINT "PK_967f2c85573cfb5ee3473eb6fe3" PRIMARY KEY ("documentsId", "testsId"))`);
        await queryRunner.query(`CREATE INDEX "IDX_9fa9260bb1257bf3d18a1141e4" ON "documents_tests"  ("documentsId") `);
        await queryRunner.query(`CREATE INDEX "IDX_6dcae4a31f1414e90b193d12ff" ON "documents_tests"  ("testsId") `);
        await queryRunner.query(`ALTER TABLE "documents" ADD CONSTRAINT "FK_c7481daf5059307842edef74d73" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "documents" ADD CONSTRAINT "FK_6e3c9b2d9881443cbbc7314672d" FOREIGN KEY ("generationJobId") REFERENCES "generation_jobs"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "tests" ADD CONSTRAINT "FK_a6ea3eda960a372cd7b3b18ca71" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "evaluation_jobs" ADD CONSTRAINT "FK_ed5eedc480674f5054a942b2ad5" FOREIGN KEY ("attempt_id") REFERENCES "attempts"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "evaluations" ADD CONSTRAINT "FK_c2677cf34db1b3075f903d91f05" FOREIGN KEY ("evaluation_job_id") REFERENCES "evaluation_jobs"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "responses" ADD CONSTRAINT "FK_5ec8fdb9a6b5d8577b07eaa166f" FOREIGN KEY ("attempt_id") REFERENCES "attempts"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "responses" ADD CONSTRAINT "FK_cf1c4eaf3ec0271b73e68c18a7a" FOREIGN KEY ("evaluationId") REFERENCES "evaluations"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "attempts" ADD CONSTRAINT "FK_1f23e642cf6e009c61cc2c214e2" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "attempts" ADD CONSTRAINT "FK_a5e4bc5034f5ac069defae66d13" FOREIGN KEY ("test_id") REFERENCES "tests"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "quotas" ADD CONSTRAINT "FK_132aa9525c82c5f1c6cae0976c8" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "generation_jobs" ADD CONSTRAINT "FK_c7f60f9fddb0ab38af5ca4f0821" FOREIGN KEY ("test_id") REFERENCES "tests"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "questions" ADD CONSTRAINT "FK_b1f107600ed9ed81aba56edfcea" FOREIGN KEY ("test_id") REFERENCES "tests"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "questions" ADD CONSTRAINT "FK_776976275e78e5b2935f1f976bb" FOREIGN KEY ("answerOptionId") REFERENCES "answer_options"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "questions" ADD CONSTRAINT "FK_aec0cdb418694af6aa5b97492a5" FOREIGN KEY ("responseId") REFERENCES "responses"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "answer_options" ADD CONSTRAINT "FK_e9cb813b02d75ebc734f6d01110" FOREIGN KEY ("responseId") REFERENCES "responses"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "documents_tests" ADD CONSTRAINT "FK_9fa9260bb1257bf3d18a1141e4a" FOREIGN KEY ("documentsId") REFERENCES "documents"("id") ON DELETE CASCADE ON UPDATE CASCADE`);
        await queryRunner.query(`ALTER TABLE "documents_tests" ADD CONSTRAINT "FK_6dcae4a31f1414e90b193d12ff7" FOREIGN KEY ("testsId") REFERENCES "tests"("id") ON DELETE CASCADE ON UPDATE CASCADE`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "documents_tests" DROP CONSTRAINT "FK_6dcae4a31f1414e90b193d12ff7"`);
        await queryRunner.query(`ALTER TABLE "documents_tests" DROP CONSTRAINT "FK_9fa9260bb1257bf3d18a1141e4a"`);
        await queryRunner.query(`ALTER TABLE "answer_options" DROP CONSTRAINT "FK_e9cb813b02d75ebc734f6d01110"`);
        await queryRunner.query(`ALTER TABLE "questions" DROP CONSTRAINT "FK_aec0cdb418694af6aa5b97492a5"`);
        await queryRunner.query(`ALTER TABLE "questions" DROP CONSTRAINT "FK_776976275e78e5b2935f1f976bb"`);
        await queryRunner.query(`ALTER TABLE "questions" DROP CONSTRAINT "FK_b1f107600ed9ed81aba56edfcea"`);
        await queryRunner.query(`ALTER TABLE "generation_jobs" DROP CONSTRAINT "FK_c7f60f9fddb0ab38af5ca4f0821"`);
        await queryRunner.query(`ALTER TABLE "quotas" DROP CONSTRAINT "FK_132aa9525c82c5f1c6cae0976c8"`);
        await queryRunner.query(`ALTER TABLE "attempts" DROP CONSTRAINT "FK_a5e4bc5034f5ac069defae66d13"`);
        await queryRunner.query(`ALTER TABLE "attempts" DROP CONSTRAINT "FK_1f23e642cf6e009c61cc2c214e2"`);
        await queryRunner.query(`ALTER TABLE "responses" DROP CONSTRAINT "FK_cf1c4eaf3ec0271b73e68c18a7a"`);
        await queryRunner.query(`ALTER TABLE "responses" DROP CONSTRAINT "FK_5ec8fdb9a6b5d8577b07eaa166f"`);
        await queryRunner.query(`ALTER TABLE "evaluations" DROP CONSTRAINT "FK_c2677cf34db1b3075f903d91f05"`);
        await queryRunner.query(`ALTER TABLE "evaluation_jobs" DROP CONSTRAINT "FK_ed5eedc480674f5054a942b2ad5"`);
        await queryRunner.query(`ALTER TABLE "tests" DROP CONSTRAINT "FK_a6ea3eda960a372cd7b3b18ca71"`);
        await queryRunner.query(`ALTER TABLE "documents" DROP CONSTRAINT "FK_6e3c9b2d9881443cbbc7314672d"`);
        await queryRunner.query(`ALTER TABLE "documents" DROP CONSTRAINT "FK_c7481daf5059307842edef74d73"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_6dcae4a31f1414e90b193d12ff"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_9fa9260bb1257bf3d18a1141e4"`);
        await queryRunner.query(`DROP TABLE "documents_tests"`);
        await queryRunner.query(`DROP TABLE "answer_options"`);
        await queryRunner.query(`DROP TABLE "questions"`);
        await queryRunner.query(`DROP TABLE "generation_jobs"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_c9b5b525a96ddc2c5647d7f7fa"`);
        await queryRunner.query(`DROP TABLE "users"`);
        await queryRunner.query(`DROP TABLE "quotas"`);
        await queryRunner.query(`DROP TABLE "attempts"`);
        await queryRunner.query(`DROP TABLE "responses"`);
        await queryRunner.query(`DROP TABLE "evaluations"`);
        await queryRunner.query(`DROP TABLE "evaluation_jobs"`);
        await queryRunner.query(`DROP TABLE "tests"`);
        await queryRunner.query(`DELETE FROM "typeorm_metadata" WHERE "type" = $1 AND "name" = $2 AND "database" = $3 AND "schema" = $4 AND "table" = $5`, ["GENERATED_COLUMN","searchVector","my_db","public","tests"]);
        await queryRunner.query(`DROP INDEX "public"."IDX_bf4703f6ca8d2e8aa1b707c353"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_c7481daf5059307842edef74d7"`);
        await queryRunner.query(`DROP TABLE "documents"`);
    }

}
