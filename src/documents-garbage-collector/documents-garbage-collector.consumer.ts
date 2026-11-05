import { Processor, WorkerHost } from '@nestjs/bullmq';
import { DOCUMENTS_GC_QUEUE } from '../contracts/documents/constants.js';
import { Job } from 'bullmq';
import { InjectRepository } from '@nestjs/typeorm';
import { Document } from '../entities/document.js';
import { In, Repository } from 'typeorm';
import { rm } from 'node:fs/promises';

@Processor(DOCUMENTS_GC_QUEUE)
export class DocumentsGarbageCollectorConsumer extends WorkerHost {
  constructor(
    @InjectRepository(Document)
    private readonly documentRepository: Repository<Document>,
  ) {
    super();
  }
  async process(job: Job) {
    if (job.data?.demoRetry === true) {
      if (job.attemptsMade < 2) {
        throw new Error("Intentional demo failure to exercise BullMQ retry");
      }
      await job.updateProgress(100);
      return { demoRetry: "succeeded" };
    }

    const documents = await this.documentRepository
      .createQueryBuilder('document')
      .withDeleted()
      .where('deleted_at IS NOT NULL')
      .getMany();
    const successful: string[] = [];

    for (const document of documents) {
      await rm(document.storageKey, { force: true });
      successful.push(document.id);
    }

    console.log(documents);
    await this.documentRepository.delete({ id: In(successful) });
    await job.updateProgress(100);
  }
}
