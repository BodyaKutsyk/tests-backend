import { PostgreSqlContainer } from '@testcontainers/postgresql';
import { DataSource } from 'typeorm';
import { entitiesPath } from '../../src/data-source.js';
import { Client } from 'pg';
import { SnakeNamingStrategy } from 'typeorm-naming-strategies';

export async function initializeTestDatabase() {
  const container = await new PostgreSqlContainer('postgres:17-alpine').start();
  const dataSource = new DataSource({
    type: 'postgres',
    entities: [entitiesPath],
    synchronize: true,
    username: container.getUsername(),
    host: container.getHost(),
    port: container.getPort(),
    database: container.getDatabase(),
    password: container.getPassword(),
    namingStrategy: new SnakeNamingStrategy(),
  });
  await dataSource.initialize();
  const client: Client = await dataSource.createQueryRunner().connect();

  return { dataSource, client, container };
}
