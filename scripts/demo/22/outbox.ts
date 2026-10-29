import { CreateTest, Helper } from './helper.js';
import { QuestionType } from '../../../src/types/temporary.js';
import { randomUUID } from 'crypto';
import { asyncTimeout } from '../../../src/utils/async-timeout.js';

const payload: CreateTest = {
  questionCount: 20,
  questionType: QuestionType.MultipleChoice,
  files: [],
};

async function twoRequests() {
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
    const job = helper.createTest(payload, idempotencyKey);
    const [result1, result2] = await Promise.all([job, job]);

    if (result1.id !== result2.id) {
      process.exit(1);
    }

    await asyncTimeout(1000);

    const createdJobs = await helper.getJobs(result1.id);
    const createdOutboxes = await helper.getOutboxByJobId(result1.id);

    const published = createdOutboxes.filter(
      (outbox) => outbox.publishedAt !== null,
    );
    const processed = Math.max(
      ...createdOutboxes.map((outbox) => outbox.attempts),
    );

    console.log(
      `requests=2 generationJobs=${createdJobs.length} outbox=${createdOutboxes.length} published=${published.length} effect=${createdOutboxes.length} processed=${processed}`,
    );

    process.exit(0);
  } catch (e) {
    console.log(e);
  } finally {
    await dataSource.destroy();
  }
}

await twoRequests();
