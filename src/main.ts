import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module.js';
import { ConfigService } from '@nestjs/config';
import { Env } from './config/env.schema.js';
import {
  HttpStatus,
  UnprocessableEntityException,
  ValidationPipe,
} from '@nestjs/common';
import { ProblemExceptionFilter } from './exceptions/problem-exception-filter.js';
import { ValidationError } from 'class-validator';
import { flattenValidationErrors } from './utils/flatten-validation-errors.js';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const configService = app.get<ConfigService<Env, true>>(ConfigService);
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      errorHttpStatusCode: HttpStatus.UNPROCESSABLE_ENTITY,

      exceptionFactory: (validationErrors: ValidationError[]) => {
        const errors = flattenValidationErrors(validationErrors);

        return new UnprocessableEntityException({
          detail: 'One or more validation errors occurred.',
          errors,
        });
      },
    }),
  );
  app.useGlobalFilters(new ProblemExceptionFilter());
  await app.listen(
    configService.get<Env>('API_INTERNAL_PORT', { infer: true }),
    '0.0.0.0',
  );
}
await bootstrap();
