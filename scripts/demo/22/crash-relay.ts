import { CreateTest, Helper } from './helper.js';
import { QuestionType } from '../../../src/types/temporary.js';
import { randomUUID } from 'crypto';
import { Client } from 'pg';
import { GenerationJobCreatedEvent } from '../../../src/contracts/generation/events.js';
import {
  BRAKE_OUTBOX_RELAY_NUM,
  GENERATION_JOB_DELIVERIES_CHANNEL,
} from '../../../src/utils/demos.js';

const payload: CreateTest = {
  questionCount: BRAKE_OUTBOX_RELAY_NUM,
  questionType: QuestionType.MultipleChoice,
  files: [],
};

async function crashRelay() {
  const helper = new Helper();
  const dataSource = helper.dataSource;
  const listener = new Client({
    host: process.env.POSTGRES_HOST,
    user: process.env.POSTGRES_ADMIN,
    password: process.env.POSTGRES_ADMIN_PASSWORD,
    database: process.env.POSTGRES_DB,
  });
  const deliveries: GenerationJobCreatedEvent[] = [];
  const idempotencyKey = randomUUID();
  try {
    await dataSource.initialize();
    await listener.connect();
    listener.on('notification', (message) => {
      if (
        message.channel === GENERATION_JOB_DELIVERIES_CHANNEL &&
        message.payload
      ) {
        deliveries.push(
          JSON.parse(message.payload) as GenerationJobCreatedEvent,
        );
      }
    });
    await listener.query(`LISTEN ${GENERATION_JOB_DELIVERIES_CHANNEL}`);

    const user = await helper.getUserWithDocuments();

    if (!user) {
      throw new Error('No users with documents');
    }

    payload.files.push(user.documents[0].id);
    const result = await helper.createTest(payload, idempotencyKey, user.id);
    await new Promise<void>((resolve) => {
      const finish = () => {
        clearTimeout(timeout);
        listener.off('notification', check);
        resolve();
      };
      const check = () => {
        if (deliveries.filter((event) => event.id === result.id).length >= 2) {
          finish();
        }
      };
      const timeout = setTimeout(finish, 10_000);
      listener.on('notification', check);
      check();
    });

    const deadline = Date.now() + 10000;
    while (Date.now() < deadline) {
      const rows = await helper.getOutboxByJobId(result.id);
      if (rows.some((row) => row.publishedAt) && await helper.getInboxByJobId(result.id)) break;
      await new Promise((resolve) => setTimeout(resolve, 200));
    }
    const createdJobs = await helper.getJobs(result.id);
    const createdOutboxes = await helper.getOutboxByJobId(result.id);
    const processed = await helper.getInboxByJobId(result.id);
    const applied = Number(createdJobs.some((job) => job.status !== 'queued'));
    const received = deliveries.filter((event) => event.id === result.id);

    const published = createdOutboxes.filter(
      (outbox) => outbox.publishedAt !== null,
    );
    console.log(`published=${published.length}\ndeliveries=${received.length}\napplied=${applied}\neffect=${applied}\nprocessed=${processed}`);
    if (published.length !== 1 || received.length < 2 || applied !== 1 || processed !== 1) throw new Error('Relay invariant failed');
  } catch (e) {
    console.error(e);
    process.exitCode = 1;
  } finally {
    await listener.end();
    if (dataSource.isInitialized) await dataSource.destroy();
  }
}

await crashRelay();
