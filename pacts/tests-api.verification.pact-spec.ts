import { Verifier } from '@pact-foundation/pact';
import { INestApplication } from '@nestjs/common';
import { StartedPostgreSqlContainer } from '@testcontainers/postgresql';
import { DataSource } from 'typeorm';
import { initializeTestDatabase } from '../test/utils/init-db.js';
import { Test, TestingModule } from '@nestjs/testing';
import { AppModule } from '../src/app.module.js';
import { getDataSourceToken } from '@nestjs/typeorm';

describe('Provider Verification', () => {
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
          latest: true,
        },
      ],
    });

    return pact.verifyProvider();
  });

  afterAll(async () => {
    await app.close();
    await container?.stop();
  });
});
