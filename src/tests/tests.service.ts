import { Injectable } from '@nestjs/common';
import { Repository } from 'typeorm';
import { GenerationJob } from '../entities/generation-job.js';
import { InjectRepository } from '@nestjs/typeorm';
import { Test } from '../entities/test.js';
import { CreateTestDto, UpdateTestDto } from './types/tests-request.dto.js';
import { CreateTestResponseDto } from './types/tests-response.dto.js';
import { TestsPublisher } from './tests.publisher.js';
import { BRAKE_TRANSACTION_NUM } from '../utils/demos.js';
import { RedisCacheService } from '../redis/cache/cache.service.js';
import { jitter } from '../utils/jitter.js';
import {
  getRedisUserTestsCacheKey,
  getRedisUserTestsLockKey,
} from '../contracts/generation/constants.js';
import { randomUUID } from 'crypto';

@Injectable()
export class TestsService {
  constructor(
    @InjectRepository(GenerationJob)
    private readonly generationJobsRepo: Repository<GenerationJob>,
    @InjectRepository(Test)
    private readonly testsRepo: Repository<Test>,
    private readonly testsPublisher: TestsPublisher,
    private readonly redisCacheService: RedisCacheService,
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

        if (generationJobPayload.questionCount === BRAKE_TRANSACTION_NUM) {
          throw new Error('second demo boom');
        }

        return generationJob;
      },
    );

    return {
      id: generationJob.id,
      status: generationJob.status,
      createdAt: generationJob.createdAt,
    };
  }

  async getAllByUserId(userId: string) {
    const cache = await this.redisCacheService.get<Test[]>(
      getRedisUserTestsCacheKey(userId),
    );

    if (cache) {
      return cache;
    }

    const uniqToken = randomUUID();
    const lockTtlMs = 5000;
    const lockKey = getRedisUserTestsLockKey(userId);

    const isLockAcquired = await this.redisCacheService.acquireLock(
      lockKey,
      uniqToken,
      lockTtlMs,
    );

    if (isLockAcquired) {
      try {
        const tests = await this.testsRepo.find({
          where: { user: { id: userId } },
        });
        await this.redisCacheService.set(
          getRedisUserTestsCacheKey(userId),
          tests,
          jitter(300, 0.4),
        );
        return tests;
      } finally {
        await this.redisCacheService.releaseLock(
          getRedisUserTestsLockKey(userId),
          uniqToken,
        );
      }
    } else {
      return (
        (await this.redisCacheService.waitAndRead<Test[]>(
          getRedisUserTestsCacheKey(userId),
          getRedisUserTestsLockKey(userId),
        )) ?? []
      );
    }
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
