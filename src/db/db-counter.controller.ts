import {
  Controller,
  Get,
  InternalServerErrorException,
  Post,
} from '@nestjs/common';
import { DataSource } from 'typeorm';
import { InjectDataSource } from '@nestjs/typeorm';
import { QueryLogger } from '../utils/query-logger.js';

@Controller('db-queries')
export class DbCounterController {
  constructor(@InjectDataSource() private readonly dataSource: DataSource) {}

  private get logger() {
    const logger = this.dataSource.logger;
    if (!(logger instanceof QueryLogger)) {
      throw new InternalServerErrorException('QueryLogger is disabled');
    }
    return logger;
  }

  @Post('reset')
  reset() {
    this.logger.resetCount();
    return { reset: true };
  }

  @Get()
  count() {
    return { count: this.logger.getCount() };
  }
}
