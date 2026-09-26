import { MigrationInterface, QueryRunner } from "typeorm";

export class GenerateDb1790412604062 implements MigrationInterface {
    name = 'GenerateDb1790412604062'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TABLE "documents" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "deleted_at" TIMESTAMP WITH TIME ZONE, "storage_key" character varying(512) NOT NULL, "name" character varying(254) NOT NULL, "mime_type" character varying(100) NOT NULL, "size" bigint NOT NULL, "user_id" uuid NOT NULL, CONSTRAINT "PK_ac51aa5181ee2036f5ca482857c" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE INDEX "IDX_c7481daf5059307842edef74d7" ON "documents"  ("user_id") `);
        await queryRunner.query(`CREATE INDEX "IDX_bf4703f6ca8d2e8aa1b707c353" ON "documents"  ("created_at", "mime_type") `);
        await queryRunner.query(`CREATE TYPE "public"."evaluation_jobs_status_enum" AS ENUM('queued', 'evaluating', 'done', 'failed')`);
        await queryRunner.query(`CREATE TABLE "evaluation_jobs" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "status" "public"."evaluation_jobs_status_enum" NOT NULL DEFAULT 'queued', "attempt_id" uuid NOT NULL, CONSTRAINT "REL_ed5eedc480674f5054a942b2ad" UNIQUE ("attempt_id"), CONSTRAINT "PK_25d723fd13ed62b277c1166f106" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE TABLE "evaluations" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "explanation" text, "is_correct" boolean NOT NULL DEFAULT false, "evaluation_job_id" uuid NOT NULL, "response_id" uuid NOT NULL, CONSTRAINT "REL_99e4357de2df3222e21f932d03" UNIQUE ("response_id"), CONSTRAINT "PK_f683b433eba0e6dae7e19b29e29" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE TABLE "responses" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "value" text, "question_id" uuid NOT NULL, "answer_option_id" uuid, "attempt_id" uuid NOT NULL, CONSTRAINT "PK_be3bdac59bd243dff421ad7bf70" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE TABLE "attempts" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "score" smallint NOT NULL DEFAULT '0', "user_id" uuid, "test_id" uuid, CONSTRAINT "PK_295ca261e361fd2fd217754dcac" PRIMARY KEY ("id"))`);
        await queryRunner.query(`INSERT INTO "typeorm_metadata"("database", "schema", "table", "type", "name", "value") VALUES ($1, $2, $3, $4, $5, $6)`, ["my_db","public","tests","GENERATED_COLUMN","searchVector","to_tsvector('simple', name || '')"]);
        await queryRunner.query(`CREATE TABLE "tests" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "deleted_at" TIMESTAMP WITH TIME ZONE, "name" character varying(255) NOT NULL, "searchVector" tsvector GENERATED ALWAYS AS (to_tsvector('simple', name || '')) STORED NOT NULL, "user_id" uuid NOT NULL, CONSTRAINT "PK_4301ca51edf839623386860aed2" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE TYPE "public"."quotas_quota_type_enum" AS ENUM('storage', 'generation')`);
        await queryRunner.query(`CREATE TABLE "quotas" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "quota_type" "public"."quotas_quota_type_enum" NOT NULL, "max_limit" integer NOT NULL, "used" integer NOT NULL DEFAULT '0', "user_id" uuid NOT NULL, CONSTRAINT "PK_5f54877798333ca833245a100d1" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE TABLE "users" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "deleted_at" TIMESTAMP WITH TIME ZONE, "email" character varying(254) NOT NULL, "first_name" character varying(100) NOT NULL, "last_name" character varying(100) NOT NULL, "password_hash" character varying(150) NOT NULL, CONSTRAINT "UQ_97672ac88f789774dd47f7c8be3" UNIQUE ("email"), CONSTRAINT "PK_a3ffb1c0c8416b9fc6f907b7433" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE INDEX "IDX_c9b5b525a96ddc2c5647d7f7fa" ON "users"  ("created_at") `);
        await queryRunner.query(`CREATE TYPE "public"."generation_jobs_question_type_enum" AS ENUM('open-ended', 'multiple-choice')`);
        await queryRunner.query(`CREATE TYPE "public"."generation_jobs_status_enum" AS ENUM('queued', 'parsing', 'generating', 'done', 'failed')`);
        await queryRunner.query(`CREATE TABLE "generation_jobs" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "question_type" "public"."generation_jobs_question_type_enum" NOT NULL, "status" "public"."generation_jobs_status_enum" NOT NULL DEFAULT 'queued', "question_count" integer NOT NULL, "test_id" uuid, "user_id" uuid NOT NULL, CONSTRAINT "REL_c7f60f9fddb0ab38af5ca4f082" UNIQUE ("test_id"), CONSTRAINT "PK_6b6b705e0fed45c8440c1d7d637" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE TYPE "public"."questions_question_type_enum" AS ENUM('open-ended', 'multiple-choice')`);
        await queryRunner.query(`CREATE TABLE "questions" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "question_type" "public"."questions_question_type_enum" NOT NULL, "value" text NOT NULL, "test_id" uuid NOT NULL, CONSTRAINT "PK_08a6d4b0f49ff300bf3a0ca60ac" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE TABLE "answer_options" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "value" text NOT NULL, "is_correct" boolean NOT NULL DEFAULT false, "question_id" uuid, CONSTRAINT "PK_6f7aad84d76ce387af24c1231cb" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE TABLE "test_documents" ("document_id" uuid NOT NULL, "test_id" uuid NOT NULL, CONSTRAINT "PK_fb60a21017bfead28aa1aba8f9c" PRIMARY KEY ("document_id", "test_id"))`);
        await queryRunner.query(`CREATE INDEX "IDX_0c905ce2d8e04a51b34a9ca31d" ON "test_documents"  ("document_id") `);
        await queryRunner.query(`CREATE INDEX "IDX_dfc97d7bfdfd194ff0dd614b5e" ON "test_documents"  ("test_id") `);
        await queryRunner.query(`CREATE TABLE "generation_job_documents" ("generation_job_id" uuid NOT NULL, "document_id" uuid NOT NULL, CONSTRAINT "PK_562b7c2257dc81dee488f6100c8" PRIMARY KEY ("generation_job_id", "document_id"))`);
        await queryRunner.query(`CREATE INDEX "IDX_b2f794c533ebd00d5c06cb2df4" ON "generation_job_documents"  ("generation_job_id") `);
        await queryRunner.query(`CREATE INDEX "IDX_12c3d2fad923a75427a4e0d9d5" ON "generation_job_documents"  ("document_id") `);
        await queryRunner.query(`ALTER TABLE "documents" ADD CONSTRAINT "FK_c7481daf5059307842edef74d73" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "evaluation_jobs" ADD CONSTRAINT "FK_ed5eedc480674f5054a942b2ad5" FOREIGN KEY ("attempt_id") REFERENCES "attempts"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "evaluations" ADD CONSTRAINT "FK_c2677cf34db1b3075f903d91f05" FOREIGN KEY ("evaluation_job_id") REFERENCES "evaluation_jobs"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "evaluations" ADD CONSTRAINT "FK_99e4357de2df3222e21f932d031" FOREIGN KEY ("response_id") REFERENCES "responses"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "responses" ADD CONSTRAINT "FK_2e0ddaf5cd2cf79e66c77b1e8b6" FOREIGN KEY ("question_id") REFERENCES "questions"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "responses" ADD CONSTRAINT "FK_31575c6925f9a829ff488a6da8b" FOREIGN KEY ("answer_option_id") REFERENCES "answer_options"("id") ON DELETE SET NULL ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "responses" ADD CONSTRAINT "FK_5ec8fdb9a6b5d8577b07eaa166f" FOREIGN KEY ("attempt_id") REFERENCES "attempts"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "attempts" ADD CONSTRAINT "FK_1f23e642cf6e009c61cc2c214e2" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "attempts" ADD CONSTRAINT "FK_a5e4bc5034f5ac069defae66d13" FOREIGN KEY ("test_id") REFERENCES "tests"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "tests" ADD CONSTRAINT "FK_a6ea3eda960a372cd7b3b18ca71" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "quotas" ADD CONSTRAINT "FK_132aa9525c82c5f1c6cae0976c8" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "generation_jobs" ADD CONSTRAINT "FK_c7f60f9fddb0ab38af5ca4f0821" FOREIGN KEY ("test_id") REFERENCES "tests"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "generation_jobs" ADD CONSTRAINT "FK_8424bd6b7d07ccd149c75fc0bc7" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "questions" ADD CONSTRAINT "FK_b1f107600ed9ed81aba56edfcea" FOREIGN KEY ("test_id") REFERENCES "tests"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "answer_options" ADD CONSTRAINT "FK_8162ab2d61e1aa77f41ea951dc9" FOREIGN KEY ("question_id") REFERENCES "questions"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "test_documents" ADD CONSTRAINT "FK_0c905ce2d8e04a51b34a9ca31df" FOREIGN KEY ("document_id") REFERENCES "documents"("id") ON DELETE CASCADE ON UPDATE CASCADE`);
        await queryRunner.query(`ALTER TABLE "test_documents" ADD CONSTRAINT "FK_dfc97d7bfdfd194ff0dd614b5e7" FOREIGN KEY ("test_id") REFERENCES "tests"("id") ON DELETE CASCADE ON UPDATE CASCADE`);
        await queryRunner.query(`ALTER TABLE "generation_job_documents" ADD CONSTRAINT "FK_b2f794c533ebd00d5c06cb2df4b" FOREIGN KEY ("generation_job_id") REFERENCES "generation_jobs"("id") ON DELETE CASCADE ON UPDATE CASCADE`);
        await queryRunner.query(`ALTER TABLE "generation_job_documents" ADD CONSTRAINT "FK_12c3d2fad923a75427a4e0d9d54" FOREIGN KEY ("document_id") REFERENCES "documents"("id") ON DELETE CASCADE ON UPDATE CASCADE`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "generation_job_documents" DROP CONSTRAINT "FK_12c3d2fad923a75427a4e0d9d54"`);
        await queryRunner.query(`ALTER TABLE "generation_job_documents" DROP CONSTRAINT "FK_b2f794c533ebd00d5c06cb2df4b"`);
        await queryRunner.query(`ALTER TABLE "test_documents" DROP CONSTRAINT "FK_dfc97d7bfdfd194ff0dd614b5e7"`);
        await queryRunner.query(`ALTER TABLE "test_documents" DROP CONSTRAINT "FK_0c905ce2d8e04a51b34a9ca31df"`);
        await queryRunner.query(`ALTER TABLE "answer_options" DROP CONSTRAINT "FK_8162ab2d61e1aa77f41ea951dc9"`);
        await queryRunner.query(`ALTER TABLE "questions" DROP CONSTRAINT "FK_b1f107600ed9ed81aba56edfcea"`);
        await queryRunner.query(`ALTER TABLE "generation_jobs" DROP CONSTRAINT "FK_8424bd6b7d07ccd149c75fc0bc7"`);
        await queryRunner.query(`ALTER TABLE "generation_jobs" DROP CONSTRAINT "FK_c7f60f9fddb0ab38af5ca4f0821"`);
        await queryRunner.query(`ALTER TABLE "quotas" DROP CONSTRAINT "FK_132aa9525c82c5f1c6cae0976c8"`);
        await queryRunner.query(`ALTER TABLE "tests" DROP CONSTRAINT "FK_a6ea3eda960a372cd7b3b18ca71"`);
        await queryRunner.query(`ALTER TABLE "attempts" DROP CONSTRAINT "FK_a5e4bc5034f5ac069defae66d13"`);
        await queryRunner.query(`ALTER TABLE "attempts" DROP CONSTRAINT "FK_1f23e642cf6e009c61cc2c214e2"`);
        await queryRunner.query(`ALTER TABLE "responses" DROP CONSTRAINT "FK_5ec8fdb9a6b5d8577b07eaa166f"`);
        await queryRunner.query(`ALTER TABLE "responses" DROP CONSTRAINT "FK_31575c6925f9a829ff488a6da8b"`);
        await queryRunner.query(`ALTER TABLE "responses" DROP CONSTRAINT "FK_2e0ddaf5cd2cf79e66c77b1e8b6"`);
        await queryRunner.query(`ALTER TABLE "evaluations" DROP CONSTRAINT "FK_99e4357de2df3222e21f932d031"`);
        await queryRunner.query(`ALTER TABLE "evaluations" DROP CONSTRAINT "FK_c2677cf34db1b3075f903d91f05"`);
        await queryRunner.query(`ALTER TABLE "evaluation_jobs" DROP CONSTRAINT "FK_ed5eedc480674f5054a942b2ad5"`);
        await queryRunner.query(`ALTER TABLE "documents" DROP CONSTRAINT "FK_c7481daf5059307842edef74d73"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_12c3d2fad923a75427a4e0d9d5"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_b2f794c533ebd00d5c06cb2df4"`);
        await queryRunner.query(`DROP TABLE "generation_job_documents"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_dfc97d7bfdfd194ff0dd614b5e"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_0c905ce2d8e04a51b34a9ca31d"`);
        await queryRunner.query(`DROP TABLE "test_documents"`);
        await queryRunner.query(`DROP TABLE "answer_options"`);
        await queryRunner.query(`DROP TABLE "questions"`);
        await queryRunner.query(`DROP TYPE "public"."questions_question_type_enum"`);
        await queryRunner.query(`DROP TABLE "generation_jobs"`);
        await queryRunner.query(`DROP TYPE "public"."generation_jobs_status_enum"`);
        await queryRunner.query(`DROP TYPE "public"."generation_jobs_question_type_enum"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_c9b5b525a96ddc2c5647d7f7fa"`);
        await queryRunner.query(`DROP TABLE "users"`);
        await queryRunner.query(`DROP TABLE "quotas"`);
        await queryRunner.query(`DROP TYPE "public"."quotas_quota_type_enum"`);
        await queryRunner.query(`DROP TABLE "tests"`);
        await queryRunner.query(`DELETE FROM "typeorm_metadata" WHERE "type" = $1 AND "name" = $2 AND "database" = $3 AND "schema" = $4 AND "table" = $5`, ["GENERATED_COLUMN","searchVector","my_db","public","tests"]);
        await queryRunner.query(`DROP TABLE "attempts"`);
        await queryRunner.query(`DROP TABLE "responses"`);
        await queryRunner.query(`DROP TABLE "evaluations"`);
        await queryRunner.query(`DROP TABLE "evaluation_jobs"`);
        await queryRunner.query(`DROP TYPE "public"."evaluation_jobs_status_enum"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_bf4703f6ca8d2e8aa1b707c353"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_c7481daf5059307842edef74d7"`);
        await queryRunner.query(`DROP TABLE "documents"`);
    }

}
