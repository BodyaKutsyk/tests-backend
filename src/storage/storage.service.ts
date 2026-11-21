import { Injectable } from '@nestjs/common';
import {
  CompletedPart,
  CompleteMultipartUploadCommand,
  CreateMultipartUploadCommand,
  HeadObjectCommand,
  HeadObjectCommandOutput,
  ListPartsCommand,
  PutObjectCommand,
  S3Client,
  UploadPartCommand,
} from '@aws-sdk/client-s3';
import { ConfigService } from '@nestjs/config';
import { Env } from '../config/env.schema.js';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import getRandomBase64 from '../utils/get-random-base64.js';
import { Document } from '../entities/document.js';

interface CreatePresignedUrlProps {
  key: string;
  md5: string;
  contentType: string;
}

interface GetMultipartUploadPartsProps {
  uploadId: string;
  storageKey: string;
  parts: number;
}

interface CreateMultipartUploadProps {
  key: string;
  contentType: string;
}

// in seconds
const UPLOAD_URL_EXPIRATION = 300;
export const DEMO_MD5 = 'AAAAAAAAAAAAAAAAAAAAAA==';

@Injectable()
export class StorageService {
  private readonly s3Client: S3Client;
  private readonly bucket: string;

  constructor(private readonly config: ConfigService<Env, true>) {
    const bucket = config.get('STORAGE_BUCKET');
    const accessKey = config.get('STORAGE_ACCESS_KEY');
    const secretKey = config.get('STORAGE_SECRET_KEY');
    const region = config.get('AWS_REGION');
    const endpoint = config.get('STORAGE_ENDPOINT');

    this.bucket = bucket;
    this.s3Client = new S3Client({
      region,
      requestChecksumCalculation: 'WHEN_REQUIRED',
      bucketEndpoint: endpoint || undefined,
      forcePathStyle: Boolean(endpoint),
      credentials: { accessKeyId: accessKey, secretAccessKey: secretKey },
    });
  }

  generateUploadUrlKey(userId: string, extension: string) {
    const uuid = getRandomBase64();
    return `uploads/${userId}/${uuid}${extension}`;
  }

  async createUploadUrl({ key, md5, contentType }: CreatePresignedUrlProps) {
    const command = new PutObjectCommand({
      Bucket: this.bucket,
      Key: key,
      ContentType: contentType,
      ContentMD5: md5,
    });

    return getSignedUrl(this.s3Client, command, {
      expiresIn: md5 === DEMO_MD5 ? 1 : UPLOAD_URL_EXPIRATION,
    });
  }

  async headObject(key: string) {
    return this.s3Client.send(
      new HeadObjectCommand({
        Bucket: this.bucket,
        Key: key,
      }),
    );
  }
  validateUploadedObject(
    object: HeadObjectCommandOutput,
    document: Document,
  ): string[] {
    const errors: string[] = [];

    if (object.ContentLength !== document.size) {
      errors.push('File size mismatch');
    }

    if (object.ContentType !== document.mimeType) {
      errors.push('Content type mismatch');
    }

    return errors;
  }

  async getMultipartUploadParts({
    storageKey,
    uploadId,
    parts,
  }: GetMultipartUploadPartsProps) {
    return Promise.all(
      Array.from({ length: parts }, async (_, index) => {
        const partNumber = index + 1;

        const command = new UploadPartCommand({
          Bucket: this.bucket,
          Key: storageKey,
          UploadId: uploadId,
          PartNumber: partNumber,
        });

        return {
          partNumber,
          uploadUrl: await getSignedUrl(this.s3Client, command, {
            expiresIn: 300,
          }),
        };
      }),
    );
  }

  createMultipartUpload({ contentType, key }: CreateMultipartUploadProps) {
    return this.s3Client.send(
      new CreateMultipartUploadCommand({
        Bucket: this.bucket,
        Key: key,
        ContentType: contentType,
      }),
    );
  }

  async listUploadedParts(key: string, uploadId: string) {
    const parts: Array<{
      PartNumber: number;
      ETag: string;
      Size: number;
    }> = [];

    let marker: string | undefined;

    do {
      const result = await this.s3Client.send(
        new ListPartsCommand({
          Bucket: this.bucket,
          Key: key,
          UploadId: uploadId,
          PartNumberMarker: marker,
        }),
      );

      for (const part of result.Parts ?? []) {
        if (
          part.PartNumber === undefined ||
          !part.ETag ||
          part.Size === undefined
        ) {
          throw new Error('Invalid multipart part metadata');
        }

        parts.push({
          PartNumber: part.PartNumber,
          ETag: part.ETag,
          Size: part.Size,
        });
      }

      if (!result.IsTruncated) break;

      if (result.NextPartNumberMarker === undefined) {
        throw new Error('Missing multipart pagination marker');
      }

      marker = result.NextPartNumberMarker;
    } while (true);

    return parts.sort((a, b) => a.PartNumber - b.PartNumber);
  }

  async completeMultipart(
    key: string,
    uploadId: string,
    parts: CompletedPart[],
  ) {
    return this.s3Client.send(
      new CompleteMultipartUploadCommand({
        Bucket: this.bucket,
        Key: key,
        UploadId: uploadId,
        MultipartUpload: {
          Parts: parts,
        },
      }),
    );
  }

  validateMultipartParts(
    parts: Array<{ PartNumber: number; Size: number }>,
    fileSize: number,
    partSize: number,
  ): void {
    if (!Number.isSafeInteger(partSize) || partSize <= 0) {
      throw new Error('Invalid part size');
    }

    const partCount = Math.ceil(fileSize / partSize);

    if (parts.length !== partCount) {
      throw new Error(
        `Some parts are missing. Expected: ${partCount}, received: ${parts.length}`,
      );
    }

    for (const [index, part] of parts.entries()) {
      const partNumber = index + 1;
      const start = index * partSize;
      const expectedSize = Math.min(partSize, fileSize - start);

      if (part.PartNumber !== partNumber || part.Size !== expectedSize) {
        throw new Error(`Invalid part ${partNumber}`);
      }
    }
  }
}
