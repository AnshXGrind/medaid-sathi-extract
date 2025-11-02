/**
 * Secure Aadhaar Handling - Zero Raw Storage
 * 
 * Security Features:
 * 1. Never stores full Aadhaar number
 * 2. Stores only last 4 digits for display
 * 3. Stores SHA-256 hashed token for verification
 * 4. Implements one-way encryption
 */

/**
 * Hash Aadhaar number using SHA-256
 * This creates a one-way hash that cannot be reversed
 */
export async function hashAadhaar(aadhaarNumber: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(aadhaarNumber);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  return hashHex;
}

/**
 * Extract last 4 digits for display purposes
 */
export function getLastFourDigits(aadhaarNumber: string): string {
  const cleaned = aadhaarNumber.replace(/\D/g, '');
  return cleaned.slice(-4);
}

/**
 * Validate Aadhaar format (12 digits)
 */
export function validateAadhaarFormat(aadhaarNumber: string): boolean {
  const cleaned = aadhaarNumber.replace(/\D/g, '');
  return cleaned.length === 12 && /^\d{12}$/.test(cleaned);
}

/**
 * Securely process Aadhaar - returns data safe to store
 * NEVER stores the original Aadhaar number
 */
export async function processAadhaarSecurely(aadhaarNumber: string): Promise<{
  lastFourDigits: string;
  hashedToken: string;
  isValid: boolean;
}> {
  const isValid = validateAadhaarFormat(aadhaarNumber);
  
  if (!isValid) {
    return {
      lastFourDigits: '',
      hashedToken: '',
      isValid: false
    };
  }

  const lastFourDigits = getLastFourDigits(aadhaarNumber);
  const hashedToken = await hashAadhaar(aadhaarNumber);

  return {
    lastFourDigits,
    hashedToken,
    isValid: true
  };
}

/**
 * Display masked Aadhaar for UI
 * Example: XXXX-XXXX-1234
 */
export function displayMaskedAadhaar(lastFourDigits: string): string {
  return `XXXX-XXXX-${lastFourDigits}`;
}

/**
 * Verify Aadhaar against stored hash
 */
export async function verifyAadhaar(
  inputAadhaar: string,
  storedHash: string
): Promise<boolean> {
  const inputHash = await hashAadhaar(inputAadhaar);
  return inputHash === storedHash;
}

/**
 * Generate secure patient ID from Aadhaar hash
 * This can be used as a unique identifier without exposing Aadhaar
 */
export function generateSecurePatientId(hashedToken: string): string {
  return `PAT-${hashedToken.substring(0, 12).toUpperCase()}`;
}
