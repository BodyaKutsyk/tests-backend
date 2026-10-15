import { Module } from '@nestjs/common';
import { TestsService } from './tests.service.js';
import { TestsController } from './tests.controller.js';
import { TypeOrmModule } from '@nestjs/typeorm';
import { GenerationJob } from '../entities/generation-job.js';
import { Test } from '../entities/test.js';
import { GenerationJobModule } from '../generation-jobs/generation-jobs.module.js';
import { TestsGateway } from './tests.gateway.js';

@Module({
  imports: [
    GenerationJobModule,
    TypeOrmModule.forFeature([GenerationJob, Test]),
  ],
  controllers: [TestsController],
  providers: [TestsService, TestsGateway],
})
export class TestsModule {}
