import { Injectable } from '@nestjs/common';
import { Repository } from 'typeorm';
import { GenerationJob } from '../entities/generation-job.js';
import { InjectRepository } from '@nestjs/typeorm';
import { Test } from '../entities/test.js';
import { CreateTestDto, UpdateTestDto } from './types/tests-request.dto.js';
import { CreateTestResponseDto } from './types/tests-response.dto.js';
import { TestsPublisher } from './tests.publisher.js';

@Injectable()
export class TestsService {
  constructor(
    @InjectRepository(GenerationJob)
    private readonly generationJobsRepo: Repository<GenerationJob>,
    @InjectRepository(GenerationJob)
    private readonly testsRepo: Repository<Test>,
    private readonly testsPublisher: TestsPublisher,
  ) {}

  async create(
    { files, questionType, questionCount }: CreateTestDto,
    userId: string,
  ): Promise<CreateTestResponseDto> {
    const documents = [...new Set(files)].map((id) => ({ id }));
    const generationJobPayload = this.generationJobsRepo.create({
      user: { id: userId },
      questionCount,
      questionType,
      documents,
    });
    const generationJob = await this.generationJobsRepo.manager.transaction(
      async (manager) => {
        const generationJob = await manager.save(
          GenerationJob,
          generationJobPayload,
        );
        await this.testsPublisher.testJobCreated(generationJob, manager);

        return generationJob;
      },
    );

    return {
      id: generationJob.id,
      status: generationJob.status,
      createdAt: generationJob.createdAt,
    };
  }

  findAll() {
    return `This action returns all tests`;
  }

  findOne(id: number) {
    return `This action returns a #${id} test`;
  }

  update(id: number, updateTestDto: UpdateTestDto) {
    return `This action updates a #${id} test`;
  }

  remove(id: number) {
    return `This action removes a #${id} test`;
  }
}
