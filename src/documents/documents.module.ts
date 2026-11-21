import { Module } from '@nestjs/common';
import { DocumentsService } from './documents.service.js';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Document } from '../entities/document.js';
import { DocumentsController } from './documents.controller.js';
import { QuotasModule } from '../quotas/quotas.module.js';
import { DocumentsPublisher } from './documents.publisher.js';
import { InboxModule } from '../inbox/inbox.module.js';
import { OutboxModule } from '../outbox/outbox.module.js';
import { DocumentsTopology } from './documents.topology.js';
import { DocumentsConsumer } from './documents.consumer.js';
import { DocumentParserService } from './parsing/document-parser.service.js';
import { RabbitMqModule } from '../rabbit-mq/rabbit-mq.module.js';
import { DoclingModule } from '../docling/docling.module.js';
import { StorageModule } from '../storage/storage.module.js';

@Module({
  imports: [
    QuotasModule,
    TypeOrmModule.forFeature([Document]),
    InboxModule,
    OutboxModule,
    RabbitMqModule,
    DoclingModule,
    StorageModule,
  ],
  controllers: [DocumentsController],
  providers: [
    DocumentsService,
    DocumentsPublisher,
    DocumentsTopology,
    DocumentsConsumer,
    DocumentParserService,
  ],
})
export class DocumentsModule {}
