import { randomUUID } from 'node:crypto';
import { GenerationJobStatus } from '../src/entities/generation-job.js';
import {
  GENERATION_JOBS_EXCHANGE,
  GENERATION_JOBS_DLQ_QUEUE,
  GENERATION_JOBS_PREFETCH,
  GENERATION_JOBS_ROUTING_KEYS,
} from '../src/contracts/generation/constants.js';
import { QuestionType } from '../src/types/temporary.js';
import type { CreateTest } from './utils/helper.js';
import {
  stopDemo,
  startDemo,
  queueLength,
  queueStats,
  waitFor,
} from './utils/helper.js';

const PUBLISHED_TARGET = 5;

async function main() {
  const runtime = await startDemo();

  try {
    const before = await queueStats(GENERATION_JOBS_ROUTING_KEYS.CREATED);
    const beforeDlq = await queueLength(runtime, GENERATION_JOBS_DLQ_QUEUE);
    const beforeWork = await queueLength(
      runtime,
      GENERATION_JOBS_ROUTING_KEYS.CREATED,
    );
    let stats = before;
    const user = await runtime.helper.getUserWithDocuments();
    if (!user) throw new Error('No seeded user with documents found');

    const data: CreateTest = {
      questionCount: 10,
      questionType: QuestionType.MultipleChoice,
      files: user.documents.map(({ id }) => id),
    };

    const results = await Promise.allSettled(
      Array.from({ length: PUBLISHED_TARGET }, async () => {
        const eventId = randomUUID();
        const test = await runtime.helper.createTest(
          data,
          eventId,
          user.id,
          true,
        );
        await runtime.helper.publishRabbitMQ({
          exchange: GENERATION_JOBS_EXCHANGE,
          routingKey: GENERATION_JOBS_ROUTING_KEYS.CREATED,
          payload: {
            id: test.id,
            eventId,
            occurredAt: test.createdAt,
            status: GenerationJobStatus.Queued,
          },
        });
        return test.id;
      }),
    );

    const ids = results.flatMap((result) =>
      result.status === 'fulfilled' ? [result.value] : [],
    );
    const published = ids.length;
    let jobs = await runtime.helper.getGenerationJobs(ids);

    if (published > 0) {
      try {
        await waitFor(async () => {
          jobs = await runtime.helper.getGenerationJobs(ids);
          stats = await queueStats(GENERATION_JOBS_ROUTING_KEYS.CREATED);
          return (
            stats.delivered - before.delivered >= published &&
            stats.acked - before.acked >= published &&
            jobs.length === published &&
            jobs.every(
              ({ status }) =>
                status === GenerationJobStatus.Done ||
                status === GenerationJobStatus.Failed,
            )
          );
        });
      } catch {
        jobs = await runtime.helper.getGenerationJobs(ids);
      }
    }

    const effect = jobs.filter(
      ({ status }) => status === GenerationJobStatus.Done,
    ).length;
    stats = await queueStats(GENERATION_JOBS_ROUTING_KEYS.CREATED);
    const delivered = stats.delivered - before.delivered;
    const acked = stats.acked - before.acked;
    const dlq =
      (await queueLength(runtime, GENERATION_JOBS_DLQ_QUEUE)) - beforeDlq;
    const work = await queueLength(
      runtime,
      GENERATION_JOBS_ROUTING_KEYS.CREATED,
    );

    console.log(`published=${published}`);
    console.log(`delivered=${delivered}`);
    console.log(`effect=${effect}`);
    console.log(`acked=${acked}`);
    console.log(`dlq=${dlq}`);
    console.log(`prefetch=${GENERATION_JOBS_PREFETCH}`);

    if (
      published !== PUBLISHED_TARGET ||
      delivered < PUBLISHED_TARGET ||
      effect !== PUBLISHED_TARGET ||
      acked < PUBLISHED_TARGET ||
      dlq !== 0 ||
      work > beforeWork
    ) {
      throw new Error('demo:publish invariant failed');
    }
  } finally {
    await stopDemo(runtime);
  }
}

await main();
