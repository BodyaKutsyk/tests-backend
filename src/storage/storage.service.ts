import { Injectable } from '@nestjs/common';
import {
  HeadObjectCommand,
  HeadObjectCommandOutput,
  PutObjectCommand,
  S3Client,
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
}
