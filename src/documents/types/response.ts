import { DocumentStatus } from '../../entities/document.js';

export interface DocumentUploadFailedResponse {
  status: DocumentStatus.Failed;
  clientId: string;
  errors: string[];
}

export interface DocumentUploadExistsResponse {
  status: DocumentStatus.Completed;
  clientId: string;
  id: string;
}

export interface DocumentUploadSuccessResponse {
  status: DocumentStatus.Pending;
  clientId: string;
  id: string;
  uploadUrl: string;
}

export type IntentBulkUploadResponse =
  | DocumentUploadSuccessResponse
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
