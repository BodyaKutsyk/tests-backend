import {Client} from 'pg'
import { seedUsers } from './seeds/seed-users.js';
import { seedDocuments } from './seeds/seed-documents.js';
import { seedTests } from './seeds/seed-tests.js';
import * as process from 'node:process';

const client = new Client({
  host: 'db',
  database: process.env.POSTGRES_DB,
  user: process.env.POSTGRES_ADMIN,
  password: process.env.POSTGRES_ADMIN_PASSWORD,
});

async function seed() {
  await client.connect();
  const result = await client.query('SELECT EXISTS (SELECT 1 FROM users)');
  const isSeeded = result.rows[0].exists;

  if (isSeeded) {
    process.exit(2)
  };

  try {
   await seedUsers(client);
   await seedDocuments(client);
   await seedTests(client);
  } finally {
    await client.end();
  }
}

seed().catch((error) => {
  console.error(error);
  process.exit(1);
})