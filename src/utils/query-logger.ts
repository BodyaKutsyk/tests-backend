import { Logger, QueryRunner } from 'typeorm';

export class QueryLogger implements Logger {
  private count = 0;
  logQuery(query: string, parameters?: any[], queryRunner?: QueryRunner) {
    this.count++;
    console.log(`Count: ${this.count} Executing: ${query}`);
  }
  getCount() {
    return this.count;
  }

  resetCount() {
    this.count = 0;
  }
  logQueryError(
    error: string,
    query: string,
    parameters?: any[],
    queryRunner?: QueryRunner,
  ) {}
  logQuerySlow(
    time: number,
    query: string,
    parameters?: any[],
    queryRunner?: QueryRunner,
  ) {}
  logSchemaBuild(message: string, queryRunner?: QueryRunner) {}
  logMigration(message: string, queryRunner?: QueryRunner) {}
  log(
    level: 'log' | 'info' | 'warn',
    message: any,
    queryRunner?: QueryRunner,
  ) {}
}
