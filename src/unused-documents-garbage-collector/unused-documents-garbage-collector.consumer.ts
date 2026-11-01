import { Processor, WorkerHost } from '@nestjs/bullmq';
import { DOCUMENTS_GC_QUEUE } from '../contracts/documents/constants.js';
import { Job } from 'bullmq';
import { InjectRepository } from '@nestjs/typeorm';
import { Document } from '../entities/document.js';
import { Repository } from 'typeorm';

@Processor(DOCUMENTS_GC_QUEUE)
export class UnusedDocumentsGarbageCollectorConsumer extends WorkerHost {
  constructor(
    @InjectRepository(Document)
    private readonly documentRepository: Repository<Document>,
  ) {
    super();
  }
  async process(job: Job) {
    const count = await this.documentRepository
      .createQueryBuilder('document')
      .leftJoin('document.tests', 'test')
      .where('test.id IS NULL')
      .getCount();
    console.log(count);
    await job.updateProgress(100);
  }
}
