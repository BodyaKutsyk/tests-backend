import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import {
  GenerationJob,
  GenerationJobStatus,
} from '../../entities/generation-job.js';
import { Repository } from 'typeorm';
import { asyncTimeout } from '../../utils/async-timeout.js';

@Injectable()
export class TestsGeneratorWorkerService {
  constructor(
    @InjectRepository(GenerationJob)
    private readonly generationJobRepo: Repository<GenerationJob>,
  ) {}
  async generate(id: string) {
    await asyncTimeout(5000);
    const job = await this.generationJobRepo
      .createQueryBuilder()
      .update(GenerationJob)
      .set({ status: GenerationJobStatus.Generating })
      .where({ id })
      .returning('*')
      .execute();

    return job.raw[0];
  }
}
