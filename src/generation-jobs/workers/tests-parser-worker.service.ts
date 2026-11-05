import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import {
  GenerationJob,
  GenerationJobStatus,
} from '../../entities/generation-job.js';
import { Repository } from 'typeorm';
import { asyncTimeout } from '../../utils/async-timeout.js';

@Injectable()
export class TestsParserWorkerService {
  constructor(
    @InjectRepository(GenerationJob)
    private readonly generationJobRepo: Repository<GenerationJob>,
  ) {}
  async parse(id: string) {
    await asyncTimeout(5000);
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
