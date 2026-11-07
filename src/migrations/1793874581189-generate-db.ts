import { MigrationInterface, QueryRunner } from 'typeorm';

export class GenerateDb1793874581189 implements MigrationInterface {
  name = 'GenerateDb1793874581189';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "tests" RENAME COLUMN "searchVector" TO "search_vector"`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "tests" RENAME COLUMN "search_vector" TO "searchVector"`,
    );
  }
}
