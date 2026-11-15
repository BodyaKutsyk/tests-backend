import { Module } from '@nestjs/common';
import { GenerationJobsEventService } from './generation-jobs-event.service.js';
import { TypeOrmModule } from '@nestjs/typeorm';
import { GenerationJob } from '../entities/generation-job.js';
import { GenerationJobsWorkflowService } from './generation-jobs-workflow.service.js';
import { TestsGeneratorWorkerService } from './workers/tests-generator-worker.service.js';
import { GenerationJobsConsumer } from './generation-jobs.consumer.js';
import { RabbitMqModule } from '../rabbit-mq/rabbit-mq.module.js';
import { GenerationJobsTopologyService } from './generation-jobs-topology.service.js';
import { InboxModule } from '../inbox/inbox.module.js';
import { RedisCacheModule } from '../redis/cache/cache.module.js';
import { GenerationJobsWorkerService } from './generation-jobs-worker.service.js';
import { GenerationJobsService } from './generation-jobs.service.js';
import { DoclingModule } from '../docling/docling.module.js';
import { DocumentContents } from '../entities/document-contents.js';
import { LlmModule } from '../llm/llm.module.js';
import { OutboxModule } from '../outbox/outbox.module.js';

@Module({
  imports: [
    RabbitMqModule,
    InboxModule,
    OutboxModule,
    RedisCacheModule,
    TypeOrmModule.forFeature([GenerationJob, DocumentContents]),
    DoclingModule,
    LlmModule,
  ],
  controllers: [],
  providers: [
    GenerationJobsTopologyService,
    GenerationJobsConsumer,
    GenerationJobsEventService,
    GenerationJobsWorkflowService,
    TestsGeneratorWorkerService,
    GenerationJobsWorkerService,
    GenerationJobsService,
  ],
  exports: [
    GenerationJobsEventService,
    GenerationJobsWorkflowService,
    GenerationJobsConsumer,
    GenerationJobsWorkerService,
    GenerationJobsService,
  ],
})
export class GenerationJobModule {}
