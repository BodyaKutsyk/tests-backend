import { Module } from '@nestjs/common';
import { DocumentsService } from './documents.service.js';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Document } from '../entities/document.js';
import { DocumentsController } from './documents.controller.js';
import { QuotasModule } from '../quotas/quotas.module.js';

@Module({
  imports: [QuotasModule, TypeOrmModule.forFeature([Document])],
  controllers: [DocumentsController],
  providers: [DocumentsService],
})
export class DocumentsModule {}
