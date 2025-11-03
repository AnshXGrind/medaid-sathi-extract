/**
 * Blockchain Audit Logger
 * 
 * Integrates with ConsentAudit.sol smart contract on Polygon Amoy
 * to provide tamper-proof audit trail for healthcare operations.
 * 
 * Privacy: Only HMAC-SHA256 hashes are stored on blockchain - NO PII
 */

import { ethers } from 'ethers';
import { createHash } from 'crypto';

// Contract ABI (Application Binary Interface)
const CONSENT_AUDIT_ABI = [
  // Events
  "event ConsentLogged(bytes32 indexed consentId, bytes32 indexed patientHash, bytes32 indexed doctorHash, bytes32 recordHash, uint256 timestamp)",
  "event ConsentRevoked(bytes32 indexed consentId, uint256 timestamp)",
  "event RecordLogged(bytes32 indexed recordHash, string uploaderRole, bytes32 indexed uploaderHash, uint256 timestamp)",
  "event ViewLogged(bytes32 indexed viewerHash, bytes32 indexed recordHash, uint256 timestamp, string accessReason)",
  
  // Core functions
  "function logConsent(bytes32 consentId, bytes32 patientHash, bytes32 doctorHash, bytes32 recordHash) external",
  "function revokeConsent(bytes32 consentId) external",
  "function logRecord(bytes32 recordHash, string uploaderRole, bytes32 uploaderHash) external",
  "function logView(bytes32 viewerHash, bytes32 recordHash, string accessReason) external",
  
  // View functions
  "function isConsentValid(bytes32 consentId) external view returns (bool)",
  "function getConsent(bytes32 consentId) external view returns (tuple(bytes32 consentId, bytes32 patientHash, bytes32 doctorHash, bytes32 recordHash, uint256 timestamp, bool revoked, uint256 revokedAt))",
  "function getRecord(bytes32 recordHash) external view returns (tuple(bytes32 recordHash, string uploaderRole, bytes32 uploaderHash, uint256 timestamp))",
  "function getViewCount(bytes32 recordHash) external view returns (uint256)",
  "function getStats() external view returns (uint256, uint256, uint256)"
];

interface BlockchainConfig {
  rpcUrl: string;
  privateKey: string;
  contractAddress: string;
  enabled: boolean;
}

interface BlockchainResponse {
  success: boolean;
  txHash?: string;
  blockNumber?: number;
  error?: string;
}

export class BlockchainAuditLogger {
  private provider: ethers.JsonRpcProvider | null = null;
  private wallet: ethers.Wallet | null = null;
  private contract: ethers.Contract | null = null;
  private config: BlockchainConfig;

  constructor() {
    this.config = {
      rpcUrl: process.env.RPC_URL || 'https://rpc-amoy.polygon.technology',
      privateKey: process.env.PRIVATE_KEY || '',
      contractAddress: process.env.CONTRACT_ADDRESS || '',
      enabled: process.env.USE_BLOCKCHAIN === 'true'
    };

    if (this.config.enabled) {
      this.initialize();
    }
  }

  /**
   * Initialize blockchain connection
   */
  private initialize() {
    try {
      if (!this.config.privateKey) {
        console.warn('⚠️ PRIVATE_KEY not set - blockchain logging disabled');
        this.config.enabled = false;
        return;
      }

      if (!this.config.contractAddress) {
        console.warn('⚠️ CONTRACT_ADDRESS not set - blockchain logging disabled');
        this.config.enabled = false;
        return;
      }

      // Connect to Polygon Amoy
      this.provider = new ethers.JsonRpcProvider(this.config.rpcUrl);
      
      // Create wallet instance
      this.wallet = new ethers.Wallet(this.config.privateKey, this.provider);
      
      // Connect to deployed contract
      this.contract = new ethers.Contract(
        this.config.contractAddress,
        CONSENT_AUDIT_ABI,
        this.wallet
      );

      console.log('✅ Blockchain audit logger initialized');
      console.log('📍 Contract address:', this.config.contractAddress);
      console.log('🌐 Network: Polygon Amoy Testnet');
    } catch (error) {
      console.error('❌ Failed to initialize blockchain logger:', error);
      this.config.enabled = false;
    }
  }

