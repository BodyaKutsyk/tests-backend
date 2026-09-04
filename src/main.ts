import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module.js';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  await app.listen(Number(process.env.INTERNAL_API_PORT ?? 3000), '0.0.0.0');
}
await bootstrap();
