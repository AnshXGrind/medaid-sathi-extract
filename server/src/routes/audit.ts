/**
 * Audit routes for government auditors
 * Read-only access to audit logs with streaming support
 */

import express, { type Request, type Response } from 'express';
import { supabaseAdmin } from '../config/supabase.js';
import { verifyAuditChain } from '../utils/audit.js';

const router = express.Router();

// TODO: Add proper authentication middleware for gov_auditor role
// For now, this is a placeholder that should be secured in production
const requireAuditorRole = (req: Request, res: Response, next: any) => {
  // TODO: Verify JWT and check role = 'gov_auditor'
  // const token = req.headers.authorization?.replace('Bearer ', '');
  // const decoded = verifyToken(token);
  // if (decoded.role !== 'gov_auditor') return res.status(403).json({ error: 'Forbidden' });
  next();
};

/**
 * GET /api/audit/logs
 * Stream audit logs with pagination
 */
router.get('/logs', requireAuditorRole, async (req: Request, res: Response) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = Math.min(parseInt(req.query.limit as string) || 100, 1000);
    const offset = (page - 1) * limit;

    const { data: logs, error, count } = await supabaseAdmin
      .from('audit_logs')
      .select('*', { count: 'exact' })
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) {
      return res.status(500).json({ error: 'Failed to fetch audit logs' });
    }

    res.json({
      logs,
      pagination: {
        page,
        limit,
        total: count,
        totalPages: Math.ceil((count || 0) / limit)
      }
    });
  } catch (error) {
    console.error('Audit logs fetch error:', error);
    res.status(500).json({ error: 'Failed to fetch audit logs' });
  }
});

/**
 * GET /api/audit/logs/:id
 * Get specific audit log entry
 */
router.get('/logs/:id', requireAuditorRole, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const { data: log, error } = await supabaseAdmin
      .from('audit_logs')
      .select('*')
      .eq('id', id)
      .single();

    if (error || !log) {
      return res.status(404).json({ error: 'Audit log not found' });
    }

    res.json(log);
  } catch (error) {
    console.error('Audit log fetch error:', error);
    res.status(500).json({ error: 'Failed to fetch audit log' });
  }
});

/**
 * GET /api/audit/verify
 * Verify audit log chain integrity
 */
router.get('/verify', requireAuditorRole, async (req: Request, res: Response) => {
  try {
    const verification = await verifyAuditChain();

    res.json({
      valid: verification.valid,
      brokenLinks: verification.brokenLinks,
      message: verification.valid 
        ? 'Audit chain integrity verified' 
        : `Chain integrity compromised. ${verification.brokenLinks.length} broken links detected.`,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Chain verification error:', error);
    res.status(500).json({ error: 'Failed to verify audit chain' });
  }
});

/**
 * GET /api/audit/stats
 * Get audit log statistics
 */
router.get('/stats', requireAuditorRole, async (req: Request, res: Response) => {
  try {
    const { data: stats } = await supabaseAdmin
      .rpc('get_audit_stats');

    res.json(stats || {});
  } catch (error) {
    console.error('Audit stats error:', error);
    res.status(500).json({ error: 'Failed to fetch audit statistics' });
  }
});

export default router;
