import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from '../../src/app.module.js';
import { StartedPostgreSqlContainer } from '@testcontainers/postgresql';
import { DataSource } from 'typeorm';
import { initializeTestDatabase } from '../utils/init-db.js';
import { getDataSourceToken } from '@nestjs/typeorm';
import { randomUUID } from 'crypto';
import { CreateUserDto } from '../../src/users/types/user.dto.js';

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

  it('throws 422 on invalid uuid /users/:id (GET)', async () => {
    return request(app.getHttpServer()).get('/users/0').expect(422);
  });

  it('throws 404 on non-existing id /users/:id (GET)', async () => {
    return request(app.getHttpServer())
      .get(`/users/${randomUUID()}`)
      .expect(404);
  });

  it('successfully creates user and it`s quotas /users (POST)', async () => {
    const user: CreateUserDto = {
      firstName: 'Jane',
      lastName: 'Doe',
      email: 'test@test.com',
      password: '12345678',
    };
    const response = await request(app.getHttpServer())
      .post('/users')
      .send(user);
    expect(response.statusCode).toBe(201);
    expect(response.body).toHaveProperty('quotas');
    expect(response.body.quotas.length).toBe(2);
  });

  afterEach(async () => {
    await app.close();
    await container?.stop();
  });
});
