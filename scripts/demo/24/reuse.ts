import { Helper24 } from './utils.js';

async function main() {
  const helper = new Helper24();

  try {
    await helper.dataSource.initialize();
    const signUpResult = await helper.signUp();
    const signUpStatus = signUpResult.status;

    if (!signUpResult.ok || !('data' in signUpResult)) {
      throw new Error(`Sign-up failed (${signUpStatus})`);
    }

    const { accessToken: r1AccessToken, refreshToken: r1RefreshToken } =
      signUpResult.data;
    const refreshResponse = await helper.refresh(r1RefreshToken);

    if (!refreshResponse.ok || !('data' in refreshResponse)) {
      throw new Error('failed to refresh');
    }

    const { accessToken: r2AccessToken } = refreshResponse.data;
    const { status: r1ReuseStatus } = await helper.refresh(r1AccessToken);
    const { status: r2ReuseStatus } = await helper.refresh(r2AccessToken);

    console.log(`sign-up=${signUpStatus}`);
    console.log(`r1-refresh=${refreshResponse.status}`);
    console.log(`r1-reuse=${r1ReuseStatus}`);
    console.log(`r2-after-reuse=${r2ReuseStatus}`);

    const checks = {
      signUp: signUpStatus === 201,
      r1Refresh: refreshResponse.status === 200,
      r1Reuse: r1ReuseStatus === 401,
      r2Reuse: r2ReuseStatus === 401,
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
