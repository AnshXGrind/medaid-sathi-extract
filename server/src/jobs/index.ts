/**
 * Background cron jobs for token rotation and maintenance
 */

import cron from 'node-cron';
import { supabaseAdmin } from '../config/supabase.js';
import { encrypt, decrypt } from '../utils/crypto.js';
import { logAuditEvent } from '../utils/audit.js';
import axios from 'axios';

const ABHA_BASE_URL = process.env.ABHA_BASE_URL || 'https://healthidsbx.abdm.gov.in/api/v2';
const ABHA_CLIENT_ID = process.env.ABHA_CLIENT_ID;
const ABHA_CLIENT_SECRET = process.env.ABHA_CLIENT_SECRET;

/**
 * Token rotation job - runs every 6 hours
 * Refreshes ABHA tokens that are expiring soon (within 24 hours)
 */
async function rotateExpiringSoon() {
  console.log('🔄 Starting ABHA token rotation job...');

  try {
    // Find tokens expiring in next 24 hours
    const expiryThreshold = new Date(Date.now() + 24 * 60 * 60 * 1000);

    const { data: expiringTokens } = await supabaseAdmin
      .from('user_abha_tokens')
      .select('*')
      .lt('token_expires_at', expiryThreshold.toISOString());

    if (!expiringTokens || expiringTokens.length === 0) {
      console.log('✅ No tokens expiring soon');
      return;
    }

    console.log(`🔄 Found ${expiringTokens.length} tokens to refresh`);

    for (const tokenData of expiringTokens) {
      try {
        // Decrypt refresh token
        const refreshToken = decrypt(
          tokenData.refresh_token_encrypted,
          tokenData.refresh_token_iv,
          tokenData.refresh_token_tag
        );

        // Request new access token
        let tokenResponse;
        try {
          tokenResponse = await axios.post(
            `${ABHA_BASE_URL}/auth/token`,
            {
              grant_type: 'refresh_token',
              refresh_token: refreshToken,
              client_id: ABHA_CLIENT_ID,
              client_secret: ABHA_CLIENT_SECRET
            },
            {
              headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
              timeout: 10000
            }
          );
        } catch (apiError) {
          console.warn(`⚠️ ABDM API unavailable for user ${tokenData.user_id}, skipping`);
          continue;
        }

        const { access_token, expires_in } = tokenResponse.data;
        const encryptedAccess = encrypt(access_token);

        // Update stored token
        await supabaseAdmin
          .from('user_abha_tokens')
          .update({
            access_token_encrypted: encryptedAccess.encrypted,
            access_token_iv: encryptedAccess.iv,
            access_token_tag: encryptedAccess.tag,
            token_expires_at: new Date(Date.now() + expires_in * 1000).toISOString(),
            last_refreshed_at: new Date().toISOString()
          })
          .eq('user_id', tokenData.user_id);

        await logAuditEvent({
          actor: 'system',
          action: 'abha_token_auto_rotated',
          targetId: tokenData.user_id,
          metadata: { health_id_hash: tokenData.health_id_hash }
        });

        console.log(`✅ Rotated token for user ${tokenData.user_id}`);
      } catch (error) {
        console.error(`❌ Failed to rotate token for user ${tokenData.user_id}:`, error);
        // Continue with next token
      }
    }

    console.log('✅ Token rotation job completed');
  } catch (error) {
    console.error('❌ Token rotation job failed:', error);
  }
}

/**
 * Cleanup expired sessions - runs daily at midnight
 */
async function cleanupExpiredSessions() {
  console.log('🧹 Starting expired session cleanup...');

  try {
    const { error } = await supabaseAdmin
      .rpc('cleanup_expired_sessions');

    if (error) {
      console.error('Failed to cleanup sessions:', error);
    } else {
      console.log('✅ Expired sessions cleaned up');
    }
  } catch (error) {
    console.error('❌ Session cleanup failed:', error);
  }
}

/**
 * Data retention policy enforcement - runs weekly
 */
async function enforceRetentionPolicy() {
  console.log('📋 Starting data retention policy enforcement...');

  try {
    const retentionDays = parseInt(process.env.AUDIT_LOG_RETENTION_DAYS || '2555'); // ~7 years default

    const { error } = await supabaseAdmin
      .rpc('check_retention_expiry', {
        retention_days: retentionDays
      });

    if (error) {
      console.error('Failed to enforce retention policy:', error);
    } else {
      console.log('✅ Retention policy enforced');
    }
  } catch (error) {
    console.error('❌ Retention policy enforcement failed:', error);
  }
}

/**
 * Start all cron jobs
 */
export function startCronJobs() {
  // Token rotation - every 6 hours
  cron.schedule('0 */6 * * *', rotateExpiringSoon);
  console.log('✅ Scheduled: Token rotation (every 6 hours)');

  // Session cleanup - daily at midnight
  cron.schedule('0 0 * * *', cleanupExpiredSessions);
  console.log('✅ Scheduled: Session cleanup (daily at midnight)');

  // Retention policy - weekly on Sunday at 2 AM
  cron.schedule('0 2 * * 0', enforceRetentionPolicy);
  console.log('✅ Scheduled: Retention policy enforcement (weekly)');
}
