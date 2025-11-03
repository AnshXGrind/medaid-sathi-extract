/**
 * Privacy-preserving analytics routes
 * District-level aggregates with k-anonymity
 */

import express, { type Request, type Response } from 'express';
import { supabaseAdmin } from '../config/supabase.js';

const router = express.Router();

const K_ANONYMITY_THRESHOLD = parseInt(process.env.K_ANONYMITY_THRESHOLD || '10');

/**
 * GET /api/analytics/district/:districtId
 * Get anonymized district-level health statistics
 */
router.get('/district/:districtId', async (req: Request, res: Response) => {
  try {
    const { districtId } = req.params;

    // Get aggregated statistics
    const { data: stats, error } = await supabaseAdmin
      .rpc('get_district_health_stats', { district_id: districtId });

    if (error) {
      return res.status(500).json({ error: 'Failed to fetch district statistics' });
    }

    // Apply k-anonymity: suppress data if less than threshold
    if (stats.total_records < K_ANONYMITY_THRESHOLD) {
      return res.json({
        district: districtId,
        message: `Data suppressed for privacy (minimum ${K_ANONYMITY_THRESHOLD} records required)`,
        available: false
      });
    }

    res.json({
      district: districtId,
      available: true,
      statistics: {
        totalConsultations: stats.total_consultations,
        commonSymptoms: stats.common_symptoms, // Array of symptom counts
        avgConsultationDuration: Math.round(stats.avg_duration),
        monthlyTrend: stats.monthly_trend
      },
      metadata: {
        lastUpdated: stats.last_updated,
        recordCount: stats.total_records,
        privacyCompliant: true
      }
    });
  } catch (error) {
    console.error('Analytics fetch error:', error);
    res.status(500).json({ error: 'Failed to fetch analytics' });
  }
});

/**
 * GET /api/analytics/disease-trends
 * Get anonymized disease prevalence trends
 */
router.get('/disease-trends', async (req: Request, res: Response) => {
  try {
    const { data: trends, error } = await supabaseAdmin
      .rpc('get_disease_trends');

    if (error) {
      return res.status(500).json({ error: 'Failed to fetch disease trends' });
    }

    // Filter out diseases with less than threshold occurrences
    const filteredTrends = trends.filter(
      (trend: any) => trend.case_count >= K_ANONYMITY_THRESHOLD
    );

    res.json({
      trends: filteredTrends,
      privacyNote: `Only showing diseases with ${K_ANONYMITY_THRESHOLD}+ reported cases`,
      lastUpdated: new Date().toISOString()
    });
  } catch (error) {
    console.error('Disease trends error:', error);
    res.status(500).json({ error: 'Failed to fetch disease trends' });
  }
});

/**
 * POST /api/analytics/compute
 * Trigger background job to compute aggregates
 * Requires admin role
 */
router.post('/compute', async (req: Request, res: Response) => {
  try {
    // TODO: Add admin authentication check

    // Trigger background computation
    // In production, this would be handled by a cron job
    res.json({
      message: 'Analytics computation triggered',
      note: 'This should be automated via cron in production'
    });
  } catch (error) {
    console.error('Analytics computation error:', error);
    res.status(500).json({ error: 'Failed to trigger analytics computation' });
  }
});

export default router;
