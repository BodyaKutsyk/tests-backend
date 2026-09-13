import { faker } from '@faker-js/faker';
import { Readable } from 'node:stream';
import { pipeline } from 'node:stream/promises';
import type { Client } from 'pg';
import { from as copyFrom } from 'pg-copy-streams';
import { escapeCsv } from '../../src/utils/escape-csv.js';

const DOCUMENTS_COUNT = 100_000;

async function* generateDocuments(userIds: string[]) {
  faker.seed(42);
  for (let i = 1; i <= DOCUMENTS_COUNT; i++) {
    const extension = faker.system.fileExt();
    const fileName = faker.system.commonFileName()
    const fileMimeType = faker.system.mimeType();
    const fileSize = faker.number.int({ min: 1024, max: 10 * 1024 * 1024 })
    const fileStorageKey = `uploads/${faker.date.past().toISOString().slice(0, 7)}/${faker.string.uuid()}.${extension}`;
    const userId = faker.helpers.arrayElement(userIds);
    const row = [
      `${fileName}.${extension}`,
      fileMimeType,
      fileSize,
      fileStorageKey,
      userId
    ]
      .map(escapeCsv)
      .join(',');

    yield row + '\n';
  }
}

export async function seedDocuments(client: Client) {
  const { rows } = await client.query<{ id: string }>(
    'SELECT id FROM users LIMIT 1000',
  );
  const copyStream = client.query(
    copyFrom(
      `COPY documents (file_name, mime_type, size, storage_key, user_id) FROM STDIN WITH (FORMAT CSV)`,
    ),
  );
  const userIds = rows.map(({ id }) => id)
  const usersStream = Readable.from(generateDocuments(userIds));
  await pipeline(usersStream, copyStream);
  console.log(`Seeded ${DOCUMENTS_COUNT} documents`);
}
