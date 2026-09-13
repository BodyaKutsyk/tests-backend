import {Client} from 'pg'
import { seedUsers } from './seeds/seed-users.js';
import { seedDocuments } from './seeds/seed-documents.js';

const client = new Client({
  host: 'db',
  database: process.env.POSTGRES_DB,
  user: process.env.POSTGRES_ADMIN,
  password: process.env.POSTGRES_ADMIN_PASSWORD,
});

async function seed() {
  await client.connect();
  try {
   await seedUsers(client);
   await seedDocuments(client);
  } finally {
    await client.end();
  }
}

seed().catch((error) => {
  console.error(error);
  process.exit(1);
})