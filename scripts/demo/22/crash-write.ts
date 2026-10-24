import { CreateTest, Helper } from './helper.js';
import { QuestionType } from '../../../src/types/temporary.js';
import { randomUUID } from 'crypto';
import { asyncTimeout } from '../../../src/utils/async-timeout.js';
import { BRAKE_TRANSACTION_NUM } from '../../../src/utils/demos.js';

const payload: CreateTest = {
  questionCount: BRAKE_TRANSACTION_NUM,
  questionType: QuestionType.MultipleChoice,
  files: [],
};

async function crashWrite() {
  const helper = new Helper();
  const dataSource = helper.dataSource;
  const idempotencyKey = randomUUID();
  try {
    await dataSource.initialize();

    const user = await helper.getUserWithDocuments();

    if (!user) {
      throw new Error('No users with documents');
    }

    payload.files.push(user.documents[0].id);
    const result = await helper.createTest(payload, idempotencyKey);
    const createdJobs = await helper.getJobs(result.id);
    const createdOutboxes = await helper.getOutboxByJobId(result.id);

    if (createdJobs.length > 0 || createdOutboxes.length > 0) {
      process.exit(1);
    }

    await asyncTimeout(1000);

    const published = createdOutboxes.filter(
      (outbox) => outbox.publishedAt !== null,
    );
    const processed = Math.max(
      ...createdOutboxes.map((outbox) => outbox.attempts),
      0,
    );

    console.log(
      `write-failed=1 generationJobs=${createdJobs.length} outbox=${createdOutboxes.length} published=${published.length} effect=${createdOutboxes.length} deliveries=${processed}`,
    );

    process.exit(0);
  } catch (e) {
    console.log(e);
  } finally {
    await dataSource.destroy();
  }
}

await crashWrite();
