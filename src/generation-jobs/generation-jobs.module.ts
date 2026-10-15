import { Module } from '@nestjs/common';
import { GenerationJobsEventService } from './generation-jobs-event.service.js';
import { TypeOrmModule } from '@nestjs/typeorm';
import { GenerationJob } from '../entities/generation-job.js';
import { GenerationJobsWorkerService } from './generation-jobs-worker.service.js';

@Module({
  imports: [TypeOrmModule.forFeature([GenerationJob])],
  controllers: [],
  providers: [GenerationJobsEventService, GenerationJobsWorkerService],
  exports: [GenerationJobsEventService, GenerationJobsWorkerService],
})
export class GenerationJobModule {}
