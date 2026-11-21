import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { DataSource } from 'typeorm';
import { StartedPostgreSqlContainer } from '@testcontainers/postgresql';
import { Client } from 'pg';
import { User } from '../entities/user.js';
import { initializeTestDatabase } from '../../test/utils/init-db.js';
import { QuestionType } from '../types/temporary.js';
import { TypeOrmModule } from '@nestjs/typeorm';
import { TestsModule } from './tests.module.js';
import { GenerationJobStatus } from '../entities/generation-job.js';

describe('TestsController (e2e)', () => {
  let app: INestApplication;
  let moduleRef: TestingModule;
  let dataSource: DataSource;
  let container: StartedPostgreSqlContainer;
  let client: Client;
  let user: User;
  let generationJobId: string;

  beforeAll(async () => {
    ({ container, client, dataSource } = await initializeTestDatabase());

    moduleRef = await Test.createTestingModule({
      imports: [
        TypeOrmModule.forRootAsync({
          useFactory: () => dataSource.options,
          dataSourceFactory: async () => dataSource,
        }),
        TestsModule,
      ],
    }).compile();

    const userRepo = dataSource.getRepository(User);

    user = await userRepo.save(
      userRepo.create({
        firstName: 'Jane',
        lastName: 'Doe',
        email: 'suspicious@email.com',
        passwordHash: 'strong_password',
        documents: [
          {
            name: 'test.txt',
            mimeType: 'test',
            storageKey: `test/${Date.now()}`,
            size: 1024,
          },
        ],
      }),
    );

    app = moduleRef.createNestApplication();

    await app.listen(0, '127.0.0.1');
  });

  it('creates test', async () => {
    const fileIds = user.documents.map((doc) => doc.id);

    const response = await request(app.getHttpServer())
      .post('/tests')
      .set('user-id', user.id)
      .send({
        questionType: QuestionType.MultipleChoice,
        questionCount: 10,
        files: fileIds,
        userId: user.id,
      })
      .expect(202);

    generationJobId = response.body.id;

    expect(response.body).toHaveProperty('id');
    expect(response.body).toHaveProperty('status');
    expect(response.body).toHaveProperty('createdAt');

    expect(response.body.status).toBe(GenerationJobStatus.Queued);

    expect(response.headers.location).toBe(
      `/generation-jobs/${generationJobId}`,
    );
  });

  it('receives job status via SSE', async () => {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 12000);

    try {
      const response = await fetch(
        `${await app.getUrl()}/tests/${generationJobId}/events`,
        {
          headers: { Accept: 'text/event-stream' },
          signal: controller.signal,
        },
      );

      expect(response.status).toBe(200);
      expect(response.headers.get('content-type')).toContain(
        'text/event-stream',
      );

      const reader = response
        .body!.pipeThrough(new TextDecoderStream())
        .getReader();

      let buffer = '';

      while (true) {
        const { value, done } = await reader.read();

        if (done) {
          throw new Error('SSE closed before receiving an event');
        }

        buffer += value;

        const frames = buffer.split(/\r?\n\r?\n/);
        buffer = frames.pop() ?? '';

        for (const frame of frames) {
          const dataLine = frame
            .split(/\r?\n/)
            .find((line) => line.startsWith('data:'));

          if (!dataLine) continue;

          const event = JSON.parse(dataLine.slice(5).trim());

          expect(event.id).toBe(generationJobId);
          expect(event.status).toBe(GenerationJobStatus.Parsing);

          return;
        }
      }
    } finally {
      clearTimeout(timeout);
      controller.abort();
    }
  }, 15000);
});
