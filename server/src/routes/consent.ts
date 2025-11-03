/**
 * Enhanced Consent Management Route with Blockchain Integration
 * 
 * Logs consent to both Supabase (internal) and blockchain (public proof)
 */

import { Router, Request, Response } from 'express';
import { supabaseAdmin } from '../config/supabase';
import { logConsent } from '../utils/consent';
import { blockchainLogger } from '../blockchain/auditLogger';
import pino from 'pino';

const router = Router();
const logger = pino({ name: 'consent-routes' });

/**
 * POST /api/consent/grant
 * 
 * Grant consent for data sharing between patient and doctor
 */
router.post('/grant', async (req: Request, res: Response) => {
  try {
    const { patientId, doctorId, recordId, scope, purpose } = req.body;

    // Validation
    if (!patientId || !doctorId || !scope || !purpose) {
      return res.status(400).json({
        error: 'Missing required fields: patientId, doctorId, scope, purpose'
      });
    }

    // Log consent to Supabase
    const consentLog = await logConsent(
      patientId,
      scope,
      purpose,
      true,
      req.ip || 'unknown'
    );

    // Generate unique consent ID
    const consentId = `consent_${patientId}_${doctorId}_${Date.now()}`;

    // Store consent relationship in database
    const { data: consent, error: dbError } = await supabaseAdmin
      .from('consent_logs')
      .insert({
        user_id: patientId,
        scope: scope,
        purpose: purpose,
        consent_given: true,
        metadata: {
          consentId,
          doctorId,
          recordId: recordId || null,
          grantedAt: new Date().toISOString()
        }
      })
      .select()
      .single();

    if (dbError) {
      logger.error('Failed to store consent:', dbError);
      return res.status(500).json({ error: 'Failed to store consent' });
    }

    // Log to blockchain (only hash data)
    let blockchainTx = null;
    if (blockchainLogger.isEnabled()) {
      const result = await blockchainLogger.logConsent(
        consentId,
        patientId,
        doctorId,
        recordId
      );

      if (result.success) {
        blockchainTx = {
          txHash: result.txHash,
          blockNumber: result.blockNumber,
          explorerUrl: blockchainLogger.getExplorerUrl(result.txHash!)
        };

        logger.info('Consent logged to blockchain:', blockchainTx);
      } else {
        logger.warn('Failed to log consent to blockchain:', result.error);
      }
    }

    res.status(201).json({
      success: true,
      message: 'Consent granted successfully',
      consentId,
      consent,
      blockchain: blockchainTx
    });

  } catch (error) {
    logger.error('Error granting consent:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * POST /api/consent/revoke
 * 
 * Revoke previously granted consent
 */
router.post('/revoke', async (req: Request, res: Response) => {
  try {
    const { consentId, patientId, reason } = req.body;

    if (!consentId || !patientId) {
      return res.status(400).json({
        error: 'Missing required fields: consentId, patientId'
      });
    }

    // Find consent in database
    const { data: existingConsent, error: findError } = await supabaseAdmin
      .from('consent_logs')
      .select('*')
      .eq('metadata->>consentId', consentId)
      .eq('user_id', patientId)
      .single();

    if (findError || !existingConsent) {
      return res.status(404).json({ error: 'Consent not found' });
    }

    // Update database
    const { error: updateError } = await supabaseAdmin
      .from('consent_logs')
      .update({
        consent_given: false,
        metadata: {
          ...existingConsent.metadata,
          revokedAt: new Date().toISOString(),
          revocationReason: reason || 'User requested'
        }
      })
      .eq('id', existingConsent.id);

    if (updateError) {
      logger.error('Failed to revoke consent:', updateError);
      return res.status(500).json({ error: 'Failed to revoke consent' });
    }

    // Revoke on blockchain
    let blockchainTx = null;
    if (blockchainLogger.isEnabled()) {
      const result = await blockchainLogger.revokeConsent(consentId);

      if (result.success) {
        blockchainTx = {
          txHash: result.txHash,
          blockNumber: result.blockNumber,
          explorerUrl: blockchainLogger.getExplorerUrl(result.txHash!)
        };

        logger.info('Consent revoked on blockchain:', blockchainTx);
      } else {
        logger.warn('Failed to revoke consent on blockchain:', result.error);
      }
    }

    res.status(200).json({
      success: true,
      message: 'Consent revoked successfully',
      consentId,
      blockchain: blockchainTx
    });

  } catch (error) {
    logger.error('Error revoking consent:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * GET /api/consent/verify/:consentId
 * 
 * Verify consent status on blockchain
 */
router.get('/verify/:consentId', async (req: Request, res: Response) => {
  try {
    const { consentId } = req.params;

    if (!blockchainLogger.isEnabled()) {
      return res.status(503).json({
        error: 'Blockchain verification not available',
        message: 'USE_BLOCKCHAIN is disabled'
      });
    }

    // Check blockchain status
    const isValid = await blockchainLogger.isConsentValid(consentId);
    const consentDetails = await blockchainLogger.getConsent(consentId);

    if (!consentDetails) {
      return res.status(404).json({
        error: 'Consent not found on blockchain',
        consentId
      });
    }

    res.status(200).json({
      success: true,
      consentId,
      valid: isValid,
      blockchain: consentDetails
    });

  } catch (error) {
    logger.error('Error verifying consent:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
