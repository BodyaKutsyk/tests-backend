import { ArrayNotEmpty, IsUUID } from 'class-validator';

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
