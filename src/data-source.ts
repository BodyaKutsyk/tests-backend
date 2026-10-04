import { DataSource, type DataSourceOptions } from 'typeorm';
import { fileURLToPath } from 'url';
import { dirname, join } from 'node:path';
import { SnakeNamingStrategy } from 'typeorm-naming-strategies';
const filename = fileURLToPath(import.meta.url);
const __dirname = dirname(filename);

export const entitiesPath = join(__dirname, 'entities/**/*{.js,.ts}');

export const dataSourceOptions: DataSourceOptions = {
  type: 'postgres',
  host: process.env.POSTGRES_HOST || 'localhost',
  username: process.env.POSTGRES_ADMIN,
  password: process.env.POSTGRES_ADMIN_PASSWORD,
  database: process.env.POSTGRES_DB,
  synchronize: false,
  entities: [entitiesPath],
  namingStrategy: new SnakeNamingStrategy(),
  migrations: [`dist/migrations/**/*{.js,.ts}`],
};

export default new DataSource(dataSourceOptions);
