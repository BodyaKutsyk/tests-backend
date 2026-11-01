import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { DOCUMENTS_GC_QUEUE } from '../contracts/documents/constants.js';
import { ConfigService } from '@nestjs/config';
import { Env } from '../config/env.schema.js';
import { UnusedDocumentsGarbageCollectorPublisher } from './unused-documents-garbage-collector.publisher.js';
import { TypeOrmModule } from '@nestjs/typeorm';
import { User } from '../entities/user.js';
import { Document } from '../entities/document.js';
import { Test } from '../entities/test.js';
import { UnusedDocumentsGarbageCollectorConsumer } from './unused-documents-garbage-collector.consumer.js';

@Module({
  imports: [
    TypeOrmModule.forFeature([User, Document, Test]),
    BullModule.registerQueueAsync({
      name: DOCUMENTS_GC_QUEUE,
      inject: [ConfigService],
      useFactory: (configService: ConfigService<Env, true>) => ({
        connection: {
          host: configService.get('REDIS_QUEUE_HOST'),
          port: configService.get('REDIS_QUEUE_PORT'),
          password: configService.get('REDIS_PASSWORD'),
        },
      }),
    }),
  ],
  providers: [
    UnusedDocumentsGarbageCollectorPublisher,
    UnusedDocumentsGarbageCollectorConsumer,
  ],
})
export class UnusedDocumentsGarbageCollectorModule {}
