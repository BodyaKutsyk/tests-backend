import { Module } from '@nestjs/common';
import { AppController } from './app.controller.js';
import { AppService } from './app.service.js';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { Env, validate } from './config/env.schema.js';
import { TypeOrmModule } from '@nestjs/typeorm';
import { readFile } from 'node:fs/promises';
import { UsersModule } from './users/users.module.js';
import { entitiesPath } from './data-source.js';
import { SnakeNamingStrategy } from 'typeorm-naming-strategies';
import { APP_FILTER, APP_PIPE } from '@nestjs/core';
import { ProblemExceptionFilter } from './exceptions/problem-exception-filter.js';
import { AppValidationPipe } from './pipes/app-validation.pipe.js';

@Module({
  imports: [
    ConfigModule.forRoot({
      validate,
      isGlobal: true,
    }),
    TypeOrmModule.forRootAsync({
      inject: [ConfigService],
      useFactory: async (configService: ConfigService<Env, true>) => {
        const DB_PASSWORD_FILE = configService.get('POSTGRES_PASSWORD_FILE');

        return {
          type: 'postgres',
          host: configService.get('POSTGRES_HOST'),
          port: configService.get('POSTGRES_PORT'),
          username: configService.get('POSTGRES_USER'),
          password: async () =>
            (await readFile(DB_PASSWORD_FILE, 'utf-8')).trim(),
          database: configService.get('POSTGRES_DB'),
          namingStrategy: new SnakeNamingStrategy(),
          entities: [entitiesPath],
        };
      },
    }),
    UsersModule,
  ],
  controllers: [AppController],
  providers: [
    AppService,
    {
      provide: APP_PIPE,
      useClass: AppValidationPipe,
    },
    {
      provide: APP_FILTER,
      useClass: ProblemExceptionFilter,
    },
  ],
})
export class AppModule {}
