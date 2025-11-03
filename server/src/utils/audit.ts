/**
 * Audit logging utilities with hash chaining for tamper detection
 */

import { supabaseAdmin } from '../config/supabase.js';
import crypto from 'crypto';

interface AuditEventData {
  actor: string;
  action: string;
  targetId: string | null;
  metadata?: Record<string, any>;
}

/**
 * Create chained audit log entry
 * Each entry includes hash of previous entry to detect tampering
 */
export async function logAuditEvent(event: AuditEventData): Promise<void> {
  try {
    // Get previous log entry
    const { data: prevLog } = await supabaseAdmin
      .from('audit_logs')
      .select('hash')
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    const prevHash = prevLog?.hash || '0000000000000000000000000000000000000000000000000000000000000000';

    // Create current entry data
    const entryData = {
      actor: event.actor,
      action: event.action,
      target_id: event.targetId,
      metadata: event.metadata || {},
      prev_hash: prevHash,
      created_at: new Date().toISOString()
    };

    // Compute hash of current entry
    const currentHash = crypto
      .createHash('sha256')
      .update(JSON.stringify(entryData))
      .digest('hex');

    // Insert audit log with hash
    const { error } = await supabaseAdmin
      .from('audit_logs')
      .insert({
        ...entryData,
        hash: currentHash
      });

    if (error) {
      console.error('Failed to write audit log:', error);
      // Don't throw - audit logging should not break main operations
    }
  } catch (error) {
    console.error('Audit logging error:', error);
  }
}

/**
 * Verify audit log chain integrity
 * Returns array of broken links (should be empty in healthy system)
 */
export async function verifyAuditChain(): Promise<{ valid: boolean; brokenLinks: number[] }> {
  const { data: logs } = await supabaseAdmin
    .from('audit_logs')
    .select('id, actor, action, target_id, metadata, prev_hash, hash, created_at')
    .order('created_at', { ascending: true });

  if (!logs || logs.length === 0) {
    return { valid: true, brokenLinks: [] };
  }

  const brokenLinks: number[] = [];

  for (let i = 1; i < logs.length; i++) {
    const currentLog = logs[i];
    const prevLog = logs[i - 1];

    // Verify current log points to correct previous hash
    if (currentLog.prev_hash !== prevLog.hash) {
      brokenLinks.push(currentLog.id);
    }

    // Verify current log's hash is correct
    const entryData = {
      actor: currentLog.actor,
      action: currentLog.action,
      target_id: currentLog.target_id,
      metadata: currentLog.metadata,
      prev_hash: currentLog.prev_hash,
      created_at: currentLog.created_at
    };

    const computedHash = crypto
      .createHash('sha256')
      .update(JSON.stringify(entryData))
      .digest('hex');

    if (computedHash !== currentLog.hash) {
      brokenLinks.push(currentLog.id);
    }
  }

  return {
    valid: brokenLinks.length === 0,
    brokenLinks
  };
}
