import { randomUUID } from 'crypto';
import { GenerationJob } from '../../../src/entities/generation-job.js';
import { Outbox } from '../../../src/entities/outbox.js';
import { QuestionType } from '../../../src/types/temporary.js';
import { BRAKE_TRANSACTION_NUM } from '../../../src/utils/demos.js';
import { Helper } from './helper.js';

async function crashWrite() {
  const helper = new Helper();
  try {
    await helper.dataSource.initialize();
    const user = await helper.getUserWithDocuments();
    if (!user) throw new Error('No users with documents');


    const jobs = helper.dataSource.getRepository(GenerationJob);
    const outbox = helper.dataSource.getRepository(Outbox);
    const beforeJobs = await jobs.countBy({ questionCount: BRAKE_TRANSACTION_NUM, user: { id: user.id } });
    const beforeOutbox = await outbox.count();
    const response = await fetch(`http://localhost:${Number(process.env.API_PORT || 3000)}/tests`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'user-id': user.id, 'X-Idempotency-Key': randomUUID() },
      body: JSON.stringify({ questionCount: BRAKE_TRANSACTION_NUM, questionType: QuestionType.MultipleChoice, files: [user.documents[0].id] }),
    });
    if (response.status !== 500) throw new Error(`Expected transaction failure (500), got ${response.status}`);
    const newJobs = await jobs.countBy({ questionCount: BRAKE_TRANSACTION_NUM, user: { id: user.id } }) - beforeJobs;
    const newOutbox = await outbox.count() - beforeOutbox;
    console.log(`write-failed=1\norders=${newJobs}\noutbox=${newOutbox}\npublished=0\ndeliveries=0\neffect=0`);
    if (newJobs !== 0 || newOutbox !== 0) throw new Error('Transaction rollback failed');
  } catch (error) {
    console.error(error);
    process.exitCode = 1;
  } finally {
    if (helper.dataSource.isInitialized) await helper.dataSource.destroy();
  }
}

await crashWrite();
