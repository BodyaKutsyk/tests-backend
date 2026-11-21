import { Helper24, UploadFileMultipartResponse } from '../24/utils.js';
import { randomUUID } from 'crypto';
import { readFile } from 'node:fs/promises';
import createMd5FromFile from '../../../src/utils/create-md5-from-file.js';
import {
  DocumentStatus,
  DocumentUploadType,
} from '../../../src/entities/document.js';

async function main() {
  const helper = new Helper24();

  try {
    await helper.dataSource.initialize();
    const signUpResult = await helper.signUp();

    if (!signUpResult.ok || !('data' in signUpResult)) {
      throw new Error(`Sign-up failed`);
    }

    const { accessToken } = signUpResult.data;
    const path = new URL('../parser/6mb.pdf', import.meta.url);
    const contentMd5 = await createMd5FromFile(path);
    const buffer = await readFile(path);
    const fileName = '6mb.pdf';
    const blob = new Blob([buffer], { type: 'application/octet-stream' });

    const documents = [
      {
        name: fileName,
        contentType: 'application/pdf',
        size: buffer.length,
        clientId: randomUUID(),
        contentMd5,
      },
    ];

    const results = await helper.intentUploads({ documents }, accessToken);

    if (!results.ok || !('data' in results)) {
      throw new Error('Failed to intend upload');
    }

    const intendUpload = results.data[0] as UploadFileMultipartResponse;

    if (
      intendUpload.status === 'pending' &&
      intendUpload.type !== DocumentUploadType.Multipart
    ) {
      throw new Error('Invalid upload type');
    }

    if (!results.ok || !('data' in results)) {
      throw new Error('failed to upload');
    }

    const documentIdsToCommit: string[] = [];

    for (const result of results.data) {
      const document = documents.find(
        (document) => document.clientId === result.clientId,
      );

      if (!document) {
        throw new Error(
          `Document with clientId: ${result.clientId} doesn't exist`,
        );
      }

      if ('type' in result && result.type === DocumentUploadType.Multipart) {
        await helper.uploadMultipart(
          blob,
          result as UploadFileMultipartResponse,
          0,
          1,
        );
        documentIdsToCommit.push(result.id);
      }
    }

    const commited = await helper.bulkCommit(documentIdsToCommit, accessToken);

    if (!commited.ok || !('data' in commited)) {
      throw new Error('Failed to cmmmit');
    }

    const headBeforeComplete = String(
      commited.data[0].status === DocumentStatus.Failed,
    );

    if (!('errors' in commited.data[0])) {
      throw new Error('Invalid multipart check');
    }

    const match = commited.data[0].errors[0].match(
      /Expected:\s*(\d+),\s*received:\s*(\d+)/i,
    );
    if (!match) {
      throw new Error('Invalid error response, expected parts missmatch');
    }

    const expected = Number(match[1]);
    const received = Number(match[2]);

    await helper.uploadMultipart(
      blob,
      results.data[0] as UploadFileMultipartResponse,
      received,
      expected,
    );

    const commitedRetry = await helper.bulkCommit(
      documentIdsToCommit,
      accessToken,
    );

    if (!commitedRetry.ok || !('data' in commitedRetry)) {
      throw new Error('Invalid commit retry');
    }
    const fileMatch = commitedRetry.data.reduce(
      (prev, curr) => prev + Number(curr.status === DocumentStatus.Completed),
      0,
    );

    const completeStatus = commitedRetry.status;
    const multipartCompleted = Number(
      commitedRetry.ok &&
        'data' in commitedRetry &&
        commitedRetry.data[0]?.status === DocumentStatus.Completed,
    );

    console.log('head-before-complete=', headBeforeComplete);
    console.log('resumed-parts=', expected - received);
    console.log('complete=', completeStatus);
    console.log('file-match=', fileMatch);
    console.log('multipart-completed=', multipartCompleted);

    const checks = {
      headBeforeComplete: headBeforeComplete === 'true',
      resumedParts: expected - received === 1,
      complete: completeStatus === 200,
      fileMatch: fileMatch === 1,
      multipartCompleted: multipartCompleted === 1,
    } satisfies Record<string, boolean>;

    const failedChecks = Object.entries(checks)
      .filter(([, passed]) => !passed)
      .map(([name]) => name);

    if (failedChecks.length > 0) {
      console.log(`failed-checks=${failedChecks.join(', ')}`);
    }

    process.exitCode = failedChecks.length === 0 ? 0 : 1;
  } catch (e) {
    console.error(e);
    process.exitCode = 1;
  } finally {
    if (helper.dataSource.isInitialized) {
      await helper.dataSource.destroy();
    }
  }
}

await main();
