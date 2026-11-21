import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { DocumentUploadIntentDto } from '../types/document.dto.js';
import { DocumentStatus } from '../../entities/document.js';

type DocumentValidationResult = {
  valid: DocumentUploadIntentDto[];
  failed: {
    clientId: string;
    errors: string[];
    status: DocumentStatus.Failed;
  }[];
};

export async function validateDocuments(
  documents: DocumentUploadIntentDto[],
): Promise<DocumentValidationResult> {
  const valid: DocumentUploadIntentDto[] = [];
  const failed: DocumentValidationResult['failed'] = [];

  for (const [_index, document] of documents.entries()) {
    const dto = plainToInstance(DocumentUploadIntentDto, document);

    const errors = await validate(dto, {
      whitelist: true,
      forbidNonWhitelisted: true,
    });

    if (errors.length) {
      failed.push({
        clientId: document?.clientId,
        errors: errors.flatMap((error) =>
          Object.values(error.constraints ?? {}),
        ),
        status: DocumentStatus.Failed,
      });

      continue;
    }

    valid.push(dto);
  }

  return { valid, failed };
}
