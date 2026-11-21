import { Injectable, Logger } from '@nestjs/common';
import { EntityManager, Repository } from 'typeorm';
import { DoclingService } from '../../docling/docling.service.js';
import { DocumentContents } from '../../entities/document-contents.js';
import { Document } from '../../entities/document.js';

const PARSER_VERSION = 1;

@Injectable()
export class DocumentParserService {
  private logger = new Logger(this.constructor.name);
  constructor(private readonly doclingService: DoclingService) {}
  async parseAndSave(id: string, manager: EntityManager): Promise<void> {
    const document = await manager
      .createQueryBuilder(Document, 'document')
      .setOnLocked('skip_locked')
      .where({ id })
      .leftJoin('document.user', 'user')
      .addSelect('user.id')
      .getOne();

    if (!document) {
      throw new Error('Document doesnt exist');
    }

    const userId = document.user.id;

    const filePath = `uploads/${userId}/${document.storageKey}`;
    const markdown = await this.doclingService.parse(filePath);
    await manager
      .createQueryBuilder(DocumentContents, 'document_contents')
      .insert()
      .into('document_contents')
      .values({ id: document.id, version: PARSER_VERSION, markdown })
      .execute();
    this.logger.log('Successfully parsed and saved results');
  }
}
