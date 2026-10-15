import { fileTypeFromBuffer } from 'file-type';
import { lookup } from 'mime-types';

export async function determineMimeType(
  buffer: Buffer,
  originalName: string,
): Promise<string> {
  const detected = await fileTypeFromBuffer(buffer);
  if (detected) {
    return detected.mime;
  }

  const mimeFromExtension = lookup(originalName);
  if (mimeFromExtension) {
    return mimeFromExtension;
  }

  return 'application/octet-stream';
}
