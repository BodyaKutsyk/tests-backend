import { Module } from '@nestjs/common';
import { DbCounterController } from './db-counter.controller.js';

@Module({
  controllers: [DbCounterController],
})
export class DbCounterModule {}
