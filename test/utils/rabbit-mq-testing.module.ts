import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { RabbitMqModule } from '../../src/rabbit-mq/rabbit-mq.module.js';
import { GenerationJobModule } from '../../src/generation-jobs/generation-jobs.module.js';
import { TestsPublisher } from '../../src/tests/tests.publisher.js';
import dataSource from '../../src/data-source.js';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),

    TypeOrmModule.forRootAsync({
      useFactory: () => ({
        ...dataSource.options,
        autoLoadEntities: true,
      }),
    }),

    RabbitMqModule,
    GenerationJobModule,
  ],
  providers: [TestsPublisher],
})
export class RabbitMqTestingModule {}
