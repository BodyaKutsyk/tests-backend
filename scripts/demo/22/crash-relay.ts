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

    const createdJobs = await helper.getJobs(result.id);
    const createdOutboxes = await helper.getOutboxByJobId(result.id);
    const applied = await helper.getInboxByJobId(result.id);
    const received = deliveries.filter((event) => event.id === result.id);

    const published = createdOutboxes.filter(
      (outbox) => outbox.publishedAt !== null,
    );
    const processed = Math.max(
      ...createdOutboxes.map((outbox) => outbox.attempts),
      0,
    );

    console.log('Consumer received:', received);
    console.log(
      `generationJobs=${createdJobs.length} outbox=${createdOutboxes.length} published=${published.length} deliveries=${received.length} applied=${applied} effect=${createdOutboxes.length} processed=${processed}`,
    );
  } catch (e) {
    console.error(e);
    process.exitCode = 1;
  } finally {
    await listener.end();
    if (dataSource.isInitialized) await dataSource.destroy();
  }
}

await crashRelay();
