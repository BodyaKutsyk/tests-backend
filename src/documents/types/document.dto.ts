import {
  ArrayMaxSize,
  ArrayMinSize,
  ArrayNotEmpty,
  ArrayUnique,
  IsArray,
  IsIn,
  IsInt,
  IsNotEmpty,
  IsString,
  IsUUID,
  Matches,
  Max,
  MaxLength,
  Min,
} from 'class-validator';

export interface FileUploadResponse {
  id?: string;
  filename: string;
  status: 'success' | 'failed';
  reason?: string;
}

export class UploadFilesResponseDto {
  items: FileUploadResponse[];
}

export class DeleteFilesPayloadDto {
  @ArrayNotEmpty()
  @IsUUID(4, { each: true })
  documentIds: string[];
}

const ALLOWED_MIME_TYPES = [
  'application/pdf',
  'application/msword', // .doc
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document', // .docx
  'text/markdown',
  'text/plain',
] as const;

const MAX_FILE_SIZE = 20 * 1024 * 1024;

export class DocumentUploadIntentDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  @Matches(/^[a-zA-Z0-9._-]+$/, {
    message: 'File name contains invalid characters',
  })
  name: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  clientId: string;

  @IsString()
  @IsIn(ALLOWED_MIME_TYPES, {
    message: `Content type must be one of: ${ALLOWED_MIME_TYPES.join(', ')}`,
  })
  contentType: string;

  @IsInt()
  @Min(1)
  @Max(MAX_FILE_SIZE)
  size: number;

  @IsString()
  @IsNotEmpty()
  @Matches(/^[A-Za-z0-9+/]{22}==$/, {
    message: 'contentMd5 must be a valid Base64-encoded 128-bit MD5 hash',
  })
  contentMd5: string;
}

export class CreateBulkPresignedUploadDto {
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(20)
  documents: DocumentUploadIntentDto[];
}

export class CommitBulkUploadDto {
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(20)
  @ArrayUnique()
  @IsUUID('4', { each: true })
  documentIds: string[];
}
