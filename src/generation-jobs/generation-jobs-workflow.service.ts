import { Injectable, Logger, OnModuleDestroy } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import {
  GenerationJob,
  GenerationJobStatus,
} from '../entities/generation-job.js';
import { Repository } from 'typeorm';
import { TestsGeneratorWorkerService } from './workers/tests-generator-worker.service.js';
import { RedisCacheService } from '../redis/cache/cache.service.js';
import { getRedisUserTestsCacheKey } from '../contracts/generation/constants.js';
import { Test } from '../entities/test.js';
import { Question } from '../entities/question.js';
import { AnswerOption } from '../entities/answer-option.js';
import { Document } from '../entities/document.js';

@Injectable()
export class GenerationJobsWorkflowService implements OnModuleDestroy {
  private readonly logger = new Logger(GenerationJobsWorkflowService.name);
  private stopping = false;

  constructor(
    @InjectRepository(GenerationJob)
    private readonly generationJobRepo: Repository<GenerationJob>,
    private readonly generatorWorker: TestsGeneratorWorkerService,
    private readonly redisCacheService: RedisCacheService,
  ) {}

  async process(jobId: string): Promise<void> {
    if (this.stopping) throw new Error('Generation workflow is stopping');

    const job = await this.generationJobRepo.findOne({
      where: { id: jobId },
      relations: { user: true, documents: true },
    });
    if (!job) throw new Error(`Generation job ${jobId} was not found`);

    const claim = await this.generationJobRepo
      .createQueryBuilder()
      .update(GenerationJob)
      .set({ status: GenerationJobStatus.Generated })
      .where('id = :id', { id: jobId })
      .andWhere('status = :status', { status: GenerationJobStatus.Queued })
      .returning('id')
      .execute();

    if (!claim.raw.length) return;

    try {
      const generationStarted = await this.generationJobRepo
        .createQueryBuilder()
        .update(GenerationJob)
        .set({ status: GenerationJobStatus.Generated })
        .where('id = :id', { id: jobId })
        .andWhere('status = :status', { status: GenerationJobStatus.Queued })
        .returning('id')
        .execute();

      if (!generationStarted.raw.length) {
        throw new Error(`Could not move job ${jobId} to generating`);
      }

      const questions = await this.generatorWorker.generate(
        jobId,
        job.questionCount,
        job.questionType,
      );

      if (!questions.length)
        throw new Error(`No valid questions generated for job ${jobId}`);

      await this.generationJobRepo.manager.transaction(async (manager) => {
        const test = await manager.save(
          Test,
          manager.create(Test, {
            name: (job.documents[0]?.name ?? 'Generated test').slice(0, 255),
            user: job.user,
          }),
        );
        for (const document of job.documents) {
          await manager
            .createQueryBuilder()
            .relation(Document, 'tests')
            .of(document.id)
            .add(test.id);
        }
        for (const generated of questions) {
          const question = await manager.save(
            Question,
            manager.create(Question, {
              test,
              value: generated.text,
              question_type: generated.type,
            }),
          );
          if (generated.options.length) {
            await manager.save(
              AnswerOption,
              generated.options.map((option) =>
                manager.create(AnswerOption, {
                  question,
                  value: option.text,
                  isCorrect: option.isCorrect,
                }),
              ),
            );
          }
        }
        const completed = await manager
          .createQueryBuilder()
          .update(GenerationJob)
          .set({
            status: GenerationJobStatus.Done,
            test,
            processed: questions.length,
          })
          .where('id = :id AND status = :status', {
            id: jobId,
            status: GenerationJobStatus.Generated,
          })
          .returning('id')
          .execute();
        if (!completed.raw.length)
          throw new Error(`Could not mark job ${jobId} as done`);
      });
    } catch (error) {
      await this.generationJobRepo
        .createQueryBuilder()
        .update(GenerationJob)
        .set({ status: GenerationJobStatus.Failed })
        .where('id = :id', { id: jobId })
        .andWhere('status = :status', {
          status: GenerationJobStatus.Generated,
        })
        .execute();

      this.logger.error(`Generation workflow failed for job ${jobId}`, error);
      throw error;
    }

    try {
      await this.redisCacheService.del(getRedisUserTestsCacheKey(job.user.id));
    } catch (error) {
      this.logger.warn(
        `Could not invalidate test cache for job ${jobId}`,
        error,
      );
    }
  }

  onModuleDestroy(): void {
    this.stopping = true;
  }
}
