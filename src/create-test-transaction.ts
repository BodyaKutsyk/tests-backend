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
        isCorrect: true,
        value: 'Non-repeatable read',
      },
      {
        isCorrect: false,
        value: 'Dirty read',
      },
      {
        isCorrect: false,
        value: 'No concurrent updates',
      },
      {
        isCorrect: false,
        value: 'All transactions are executed serially',
      },
    ],
  },
  {
    value: 'What does SELECT FOR UPDATE do in PostgreSQL?',
    answerOptions: [
      {
        isCorrect: true,
        value: 'Locks selected rows against conflicting updates and deletes',
      },
      {
        isCorrect: false,
        value: 'Locks the entire table',
      },
      {
        isCorrect: false,
        value: 'Deletes selected rows after reading them',
      },
      {
        isCorrect: false,
        value: 'Prevents all SELECT queries from reading the rows',
      },
    ],
  },
  {
    value: 'What is the main purpose of SELECT FOR SHARE?',
    answerOptions: [
      {
        isCorrect: true,
        value:
          'To lock rows while still allowing other transactions to acquire compatible shared locks',
      },
      {
        isCorrect: false,
        value: 'To exclusively lock rows for updates',
      },
      {
        isCorrect: false,
        value: 'To automatically commit a transaction',
      },
      {
        isCorrect: false,
        value: 'To skip all locked rows',
      },
    ],
  },
  {
    value: 'What does the NOWAIT option do when acquiring a row lock?',
    answerOptions: [
      {
        isCorrect: true,
        value: 'Immediately returns an error if the row is already locked',
      },
      {
        isCorrect: false,
        value: 'Waits until the lock becomes available',
      },
      {
        isCorrect: false,
        value: 'Ignores the existing lock',
      },
      {
        isCorrect: false,
        value: 'Automatically rolls back the other transaction',
      },
    ],
  },
  {
    value: 'What does SKIP LOCKED do?',
    answerOptions: [
      {
        isCorrect: true,
        value: 'Skips rows that are currently locked by another transaction',
      },
      {
        isCorrect: false,
        value: 'Removes locks from selected rows',
      },
      {
        isCorrect: false,
        value: 'Waits for all locked rows to become available',
      },
      {
        isCorrect: false,
        value: 'Locks all rows in the table',
      },
    ],
  },
  {
    value: 'What is a lost update?',
    answerOptions: [
      {
        isCorrect: true,
        value:
          'When one transaction overwrites changes made by another transaction',
      },
      {
        isCorrect: false,
        value: 'When a transaction reads uncommitted data',
      },
      {
        isCorrect: false,
        value: 'When a SELECT query returns no rows',
      },
      {
        isCorrect: false,
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
