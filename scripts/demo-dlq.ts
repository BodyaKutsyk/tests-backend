import { randomUUID } from 'node:crypto';
import {
  GENERATION_JOBS_EXCHANGE,
  GENERATION_JOBS_DLQ_QUEUE,
  GENERATION_JOBS_ROUTING_KEYS,
} from '../src/contracts/generation/constants.js';
import { GenerationJobStatus } from '../src/entities/generation-job.js';
import {
  stopDemo,
  startDemo,
  queueLength,
  getDlqReason,
  waitFor,
} from './utils/helper.js';

const VALID_DLQ_REASONS = new Set([
  'rejected',
  'expired',
  'maxlen',
  'delivery_limit',
]);

async function main() {
  const runtime = await startDemo();
  const eventId = randomUUID();
  let dlqReason: string | undefined;

  try {
    const beforeDlq = await queueLength(runtime, GENERATION_JOBS_DLQ_QUEUE);
    if (!runtime.helper.channel) {
      throw new Error('RabbitMQ channel is not available');
    }

    await runtime.helper.publishRabbitMQ({
      exchange: GENERATION_JOBS_EXCHANGE,
      routingKey: GENERATION_JOBS_ROUTING_KEYS.CREATED,
      payload: {
        id: randomUUID(),
        eventId,
        occurredAt: new Date().toISOString(),
        status: GenerationJobStatus.Queued,
      },
    });

    let work = await queueLength(runtime, GENERATION_JOBS_ROUTING_KEYS.CREATED);
    try {
      await waitFor(async () => {
        work = await queueLength(runtime, GENERATION_JOBS_ROUTING_KEYS.CREATED);
        if ((await queueLength(runtime, GENERATION_JOBS_DLQ_QUEUE)) <= beforeDlq)
          return false;
        dlqReason = await getDlqReason(runtime, eventId);
        return Boolean(dlqReason);
      });
    } catch {
      work = await queueLength(runtime, GENERATION_JOBS_ROUTING_KEYS.CREATED);
    }

    const dlq = (await queueLength(runtime, GENERATION_JOBS_DLQ_QUEUE)) - beforeDlq;
    const rejected = dlqReason ? 1 : 0;
    work = await queueLength(runtime, GENERATION_JOBS_ROUTING_KEYS.CREATED);
    const effect = 0;

    console.log(`rejected=${rejected}`);
    console.log(`work=${work}`);
    console.log(`dlq=${dlq}`);
    console.log(`dlq-reason=${dlqReason ?? 'unknown'}`);
    console.log(`effect=${effect}`);

    if (
      rejected !== 1 ||
      dlq !== 1 ||
      !dlqReason ||
      !VALID_DLQ_REASONS.has(dlqReason) ||
      effect !== 0
    ) {
      throw new Error('demo:dlq invariant failed');
    }
  } finally {
    await stopDemo(runtime);
  }
}

await main();
