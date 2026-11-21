import { Injectable, Logger } from '@nestjs/common';
import {
  DoclingClient,
  type ConvertDocumentsOptions,
} from '@docling/docling-client';
import { Env } from '../config/env.schema.js';
import { ConfigService } from '@nestjs/config';
import { extname } from 'node:path';
import { readPlainTextMarkdown, toMarkdown } from './utils/mapper.js';

@Injectable()
export class DoclingService {
  private readonly logger = new Logger(DoclingService.name);
  private readonly client: DoclingClient;
  constructor(configService: ConfigService<Env, true>) {
    const port = configService.get('DOCLING_PORT');
    const host = configService.get('DOCLING_HOST');
    const apiKey = configService.get('DOCLING_API_KEY');
    this.client = new DoclingClient({
      baseUrl: `http://${host}:${port}`,
      apiKey,
    });
  }

  async parse(filePath: string): Promise<string> {
    const start = Date.now();
    const extension = extname(filePath).toLowerCase();

    if (extension === '.txt' || extension === '.md') {
      return readPlainTextMarkdown(filePath);
    }
    const options: ConvertDocumentsOptions = {
      to_formats: ['md'],
      image_export_mode: 'placeholder',
      do_ocr: false,
      do_table_structure: true,
      table_mode: 'accurate',
    };
    let markdown = await this.convert(filePath, options);
    const canUseOcr = [
      '.pdf',
      '.png',
      '.jpg',
      '.jpeg',
      '.tif',
      '.tiff',
      '.bmp',
      '.webp',
    ].includes(extension);
    if (!markdown.trim() && canUseOcr) {
      markdown = await this.convert(filePath, { ...options, do_ocr: true });
    }
    if (!markdown.trim()) {
      throw new Error(`Docling did not extract text from ${filePath}`);
    }
    this.logger.log(`Parsed ${filePath} in ${Date.now() - start} ms`);
    return markdown;
  }

  private async convert(
    filePath: string,
    options: ConvertDocumentsOptions,
  ): Promise<string> {
    const job = await this.client.submitSource(filePath, {
      options,
      target: { kind: 'inbody' },
    });
    await job.wait();
    return toMarkdown(await this.client.getResult(job.taskId));
  }
}
