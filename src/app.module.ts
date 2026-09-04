import { Module } from '@nestjs/common';
import { AppController } from './app.controller.js';
import { AppService } from './app.service.js';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { validate } from './config/env.schema.js';
import { TypeOrmModule } from '@nestjs/typeorm';
import { readFile } from 'node:fs/promises';

@Module({
  imports: [
    ConfigModule.forRoot({
      validate,
      isGlobal: true,
    }),
    TypeOrmModule.forRootAsync({
      inject: [ConfigService],
      useFactory: async (configService: ConfigService) => {
        const DB_PASSWORD_FILE = configService.get(
          'POSTGRES_PASSWORD_FILE',
        ) as string;
        const DB_PASSWORD = (await readFile(DB_PASSWORD_FILE, 'utf-8')).trim();

        console.log('password:', DB_PASSWORD.slice(0, 5) + '***');

        return {
          type: 'postgres',
          host: 'db',
          username: configService.get('POSTGRES_USER'),
          password: async () =>
            (await readFile(DB_PASSWORD_FILE, 'utf-8')).trim(),
          database: configService.get('POSTGRES_DB'),
        };
      },
    }),
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
