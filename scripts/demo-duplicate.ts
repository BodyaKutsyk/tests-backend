import { randomUUID } from 'node:crypto';
import {
  GENERATION_JOBS_EXCHANGE,
  GENERATION_JOBS_ROUTING_KEYS,
} from '../src/contracts/generation/constants.js';
import { GenerationJobStatus } from '../src/entities/generation-job.js';
import { QuestionType } from '../src/types/temporary.js';
import { queueStats, stopDemo, startDemo, waitFor } from './utils/helper.js';

async function main() {
  const runtime = await startDemo();

  try {
    const before = await queueStats(GENERATION_JOBS_ROUTING_KEYS.CREATED);
    let stats = before;
    const user = await runtime.helper.getUserWithDocuments();
    if (!user) throw new Error('No seeded user with documents found');

    const eventId = randomUUID();
    const test = await runtime.helper.createTest(
      {
        questionCount: 10,
        questionType: QuestionType.MultipleChoice,
        files: user.documents.map(({ id }) => id),
      },
      eventId,
      user.id,
      true,
    );
    const event = {
      id: test.id,
      eventId,
      occurredAt: test.createdAt,
      status: GenerationJobStatus.Queued,
    };
    for (let index = 0; index < 2; index++) {
      await runtime.helper.publishRabbitMQ({
        exchange: GENERATION_JOBS_EXCHANGE,
        routingKey: GENERATION_JOBS_ROUTING_KEYS.CREATED,
        payload: event,
      });
    }

    let jobs = await runtime.helper.getGenerationJobs([test.id]);
    try {
      await waitFor(async () => {
        jobs = await runtime.helper.getGenerationJobs([test.id]);
        stats = await queueStats(GENERATION_JOBS_ROUTING_KEYS.CREATED);
        return (
          stats.delivered - before.delivered >= 2 &&
          stats.acked - before.acked >= 2 &&
          jobs.length === 1 &&
          jobs[0].status === GenerationJobStatus.Done
        );
      });
    } catch {
      jobs = await runtime.helper.getGenerationJobs([test.id]);
    }

    const effect = jobs.filter(
      ({ status }) => status === GenerationJobStatus.Done,
    ).length;
    stats = await queueStats(GENERATION_JOBS_ROUTING_KEYS.CREATED);
    const deliveries = stats.delivered - before.delivered;
    const acked = stats.acked - before.acked;
    const skipped = deliveries - effect;
    console.log(`deliveries=${deliveries}`);
    console.log(`effect=${effect}`);
    console.log(`skipped=${skipped}`);

    if (deliveries < 2 || acked < 2 || effect !== 1 || skipped < 1) {
      throw new Error('demo:duplicate invariant failed');
    }
  } finally {
    await stopDemo(runtime);
  }
}

await main();
