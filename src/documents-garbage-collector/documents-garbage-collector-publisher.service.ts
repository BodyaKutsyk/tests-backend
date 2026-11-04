import {
  Injectable,
  OnApplicationBootstrap,
  OnModuleInit,
} from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import {
  DOCUMENTS_GC_QUEUE,
  DOCUMENTS_GC_QUEUE_JOB,
} from '../contracts/documents/constants.js';
import { Queue } from 'bullmq';

@Injectable()
export class DocumentsGarbageCollectorPublisher implements OnModuleInit {
  constructor(
    @InjectQueue(DOCUMENTS_GC_QUEUE) private readonly documentsGCQueue: Queue,
  ) {}

  async onModuleInit() {
    await this.publishCleanUpJob();
  }

  async publishCleanUpJob() {
    await this.documentsGCQueue.upsertJobScheduler(
      'documents-gc-scheduler',
      { every: 60_000 },
      {
        name: DOCUMENTS_GC_QUEUE_JOB,
        data: {},
        opts: {
          attempts: 3,
          backoff: { type: 'exponential', delay: 1_000, jitter: 0.2 },
        },
      },
    );
  }
}
