import { Helper24 } from '../24/utils.js';
import { randomUUID } from 'crypto';
import { QuestionType } from '../../../src/types/temporary.js';
import { readFile } from 'node:fs/promises';
import { asyncTimeout } from '../../../src/utils/async-timeout.js';

async function main() {
  const helper = new Helper24();

  try {
    await helper.dataSource.initialize();
    const signUpResult = await helper.signUp();

    if (!signUpResult.ok || !('data' in signUpResult)) {
      throw new Error(`Sign-up failed`);
    }

    const { accessToken: r1AccessToken, refreshToken: r1RefreshToken } =
      signUpResult.data;

    const jwtPayload = helper.decodeJwtPayload(r1AccessToken);
    const userId = jwtPayload.sub as string;

    const path = new URL('./mock2.docx', import.meta.url);
    const pdfBuffer = await readFile(path);

    const results = await helper.postFiles(
      [
        {
          buffer: pdfBuffer,
          filename: 'sample.docx',
          contentType: 'application/msword',
        },
        // {
        //   buffer: pdfBuffer,
        //   filename: 'sample.docx',
        //   contentType: 'application/msword',
        // },
        // {
        //   buffer: pdfBuffer,
        //   filename: 'sample.docx',
        //   contentType: 'application/msword',
        // },
        // {
        //   buffer: pdfBuffer,
        //   filename: 'sample.docx',
        //   contentType: 'application/msword',
        // },
      ],
      {
        Authorization: `Bearer ${r1AccessToken}`,
      },
    );

    console.log(results);

    if (!results.ok || !('data' in results)) {
      throw new Error('failed to upload');
    }

    const ids = results.data.items.map((item) => item.id);

    await asyncTimeout(10000);

    const result = await helper.createTest(
      {
        files: ids,
        questionType: QuestionType.MultipleChoice,
        questionCount: 10,
      },
      randomUUID(),
      r1AccessToken,
    );
  } catch (e) {
    console.log(e);
  } finally {
    await helper.dataSource.destroy();
  }
}

await main();
