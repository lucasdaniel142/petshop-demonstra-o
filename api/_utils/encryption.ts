import crypto from 'crypto';

const ALGORITHM = 'aes-256-gcm';

// Formato da chave: 64 caracteres hex (32 bytes)
function getKey(): Buffer {
  const keyHex = process.env.APP_ENCRYPTION_KEY;
  if (!keyHex || keyHex.length !== 64) {
    throw new Error('APP_ENCRYPTION_KEY não configurada ou inválida. Deve ter 64 caracteres hex (32 bytes).');
  }
  return Buffer.from(keyHex, 'hex');
}

export function encryptPII(text: string): string {
  if (!text) return '';
  try {
    const iv = crypto.randomBytes(12);
    const cipher = crypto.createCipheriv(ALGORITHM, getKey(), iv);
    let encrypted = cipher.update(text, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    const authTag = cipher.getAuthTag().toString('hex');
    // Prefixo ENC: para identificar facilmente strings criptografadas
    return `ENC:${iv.toString('hex')}:${authTag}:${encrypted}`;
  } catch (error) {
    console.error('Erro na criptografia:', error);
    return text; // Fallback seguro
  }
}

export function decryptPII(hash: string): string {
  if (!hash || typeof hash !== 'string') return '';
  if (!hash.startsWith('ENC:')) return hash; // Retorna original se não estiver criptografado

  try {
    const [, ivHex, authTagHex, encryptedHex] = hash.split(':');
    if (!ivHex || !authTagHex || !encryptedHex) return hash;

    const decipher = crypto.createDecipheriv(ALGORITHM, getKey(), Buffer.from(ivHex, 'hex'));
    decipher.setAuthTag(Buffer.from(authTagHex, 'hex'));
    let decrypted = decipher.update(encryptedHex, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    return decrypted;
  } catch (error) {
    console.error('Erro na descriptografia:', error);
    return '*** DADO PROTEGIDO/ERRO ***';
  }
}
