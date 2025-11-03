/**
 * Cryptographic utilities for HMAC hashing and encryption
 * Security: Server-side only operations for sensitive data
 */

import crypto from 'crypto';

const HMAC_SECRET = process.env.HMAC_SECRET;
const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY;

if (!HMAC_SECRET || HMAC_SECRET.length < 64) {
  throw new Error('HMAC_SECRET must be at least 64 characters. Generate with: node -e "console.log(require(\'crypto\').randomBytes(64).toString(\'hex\'))"');
}

if (!ENCRYPTION_KEY || ENCRYPTION_KEY.length < 32) {
  throw new Error('ENCRYPTION_KEY must be at least 32 characters for AES-256');
}

/**
 * HMAC-SHA256 hash for sensitive identifiers (Aadhaar, Health ID)
 * Prevents rainbow table attacks and ensures one-way hashing
 */
export function hmacHash(data: string): string {
  if (!data || typeof data !== 'string') {
    throw new Error('Invalid data for HMAC hashing');
  }
  
  const hmac = crypto.createHmac('sha256', HMAC_SECRET);
  hmac.update(data);
  return hmac.digest('hex');
}

/**
 * Hash Aadhaar number with HMAC and extract last 4 digits
 * Server-side only - never send raw Aadhaar to client
 */
export function hashAadhaar(aadhaarNumber: string): { hash: string; last4: string } {
  // Validate Aadhaar format (12 digits)
  const cleaned = aadhaarNumber.replace(/\s/g, '');
  if (!/^\d{12}$/.test(cleaned)) {
    throw new Error('Invalid Aadhaar number format');
  }

  return {
    hash: hmacHash(cleaned),
    last4: cleaned.slice(-4)
  };
}

/**
 * Hash Health ID (ABHA number) with HMAC
 */
export function hashHealthId(healthId: string): string {
  // Validate Health ID format (14 digits)
  const cleaned = healthId.replace(/[-\s]/g, '');
  if (!/^\d{14}$/.test(cleaned)) {
    throw new Error('Invalid Health ID format');
  }

  return hmacHash(cleaned);
}

/**
 * AES-256-GCM encryption for sensitive tokens
 */
export function encrypt(plaintext: string): { encrypted: string; iv: string; tag: string } {
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv(
    'aes-256-gcm',
    Buffer.from(ENCRYPTION_KEY.slice(0, 32)),
    iv
  );

  let encrypted = cipher.update(plaintext, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  const tag = cipher.getAuthTag();

  return {
    encrypted,
    iv: iv.toString('hex'),
    tag: tag.toString('hex')
  };
}

/**
 * AES-256-GCM decryption
 */
export function decrypt(encrypted: string, iv: string, tag: string): string {
  const decipher = crypto.createDecipheriv(
    'aes-256-gcm',
    Buffer.from(ENCRYPTION_KEY.slice(0, 32)),
    Buffer.from(iv, 'hex')
  );

  decipher.setAuthTag(Buffer.from(tag, 'hex'));

  let decrypted = decipher.update(encrypted, 'hex', 'utf8');
  decrypted += decipher.final('utf8');

  return decrypted;
}

/**
 * Generate secure random token
 */
export function generateSecureToken(length: number = 32): string {
  return crypto.randomBytes(length).toString('hex');
}

/**
 * Hash IP address for privacy-preserving logging
 */
export function hashIpAddress(ip: string): string {
  return crypto.createHash('sha256').update(ip + HMAC_SECRET).digest('hex').slice(0, 16);
}
