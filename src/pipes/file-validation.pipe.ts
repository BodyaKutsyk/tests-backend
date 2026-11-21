import { FileValidator } from '@nestjs/common';
import { extname } from 'node:path';

const FILE_SIGNATURES: Record<string, { offset: number; bytes: number[] }> = {
  '.pdf': { offset: 0, bytes: [0x25, 0x50, 0x44, 0x46, 0x2d] },
  '.doc': {
    offset: 0,
    bytes: [0xd0, 0xcf, 0x11, 0xe0, 0xa1, 0xb1, 0x1a, 0xe1],
  },
  '.docx': { offset: 0, bytes: [0x50, 0x4b, 0x03, 0x04] },
  '.ppt': {
    offset: 0,
    bytes: [0xd0, 0xcf, 0x11, 0xe0, 0xa1, 0xb1, 0x1a, 0xe1],
  },
  '.pptx': { offset: 0, bytes: [0x50, 0x4b, 0x03, 0x04] },
};

const TEXT_EXTENSIONS = new Set(['.txt', '.md']);

export class FileValidationPipe extends FileValidator<{}> {
  constructor() {
    super({});
  }

  isValid(file?: Express.Multer.File): boolean {
    if (!file?.buffer?.length) return false;

    const ext = extname(file.originalname).toLowerCase();

    const signature = FILE_SIGNATURES[ext];
    if (signature) {
      return file.buffer
        .subarray(signature.offset, signature.offset + signature.bytes.length)
        .equals(Buffer.from(signature.bytes));
    }

    if (TEXT_EXTENSIONS.has(ext)) {
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
    return `Invalid document format. Allowed: ${[
      ...Object.keys(FILE_SIGNATURES),
      ...TEXT_EXTENSIONS,
    ].join(', ')}`;
  }
}
