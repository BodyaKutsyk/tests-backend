import { Injectable, OnApplicationBootstrap } from '@nestjs/common';
import { InboxService } from '../inbox/inbox.service.js';
import { RabbitMqService } from '../rabbit-mq/rabbit-mq.service.js';
import { Channel } from 'amqplib';
import { DocumentsTopology } from './documents.topology.js';
import { DOCUMENTS_ROUTING_KEYS } from '../contracts/documents/constants.js';
import { RabbitMQEvent } from '../rabbit-mq/events.js';
import { InjectRepository } from '@nestjs/typeorm';
import { Document } from '../entities/document.js';
import { Repository } from 'typeorm';
import { DocumentContents } from '../entities/document-contents.js';
import { DocumentParserService } from './parsing/document-parser.service.js';

@Injectable()
export class DocumentsConsumer implements OnApplicationBootstrap {
  private channel: Channel;

  constructor(
    private readonly inboxService: InboxService,
    private readonly rabbitMQService: RabbitMqService,
    private readonly documentsTopology: DocumentsTopology,
    private readonly documentParserService: DocumentParserService,
    @InjectRepository(Document)
    private readonly documentsRepo: Repository<DocumentContents>,
  ) {}

  async onApplicationBootstrap() {
    await this.startConsuming();
  }

  private async startConsuming() {
    await this.initialize();
    await this.consume();
  }

  private async initialize() {
    this.channel = await this.rabbitMQService.createConsumerChannel();

    await this.documentsTopology.setup(this.channel);
  }

  private async consume() {
    await this.channel.consume(
      DOCUMENTS_ROUTING_KEYS.uploaded,
      async (data) => {
        if (!data) return;
        const event = JSON.parse(data.content.toString()) as RabbitMQEvent;
        const manager = this.documentsRepo.manager;

        try {
          await manager.transaction(async (manager) => {
            const insertResult = await this.inboxService.save(
              { messageId: event.id, consumer: this.constructor.name },
              manager,
            );

            if (insertResult.raw.length === 0) {
              return;
            }

            await this.documentParserService.parseAndSave(event.id, manager);
          });
          this.channel.ack(data);
        } catch {
          this.channel.nack(data, false, false);
        }
      },
    );
  }
}
