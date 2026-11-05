export interface FileUploadResponse {
  filename: string;
  status: 'success' | 'failed';
  reason?: string;
}

export class UploadFilesResponseDto {
  items: FileUploadResponse[];
}
