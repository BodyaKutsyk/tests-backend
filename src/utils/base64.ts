export function encodeBase64(str: string) {
  return Buffer.from(str, 'utf8').toString('base64');
}

export function decodeBase64(str: string) {
  return Buffer.from(str, 'base64').toString('utf8');
}
