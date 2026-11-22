import { Helper24 } from '../24/utils.js';

const OBJECT_KEY = 'md_sample.9bced8f24b5c25fa7b3a21de796c30ce.md';
const OBJECT_KEY_NEW = 'md_sample.7abdc7d5181e70cec3b2666ebf26cdd0.md';

async function main() {
  const helper = new Helper24();

  try {
    await helper.waitForReady(Number(process.env.CDN_PORT || 8081));
    const { status: directStatus } = await helper.s3Get(
      `/examples/${OBJECT_KEY}`,
    );

    const { status: missStatus, cacheStatus } = await helper.cdnGet(
      `/examples/${OBJECT_KEY}`,
    );

    const {
      status: hitStatus,
      cacheStatus: cacheStatusSecond,
      data: oldBody,
    } = await helper.cdnGet(`/examples/${OBJECT_KEY}`);
    const cacheHit = Number(cacheStatusSecond === 'HIT');

    const { data: newBody } = await helper.cdnGet(
      `/examples/${OBJECT_KEY_NEW}`,
    );

    // @ts-ignore
    const newName = OBJECT_KEY !== OBJECT_KEY_NEW ? 1 : 0;
    const contentChanged = oldBody !== newBody ? 1 : 0;

    console.log('direct=', directStatus);
    console.log('edge-miss=', cacheStatus);
    console.log('edge-miss-status=', missStatus);
    console.log('edge-hit=', cacheStatusSecond);
    console.log('edge-hit-status=', hitStatus);
    console.log('cache-hit=', cacheHit);
    console.log('new-name=', newName);
    console.log('new-url=', newName);
    console.log('content-changed=', contentChanged);

    const checks = {
      direct: directStatus === 403,
      miss: missStatus === 200,
      hit: hitStatus === 200,
      cacheHit: cacheHit === 1,
      newName: newName === 1,
      contentChanged: contentChanged === 1,
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
  }
}

await main();
