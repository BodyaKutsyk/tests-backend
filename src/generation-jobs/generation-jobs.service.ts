import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { GenerationJob } from '../entities/generation-job.js';
import { Repository } from 'typeorm';

@Injectable()
export class GenerationJobsService {
  constructor(
    @InjectRepository(GenerationJob)
    private readonly generationJobRepository: Repository<GenerationJob>,
  ) {}

  async checkUserAccess(
    generationJobId: string,
    userId: string,
  ): Promise<boolean> {
    try {
      const generationJob = await this.generationJobRepository.findOne({
        where: { id: generationJobId, user: { id: userId } },
      });

      return Boolean(generationJob);
    } catch {
      return false;
    }
  }
}
