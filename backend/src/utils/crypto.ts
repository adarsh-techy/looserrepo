import crypto from 'crypto';

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 12; // Standard 96-bit IV for AES-GCM
const SALT_LENGTH = 16;
const KEY_LENGTH = 32;
const PBKDF2_ITERATIONS = 100000;

/**
 * Encrypt a plaintext string using AES-256-GCM and a hex master key
 */
export function encryptWithMasterKey(text: string, masterKeyHex: string): { ciphertext: string; iv: string; authTag: string } {
  const key = Buffer.from(masterKeyHex, 'hex');
  if (key.length !== 32) {
    throw new Error('Master key must be 32 bytes (64 hex characters)');
  }

  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);

  let encrypted = cipher.update(text, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  const authTag = cipher.getAuthTag().toString('hex');

  return {
    ciphertext: encrypted,
    iv: iv.toString('hex'),
    authTag,
  };
}

/**
 * Decrypt a ciphertext string using AES-256-GCM and a hex master key
 */
export function decryptWithMasterKey(ciphertext: string, ivHex: string, authTagHex: string, masterKeyHex: string): string {
  const key = Buffer.from(masterKeyHex, 'hex');
  const iv = Buffer.from(ivHex, 'hex');
  const authTag = Buffer.from(authTagHex, 'hex');

  const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
  decipher.setAuthTag(authTag);

  let decrypted = decipher.update(ciphertext, 'hex', 'utf8');
  decrypted += decipher.final('utf8');
  return decrypted;
}

/**
 * Derive an encryption key from a dedicated password and unique salt using PBKDF2-SHA512
 */
export function deriveKeyFromPassword(password: string, saltHex?: string): { key: Buffer; salt: string } {
  const salt = saltHex ? Buffer.from(saltHex, 'hex') : crypto.randomBytes(SALT_LENGTH);
  const key = crypto.pbkdf2Sync(password, salt, PBKDF2_ITERATIONS, KEY_LENGTH, 'sha512');
  return { key, salt: salt.toString('hex') };
}

/**
 * Encrypt arbitrary content with a custom password (used for dedicated secret notes)
 */
export function encryptWithPassword(text: string, password: string): { ciphertext: string; salt: string; iv: string; authTag: string } {
  const { key, salt } = deriveKeyFromPassword(password);
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);

  let encrypted = cipher.update(text, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  const authTag = cipher.getAuthTag().toString('hex');

  return {
    ciphertext: encrypted,
    salt,
    iv: iv.toString('hex'),
    authTag,
  };
}

/**
 * Decrypt content with a custom password and stored salt, iv, and authTag
 */
export function decryptWithPassword(ciphertext: string, password: string, saltHex: string, ivHex: string, authTagHex: string): string {
  const { key } = deriveKeyFromPassword(password, saltHex);
  const iv = Buffer.from(ivHex, 'hex');
  const authTag = Buffer.from(authTagHex, 'hex');

  const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
  decipher.setAuthTag(authTag);

  let decrypted = decipher.update(ciphertext, 'hex', 'utf8');
  decrypted += decipher.final('utf8');
  return decrypted;
}

/**
 * Mask sensitive string for safe UI presentation (e.g. "••••••••••••")
 */
export function maskSensitiveValue(len: number = 12): string {
  return '•'.repeat(len);
}
