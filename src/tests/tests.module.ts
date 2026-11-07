import { Module } from '@nestjs/common';
import { TestsService } from './tests.service.js';
import { TestsController } from './tests.controller.js';
import { TypeOrmModule } from '@nestjs/typeorm';
import { GenerationJob } from '../entities/generation-job.js';
import { Test } from '../entities/test.js';
import { GenerationJobModule } from '../generation-jobs/generation-jobs.module.js';
import { TestsGateway } from './tests.gateway.js';
import { TestsPublisher } from './tests.publisher.js';
import { RabbitMqModule } from '../rabbit-mq/rabbit-mq.module.js';
import { OutboxModule } from '../outbox/outbox.module.js';
import { RedisCacheModule } from '../redis/cache/cache.module.js';

@Module({
  imports: [
    GenerationJobModule,
    TypeOrmModule.forFeature([GenerationJob, Test]),
    RabbitMqModule,
    OutboxModule,
    RedisCacheModule,
  ],
  controllers: [TestsController],
  providers: [TestsService, TestsGateway, TestsPublisher],
})
export class TestsModule {}
