import { Get, Inject, Injectable } from '@nestjs/common';
import { DataSource } from 'typeorm';

@Injectable()
export class AppService {
  constructor(private readonly dataSource: DataSource) {}
  getHello(): string {
    return 'Hello World!';
  }

  async testDatabase() {
    const result = await this.dataSource.query(
      'SELECT current_timestamp - pg_postmaster_start_time() AS uptime;',
    );

    return result[0];
  }
}
