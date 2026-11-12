import { Injectable } from '@nestjs/common';
import { DoclingClient } from '@docling/docling-client';
import { Env } from '../config/env.schema.js';
import { ConfigService } from '@nestjs/config';
import type { DoclingDocument } from '@docling/docling-core';
import { blocksToMarkdown, normalizeDocling } from './utils/mapper.js';

@Injectable()
export class DoclingService {
  private readonly client: DoclingClient<DoclingDocument>;
  constructor(configService: ConfigService<Env, true>) {
    const port = configService.get('DOCLING_PORT');
    const host = configService.get('DOCLING_HOST');
    const apiKey = configService.get('DOCLING_API_KEY');
    const url = `http://${host}:${port}`;

    console.log(host);

    this.client = new DoclingClient({
      baseUrl: url,
      apiKey,
    });
  }

  async parse(filePath: string) {
    const start = new Date().getTime();
    const converted = await this.client.convert(filePath, {
      options: {
        do_ocr: true,
        do_table_structure: true,
        table_mode: 'accurate',
      },
    });

    const document = converted.document;
    const blocks = normalizeDocling(document);
    const markdown = blocksToMarkdown(blocks);

    console.log(blocks, markdown);
    console.log(`took: ${new Date().getTime() - start} ms`);

    return {
      blocks,
      markdown,
    };
  }
}
