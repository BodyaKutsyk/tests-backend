import { DocumentStatus, DocumentUploadType } from '../../entities/document.js';

interface BaseUploadResponse {
  clientId: string;
  id: string;
}

interface MultipartItem {
  partNumber: number;
  uploadUrl: string;
}

export interface DocumentUploadFailedResponse {
  status: DocumentStatus.Failed;
  clientId: string;
  errors: string[];
}

export interface DocumentUploadExistsResponse extends BaseUploadResponse {
  status: DocumentStatus.Completed;
}

export interface SingleUploadResponse extends BaseUploadResponse {
  status: DocumentStatus.Pending;
  uploadUrl: string;
  type: DocumentUploadType.Single;
}

export interface MultipartUploadResponse extends BaseUploadResponse {
  status: DocumentStatus.Pending;
  type: DocumentUploadType.Multipart;
  partSize: number;
  parts: MultipartItem[];
}

export type IntentBulkUploadResponse =
  | SingleUploadResponse
  | MultipartUploadResponse
  | DocumentUploadExistsResponse
  | DocumentUploadFailedResponse;

export interface DocumentCommitFailedResponse {
  id: string;
  status: DocumentStatus.Failed;
  errors: string[];
}

export interface DocumentCommitSuccessResponse {
  id: string;
  status: DocumentStatus.Completed;
}

export type DocumentCommitResponse =
  DocumentCommitFailedResponse | DocumentCommitSuccessResponse;
