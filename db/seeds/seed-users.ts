import { fakerUK } from '@faker-js/faker';
import { Readable } from 'node:stream';
import { pipeline } from 'node:stream/promises';
import type { Client } from 'pg';
import { from as copyFrom } from 'pg-copy-streams';
import { escapeCsv } from '../../src/utils/escape-csv.js';

const USERS_COUNT = 100_000;

async function* generateUsers() {
  fakerUK.seed(42);
  for (let i = 1; i <= USERS_COUNT; i++) {
    const row = [
      i + fakerUK.internet.email(),
      fakerUK.person.firstName(),
      fakerUK.person.lastName(),
      `pswd_hash_${i}`,
      fakerUK.date.past({ years: 2 }).toISOString()
    ].map(escapeCsv).join(',');

    yield row + '\n';
  }
}

export async function seedUsers(client: Client) {
  const copyStream = client.query(
    copyFrom(
      `COPY users (email, first_name, last_name, password_hash, created_at) FROM STDIN WITH (FORMAT CSV)`,
    ),
  );
  const usersStream = Readable.from(generateUsers());
  await pipeline(usersStream, copyStream);
  await client.query('VACUUM(ANALYSE) users');

  console.log(`Seeded ${USERS_COUNT} users`);
}

