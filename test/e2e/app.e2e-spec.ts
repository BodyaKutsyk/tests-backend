import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from '../../src/app.module.js';
import { StartedPostgreSqlContainer } from '@testcontainers/postgresql';
import { DataSource } from 'typeorm';
import { initializeTestDatabase } from '../utils/init-db.js';
import { getDataSourceToken } from '@nestjs/typeorm';
import { randomUUID } from 'crypto';

describe('AppController (e2e)', () => {
  let app: INestApplication;
  let container: StartedPostgreSqlContainer;
  let dataSource: DataSource;

  beforeEach(async () => {
    ({ container, dataSource } = await initializeTestDatabase());
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(getDataSourceToken())
      .useValue(dataSource)
      .compile();

    app = moduleFixture.createNestApplication();
    await app.init();
  });

  it('/ (GET)', () => {
    return request(app.getHttpServer())
      .get('/')
      .expect(200)
      .expect('Hello World!');
  });

  it('throws 400 on invalid uuid /users/:id (GET)', async () => {
    return request(app.getHttpServer()).get('/users/0').expect(400);
  });

  it('throws 404 on non-existing id /users/:id (GET)', async () => {
    return request(app.getHttpServer())
      .get(`/users/${randomUUID()}`)
      .expect(404);
  });

  afterEach(async () => {
    await app.close();
    await container?.stop();
  });
});
