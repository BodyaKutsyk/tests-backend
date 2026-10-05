import { User } from './entities/user.js';
import { Test } from './entities/test.js';
import { DataSource } from 'typeorm';
import { Quota, QuotaType } from './entities/quota.js';
import { GenerationJob, JobStatus } from './entities/generation-job.js';
import { QuestionType } from './types/temporary.js';

const questions = [
  {
    value: 'Which phenomenon can occur at the READ COMMITTED isolation level?',
    answerOptions: [
      {
        is_correct: true,
        value: 'Non-repeatable read',
      },
      {
        is_correct: false,
        value: 'Dirty read',
      },
      {
        is_correct: false,
        value: 'No concurrent updates',
      },
      {
        is_correct: false,
        value: 'All transactions are executed serially',
      },
    ],
  },
  {
    value: 'What does SELECT FOR UPDATE do in PostgreSQL?',
    answerOptions: [
      {
        is_correct: true,
        value: 'Locks selected rows against conflicting updates and deletes',
      },
      {
        is_correct: false,
        value: 'Locks the entire table',
      },
      {
        is_correct: false,
        value: 'Deletes selected rows after reading them',
      },
      {
        is_correct: false,
        value: 'Prevents all SELECT queries from reading the rows',
      },
    ],
  },
  {
    value: 'What is the main purpose of SELECT FOR SHARE?',
    answerOptions: [
      {
        is_correct: true,
        value:
          'To lock rows while still allowing other transactions to acquire compatible shared locks',
      },
      {
        is_correct: false,
        value: 'To exclusively lock rows for updates',
      },
      {
        is_correct: false,
        value: 'To automatically commit a transaction',
      },
      {
        is_correct: false,
        value: 'To skip all locked rows',
      },
    ],
  },
  {
    value: 'What does the NOWAIT option do when acquiring a row lock?',
    answerOptions: [
      {
        is_correct: true,
        value: 'Immediately returns an error if the row is already locked',
      },
      {
        is_correct: false,
        value: 'Waits until the lock becomes available',
      },
      {
        is_correct: false,
        value: 'Ignores the existing lock',
      },
      {
        is_correct: false,
        value: 'Automatically rolls back the other transaction',
      },
    ],
  },
  {
    value: 'What does SKIP LOCKED do?',
    answerOptions: [
      {
        is_correct: true,
        value: 'Skips rows that are currently locked by another transaction',
      },
      {
        is_correct: false,
        value: 'Removes locks from selected rows',
      },
      {
        is_correct: false,
        value: 'Waits for all locked rows to become available',
      },
      {
        is_correct: false,
        value: 'Locks all rows in the table',
      },
    ],
  },
  {
    value: 'What is a lost update?',
    answerOptions: [
      {
        is_correct: true,
        value:
          'When one transaction overwrites changes made by another transaction',
      },
      {
        is_correct: false,
        value: 'When a transaction reads uncommitted data',
      },
      {
        is_correct: false,
        value: 'When a SELECT query returns no rows',
      },
      {
        is_correct: false,
        value: 'When PostgreSQL deletes an old row version',
      },
    ],
  },
  {
    value: 'Which query performs an atomic increment of a counter?',
    answerOptions: [
      {
        is_correct: true,
        value: 'UPDATE users SET score = score + 1 WHERE id = 1',
      },
      {
        is_correct: false,
        value: 'SELECT score FROM users WHERE id = 1',
      },
      {
        is_correct: false,
        value: 'SELECT score + 1 FROM users WHERE id = 1',
      },
      {
        is_correct: false,
        value: 'UPDATE users SET score = 1 WHERE id = 1',
      },
    ],
  },
  {
    value: 'What is a database deadlock?',
    answerOptions: [
      {
        is_correct: true,
        value:
          'A situation where transactions wait for each other to release locks',
      },
      {
        is_correct: false,
        value: 'A transaction that takes too long to execute',
      },
      {
        is_correct: false,
        value: 'A table without indexes',
      },
      {
        is_correct: false,
        value: 'A failed connection to the database',
      },
    ],
  },
  {
    value: 'What does the RETURNING clause do in PostgreSQL?',
    answerOptions: [
      {
        is_correct: true,
        value: 'Returns values from rows affected by INSERT, UPDATE, or DELETE',
      },
      {
        is_correct: false,
        value: 'Rolls back the transaction',
      },
      {
        is_correct: false,
        value: 'Returns the previous SQL query',
      },
      {
        is_correct: false,
        value: 'Releases all row locks',
      },
    ],
  },
  {
    value:
      'Which lock is weaker than FOR UPDATE and allows updates that do not change key values?',
    answerOptions: [
      {
        is_correct: true,
        value: 'FOR KEY SHARE',
      },
      {
        is_correct: false,
        value: 'FOR UPDATE',
      },
      {
        is_correct: false,
        value: 'ACCESS EXCLUSIVE',
      },
      {
        is_correct: false,
        value: 'FOR SHARE',
      },
    ],
  },
];

export async function createTestTransaction(dataSource: DataSource) {
  await dataSource.transaction('READ COMMITTED', async (manager) => {
    const userRepo = manager.getRepository(User);
    const testRepo = manager.getRepository(Test);
    const generationJobRepo = manager.getRepository(GenerationJob);
    const user = await userRepo.findOneOrFail({ where: {} });

    const result = await manager
      .createQueryBuilder()
      .update(Quota)
      .set({
        used: () => '"used" + 1024',
      })
      .where('"user_id" = :userId', { userId: user.id })
      .andWhere('"quota_type" = :quotaType', {
        quotaType: QuotaType.Storage,
      })
      .andWhere('"used" + 1024 <= "max_limit"')
      .returning('*')
      .execute();

    if (result.affected === 0) {
      throw new Error('Quota exceeded');
    }
    const generationJob = await generationJobRepo.save({
      user: { id: user.id },
      questionCount: questions.length,
      questionType: QuestionType.MultipleChoice,
      status: JobStatus.Queued,
    });

    generationJob.test = await testRepo.save({
      name: 'Learn transaction isolation',
      user,
      questions,
    });
    await generationJobRepo.save(generationJob);
  });
}
