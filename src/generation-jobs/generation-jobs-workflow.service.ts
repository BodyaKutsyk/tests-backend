import { Injectable, Logger, OnModuleDestroy } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import {
  GenerationJob,
  GenerationJobStatus,
} from '../entities/generation-job.js';
import { EntityManager, Repository } from 'typeorm';
import {
  GeneratedQuestion,
  TestsGeneratorWorkerService,
} from './workers/tests-generator-worker.service.js';
import { RedisCacheService } from '../redis/cache/cache.service.js';
import { getRedisUserTestsCacheKey } from '../contracts/generation/constants.js';
import { Test } from '../entities/test.js';
import { Question } from '../entities/question.js';
import { AnswerOption } from '../entities/answer-option.js';
import { Document } from '../entities/document.js';
import { InboxService } from '../inbox/inbox.service.js';
import { DocumentNotReadyError } from './document-not-ready.error.js';

@Injectable()
export class GenerationJobsWorkflowService implements OnModuleDestroy {
  private readonly logger = new Logger(GenerationJobsWorkflowService.name);
  private stopping = false;

  constructor(
    @InjectRepository(GenerationJob)
    private readonly generationJobRepo: Repository<GenerationJob>,
    private readonly generatorWorker: TestsGeneratorWorkerService,
    private readonly redisCacheService: RedisCacheService,
    private readonly inboxService: InboxService,
  ) {}

  async process(
    jobId: string,
    inboxEntry: { messageId: string; consumer: string },
  ): Promise<void> {
    if (this.stopping) throw new Error('Generation workflow is stopping');

    const runner =
      this.generationJobRepo.manager.connection.createQueryRunner();
    await runner.connect();
    let locked = false;
    try {
      const rows = await runner.query(
        'SELECT pg_try_advisory_lock(hashtextextended($1, 0)) AS locked',
        [jobId],
      );
      locked = rows[0].locked;
      if (!locked) return;

      const job = await this.generationJobRepo.findOne({
        where: { id: jobId },
        relations: { user: true, documents: true },
      });
      if (!job) throw new Error(`Generation job ${jobId} was not found`);
      if (
        job.status === GenerationJobStatus.Queued ||
        job.status === GenerationJobStatus.Failed
      ) {
        if (!(await this.claimJob(jobId, job.status))) return;
      } else if (job.status !== GenerationJobStatus.Generated) {
        return;
      }

      try {
        const questions = await this.generatorWorker.generate(
          {
            jobId,
            questionCount: job.questionCount,
            questionType: job.questionType,
          },
          job.generationCheckpoint ?? {
            questions: [],
            attempts: 0,
            emptyBatches: 0,
          },
          async (generationCheckpoint) => {
            await this.generationJobRepo.update(jobId, {
              generationCheckpoint,
              processed: generationCheckpoint.questions.length,
            });
          },
        );
        if (!questions.length)
          throw new Error(`No valid questions generated for job ${jobId}`);
        await this.saveResult(job, questions, inboxEntry);
      } catch (error) {
        if (error instanceof DocumentNotReadyError) {
          await this.generationJobRepo.update(jobId, {
            status: GenerationJobStatus.Queued,
          });
          throw error;
        }
        await this.generationJobRepo.update(jobId, {
          status: GenerationJobStatus.Failed,
        });
        this.logger.error(`Generation workflow failed for job ${jobId}`, error);
        throw error;
      }
      await this.invalidateCache(job.user.id, jobId);
    } finally {
      if (locked)
        await runner.query(
          'SELECT pg_advisory_unlock(hashtextextended($1, 0))',
          [jobId],
        );
      await runner.release();
    }
  }

  async failWaitingJob(jobId: string): Promise<void> {
    await this.generationJobRepo
      .createQueryBuilder()
      .update(GenerationJob)
      .set({ status: GenerationJobStatus.Failed })
      .where('id = :id AND status = :status', {
        id: jobId,
        status: GenerationJobStatus.Queued,
      })
      .execute();
  }

  private async claimJob(
    jobId: string,
    status: GenerationJobStatus,
  ): Promise<boolean> {
    const result = await this.generationJobRepo
      .createQueryBuilder()
      .update(GenerationJob)
      .set({ status: GenerationJobStatus.Generated })
      .where('id = :id AND status = :status', {
        id: jobId,
        status,
      })
      .returning('id')
      .execute();
    return result.raw.length > 0;
  }

  private async saveResult(
    job: GenerationJob,
    questions: GeneratedQuestion[],
    inboxEntry: { messageId: string; consumer: string },
  ) {
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
      for (const question of questions) {
        await this.saveQuestion(manager, test, question);
      }

      const result = await manager
        .createQueryBuilder()
        .update(GenerationJob)
        .set({
          status: GenerationJobStatus.Done,
          test,
          processed: questions.length,
          generationCheckpoint: null,
        })
        .where('id = :id AND status = :status', {
          id: job.id,
          status: GenerationJobStatus.Generated,
        })
        .returning('id')
        .execute();
      if (!result.raw.length) {
        throw new Error(`Could not mark job ${job.id} as done`);
      }
      await this.inboxService.save(inboxEntry, manager);
    });
  }

  private async saveQuestion(
    manager: EntityManager,
    test: Test,
    generated: GeneratedQuestion,
  ) {
    const question = await manager.save(
      Question,
      manager.create(Question, {
        test,
        value: generated.text,
        question_type: generated.type,
      }),
    );
    if (!generated.options.length) return;

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

  private async invalidateCache(userId: string, jobId: string) {
    try {
      await this.redisCacheService.del(getRedisUserTestsCacheKey(userId));
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
