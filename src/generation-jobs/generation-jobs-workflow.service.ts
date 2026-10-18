import { Injectable, Logger, OnModuleDestroy } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import {
  GenerationJob,
  GenerationJobStatus,
} from '../entities/generation-job.js';
import { Repository } from 'typeorm';
import { clearInterval } from 'node:timers';
import { GenerationJobsEventService } from './generation-jobs-event.service.js';
import { TestsParserWorkerService } from './workers/tests-parser-worker.service.js';
import { TestsGeneratorWorkerService } from './workers/tests-generator-worker.service.js';

@Injectable()
export class GenerationJobsWorkflowService implements OnModuleDestroy {
  private readonly logger = new Logger(GenerationJobsWorkflowService.name);

  private readonly intervals = new Map<
    string,
    ReturnType<typeof setInterval>
  >();

  private readonly processing = new Set<string>();
  private readonly inFlight = new Set<Promise<void>>();
  private stopping = false;

  constructor(
    @InjectRepository(GenerationJob)
    private readonly generationJobRepo: Repository<GenerationJob>,
    private readonly eventsService: GenerationJobsEventService,
    private readonly parserWorker: TestsParserWorkerService,
    private readonly generatorWorker: TestsGeneratorWorkerService,
  ) {}

  async process(jobId: string): Promise<void> {
    if (this.stopping || this.intervals.has(jobId)) return;

    const intervalId = setInterval(() => {
      if (this.stopping || this.processing.has(jobId)) return;

      this.processing.add(jobId);

      const task = this.tick(jobId)
        .catch((error) => {
          this.logger.error(error);
          this.stop(jobId);
        })
        .finally(() => {
          this.processing.delete(jobId);
          this.inFlight.delete(task);
        });

      this.inFlight.add(task);
    }, 6000);

    this.intervals.set(jobId, intervalId);
  }

  private async tick(jobId: string): Promise<void> {
    let job = await this.generationJobRepo.findOneByOrFail({
      id: jobId,
    });

    const isFinished = this.isFinished(job.status);

    if (this.stopping || isFinished) {
      if (isFinished)
        this.eventsService.publish({
          id: jobId,
          status: job.status,
        });

      this.stop(jobId);
      return;
    }

    switch (job.status) {
      case GenerationJobStatus.Queued:
        job = await this.parserWorker.parse(job.id);
        break;
      case GenerationJobStatus.Parsing:
        job = await this.generatorWorker.generate(jobId);
        break;
      case GenerationJobStatus.Generating:
        job.status = GenerationJobStatus.Done;
    }

    await this.generationJobRepo.save(job);

    this.eventsService.publish({
      id: jobId,
      status: job.status,
    });

    if (this.isFinished(job.status)) {
      this.stop(jobId);
    }
  }

  private isFinished(status: GenerationJobStatus): boolean {
    return (
      status === GenerationJobStatus.Done ||
      status === GenerationJobStatus.Failed
    );
  }

  private stop(jobId: string): void {
    const intervalId = this.intervals.get(jobId);

    if (intervalId) {
      clearInterval(intervalId);
      this.intervals.delete(jobId);
    }
  }

  async onModuleDestroy(): Promise<void> {
    this.stopping = true;

    for (const jobId of this.intervals.keys()) {
      this.stop(jobId);
    }

    await Promise.allSettled([...this.inFlight]);
  }
}
