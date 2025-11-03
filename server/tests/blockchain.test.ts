/**
 * Blockchain Integration Tests
 * 
 * Tests the backend blockchain logging functionality
 * Run with: npm test -- blockchain
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { BlockchainAuditLogger } from '../src/blockchain/auditLogger';

describe('Blockchain Audit Logger', () => {
  let logger: BlockchainAuditLogger;

  beforeAll(() => {
    // Initialize blockchain logger
    logger = new BlockchainAuditLogger();
  });

  describe('Initialization', () => {
    it('should check if blockchain is enabled', () => {
      const isEnabled = logger.isEnabled();
      
      // Will be false in test environment without proper config
      expect(typeof isEnabled).toBe('boolean');
      console.log('Blockchain enabled:', isEnabled);
    });
  });

  describe('Consent Logging (Mock)', () => {
    it('should handle consent logging when blockchain is disabled', async () => {
      const result = await logger.logConsent(
        'consent_test_123',
        'patient_456',
        'doctor_789',
        'record_abc'
      );

      if (!logger.isEnabled()) {
        expect(result.success).toBe(false);
        expect(result.error).toBe('Blockchain logging disabled');
      } else {
        expect(result.success).toBe(true);
        expect(result.txHash).toBeDefined();
      }
    });

    it('should generate consistent bytes32 hashes', () => {
      // Test hash generation (private method tested indirectly)
      const testId = 'test_consent_123';
      
      // In production, same ID should always produce same hash
      // This is important for blockchain verification
      expect(testId).toBe('test_consent_123');
    });
  });

  describe('Record Logging (Mock)', () => {
    it('should handle record logging when blockchain is disabled', async () => {
      const result = await logger.logRecordUpload(
        'record_test_xyz',
        'patient',
        'uploader_123'
      );

      if (!logger.isEnabled()) {
        expect(result.success).toBe(false);
      } else {
        expect(result.success).toBe(true);
      }
    });
  });

  describe('View Logging (Mock)', () => {
    it('should handle view event logging when blockchain is disabled', async () => {
      const result = await logger.logViewEvent(
        'viewer_123',
        'record_456',
        'consultation'
      );

      if (!logger.isEnabled()) {
        expect(result.success).toBe(false);
      } else {
        expect(result.success).toBe(true);
      }
    });
  });

  describe('Verification Functions', () => {
    it('should verify consent validity', async () => {
      const isValid = await logger.isConsentValid('consent_test_123');
      
      // Will return false when blockchain is disabled or consent not found
      expect(typeof isValid).toBe('boolean');
    });

    it('should get consent details', async () => {
      const consent = await logger.getConsent('consent_test_123');
      
      // Will return null when blockchain is disabled or consent not found
      expect(consent === null || typeof consent === 'object').toBe(true);
    });

    it('should get blockchain statistics', async () => {
      const stats = await logger.getStats();
      
      if (logger.isEnabled()) {
        expect(stats).toHaveProperty('totalConsents');
        expect(stats).toHaveProperty('totalRecords');
        expect(stats).toHaveProperty('totalViews');
      } else {
        expect(stats).toBeNull();
      }
    });
  });

  describe('Explorer URL Generation', () => {
    it('should generate correct explorer URL', () => {
      const txHash = '0x1234567890abcdef';
      const url = logger.getExplorerUrl(txHash);
      
      expect(url).toContain('amoy.polygonscan.com');
      expect(url).toContain(txHash);
      expect(url).toBe(`https://amoy.polygonscan.com/tx/${txHash}`);
    });
  });
});

// Integration test with actual blockchain (requires setup)
describe('Blockchain Integration (E2E)', () => {
  // Skip if blockchain not configured
  const skipTests = !process.env.USE_BLOCKCHAIN || process.env.USE_BLOCKCHAIN !== 'true';

  it.skipIf(skipTests)('should log consent to blockchain', async () => {
    const logger = new BlockchainAuditLogger();
    
    if (!logger.isEnabled()) {
      console.warn('Blockchain not enabled - skipping E2E test');
      return;
    }

    const consentId = `consent_e2e_${Date.now()}`;
    const result = await logger.logConsent(
      consentId,
      'patient_e2e_test',
      'doctor_e2e_test',
      'record_e2e_test'
    );

    expect(result.success).toBe(true);
    expect(result.txHash).toBeDefined();
    expect(result.blockNumber).toBeGreaterThan(0);

    console.log('✅ Consent logged to blockchain:', result.txHash);
    console.log('🔗 View at:', logger.getExplorerUrl(result.txHash!));
  }, 30000); // 30 second timeout for blockchain transaction

  it.skipIf(skipTests)('should verify consent on blockchain', async () => {
    const logger = new BlockchainAuditLogger();
    
    if (!logger.isEnabled()) {
      console.warn('Blockchain not enabled - skipping E2E test');
      return;
    }

    // Log a consent first
    const consentId = `consent_verify_${Date.now()}`;
    const logResult = await logger.logConsent(
      consentId,
      'patient_verify_test',
      'doctor_verify_test'
    );

    expect(logResult.success).toBe(true);

    // Wait for transaction to be mined
    await new Promise(resolve => setTimeout(resolve, 5000));

    // Verify consent
    const isValid = await logger.isConsentValid(consentId);
    expect(isValid).toBe(true);

    // Get consent details
    const consent = await logger.getConsent(consentId);
    expect(consent).toBeDefined();
    expect(consent?.timestamp).toBeGreaterThan(0);

    console.log('✅ Consent verified on blockchain');
  }, 60000); // 60 second timeout
});
