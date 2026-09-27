import { DataSource } from 'typeorm';
import { dataSourceOptions } from './data-source.js';
import { QueryLogger } from './utils/query-logger.js';
import { GenerationJob, JobStatus } from './entities/generation-job.js';
import { User } from './entities/user.js';
import { asyncTimeout } from './utils/async-timeout.js';
import { QuestionType } from './types/temporary.js';

const WORKERS_AMOUNT = 3;
const JOBS_AMOUNT = 100;

async function createTestJobs(dataSource: DataSource, user: User) {
  const generationJobsRepo = dataSource.getRepository(GenerationJob);
  const questionTypes = Object.values(QuestionType);

  const generationJobsMock = Array.from(
    { length: JOBS_AMOUNT },
    (_, index) => ({
      user,
      question_count: 10,
      question_type: questionTypes[index % questionTypes.length],
    }),
  );

  return await generationJobsRepo.save(
    generationJobsRepo.create(generationJobsMock),
  );
}

async function runWorker(
  dataSource: DataSource,
  userId: string,
  workerId: number,
) {
  let total = 0;

  while (true) {
    const result = await processQueuedJob(dataSource, userId);

    if (result) {
      total++;
    } else {
      break;
    }
  }

  console.log(`[worker #${workerId}] total: ${total}`);
  return total;
}

async function processQueuedJob(dataSource: DataSource, userId: string) {
  const queryRunner = dataSource.createQueryRunner();

  try {
    await queryRunner.connect();
    await queryRunner.startTransaction();

    const generationJob = await queryRunner.manager
      .createQueryBuilder(GenerationJob, 'generation_job')
      .where('generation_job.user_id = :id', { id: userId })
      .andWhere('generation_job.status = :status', {
        status: JobStatus.Queued,
      })
      .orderBy('generation_job.created_at', 'ASC')
      .limit(1)
      .setLock('pessimistic_write')
      .setOnLocked('skip_locked')
      .getOne();

    await asyncTimeout(250);
    const updatedJob = await queryRunner.manager
      .createQueryBuilder()
      .update(GenerationJob)
      .set({ status: JobStatus.Parsing })
      .where('id = :id', { id: generationJob?.id })
      .returning('*')
      .execute();

    await queryRunner.commitTransaction();
    return updatedJob.raw.length > 0;
  } catch (e) {
    await queryRunner.rollbackTransaction();
    console.log(e);
  } finally {
    await queryRunner.release();
  }
}

async function transactionWithWorkers() {
  const logger = new QueryLogger();
  const dataSource = new DataSource({
    ...dataSourceOptions,
    logger,
  });
  await dataSource.initialize();
  const user = await dataSource
    .createQueryBuilder(User, 'user')
    .where({})
    .getOneOrFail();

  await createTestJobs(dataSource, user);
  const startTime = new Date().getTime();
  const jobs = Array.from({ length: WORKERS_AMOUNT }, (_, workerId) =>
    runWorker(dataSource, user.id, workerId + 1),
  );
  const results = await Promise.all(jobs);
  const executionTime = (new Date().getTime() - startTime) / 1000;
  const totalOperations = results.reduce((prev, curr) => prev + curr, 0);
  console.log(
    `[${executionTime} s] Workers did total: ${totalOperations} operations`,
  );
}

await transactionWithWorkers();
