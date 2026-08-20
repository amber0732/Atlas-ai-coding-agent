// src/lib/authCrypto.mjs
import crypto from 'crypto';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'atlas_super_secret_jwt_key_32_chars_min';
// AES-256 requires a 32-byte key
const ENCRYPTION_KEY = Buffer.from(
  (process.env.ENCRYPTION_KEY || '12345678901234567890123456789012').slice(0, 32),
  'utf-8'
);

// 1. Password Hashing
export async function hashPassword(plainPassword) {
  return await bcrypt.hash(plainPassword, 12);
}

export async function verifyPassword(plainPassword, hashedPassword) {
  return await bcrypt.compare(plainPassword, hashedPassword);
}

// 2. AES-256-GCM Token Encryption (For GitHub Tokens at rest)
export function encryptSecret(plainText) {
  if (!plainText) return null;
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv('aes-256-gcm', ENCRYPTION_KEY, iv);
  
  let encrypted = cipher.update(plainText, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  const authTag = cipher.getAuthTag().toString('hex');
  
  return `${iv.toString('hex')}:${authTag}:${encrypted}`;
}

export function decryptSecret(encryptedPayload) {
  if (!encryptedPayload) return null;
  const [ivHex, authTagHex, encryptedText] = encryptedPayload.split(':');
  if (!ivHex || !authTagHex || !encryptedText) return null;

  const decipher = crypto.createDecipheriv(
    'aes-256-gcm',
    ENCRYPTION_KEY,
    Buffer.from(ivHex, 'hex')
  );
  decipher.setAuthTag(Buffer.from(authTagHex, 'hex'));

  let decrypted = decipher.update(encryptedText, 'hex', 'utf8');
  decrypted += decipher.final('utf8');
  return decrypted;
}

// 3. JWT Session Tokens
export function createSessionToken(userPayload) {
  return jwt.sign(userPayload, JWT_SECRET, { expiresIn: '7d' });
}

export function verifySessionToken(token) {
  try {
    return jwt.verify(token, JWT_SECRET);
  } catch {
    return null;
  }
}
