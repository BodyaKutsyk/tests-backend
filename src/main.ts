import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module.js';
import { ConfigService } from '@nestjs/config';
import { Env } from './config/env.schema.js';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const configService = app.get(ConfigService);
  await app.listen(
    configService.get<Env>('API_INTERNAL_PORT', { infer: true }),
    '0.0.0.0',
  );
}
await bootstrap();
