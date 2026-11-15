import { Injectable, Logger } from '@nestjs/common';
import { OutboxSavePayload, OutboxService } from '../outbox/outbox.service.js';
import { Document } from '../entities/document.js';
import { EntityManager } from 'typeorm';
import {
  DOCUMENTS_EXCHANGE,
  DOCUMENTS_ROUTING_KEYS,
} from '../contracts/documents/constants.js';
import { randomUUID } from 'crypto';

export interface DocumentUploadedPayload {
  id: string;
  occurredAt: Date;
  eventId: string;
}

@Injectable()
export class DocumentsPublisher {
  private logger = new Logger(this.constructor.name);
  constructor(private readonly outboxService: OutboxService) {}

  async uploaded(document: Document, manager: EntityManager) {
    const occurredAt = new Date();
    const eventId = randomUUID();

    const payload: OutboxSavePayload<DocumentUploadedPayload> = {
      exchange: DOCUMENTS_EXCHANGE,
      type: DOCUMENTS_ROUTING_KEYS.uploaded,
      aggregateType: this.constructor.name,
      aggregateId: document.id,
      payload: {
        id: document.id,
        eventId,
        occurredAt,
      },
    };

    await this.outboxService.save(payload, manager);
    this.logger.log(`Published document ${document.id}`);
  }
}
