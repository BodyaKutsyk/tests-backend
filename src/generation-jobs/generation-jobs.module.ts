import { Module } from '@nestjs/common';
import { GenerationJobsEventService } from './generation-jobs-event.service.js';
import { TypeOrmModule } from '@nestjs/typeorm';
import { GenerationJob } from '../entities/generation-job.js';
import { GenerationJobsWorkerService } from './generation-jobs-worker.service.js';
import { GenerationJobsService } from './generation-jobs.service.js';

@Module({
  imports: [TypeOrmModule.forFeature([GenerationJob])],
  controllers: [],
  providers: [
    GenerationJobsEventService,
    GenerationJobsWorkerService,
    GenerationJobsService,
  ],
  exports: [
    GenerationJobsEventService,
    GenerationJobsWorkerService,
    GenerationJobsService,
  ],
})
export class GenerationJobModule {}
