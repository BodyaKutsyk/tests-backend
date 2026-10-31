import { Inject, Injectable, Logger, OnModuleDestroy } from '@nestjs/common';
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
  private readonly completion = new Map<
    string,
    {
      resolve: () => void;
      reject: (error: Error) => void;
      promise: Promise<void>;
    }
  >();
  private stopping = false;

  constructor(
    @InjectRepository(GenerationJob)
    private readonly generationJobRepo: Repository<GenerationJob>,
    @Inject(GenerationJobsEventService)
    private readonly eventsService: GenerationJobsEventService,
    @Inject(TestsParserWorkerService)
    private readonly parserWorker: TestsParserWorkerService,
    @Inject(TestsGeneratorWorkerService)
    private readonly generatorWorker: TestsGeneratorWorkerService,
  ) {}

  async process(jobId: string): Promise<void> {
    if (this.stopping) {
      throw new Error('Generation workflow is stopping');
    }

    const existing = this.completion.get(jobId);
    if (existing) return existing.promise;

    let resolve!: () => void;
    let reject!: (error: Error) => void;
    const promise = new Promise<void>((res, rej) => {
      resolve = res;
      reject = rej;
    });
    this.completion.set(jobId, { resolve, reject, promise });

    const intervalId = setInterval(() => {
      if (this.stopping || this.processing.has(jobId)) return;

      this.processing.add(jobId);

      const task = this.tick(jobId)
        .then((finished) => {
          if (finished) {
            this.stop(jobId);
            this.completion.get(jobId)?.resolve();
            this.completion.delete(jobId);
          }
        })
        .catch((error: unknown) => {
          this.logger.error(error);
          this.stop(jobId);
          const completion = this.completion.get(jobId);
          this.completion.delete(jobId);
          completion?.reject(
            error instanceof Error ? error : new Error(String(error)),
          );
        })
        .finally(() => {
          this.processing.delete(jobId);
          this.inFlight.delete(task);
        });

      this.inFlight.add(task);
    }, 6000);

    this.intervals.set(jobId, intervalId);
    return promise;
  }

  private async tick(jobId: string): Promise<boolean> {
    let job = await this.generationJobRepo.findOneByOrFail({
      id: jobId,
    });
    this.eventsService.publish({
      id: jobId,
      status: job.status,
      type: job.status,
    });

    const isFinished = this.isFinished(job.status);

    if (this.stopping || isFinished) {
      this.stop(jobId);
      return true;
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
      type: job.status,
    });

    if (this.isFinished(job.status)) {
      this.stop(jobId);
    }

    return this.isFinished(job.status);
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

    for (const completion of this.completion.values()) {
      completion.reject(
        new Error('Generation workflow stopped before completion'),
      );
    }
    this.completion.clear();
  }
}
