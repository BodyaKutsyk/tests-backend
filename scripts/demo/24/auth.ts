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

    const { accessToken, refreshToken } = signUpResult.data;
    const { status: withoutTokenStatus } = await helper.getTests({
      accessToken: '',
    });
    const { status: withTokenStatus } = await helper.getTests({
      accessToken,
    });
    const refreshResult = await helper.refresh(refreshToken);
    const refreshStatus = refreshResult.status;

    if (!refreshResult.ok || !('data' in refreshResult)) {
      throw new Error(`Refresh failed (${refreshStatus})`);
    }

    const rotatedRefreshToken = refreshResult.data.refreshToken;
    const { status: logoutStatus } = await helper.logout(rotatedRefreshToken);
    const { status: afterLogOutStatus } = await helper.getTests({
      accessToken,
    });
    const refreshAfterLogout = await helper.refresh(rotatedRefreshToken);
    const refreshAfterLogoutStatus = refreshAfterLogout.status;
    const { status: afterRefreshLogOutStatus } = await helper.getTests({
      accessToken,
    });

    console.log(
      'PS: sign up also gives access and refresh token like sign-in endpoint but return 201 Created because it basically creates user',
    );

    console.log(`sign-up=${signUpStatus}`);
    console.log(`no-token=${withoutTokenStatus}`);
    console.log(`with-token=${withTokenStatus}`);
    console.log(`refresh=${refreshStatus}`);
    console.log(`logout=${logoutStatus}`);
    console.log(`after-logout=${afterLogOutStatus}`);
    console.log(`refresh-after-logout=${refreshAfterLogoutStatus}`);
    console.log(`access-after-refresh-attempt=${afterRefreshLogOutStatus}`);

    const checks = {
      signUp: signUpStatus === 201,
      noToken: withoutTokenStatus === 401,
      withToken: withTokenStatus === 200,
      refresh: refreshStatus === 200,
      logout: logoutStatus === 204,
      accessAfterLogout: afterLogOutStatus === 401,
      refreshAfterLogout: refreshAfterLogoutStatus === 401,
      accessAfterRefreshAttempt: afterRefreshLogOutStatus === 401,
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
