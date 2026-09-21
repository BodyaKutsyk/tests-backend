import {Client} from 'pg'
import { seedUsers } from './seeds/seed-users.js';
import { seedDocuments } from './seeds/seed-documents.js';
import { seedTests } from './seeds/seed-tests.js';

const client = new Client({
  host: process.env.POSTGRES_HOST || 'localhost',
  database: process.env.POSTGRES_DB,
  user: process.env.POSTGRES_ADMIN,
  password: process.env.POSTGRES_ADMIN_PASSWORD,
});

async function seed() {
  await client.connect();
  const result = await client.query('SELECT EXISTS (SELECT 1 FROM users)');
  const isSeeded = result.rows[0].exists;

  if (isSeeded) {
    console.log('The database has already been seeded')
    process.exit()
  }

  try {
   await seedUsers(client);
   await seedDocuments(client);
   await seedTests(client);
  } finally {
    await client.end();
    console.log('Successfully seeded the database')
  }
}

seed().catch((error) => {
  console.error(error);
  process.exit(1);
})