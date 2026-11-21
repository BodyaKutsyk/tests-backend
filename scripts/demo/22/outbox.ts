import { CreateTest, Helper } from './helper.js';
import { QuestionType } from '../../../src/types/temporary.js';
import { randomUUID } from 'crypto';
import { asyncTimeout } from '../../../src/utils/async-timeout.js';
import { Client } from 'pg';
import { GENERATION_JOB_DELIVERIES_CHANNEL } from '../../../src/utils/demos.js';

const payload: CreateTest = {
  questionCount: 20,
  questionType: QuestionType.MultipleChoice,
  files: [],
};

async function twoRequests() {
  const helper = new Helper();
  const dataSource = helper.dataSource;
  const idempotencyKey = randomUUID();
  const listener = new Client({ host: process.env.POSTGRES_HOST, port: Number(process.env.POSTGRES_PORT ?? 5432), user: process.env.POSTGRES_ADMIN, password: process.env.POSTGRES_ADMIN_PASSWORD, database: process.env.POSTGRES_DB });
  const deliveries: string[] = [];
  try {
    await dataSource.initialize();
    await listener.connect();
    listener.on('notification', (message) => {
      if (message.channel !== GENERATION_JOB_DELIVERIES_CHANNEL || !message.payload) return;
      const event = JSON.parse(message.payload) as { id: string };
      deliveries.push(event.id);
    });
    await listener.query(`LISTEN ${GENERATION_JOB_DELIVERIES_CHANNEL}`);

    const user = await helper.getUserWithDocuments();

    if (!user) {
      throw new Error('No users with documents');
    }

    payload.files.push(user.documents[0].id);
    const result1 = await helper.createTest(payload, idempotencyKey, user.id);
    const result2 = await helper.createTest(payload, idempotencyKey, user.id);

    if (result1.id !== result2.id) {
      process.exit(1);
    }

    await asyncTimeout(5000);

    const createdJobs = await helper.getJobs(result1.id);
    const createdOutboxes = await helper.getOutboxByJobId(result1.id);

    const published = createdOutboxes.filter(
      (outbox) => outbox.publishedAt !== null,
    );
    const processed = await helper.getInboxByJobId(result1.id);
    const effect = Number(createdJobs.some((job) => job.status !== 'queued'));

    console.log(
      `requests=2\norders=${createdJobs.length}\noutbox=${createdOutboxes.length}\npublished=${published.length}\ndeliveries=${deliveries.filter((id) => id === result1.id).length}\neffect=${effect}\nprocessed=${processed}`,
    );

    if (createdJobs.length !== 1 || createdOutboxes.length !== 1 || published.length !== 1 || effect !== 1 || processed !== 1) throw new Error('Outbox invariant failed');
  } catch (e) {
    console.error(e);
    process.exitCode = 1;
  } finally {
    await listener.end().catch(() => undefined);
    if (dataSource.isInitialized) await dataSource.destroy();
  }
}

await twoRequests();
