import { Verifier } from '@pact-foundation/pact';
import { INestApplication } from '@nestjs/common';
import { StartedPostgreSqlContainer } from '@testcontainers/postgresql';
import { DataSource } from 'typeorm';
import { initializeTestDatabase } from '../test/utils/init-db.js';
import { Test, TestingModule } from '@nestjs/testing';
import { AppModule } from '../src/app.module.js';
import { getDataSourceToken } from '@nestjs/typeorm';

import { seedUsers } from '../db/seeds/seed-users.js';
import { Client } from 'pg';

describe('Provider Verification', () => {
  let app: INestApplication;
  let container: StartedPostgreSqlContainer;
  let dataSource: DataSource;
  let client: Client;

  beforeAll(async () => {
    ({ container, dataSource, client } = await initializeTestDatabase());
    process.env.POSTGRES_HOST = container.getHost();
    process.env.POSTGRES_PORT = String(container.getPort());
    process.env.POSTGRES_USER = container.getUsername();
    process.env.POSTGRES_DB = container.getDatabase();

    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(getDataSourceToken())
      .useValue(dataSource)
      .compile();

    await seedUsers(client, 10);

    app = moduleFixture.createNestApplication();
    await app.listen(0, '127.0.0.1');
  }, 20_000);

  it('passes consumer expectations', async () => {
    const providerBaseUrl = await app.getUrl();
    const pact = new Verifier({
      provider: 'tests-api',
      pactBrokerUrl: `http://localhost:${process.env.PACT_BROKER_PORT}`,
      providerBaseUrl,
      publishVerificationResult: process.env.CI === 'true',
      providerVersion: '0.1',
      consumerVersionSelectors: [
        {
          mainBranch: true,
        },
      ],
    });

    return pact.verifyProvider();
  }, 60_000);

  afterAll(async () => {
    await app?.close();
    await container?.stop();
  }, 30_000);
});
