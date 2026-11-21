import * as fs from 'node:fs';
import { createHash } from 'node:crypto';

export default function createMd5FromFile(path: fs.PathLike): Promise<string> {
  return new Promise((resolve, reject) => {
    const hash = createHash('md5');
    const stream = fs.createReadStream(path);

    stream.on('data', (chunk) => {
      hash.update(chunk);
    });

    stream.on('end', () => {
      resolve(hash.digest('base64'));
    });

    stream.on('error', reject);
  });
}
