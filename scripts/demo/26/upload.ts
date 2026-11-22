import { Helper24 } from '../24/utils.js';
import { randomUUID } from 'crypto';
import { readFile } from 'node:fs/promises';
import createMd5FromFile from '../../../src/utils/create-md5-from-file.js';
import {
  DocumentStatus,
  DocumentUploadType,
} from '../../../src/entities/document.js';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { DEMO_MD5 } from '../../../src/storage/storage.service.js';

const execFileAsync = promisify(execFile);

async function main() {
  const helper = new Helper24();
  let apiStopped = false;
  process.env.API_PORT = '3000';

  try {
    await helper.waitForReady(3000);
    await helper.waitForReady(3001);
    await helper.dataSource.initialize();
    const signUpResult = await helper.signUp();

    if (!signUpResult.ok || !('data' in signUpResult)) {
      throw new Error(`Sign-up failed`);
    }

    const { accessToken } = signUpResult.data;
    const path = new URL('../parser/mock2.docx', import.meta.url);
    const path2 = new URL('../parser/mock.pdf', import.meta.url);
    const contentMd5 = await createMd5FromFile(path);
    const pdfMd5 = await createMd5FromFile(path2);
    const buffer = await readFile(path);
    const buffer2 = await readFile(path2);
    const fileName = 'mock.docx';
    let apiAlive = 0;

    const documents = [
      {
        name: fileName,
        contentType:
          'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        size: buffer.length,
        clientId: randomUUID(),
        contentMd5,
      },
      {
        name: 'pdf.pdf',
        contentType: 'application/pdf',
        size: buffer2.length,
        clientId: randomUUID(),
        contentMd5: pdfMd5,
      },
      {
        name: fileName,
        contentType:
          'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        size: buffer.length,
        clientId: randomUUID(),
        contentMd5: DEMO_MD5,
      },
    ];

    const results = await helper.intentUploads({ documents }, accessToken);
    const intentStatus = results.status;

    if (!results.ok || !('data' in results)) {
      throw new Error('failed to upload');
    }

    let keyFromServer = 0;

    if (
      results.data[0].status === DocumentStatus.Pending &&
      results.data[0].type === DocumentUploadType.Single
    ) {
      const includesFileName = results.data[0].uploadUrl.includes(fileName);

      if (!includesFileName) {
        keyFromServer = 1;
      }
    }
    const documentIdsToCommit: string[] = [];
    let putOffline = 500;
    let tamperedUrl = '';
    let tamperedStatus = 200;

    await execFileAsync('docker', ['compose', 'stop', 'api']);
    apiStopped = true;
    try {
      const response = await helper.get('/health');
      apiAlive = Number(response.status === 200);
    } catch {
      apiAlive = 0;
    }

    process.env.API_PORT = '3001';

    for (const result of results.data.slice(0, 1)) {
      if ('uploadUrl' in result) {
        if (!tamperedUrl) {
          tamperedUrl = result.uploadUrl;
        }
        const document = documents.find(
          (document) => document.clientId === result.clientId,
        );

        if (!document) {
          throw new Error(
            `Document with clientId: ${result.clientId} doesn't exist`,
          );
        }

        const signedHeaders = new URL(result.uploadUrl).searchParams.get(
          'X-Amz-SignedHeaders',
        );

        console.log('signed-headers:', signedHeaders);

        const putResult = await helper.putToS3(result.uploadUrl, buffer, {
          'Content-Type': document.contentType,
          'Content-MD5': document.contentMd5,
        });
        putOffline = putResult.status;
        documentIdsToCommit.push(result.id);
        if (results.data[1] && 'id' in results.data[1]) {
          documentIdsToCommit.push(results.data[1].id);
        }
      }
    }
    const document = documents[0];
    const tamperedUrlObject = new URL(tamperedUrl);

    tamperedUrlObject.pathname += '-tampered';

    const tamperedResponse = await fetch(tamperedUrlObject, {
      method: 'PUT',
      body: buffer,
      headers: {
        'Content-Type': document.contentType,
        'Content-MD5': document.contentMd5,
      },
    });

    tamperedStatus = tamperedResponse.status;

    if (!('uploadUrl' in results.data[2])) {
      throw new Error('Missing expired upload url');
    }

    const expiredPresignedUrl = results.data[2].uploadUrl;
    const expiredPresignedUrlObject = new URL(expiredPresignedUrl);

    const expiredResponse = await fetch(expiredPresignedUrlObject, {
      method: 'PUT',
      body: buffer,
      headers: {
        'Content-Type': document.contentType,
        'Content-MD5': document.contentMd5,
      },
    });

    const expiredStatus = expiredResponse.status;

    const commited = await helper.bulkCommit(documentIdsToCommit, accessToken);
    const commitedStatus = commited.status;

    if (!commited.ok || !('data' in commited)) {
      throw new Error('Failed to cmmmit');
    }

    const notUploaded = commited.data.find(
      (doc) => doc.id === documentIdsToCommit[1],
    );
    const missingBytesItemRejected = Number(
      notUploaded?.status === DocumentStatus.Failed,
    );

    console.log('intent=', intentStatus);
    console.log('key-from-server=', keyFromServer);
    console.log('api-alive=', apiAlive);
    console.log('put-offline=', putOffline);
    console.log('commit=', commitedStatus);
    console.log('commit-without-bytes=', commitedStatus);
    console.log('commit-without-bytes-item-rejected=', missingBytesItemRejected);
    console.log(
      `Bulk commit returned HTTP ${commitedStatus}; the missing file was rejected in its item result.`,
    );
    console.log('tampered=', tamperedStatus);
    console.log('expired=', expiredStatus);

    const checks = {
      intent: intentStatus === 200,
      keyFromServer: keyFromServer === 1,
      apiAlive: apiAlive === 0,
      putOffline: putOffline === 200,
      commit: commitedStatus === 200,
      withoutBytes:
        commitedStatus === 200 && missingBytesItemRejected === 1,
      tampered: tamperedStatus === 403,
      expired: expiredStatus === 403,
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
    if (apiStopped) {
      try {
        await execFileAsync('docker', ['compose', 'start', 'api']);
      } catch (error) {
        console.error('Failed to restart api:', error);
        process.exitCode = 1;
      }
    }
    if (helper.dataSource.isInitialized) {
      await helper.dataSource.destroy();
    }
  }
}

await main();
