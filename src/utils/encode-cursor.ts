import { CursorDto } from '../types/cursor.dto.js';
import { encodeBase64 } from './base64.js';

export function encodeCursor(cursor: CursorDto) {
  return encodeBase64(JSON.stringify(cursor));
}
