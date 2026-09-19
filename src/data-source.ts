import { DataSource, DataSourceOptions } from 'typeorm';

const entities = new URL('./enteties/**/*{.js,.ts}', import.meta.url).pathname;
const migrations = new URL('./migrations/**/*{.js,.ts}', import.meta.url).pathname;

export const dataSourceOptions: DataSourceOptions = {
  type: 'postgres',
  host: 'db',
  username: process.env.POSTGRES_ADMIN,
  password: process.env.POSTGRES_ADMIN_PASSWORD,
  database: process.env.POSTGRES_DB,
  synchronize: false,
  entities: [entities],
  migrations: [migrations]
}

export default new DataSource(dataSourceOptions);

