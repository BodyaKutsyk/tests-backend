import { Module } from '@nestjs/common';
import { QuotasService } from './quotas.service.js';
import { QuotasController } from './quotas.controller.js';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Quota } from '../entities/quota.js';

@Module({
  imports: [TypeOrmModule.forFeature([Quota])],
  controllers: [QuotasController],
  providers: [QuotasService],
  exports: [QuotasService],
})
export class QuotasModule {}
