import { Injectable } from '@nestjs/common';
import { Repository } from 'typeorm';
import { GenerationJob } from '../entities/generation-job.js';
import { InjectRepository } from '@nestjs/typeorm';
import { Test } from '../entities/test.js';
import { CreateTestDto, UpdateTestDto } from './types/tests-request.dto.js';
import { CreateTestResponseDto } from './types/tests-response.dto.js';
import { TestsJobCreatedPayload, TestsPublisher } from './tests.publisher.js';
import { OutboxSavePayload, OutboxService } from '../outbox/outbox.service.js';
import { GENERATION_JOBS_EXCHANGE } from '../contracts/generation/constants.js';
import { randomUUID } from 'crypto';

// will be replaced with JWT
let userId = '2d86a24b-68f2-4554-a17a-3300e4047112';

interface GenerationJobOutboxPayload {}

@Injectable()
export class TestsService {
  constructor(
    @InjectRepository(GenerationJob)
    private readonly generationJobsRepo: Repository<GenerationJob>,
    @InjectRepository(GenerationJob)
    private readonly testsRepo: Repository<Test>,
    private readonly testsPublisher: TestsPublisher,
    private readonly outboxService: OutboxService,
  ) {}

  async create(
    { files, questionType, questionCount }: CreateTestDto,
    userId = '2d86a24b-68f2-4554-a17a-3300e4047112',
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

        const occurredAt = new Date();
        // TODO: save in Redis
        const eventId = randomUUID();
        const outboxPayload: OutboxSavePayload<TestsJobCreatedPayload> = {
          type: this.constructor.name,
          aggregateType: GENERATION_JOBS_EXCHANGE,
          aggregateId: generationJob.id,
          payload: {
            id: generationJob.id,
            eventId,
            occurredAt,
          },
        };
        await this.outboxService.save<TestsJobCreatedPayload>(
          outboxPayload,
          manager,
        );

        return generationJob;
      },
    );

    // await this.testsPublisher.testJobCreated(generationJob.id);

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
