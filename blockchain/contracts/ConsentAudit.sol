// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title ConsentAudit
 * @notice Tamper-proof audit trail for healthcare consent and record management
 * @dev Stores only cryptographic hashes - NO personal data on blockchain
 * 
 * Privacy Compliance:
 * - All patient/doctor/record identifiers are HMAC-SHA256 hashes
 * - No PII (Personally Identifiable Information) stored on-chain
 * - Compliant with India's DPDP Act 2023 and ABDM guidelines
 * 
 * Use Case: Verify authenticity of consent, record uploads, and access events
 * Deployed on: Polygon Amoy Testnet (production deployment on Polygon mainnet)
 */
contract ConsentAudit {
    
    // ============================================================================
    // STATE VARIABLES
    // ============================================================================
    
    /// @notice Backend wallet authorized to write audit logs
    address public authorizedBackend;
    
    /// @notice Contract owner (for emergency operations)
    address public owner;
    
    /// @notice Total number of consent logs
    uint256 public totalConsents;
    
    /// @notice Total number of record logs
    uint256 public totalRecords;
    
    /// @notice Total number of view logs
    uint256 public totalViews;
    
    // ============================================================================
    // STRUCTS
    // ============================================================================
    
    struct ConsentLog {
        bytes32 consentId;        // Unique consent identifier (hashed)
        bytes32 patientHash;      // HMAC-SHA256(patient_id)
        bytes32 doctorHash;       // HMAC-SHA256(doctor_id)
        bytes32 recordHash;       // HMAC-SHA256(record_id)
        uint256 timestamp;        // Block timestamp
        bool revoked;             // Consent revocation status
        uint256 revokedAt;        // Revocation timestamp
    }
    
    struct RecordLog {
        bytes32 recordHash;       // HMAC-SHA256(record_id)
        string uploaderRole;      // 'patient', 'doctor', 'asha_worker'
        bytes32 uploaderHash;     // HMAC-SHA256(uploader_id)
        uint256 timestamp;        // Block timestamp
    }
    
    struct ViewLog {
        bytes32 viewerHash;       // HMAC-SHA256(viewer_id)
        bytes32 recordHash;       // HMAC-SHA256(record_id)
        uint256 timestamp;        // Block timestamp
        string accessReason;      // Optional: 'consultation', 'emergency', etc.
    }
    
    // ============================================================================
    // MAPPINGS
    // ============================================================================
    
    /// @notice Consent logs by consentId
    mapping(bytes32 => ConsentLog) public consents;
    
    /// @notice Record logs by recordHash
    mapping(bytes32 => RecordLog) public records;
    
    /// @notice Verification: check if consent exists
    mapping(bytes32 => bool) public consentExists;
    
    /// @notice Verification: check if record exists
    mapping(bytes32 => bool) public recordExists;
    
    /// @notice Track view count per record
    mapping(bytes32 => uint256) public recordViewCount;
    
    // ============================================================================
    // EVENTS
    // ============================================================================
    
    event ConsentLogged(
        bytes32 indexed consentId,
        bytes32 indexed patientHash,
        bytes32 indexed doctorHash,
        bytes32 recordHash,
        uint256 timestamp
    );
    
    event ConsentRevoked(
        bytes32 indexed consentId,
        uint256 timestamp
    );
    
    event RecordLogged(
        bytes32 indexed recordHash,
        string uploaderRole,
        bytes32 indexed uploaderHash,
        uint256 timestamp
    );
    
    event ViewLogged(
        bytes32 indexed viewerHash,
        bytes32 indexed recordHash,
        uint256 timestamp,
        string accessReason
    );
    
    event BackendUpdated(
        address indexed oldBackend,
        address indexed newBackend,
        uint256 timestamp
    );
    
    // ============================================================================
    // MODIFIERS
    // ============================================================================
    
    modifier onlyAuthorized() {
        require(
            msg.sender == authorizedBackend || msg.sender == owner,
            "ConsentAudit: Unauthorized caller"
        );
        _;
    }
    
    modifier onlyOwner() {
        require(msg.sender == owner, "ConsentAudit: Owner only");
        _;
    }
    
    // ============================================================================
    // CONSTRUCTOR
    // ============================================================================
    
    constructor(address _authorizedBackend) {
        require(_authorizedBackend != address(0), "ConsentAudit: Invalid backend address");
        
        owner = msg.sender;
        authorizedBackend = _authorizedBackend;
        
        totalConsents = 0;
        totalRecords = 0;
        totalViews = 0;
    }
    
    // ============================================================================
    // CORE FUNCTIONS
    // ============================================================================
    
    /**
     * @notice Log a new consent for data sharing
     * @param consentId Unique consent identifier (hashed)
     * @param patientHash HMAC-SHA256 hash of patient ID
     * @param doctorHash HMAC-SHA256 hash of doctor ID
     * @param recordHash HMAC-SHA256 hash of record ID
     */
    function logConsent(
        bytes32 consentId,
        bytes32 patientHash,
        bytes32 doctorHash,
        bytes32 recordHash
    ) external onlyAuthorized {
        require(consentId != bytes32(0), "ConsentAudit: Invalid consentId");
        require(patientHash != bytes32(0), "ConsentAudit: Invalid patientHash");
        require(doctorHash != bytes32(0), "ConsentAudit: Invalid doctorHash");
        require(!consentExists[consentId], "ConsentAudit: Consent already logged");
        
        consents[consentId] = ConsentLog({
            consentId: consentId,
            patientHash: patientHash,
            doctorHash: doctorHash,
            recordHash: recordHash,
            timestamp: block.timestamp,
            revoked: false,
            revokedAt: 0
        });
        
        consentExists[consentId] = true;
        totalConsents++;
        
        emit ConsentLogged(consentId, patientHash, doctorHash, recordHash, block.timestamp);
    }
    
    /**
     * @notice Revoke a previously granted consent
     * @param consentId The consent identifier to revoke
     */
    function revokeConsent(bytes32 consentId) external onlyAuthorized {
        require(consentExists[consentId], "ConsentAudit: Consent not found");
        require(!consents[consentId].revoked, "ConsentAudit: Already revoked");
        
        consents[consentId].revoked = true;
        consents[consentId].revokedAt = block.timestamp;
        
        emit ConsentRevoked(consentId, block.timestamp);
    }
    
    /**
     * @notice Log a new health record upload
     * @param recordHash HMAC-SHA256 hash of record ID
     * @param uploaderRole Role of uploader ('patient', 'doctor', 'asha_worker')
     * @param uploaderHash HMAC-SHA256 hash of uploader ID
     */
    function logRecord(
        bytes32 recordHash,
        string calldata uploaderRole,
        bytes32 uploaderHash
    ) external onlyAuthorized {
        require(recordHash != bytes32(0), "ConsentAudit: Invalid recordHash");
        require(bytes(uploaderRole).length > 0, "ConsentAudit: Invalid role");
        require(uploaderHash != bytes32(0), "ConsentAudit: Invalid uploaderHash");
        require(!recordExists[recordHash], "ConsentAudit: Record already logged");
        
        records[recordHash] = RecordLog({
            recordHash: recordHash,
            uploaderRole: uploaderRole,
            uploaderHash: uploaderHash,
            timestamp: block.timestamp
        });
        
        recordExists[recordHash] = true;
        totalRecords++;
        
        emit RecordLogged(recordHash, uploaderRole, uploaderHash, block.timestamp);
    }
    
    /**
     * @notice Log a record view/access event
     * @param viewerHash HMAC-SHA256 hash of viewer ID
     * @param recordHash HMAC-SHA256 hash of record being viewed
     * @param accessReason Reason for access (optional)
     */
    function logView(
        bytes32 viewerHash,
        bytes32 recordHash,
        string calldata accessReason
    ) external onlyAuthorized {
        require(viewerHash != bytes32(0), "ConsentAudit: Invalid viewerHash");
        require(recordHash != bytes32(0), "ConsentAudit: Invalid recordHash");
        require(recordExists[recordHash], "ConsentAudit: Record not found");
        
        recordViewCount[recordHash]++;
        totalViews++;
        
        emit ViewLogged(viewerHash, recordHash, block.timestamp, accessReason);
    }
    
    // ============================================================================
    // VIEW FUNCTIONS
    // ============================================================================
    
    /**
     * @notice Check if a consent is valid (exists and not revoked)
     * @param consentId The consent identifier to check
     * @return isValid Whether consent is valid
     */
    function isConsentValid(bytes32 consentId) external view returns (bool) {
        if (!consentExists[consentId]) return false;
        return !consents[consentId].revoked;
    }
    
    /**
     * @notice Get detailed consent information
     * @param consentId The consent identifier
     * @return Consent log details
     */
    function getConsent(bytes32 consentId) external view returns (ConsentLog memory) {
        require(consentExists[consentId], "ConsentAudit: Consent not found");
        return consents[consentId];
    }
    
    /**
     * @notice Get record upload details
     * @param recordHash The record identifier
     * @return Record log details
     */
    function getRecord(bytes32 recordHash) external view returns (RecordLog memory) {
        require(recordExists[recordHash], "ConsentAudit: Record not found");
        return records[recordHash];
    }
    
    /**
     * @notice Get total view count for a record
     * @param recordHash The record identifier
     * @return View count
     */
    function getViewCount(bytes32 recordHash) external view returns (uint256) {
        return recordViewCount[recordHash];
    }
    
    /**
     * @notice Get contract statistics
     * @return Total consents, records, and views
     */
    function getStats() external view returns (uint256, uint256, uint256) {
        return (totalConsents, totalRecords, totalViews);
    }
    
    // ============================================================================
    // ADMIN FUNCTIONS
    // ============================================================================
    
    /**
     * @notice Update authorized backend address (owner only)
     * @param newBackend New backend wallet address
     */
    function updateBackend(address newBackend) external onlyOwner {
        require(newBackend != address(0), "ConsentAudit: Invalid address");
        
        address oldBackend = authorizedBackend;
        authorizedBackend = newBackend;
        
        emit BackendUpdated(oldBackend, newBackend, block.timestamp);
    }
    
    /**
     * @notice Transfer contract ownership (owner only)
     * @param newOwner New owner address
     */
    function transferOwnership(address newOwner) external onlyOwner {
        require(newOwner != address(0), "ConsentAudit: Invalid address");
        owner = newOwner;
    }
}
