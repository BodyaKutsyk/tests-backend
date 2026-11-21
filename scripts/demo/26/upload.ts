import { Helper24 } from '../24/utils.js';
import { randomUUID } from 'crypto';
import { readFile } from 'node:fs/promises';
import createMd5FromFile from '../../../src/utils/create-md5-from-file.js';

async function main() {
  const helper = new Helper24();

  try {
    await helper.dataSource.initialize();
    const signUpResult = await helper.signUp();

    if (!signUpResult.ok || !('data' in signUpResult)) {
      throw new Error(`Sign-up failed`);
    }

    const { accessToken } = signUpResult.data;

    const path = new URL('../parser/mock2.docx', import.meta.url);
    const contentMd5 = await createMd5FromFile(path);
    const buffer = await readFile(path);

    const documents = [
      {
        name: 'sample.docx',
        contentType: 'application/msword',
        size: 1,
        clientId: randomUUID(),
        contentMd5,
      },
      {
        name: 'sample.docx',
        contentType: 'application/error',
        size: 1,
        clientId: randomUUID(),
        contentMd5,
      },
    ];

    const results = await helper.intentUploads({ documents }, accessToken);

    if (!results.ok || !('data' in results)) {
      throw new Error('failed to upload');
    }

    const documentIdsToCommit: string[] = [];

    for (const result of results.data) {
      if ('uploadUrl' in result) {
        const document = documents.find(
          (document) => document.clientId === result.clientId,
        );

        if (!document) {
          throw new Error(
            `Document with clientId: ${result.clientId} doesn't exist`,
          );
        }

        await helper.putToS3(result.uploadUrl, buffer, {
          'Content-Type': document.contentType,
          'Content-MD5': document.contentMd5,
        });
        documentIdsToCommit.push(result.id);
        console.log('uploaded');
      }
    }

    const commited = await helper.bulkCommit(documentIdsToCommit, accessToken);

    console.log(commited);
  } catch (e) {
    console.log(e);
  } finally {
    await helper.dataSource.destroy();
  }
}

await main();
