import { DataSource, type DataSourceOptions } from 'typeorm';
import { fileURLToPath } from 'url';
import { dirname } from 'node:path'

const filename = fileURLToPath(import.meta.url);
const __dirname = dirname(filename);

console.log(__dirname)

export const dataSourceOptions: DataSourceOptions = {
  type: 'postgres',
  host: process.env.POSTGRES_HOST,
  username: process.env.POSTGRES_ADMIN,
  password: process.env.POSTGRES_ADMIN_PASSWORD,
  database: process.env.POSTGRES_DB,
  synchronize: false,
  entities: [`dist/entities/**/*{.js,.ts}`],
  migrations: [`dist/migrations/**/*{.js,.ts}`]
};

export default new DataSource(dataSourceOptions);

