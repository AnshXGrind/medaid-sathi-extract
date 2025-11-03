/**
 * Consent logging utilities for GDPR/DPDP compliance
 */

import { supabaseAdmin } from '../config/supabase.js';
import { hashIpAddress } from './crypto.js';

interface ConsentData {
  userId: string;
  scope: string;
  purpose: string;
  ipHash: string;
  userAgent?: string;
}

/**
 * Log user consent for data processing
 * Required by GDPR Art. 7 and India's DPDP Act 2023
 */
export async function logConsent(consent: ConsentData): Promise<void> {
  try {
    const ipHashSafe = hashIpAddress(consent.ipHash);

    const { error } = await supabaseAdmin
      .from('consent_logs')
      .insert({
        user_id: consent.userId,
        scope: consent.scope,
        purpose: consent.purpose,
        ip_hash: ipHashSafe,
        user_agent: consent.userAgent?.slice(0, 200), // Truncate to avoid large storage
        consent_given: true,
        created_at: new Date().toISOString()
      });

    if (error) {
      console.error('Failed to log consent:', error);
    }
  } catch (error) {
    console.error('Consent logging error:', error);
  }
}

/**
 * Log consent withdrawal
 */
export async function logConsentWithdrawal(userId: string, scope: string, reason?: string): Promise<void> {
  try {
    const { error } = await supabaseAdmin
      .from('consent_logs')
      .insert({
        user_id: userId,
        scope,
        purpose: reason || 'User requested consent withdrawal',
        consent_given: false,
        created_at: new Date().toISOString()
      });

    if (error) {
      console.error('Failed to log consent withdrawal:', error);
    }
  } catch (error) {
    console.error('Consent withdrawal logging error:', error);
  }
}

/**
 * Check if user has given consent for specific scope
 */
export async function hasConsent(userId: string, scope: string): Promise<boolean> {
  const { data } = await supabaseAdmin
    .from('consent_logs')
    .select('consent_given')
    .eq('user_id', userId)
    .eq('scope', scope)
    .order('created_at', { ascending: false })
    .limit(1)
    .single();

  return data?.consent_given || false;
}
