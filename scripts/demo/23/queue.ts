import { Queue, QueueEvents } from "bullmq";
import { Redis } from "ioredis";
import { randomUUID } from "node:crypto";
import { DOCUMENTS_GC_QUEUE, DOCUMENTS_GC_QUEUE_JOB } from "../../../src/contracts/documents/constants.js";

const SCHEDULER_ID = "documents-gc-scheduler";

async function main() {
  const connection = {
    host: process.env.REDIS_QUEUE_HOST,
    port: Number(process.env.REDIS_QUEUE_PORT),
    password: process.env.REDIS_PASSWORD,
    maxRetriesPerRequest: null,
  };
  const redis = new Redis(connection);
  const inspector = new Redis(connection);
  const queue = new Queue(DOCUMENTS_GC_QUEUE, { connection: redis });
  const events = new QueueEvents(DOCUMENTS_GC_QUEUE, { connection: { ...connection } });
  const scheduledRunIds = new Set<string>();

  events.on("completed", ({ jobId }) => {
    void queue.getJob(jobId).then((job) => {
      if (job?.repeatJobKey === SCHEDULER_ID) scheduledRunIds.add(jobId);
    }).catch((error: unknown) => console.error(error));
  });

  try {
    await events.waitUntilReady();
    const [, policy] = (await inspector.call("CONFIG", "GET", "maxmemory-policy")) as string[];
    const queueNoeviction = Number(policy === "noeviction");
    const jobId = "queue-demo-" + randomUUID();
    const options = { jobId, attempts: 3, backoff: { type: "exponential" as const, delay: 1000, jitter: 0.2 } };
    const [first, duplicate] = await Promise.all([
      queue.add(DOCUMENTS_GC_QUEUE_JOB, { demoRetry: true }, options),
      queue.add(DOCUMENTS_GC_QUEUE_JOB, { demoRetry: true }, options),
    ]);
    const queued = Number(first.id === duplicate.id && !!(await queue.getJob(jobId)));
    await first.waitUntilFinished(events, 30_000);
    const job = await queue.getJob(jobId);
    if (!job) throw new Error("Demo job was not found");
    const attempts = job.attemptsStarted;
    const completed = Number((await job.getState()) === "completed");
    const schedulers = await queue.getJobSchedulersCount();

    const deadline = Date.now() + 150_000;
    while (scheduledRunIds.size < 2 && Date.now() < deadline) {
      await new Promise((resolve) => setTimeout(resolve, 250));
    }
    const scheduledRuns = scheduledRunIds.size;
    console.log("queue-noeviction=" + queueNoeviction);
    console.log("attempts=" + attempts);
    console.log("completed=" + completed);
    console.log("added=2");
    console.log("queued=" + queued);
    console.log("schedulers=" + schedulers);
    console.log("scheduled-runs=" + scheduledRuns);

    if (completed) await job.remove();
    if (queueNoeviction !== 1 || attempts < 3 || completed !== 1 || queued !== 1 || schedulers < 1 || scheduledRuns < 2) process.exitCode = 1;
  } finally {
    await Promise.allSettled([events.close(), queue.close(), redis.quit(), inspector.quit()]);
  }
}

await main();
