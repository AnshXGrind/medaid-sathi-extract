/**
 * Health check and monitoring routes
 */

import express, { type Request, type Response } from 'express';
import { supabaseAdmin } from '../config/supabase.js';

const router = express.Router();

/**
 * GET /api/health
 * Basic health check
 */
router.get('/', async (req: Request, res: Response) => {
  const health = {
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    version: '2.0.0',
    checks: {
      server: 'ok',
      database: 'unknown',
      abha: 'unknown'
    }
  };

  // Check database connectivity
  try {
    const { error } = await supabaseAdmin
      .from('profiles')
      .select('count')
      .limit(1)
      .single();

    health.checks.database = error ? 'error' : 'ok';
  } catch {
    health.checks.database = 'error';
  }

  // Check ABHA endpoint (basic connectivity)
  const abhaConfigured = !!(process.env.ABHA_CLIENT_ID && process.env.ABHA_CLIENT_SECRET);
  health.checks.abha = abhaConfigured ? 'configured' : 'not_configured';

  const overallHealthy = health.checks.database === 'ok';
  res.status(overallHealthy ? 200 : 503).json(health);
});

/**
 * GET /api/health/metrics
 * Detailed metrics for monitoring
 */
router.get('/metrics', async (req: Request, res: Response) => {
  try {
    const metrics = {
      process: {
        uptime: process.uptime(),
        memory: process.memoryUsage(),
        cpu: process.cpuUsage()
      },
      timestamp: new Date().toISOString()
    };

    res.json(metrics);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch metrics' });
  }
});

export default router;
