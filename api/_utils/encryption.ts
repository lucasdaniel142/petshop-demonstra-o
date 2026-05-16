import crypto from 'crypto';

const ENCRYPTION_KEY = process.env.ORDER_ENCRYPTION_KEY || '';

export function decryptPII(text: string) {
  if (!ENCRYPTION_KEY) {
    throw new Error('ORDER_ENCRYPTION_KEY is not defined');
  }

  const [ivHex, encryptedHex] = text.split(':');
  if (!ivHex || !encryptedHex) {
    throw new Error('Invalid encrypted format');
  }

  const iv = Buffer.from(ivHex, 'hex');
  const encryptedText = Buffer.from(encryptedHex, 'hex');
  const decipher = crypto.createDecipheriv(
    'aes-256-cbc',
    Buffer.from(ENCRYPTION_KEY, 'hex'),
    iv
  );

  let decrypted = decipher.update(encryptedText);
  decrypted = Buffer.concat([decrypted, decipher.final()]);

  return decrypted.toString();
}
