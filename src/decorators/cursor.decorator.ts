import {
  createParamDecorator,
  ExecutionContext,
  BadRequestException,
} from '@nestjs/common';
import { plainToInstance } from 'class-transformer';
import { validate, ValidationError } from 'class-validator';
import { ParseBase64Pipe } from '../pipes/parse-base64.pipe.js';
import { CursorDto } from '../types/cursor.dto.js';

const base64Pipe = new ParseBase64Pipe();

export const Cursor = createParamDecorator(
  async (
    data: unknown,
    ctx: ExecutionContext,
  ): Promise<CursorDto | undefined> => {
    const request = ctx.switchToHttp().getRequest();
    const rawValue = request.query.cursor;

    if (!rawValue) return undefined;

    const decodedString = base64Pipe.transform(rawValue);

    try {
      const parsedJson = JSON.parse(decodedString);
      const cursorInstance = plainToInstance(CursorDto, parsedJson);

      const errors = await validate(cursorInstance);
      if (errors.length > 0) {
        throw new BadRequestException(
          errors.flatMap((err) => Object.values(err.constraints || {})),
        );
      }

      return cursorInstance;
    } catch (error) {
      if (error instanceof BadRequestException) {
        throw error;
      }
      throw new BadRequestException('Invalid JSON structure inside cursor');
    }
  },
);
