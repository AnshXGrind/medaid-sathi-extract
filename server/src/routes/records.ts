/**
 * Enhanced Health Records Route with Blockchain Integration
 * 
 * Logs record uploads and views to blockchain for tamper-proof audit trail
 */

import { Router, Request, Response } from 'express';
import { supabaseAdmin } from '../config/supabase';
import { blockchainLogger } from '../blockchain/auditLogger';
import pino from 'pino';

const router = Router();
const logger = pino({ name: 'records-routes' });

/**
 * POST /api/records/upload
 * 
 * Upload a new health record and log to blockchain
 */
router.post('/upload', async (req: Request, res: Response) => {
  try {
    const { userId, recordType, recordData, uploaderRole } = req.body;

    // Validation
    if (!userId || !recordType || !recordData || !uploaderRole) {
      return res.status(400).json({
        error: 'Missing required fields: userId, recordType, recordData, uploaderRole'
      });
    }

    // Validate uploader role
    const validRoles = ['patient', 'doctor', 'asha_worker'];
    if (!validRoles.includes(uploaderRole)) {
      return res.status(400).json({
        error: `Invalid uploaderRole. Must be one of: ${validRoles.join(', ')}`
      });
    }

    // Store record in Supabase
    const { data: record, error: dbError } = await supabaseAdmin
      .from('health_records')
      .insert({
        user_id: userId,
        record_type: recordType,
        record_data: recordData,
        uploaded_by: userId,
        uploaded_at: new Date().toISOString()
      })
      .select()
      .single();

    if (dbError) {
      logger.error('Failed to store health record:', dbError);
      return res.status(500).json({ error: 'Failed to store health record' });
    }

    const recordId = record.id;

    // Log to blockchain (only hash data)
    let blockchainTx = null;
    if (blockchainLogger.isEnabled()) {
      const result = await blockchainLogger.logRecordUpload(
        recordId,
        uploaderRole,
        userId
      );

      if (result.success) {
        blockchainTx = {
          txHash: result.txHash,
          blockNumber: result.blockNumber,
          explorerUrl: blockchainLogger.getExplorerUrl(result.txHash!)
        };

        logger.info('Record upload logged to blockchain:', blockchainTx);
      } else {
        logger.warn('Failed to log record upload to blockchain:', result.error);
      }
    }

    res.status(201).json({
      success: true,
      message: 'Health record uploaded successfully',
      recordId,
      record,
      blockchain: blockchainTx
    });

  } catch (error) {
    logger.error('Error uploading health record:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * GET /api/records/:recordId/view
 * 
 * View a health record and log access to blockchain
 */
router.get('/:recordId/view', async (req: Request, res: Response) => {
  try {
    const { recordId } = req.params;
    const { viewerId, accessReason } = req.query;

    if (!viewerId) {
      return res.status(400).json({
        error: 'Missing required query parameter: viewerId'
      });
    }

    // Fetch record from database
    const { data: record, error: dbError } = await supabaseAdmin
      .from('health_records')
      .select('*')
      .eq('id', recordId)
      .single();

    if (dbError || !record) {
      return res.status(404).json({ error: 'Health record not found' });
    }

    // TODO: Add RLS check - verify viewer has permission to access this record

    // Log view event to blockchain
    let blockchainTx = null;
    if (blockchainLogger.isEnabled()) {
      const result = await blockchainLogger.logViewEvent(
        viewerId as string,
        recordId,
        (accessReason as string) || 'consultation'
      );

      if (result.success) {
        blockchainTx = {
          txHash: result.txHash,
          blockNumber: result.blockNumber,
          explorerUrl: blockchainLogger.getExplorerUrl(result.txHash!)
        };

        logger.info('Record view logged to blockchain:', blockchainTx);
      } else {
        logger.warn('Failed to log view event to blockchain:', result.error);
      }
    }

    res.status(200).json({
      success: true,
      record,
      blockchain: blockchainTx,
      viewCount: blockchainLogger.isEnabled() 
        ? await blockchainLogger.getViewCount(recordId)
        : null
    });

  } catch (error) {
    logger.error('Error viewing health record:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * GET /api/records/:recordId/verify
 * 
 * Verify record authenticity on blockchain
 */
router.get('/:recordId/verify', async (req: Request, res: Response) => {
  try {
    const { recordId } = req.params;

    if (!blockchainLogger.isEnabled()) {
      return res.status(503).json({
        error: 'Blockchain verification not available',
        message: 'USE_BLOCKCHAIN is disabled'
      });
    }

    // Get record details from blockchain
    const recordDetails = await blockchainLogger.getRecord(recordId);

    if (!recordDetails) {
      return res.status(404).json({
        error: 'Record not found on blockchain',
        message: 'This record has not been logged to blockchain or does not exist',
        recordId
      });
    }

    // Get view count
    const viewCount = await blockchainLogger.getViewCount(recordId);

    res.status(200).json({
      success: true,
      recordId,
      blockchain: {
        ...recordDetails,
        viewCount,
        timestamp: new Date(recordDetails.timestamp * 1000).toISOString()
      },
      message: 'Record authenticity verified on blockchain'
    });

  } catch (error) {
    logger.error('Error verifying record:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * GET /api/records/blockchain/stats
 * 
 * Get blockchain statistics
 */
router.get('/blockchain/stats', async (req: Request, res: Response) => {
  try {
    if (!blockchainLogger.isEnabled()) {
      return res.status(503).json({
        error: 'Blockchain not available',
        message: 'USE_BLOCKCHAIN is disabled'
      });
    }

    const stats = await blockchainLogger.getStats();

    if (!stats) {
      return res.status(500).json({
        error: 'Failed to fetch blockchain statistics'
      });
    }

    res.status(200).json({
      success: true,
      blockchain: stats,
      network: 'Polygon Amoy Testnet',
      explorerUrl: 'https://amoy.polygonscan.com'
    });

  } catch (error) {
    logger.error('Error fetching blockchain stats:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
