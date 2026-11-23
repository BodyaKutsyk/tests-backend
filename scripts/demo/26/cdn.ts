import { Helper24 } from '../24/utils.js';
import { createHash, randomUUID } from 'node:crypto';
import { PutObjectCommand } from '@aws-sdk/client-s3';
import { createDemoS3Client } from './s3.js';

async function publishAsset(s3: ReturnType<typeof createDemoS3Client>, content: string) {
  const hash = createHash('sha256').update(content).digest('hex');
  const key = `examples/md_sample.${hash}.md`;
  await s3.send(new PutObjectCommand({
    Bucket: process.env.STORAGE_BUCKET,
    Key: key,
    Body: content,
    ContentType: 'text/markdown; charset=utf-8',
    CacheControl: 'public, max-age=31536000, immutable',
  }));
  return `/${key}`;
}

async function main() {
  const helper = new Helper24();
  const s3 = createDemoS3Client();

  try {
    const nonce = randomUUID();
    const oldContent = `CDN demo ${nonce}: version 1\n`;
    const newContent = `CDN demo ${nonce}: version 2\n`;
    const oldUrl = await publishAsset(s3, oldContent);
    const newUrl = await publishAsset(s3, newContent);
    await helper.waitForReady(Number(process.env.CDN_PORT || 8081));
    const { status: directStatus } = await helper.s3Get(
      oldUrl,
    );

    const { status: missStatus, cacheStatus } = await helper.cdnGet(
      oldUrl,
    );

    const {
      status: hitStatus,
      cacheStatus: cacheStatusSecond,
      data: oldBody,
    } = await helper.cdnGet(oldUrl);
    const cacheHit = Number(cacheStatusSecond === 'HIT');

    const { status: newStatus, data: newBody } = await helper.cdnGet(
      newUrl,
    );

    const newName = Number(oldUrl !== newUrl);
    const contentChanged = oldBody !== newBody ? 1 : 0;

    console.log(`direct=${directStatus}`);
    console.log(`edge-miss=${cacheStatus}`);
    console.log(`edge-miss-status=${missStatus}`);
    console.log(`edge-hit=${cacheStatusSecond}`);
    console.log(`edge-hit-status=${hitStatus}`);
    console.log(`cache-hit=${cacheHit}`);
    console.log(`new-name=${newName}`);
    console.log(`new-url=${newName}`);
    console.log(`content-changed=${contentChanged}`);

    const checks = {
      direct: directStatus === 403,
      miss: missStatus === 200 && cacheStatus === 'MISS',
      hit: hitStatus === 200,
      cacheHit: cacheHit === 1,
      newName: newName === 1,
      contentChanged: contentChanged === 1 && oldBody === oldContent && newBody === newContent && newStatus === 200,
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
    s3.destroy();
  }
}

await main();
