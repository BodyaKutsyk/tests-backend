import { randomBytes } from 'node:crypto';

export default function getRandomBase64(): string {
  return randomBytes(16).toString('base64url');
}
