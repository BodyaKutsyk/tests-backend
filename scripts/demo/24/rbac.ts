import { Helper24 } from './utils.js';

async function main() {
  const helper = new Helper24();

  try {
    await helper.dataSource.initialize();
    const signUpResult = await helper.signUp();
    const signUpStatus = signUpResult.status;
    const randomDocument = await helper.getRandomDocument();

    if (!signUpResult.ok || !('data' in signUpResult)) {
      throw new Error(`Sign-up failed (${signUpStatus})`);
    }

    const { accessToken: r1AccessToken, refreshToken: r1RefreshToken } =
      signUpResult.data;
    const { status: anonStatus } = await helper.getTests({ accessToken: '' });
    const text = 'loremloremloremlorem';

    const result = await helper.postFiles(
      [
        {
          buffer: Buffer.from(text, 'utf8'),
          filename: 'generated.txt',
          contentType: 'text/plain',
        },
      ],
      {
        Authorization: `Bearer ${r1AccessToken}`,
        'Content-Type': 'multipart/form-data',
      },
    );

    if (!result.ok || !('data' in result)) {
      throw new Error('Failed to upload file');
    }

    const { items } = result.data;
    const documentId = items[0].id;
    const { status: ownDocumentStatus } = await helper.getDocument(
      documentId,
      r1AccessToken,
    );
    const { status: foreignDocumentStatus } = await helper.getDocument(
      randomDocument?.id || '',
      r1AccessToken,
    );
    const { status: resourceWithoutRoleStatus } = await helper.getUsers({
      accessToken: r1AccessToken,
    });
    const jwtPayload = helper.decodeJwtPayload(r1AccessToken);
    const userId = jwtPayload.sub as string;
    await helper.promoteToAdmin(userId);
    const { status: resourceWithRoleStatus } = await helper.getUsers({
      accessToken: r1AccessToken,
    });

    jwtPayload.sub = '5935545f-d8d8-4800-a0a8-89386333399d';

    const newAccessToken = helper.encodeJwtPayload(jwtPayload);
    const { status: tamperedStatus } = await helper.getUsers({
      accessToken: newAccessToken,
    });

    console.log(`anon=${anonStatus}`);
    console.log(`own=${ownDocumentStatus}`);
    console.log(`foreign=${foreignDocumentStatus}`);
    console.log(`role-denied=${resourceWithoutRoleStatus}`);
    console.log(`role-allowed=${resourceWithRoleStatus}`);
    console.log(`tampered=${tamperedStatus}`);

    const checks = {
      anon: anonStatus === 401,
      own: ownDocumentStatus === 200,
      foreign: foreignDocumentStatus === 403,
      roleDenied: resourceWithoutRoleStatus === 403,
      roleAllowed: resourceWithRoleStatus === 200,
      tampered: tamperedStatus === 401,
    } satisfies Record<string, boolean>;

    const failedChecks = Object.entries(checks)
      .filter(([, passed]) => !passed)
      .map(([name]) => name);

    if (failedChecks.length > 0) {
      console.log(`failed-checks=${failedChecks.join(', ')}`);
    }

    process.exitCode = failedChecks.length === 0 ? 0 : 1;
  } catch {
    process.exitCode = 1;
  } finally {
    await helper.dataSource.destroy();
  }
}

await main();
