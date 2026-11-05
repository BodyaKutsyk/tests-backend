import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Outbox } from '../entities/outbox.js';
import { OutboxService } from './outbox.service.js';
import { OutboxRelayWorkerService } from './outbox-relay-worker.service.js';
import { RabbitMqService } from '../rabbit-mq/rabbit-mq.service.js';
import { RabbitMqModule } from '../rabbit-mq/rabbit-mq.module.js';

@Module({
  imports: [RabbitMqModule, TypeOrmModule.forFeature([Outbox])],
  providers: [RabbitMqService, OutboxService, OutboxRelayWorkerService],
  exports: [OutboxService],
})
export class OutboxModule {}
