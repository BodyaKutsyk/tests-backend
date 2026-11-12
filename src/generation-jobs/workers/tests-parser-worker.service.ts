import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import {
  GenerationJob,
  GenerationJobStatus,
} from '../../entities/generation-job.js';
import { Repository } from 'typeorm';
import { asyncTimeout } from '../../utils/async-timeout.js';
import { DoclingService } from '../../docling/docling.service.js';
import { NotFoundProblem } from '../../exceptions/problem-errors.js';

@Injectable()
export class TestsParserWorkerService {
  constructor(
    @InjectRepository(GenerationJob)
    private readonly generationJobRepo: Repository<GenerationJob>,
    private readonly doclingService: DoclingService,
  ) {}
  async parse(id: string) {
    // await asyncTimeout(5000);
    await this.generationJobRepo.manager.transaction(async (manager) => {
      const job = await manager
        .createQueryBuilder(GenerationJob, 'job')
        .where({ id })
        .leftJoinAndSelect('job.documents', 'document')
        .leftJoinAndSelect('job.user', 'user')
        .getOne();

      const document = job?.documents[0];
      if (!document) {
        throw new NotFoundProblem();
      }
      const userId = job?.user.id;
      const filePath = `uploads/${userId}/${document.storageKey}`;
      const result = await this.doclingService.parse(filePath);
    });

    const job = await this.generationJobRepo
      .createQueryBuilder()
      .update(GenerationJob)
      .set({ status: GenerationJobStatus.Parsing })
      .where({ id })
      .returning('*')
      .execute();

    return job.raw[0];
  }
}
