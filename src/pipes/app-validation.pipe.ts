import {
  HttpStatus,
  Injectable,
  UnprocessableEntityException,
  ValidationPipe,
} from '@nestjs/common';
import { ValidationError } from 'class-validator';
import { flattenValidationErrors } from '../utils/flatten-validation-errors.js';

@Injectable()
export class AppValidationPipe extends ValidationPipe {
  constructor() {
    super({
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
    });
  }
}
