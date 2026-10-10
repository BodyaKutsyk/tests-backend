import { DataSource, type DataSourceOptions } from 'typeorm';
import { fileURLToPath } from 'url';
import { dirname, join } from 'node:path';
import fs from 'node:fs';
import { SnakeNamingStrategy } from 'typeorm-naming-strategies';

const filename = fileURLToPath(import.meta.url);
const __dirname = dirname(filename);
const isDocker = fs.existsSync('/.dockerenv');
const directHost = isDocker ? 'db' : '127.0.0.1';

export const entitiesPath = join(__dirname, 'entities/**/*{.js,.ts}');

export const dataSourceOptions: DataSourceOptions = {
  type: 'postgres',
  host: directHost,
  username: process.env.POSTGRES_ADMIN,
  password: process.env.POSTGRES_ADMIN_PASSWORD,
  database: process.env.POSTGRES_DB,
  synchronize: false,
  entities: [entitiesPath],
  namingStrategy: new SnakeNamingStrategy(),
  migrations: [`dist/migrations/**/*{.js,.ts}`],
};

export default new DataSource(dataSourceOptions);
