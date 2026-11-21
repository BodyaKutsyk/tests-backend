import { Helper, type HttpResult } from '../../utils/helper.js';
import { randomUUID } from 'crypto';
import { Role, User } from '../../../src/entities/user.js';
import {
  DocumentCommitResponse,
  IntentBulkUploadResponse,
} from '../../../src/documents/types/response.js';
import { DocumentUploadType } from '../../../src/entities/document.js';

interface AuthResponse {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
}

interface PutResult {
  status: number;
  etag: string | null;
}

interface GetUsersProps {
  accessToken: string;
}

interface MultipartPart {
  partNumber: number;
  uploadUrl: string;
}

interface UploadedPart {
  PartNumber: number;
  ETag: string;
}

type UploadBody = Blob | Buffer | Uint8Array<ArrayBuffer>;

interface IntentDocumentUpload {
  contentMd5: string;
  clientId: string;
  name: string;
  size: number;
  contentType: string;
}

interface IntentDocumentsUploadPayload {
  documents: IntentDocumentUpload[];
}

interface UploadFileSingleResponse {
  id: string;
  fileName: string;
  status: string;
  type: DocumentUploadType;
  clientId: string;
}

export interface UploadFileMultipartResponse extends UploadFileSingleResponse {
  parts: MultipartPart[];
  partSize: number;
}

interface UploadFilesResponse {
  items: (UploadFileMultipartResponse | UploadFileSingleResponse)[];
}

interface UploadFile {
  buffer: Buffer;
  filename: string;
  contentType?: string;
}

async function readResponseBody(response: Response): Promise<unknown> {
  const body = await response.text();

  if (!body) return undefined;

  try {
    return JSON.parse(body) as unknown;
  } catch {
    return body;
  }
}

export class Helper24 extends Helper {
  async signUp(): Promise<HttpResult<AuthResponse>> {
    const email = `user-${randomUUID().slice(0, 6)}@gmail.com`;
    const password = 'Test1234!';
    const data = { email, password };

    return this.post<AuthResponse>('/auth/sign-up', data);
  }

  async refresh(refreshToken: string): Promise<HttpResult<AuthResponse>> {
    return this.post<AuthResponse>('/auth/refresh', { refreshToken });
  }

  async logout(refreshToken: string): Promise<HttpResult<never>> {
    return this.post<never>('/auth/sign-out', { refreshToken });
  }

  async getUsers({ accessToken }: GetUsersProps) {
    return this.get('/users', { Authorization: `Bearer ${accessToken}` });
  }

  async promoteToAdmin(userId: string) {
    await this.dataSource
      .createQueryBuilder()
      .update(User)
      .set({ role: Role.Admin })
      .where('id = :id', { id: userId })
      .execute();
  }

  async intentUploads(
    documents: IntentDocumentsUploadPayload,
    accessToken: string,
  ) {
    return this.post<IntentBulkUploadResponse[]>('/files/intent', documents, {
      Authorization: `Bearer ${accessToken}`,
    });
  }

  async postFiles(
    files: UploadFile[],
    headers: Record<string, string> = {},
  ): Promise<HttpResult<UploadFilesResponse>> {
    const formData = new FormData();

    for (const file of files) {
      formData.append(
        'files',
        new Blob([new Uint8Array(file.buffer)], {
          type: file.contentType ?? 'application/octet-stream',
        }),
        file.filename,
      );
    }

    const requestHeaders = new Headers(headers);
    requestHeaders.delete('content-type');

    const response = await fetch(
      `http://localhost:${Number(process.env.API_PORT || 3000)}/files`,
      {
        method: 'POST',
        headers: requestHeaders,
        body: formData,
      },
    );

    console.log(response);

    if (!response.ok) {
      return {
        ok: false,
        status: response.status,
        data: await readResponseBody(response),
      };
    }

    if (response.status === 204) {
      return { ok: true, status: 204 };
    }

    return {
      ok: true,
      status: response.status,
      data: (await readResponseBody(response)) as UploadFilesResponse,
    };
  }

  decodeJwtPayload(token: string): Record<string, unknown> {
    const [, payload] = token.split('.');

    if (!payload) {
      throw new Error('Invalid JWT format');
    }

    return JSON.parse(
      Buffer.from(payload, 'base64url').toString('utf8'),
    ) as Record<string, unknown>;
  }

  encodeJwtPayload(payload: Record<string, unknown>): string {
    return Buffer.from(JSON.stringify(payload)).toString('base64url');
  }

  async putToS3(
    url: string,
    body: UploadBody,
    headers: Record<string, string> = {},
  ): Promise<PutResult> {
    const response = await fetch(url, {
      method: 'PUT',
      headers,
      body,
    });

    if (!response.ok) {
      throw new Error(
        `S3 upload failed: ${response.status} ${await response.text()}`,
      );
    }

    return {
      status: response.status,
      etag: response.headers.get('etag'),
    };
  }

  async bulkCommit(documentIds: string[], accessToken: string) {
    return this.post<DocumentCommitResponse[]>(
      '/files/commit',
      { documentIds },
      { Authorization: `Bearer ${accessToken}` },
    );
  }

  async uploadMultipart(
    file: Blob,
    intent: UploadFileMultipartResponse,
    start = 0,
    end = intent.parts.length,
  ): Promise<void> {
    const results = await Promise.allSettled(
      intent.parts.slice(start, end).map(async ({ partNumber, uploadUrl }) => {
        const start = (partNumber - 1) * intent.partSize;
        const end = Math.min(start + intent.partSize, file.size);

        await this.putToS3(uploadUrl, file.slice(start, end));
      }),
    );

    const failed = results.filter((result) => result.status === 'rejected');

    if (failed.length) {
      throw new Error(`${failed.length} multipart uploads failed`);
    }
  }
}
