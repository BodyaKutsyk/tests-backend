import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { DoclingService } from './docling.service.js';
import type { ConfigService } from '@nestjs/config';
import type { Env } from '../config/env.schema.js';

describe('DoclingService', () => {
  it('preserves Markdown files without invoking PDF conversion', async () => {
    const directory = await mkdtemp(join(tmpdir(), 'docling-md-'));
    try {
      const path = join(directory, 'notes.md');
      const markdown = '# Heading\n\nA paragraph with **emphasis**.';
      await writeFile(path, markdown);
      const config = {
        get: (key: string) =>
          ({
            DOCLING_PORT: 5001,
            DOCLING_HOST: 'localhost',
            DOCLING_API_KEY: 'test',
          })[key as 'DOCLING_HOST'],
      };
      const service = new DoclingService(config as ConfigService<Env, true>);

      expect(await service.parse(path)).toBe(markdown);
    } finally {
      await rm(directory, { recursive: true, force: true });
    }
  });
});
