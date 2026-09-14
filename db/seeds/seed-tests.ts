import { fakerUK as faker } from '@faker-js/faker';
import { Readable } from 'node:stream';
import { pipeline } from 'node:stream/promises';
import type { Client } from 'pg';
import { from as copyFrom } from 'pg-copy-streams';
import { escapeCsv } from '../../src/utils/escape-csv.js';

const TESTS_COUNT = 100_000;

function generateTestTitle() {
  const subjects = [
    'JavaScript',
    'TypeScript',
    'PostgreSQL',
    'Docker',
    'Cybersecurity',
    'React',
    'Node.js',
    'Networking',
    'Databases',
    'Software Testing',
  ];

  const levels = [
    'Основи',
    'Фундаментальний',
    'Essentials',
    'Просунутий',
    'Intermediate',
    'Оцінка',
    'Практика',
    'Перевірка знань',
  ];

  const titlePatterns = [
    () =>
      `${faker.helpers.arrayElement(subjects)} ${faker.helpers.arrayElement(levels)}`,

    () =>
      `${faker.helpers.arrayElement(subjects)}: ${faker.lorem.words({ min: 2, max: 4 })}`,

    () =>
      `${faker.helpers.arrayElement(levels)} in ${faker.helpers.arrayElement(subjects)}`,

    () =>
      `${faker.helpers.arrayElement(subjects)} ${faker.lorem.word()} ${faker.helpers.arrayElement(levels)}`,

    () =>
      `${faker.lorem.words({ min: 2, max: 3 })}: ${faker.helpers.arrayElement(subjects)}`,

    () =>
      `${faker.helpers.arrayElement(subjects)} — ${faker.lorem.words({ min: 2, max: 4 })}`,
  ];

  return faker.helpers.arrayElement(titlePatterns)();
}

async function* generateTests(userIds: string[], documentIds: string[]) {
  faker.seed(42);
  for (let i = 1; i <= TESTS_COUNT; i++) {
    const documentId = faker.helpers.arrayElement(documentIds);
    const userId = faker.helpers.arrayElement(userIds);
    const title = generateTestTitle();
    const createdAt = faker.date.past({ years: 1 }).toISOString();
    const row = [title, documentId, userId, createdAt].map(escapeCsv).join(',');

    yield row + '\n';
  }
}

export async function seedTests(client: Client) {
  const { rows: documentRows } = await client.query<{ id: string }>(
    'SELECT id FROM documents LIMIT 1000',
  );
  const { rows: userRows } = await client.query<{ id: string }>(
    'SELECT id FROM users LIMIT 1000',
  );
  const copyStream = client.query(
    copyFrom(
      `COPY tests (name, document_id, user_id, created_at) FROM STDIN WITH (FORMAT CSV)`,
    ),
  );
  const documentIds = documentRows.map(({ id }) => id);
  const userIds = userRows.map(({ id }) => id);

  const usersStream = Readable.from(generateTests(userIds, documentIds));
  await pipeline(usersStream, copyStream);
  await client.query('VACUUM(ANALYSE) tests');
  console.log(`Seeded ${TESTS_COUNT} tests`);
}
