import { Injectable } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import {
  DOCUMENTS_GC_QUEUE,
  DOCUMENTS_GC_QUEUE_JOB,
} from '../contracts/documents/constants.js';
import { Queue } from 'bullmq';
import { Cron, CronExpression } from '@nestjs/schedule';

@Injectable()
export class UnusedDocumentsGarbageCollectorPublisher {
  constructor(
    @InjectQueue(DOCUMENTS_GC_QUEUE) private readonly documentsGCQueue: Queue,
  ) {}

  @Cron(CronExpression.EVERY_10_SECONDS)
  async publishCleanUpJob() {
    await this.documentsGCQueue.add(DOCUMENTS_GC_QUEUE_JOB, {});
  }
}
