import { PipeTransform, UnprocessableEntityException } from '@nestjs/common';
import { decodeBase64 } from '../utils/base64.js';

export class ParseBase64Pipe implements PipeTransform<string> {
  transform(value: string): string {
    if (typeof value !== 'string') {
      throw new UnprocessableEntityException('Value should be string type');
    }

    const base64Regex =
      /^([A-Za-z0-9+/]{4})*([A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/;
    if (!base64Regex.test(value)) {
      throw new UnprocessableEntityException('Invalid base64 string');
    }

    try {
      return decodeBase64(value);
    } catch {
      throw new UnprocessableEntityException('Failed to decode base64');
    }
  }
}
