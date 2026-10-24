import { Module } from '@nestjs/common';
import { GenerationJobsEventService } from './generation-jobs-event.service.js';
import { TypeOrmModule } from '@nestjs/typeorm';
import { GenerationJob } from '../entities/generation-job.js';
import { GenerationJobsWorkflowService } from './generation-jobs-workflow.service.js';
import { TestsGeneratorWorkerService } from './workers/tests-generator-worker.service.js';
import { TestsParserWorkerService } from './workers/tests-parser-worker.service.js';
import { GenerationJobsConsumer } from './generation-jobs.consumer.js';
import { RabbitMqModule } from '../rabbit-mq/rabbit-mq.module.js';
import { GenerationJobsTopologyService } from './generation-jobs-topology.service.js';
import { InboxModule } from '../inbox/inbox.module.js';

@Module({
  imports: [
    RabbitMqModule,
    InboxModule,
    TypeOrmModule.forFeature([GenerationJob]),
  ],
  controllers: [],
  providers: [
    GenerationJobsTopologyService,
    GenerationJobsConsumer,
    GenerationJobsEventService,
    GenerationJobsWorkflowService,
    TestsGeneratorWorkerService,
    TestsParserWorkerService,
  ],
  exports: [
    GenerationJobsEventService,
    GenerationJobsWorkflowService,
    GenerationJobsConsumer,
  ],
})
export class GenerationJobModule {}
