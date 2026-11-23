import { S3Client } from '@aws-sdk/client-s3';

export function createDemoS3Client() {
  return new S3Client({
    region: process.env.AWS_REGION,
    endpoint: process.env.STORAGE_ENDPOINT || undefined,
    forcePathStyle: Boolean(process.env.STORAGE_ENDPOINT),
    credentials: {
      accessKeyId: process.env.STORAGE_ACCESS_KEY ?? '',
      secretAccessKey: process.env.STORAGE_SECRET_KEY ?? '',
    },
    requestChecksumCalculation: 'WHEN_REQUIRED',
  });
}
