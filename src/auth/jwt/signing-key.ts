import { createPrivateKey, createPublicKey, type KeyObject } from 'node:crypto';

function decodeKey(value: string): string {
  return value.includes('-----BEGIN')
    ? value.replace(/\\n/g, '\n')
    : Buffer.from(value, 'base64').toString('utf8');
}

export function getSigningKey(
  privateValue: string,
  publicValue: string,
): KeyObject {
  try {
    const privateKey = createPrivateKey(decodeKey(privateValue));
    const publicKey = createPublicKey(decodeKey(publicValue));
    if (
      privateKey.asymmetricKeyType !== 'ec' ||
      privateKey.asymmetricKeyDetails?.namedCurve !== 'prime256v1'
    ) {
      throw new Error('Expected an EC P-256 key');
    }
    const derived = createPublicKey(privateKey).export({
      type: 'spki',
      format: 'der',
    });
    const configured = publicKey.export({ type: 'spki', format: 'der' });
    if (!derived.equals(configured))
      throw new Error('Public key does not match private key');
    return privateKey;
  } catch (error) {
    throw new Error(
      'JWT_PRIVATE_KEY and JWT_PUBLIC_KEY must be a matching ES256 key pair',
      { cause: error },
    );
  }
}
