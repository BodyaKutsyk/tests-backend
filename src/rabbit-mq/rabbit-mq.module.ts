import { Module } from '@nestjs/common';
import { RabbitMqService } from './rabbit-mq.service.js';

@Module({
  exports: [RabbitMqService],
  providers: [RabbitMqService],
})
export class RabbitMqModule {}
