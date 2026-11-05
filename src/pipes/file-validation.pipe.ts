import { FileValidator } from '@nestjs/common';
import { extname } from 'node:path';

export class FileValidationPipe extends FileValidator<{}> {
  constructor() {
    super({});
  }

  isValid(file?: Express.Multer.File): boolean {
    if (!file?.buffer?.length) return false;

    const ext = extname(file.originalname).toLowerCase();

    if (ext === '.pdf') {
      return file.buffer.subarray(0, 5).toString() === '%PDF-';
    }

    if (ext === '.txt' || ext === '.md') {
      try {
        const text = new TextDecoder('utf-8', {
          fatal: true,
        }).decode(file.buffer);

        return !text.includes('\0');
      } catch {
        return false;
      }
    }

    return false;
  }

  buildErrorMessage(): string {
    return 'Invalid document format. Allowed: PDF, TXT, MD';
  }
}