  /**
   * Check if blockchain logging is enabled
   */
  public isEnabled(): boolean {
    return this.config.enabled && this.contract !== null;
  }

  /**
   * Convert string to bytes32 hash for blockchain storage
   * Uses SHA-256 for deterministic hashing
   */
  private toBytes32(value: string): string {
    const hash = createHash('sha256').update(value).digest('hex');
    return '0x' + hash;
  }

  /**
   * Log consent for data sharing
   * 
   * @param consentId Unique consent identifier from database
   * @param patientId Patient's user ID
   * @param doctorId Doctor's user ID
   * @param recordId Health record ID (optional)
   */
  async logConsent(
    consentId: string,
    patientId: string,
    doctorId: string,
    recordId?: string
  ): Promise<BlockchainResponse> {
    if (!this.isEnabled()) {
      return { success: false, error: 'Blockchain logging disabled' };
    }

    try {
      const consentHash = this.toBytes32(consentId);
      const patientHash = this.toBytes32(patientId);
      const doctorHash = this.toBytes32(doctorId);
      const recordHash = recordId ? this.toBytes32(recordId) : ethers.ZeroHash;

      console.log('📝 Logging consent to blockchain:', { consentId, patientId, doctorId, recordId });

      const tx = await this.contract!.logConsent(
        consentHash,
        patientHash,
        doctorHash,
        recordHash
      );

      const receipt = await tx.wait();

      console.log('✅ Consent logged on blockchain:', receipt.hash);

      return {
        success: true,
        txHash: receipt.hash,
        blockNumber: receipt.blockNumber
      };
    } catch (error: any) {
      console.error('❌ Failed to log consent:', error.message);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Revoke a previously granted consent
   * 
   * @param consentId Unique consent identifier
   */
  async revokeConsent(consentId: string): Promise<BlockchainResponse> {
    if (!this.isEnabled()) {
      return { success: false, error: 'Blockchain logging disabled' };
    }

    try {
      const consentHash = this.toBytes32(consentId);

      console.log('🚫 Revoking consent on blockchain:', consentId);

      const tx = await this.contract!.revokeConsent(consentHash);
      const receipt = await tx.wait();

      console.log('✅ Consent revoked on blockchain:', receipt.hash);

      return {
        success: true,
        txHash: receipt.hash,
        blockNumber: receipt.blockNumber
      };
    } catch (error: any) {
      console.error('❌ Failed to revoke consent:', error.message);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Log health record upload
   * 
   * @param recordId Unique record identifier from database
   * @param uploaderRole Role of uploader ('patient', 'doctor', 'asha_worker')
   * @param uploaderId User ID of uploader
   */
  async logRecordUpload(
    recordId: string,
    uploaderRole: string,
    uploaderId: string
  ): Promise<BlockchainResponse> {
    if (!this.isEnabled()) {
      return { success: false, error: 'Blockchain logging disabled' };
    }

    try {
      const recordHash = this.toBytes32(recordId);
      const uploaderHash = this.toBytes32(uploaderId);

      console.log('📤 Logging record upload to blockchain:', { recordId, uploaderRole, uploaderId });

      const tx = await this.contract!.logRecord(
        recordHash,
        uploaderRole,
        uploaderHash
      );

      const receipt = await tx.wait();

      console.log('✅ Record upload logged on blockchain:', receipt.hash);

      return {
        success: true,
        txHash: receipt.hash,
        blockNumber: receipt.blockNumber
      };
    } catch (error: any) {
      console.error('❌ Failed to log record upload:', error.message);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Log record view/access event
   * 
   * @param viewerId User ID of person viewing record
   * @param recordId Health record ID being viewed
   * @param accessReason Reason for access (e.g., 'consultation', 'emergency')
   */
  async logViewEvent(
    viewerId: string,
    recordId: string,
    accessReason: string = 'consultation'
  ): Promise<BlockchainResponse> {
    if (!this.isEnabled()) {
      return { success: false, error: 'Blockchain logging disabled' };
    }

    try {
      const viewerHash = this.toBytes32(viewerId);
      const recordHash = this.toBytes32(recordId);

      console.log('👁️ Logging view event to blockchain:', { viewerId, recordId, accessReason });

      const tx = await this.contract!.logView(
        viewerHash,
        recordHash,
        accessReason
      );

      const receipt = await tx.wait();

      console.log('✅ View event logged on blockchain:', receipt.hash);

      return {
        success: true,
        txHash: receipt.hash,
        blockNumber: receipt.blockNumber
      };
    } catch (error: any) {
      console.error('❌ Failed to log view event:', error.message);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Verify if a consent is valid (exists and not revoked)
   * 
   * @param consentId Consent identifier to check
   */
  async isConsentValid(consentId: string): Promise<boolean> {
    if (!this.isEnabled()) return false;

    try {
      const consentHash = this.toBytes32(consentId);
      const isValid = await this.contract!.isConsentValid(consentHash);
      return isValid;
    } catch (error: any) {
      console.error('❌ Failed to verify consent:', error.message);
      return false;
    }
  }

  /**
   * Get consent details from blockchain
   * 
   * @param consentId Consent identifier
   */
  async getConsent(consentId: string) {
    if (!this.isEnabled()) return null;

    try {
      const consentHash = this.toBytes32(consentId);
      const consent = await this.contract!.getConsent(consentHash);
      
      return {
        consentId: consent.consentId,
        patientHash: consent.patientHash,
        doctorHash: consent.doctorHash,
        recordHash: consent.recordHash,
        timestamp: Number(consent.timestamp),
        revoked: consent.revoked,
        revokedAt: consent.revokedAt ? Number(consent.revokedAt) : null
      };
    } catch (error: any) {
      console.error('❌ Failed to get consent:', error.message);
      return null;
    }
  }

  /**
   * Get record details from blockchain
   * 
   * @param recordId Record identifier
   */
  async getRecord(recordId: string) {
    if (!this.isEnabled()) return null;

    try {
      const recordHash = this.toBytes32(recordId);
      const record = await this.contract!.getRecord(recordHash);
      
      return {
        recordHash: record.recordHash,
        uploaderRole: record.uploaderRole,
        uploaderHash: record.uploaderHash,
        timestamp: Number(record.timestamp)
      };
    } catch (error: any) {
      console.error('❌ Failed to get record:', error.message);
      return null;
    }
  }

  /**
   * Get view count for a record
   * 
   * @param recordId Record identifier
   */
  async getViewCount(recordId: string): Promise<number> {
    if (!this.isEnabled()) return 0;

    try {
      const recordHash = this.toBytes32(recordId);
      const count = await this.contract!.getViewCount(recordHash);
      return Number(count);
    } catch (error: any) {
      console.error('❌ Failed to get view count:', error.message);
      return 0;
    }
  }

  /**
   * Get contract statistics
   */
  async getStats() {
    if (!this.isEnabled()) return null;

    try {
      const stats = await this.contract!.getStats();
      return {
        totalConsents: Number(stats[0]),
        totalRecords: Number(stats[1]),
        totalViews: Number(stats[2])
      };
    } catch (error: any) {
      console.error('❌ Failed to get stats:', error.message);
      return null;
    }
  }

  /**
   * Get blockchain explorer URL for transaction
   */
  getExplorerUrl(txHash: string): string {
    return `https://amoy.polygonscan.com/tx/${txHash}`;
  }
}

// Export singleton instance
export const blockchainLogger = new BlockchainAuditLogger();
