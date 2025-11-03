# Blockchain Audit Trail - MED-AID SAARTHI

## 🔐 Overview

MED-AID SAARTHI integrates a **tamper-proof blockchain audit trail** using Polygon Amoy testnet (and production on Polygon mainnet) to provide verifiable, immutable proof of:

- **Consent Management**: Patient consent for data sharing
- **Record Uploads**: Health record creation and modifications
- **Access Logs**: Who viewed what record and when

### ✅ Privacy-First Design

**CRITICAL**: Only cryptographic hashes are stored on blockchain - **NO personal data or PII**.

All patient identifiers (Aadhaar, Health ID, names) are hashed using **HMAC-SHA256** before blockchain storage, ensuring:
- ✅ Compliance with India's DPDP Act 2023
- ✅ ABDM data protection guidelines
- ✅ HIPAA-like privacy standards
- ✅ Right to be forgotten (only hashes on-chain, off-chain data can be deleted)

---

## 📋 Table of Contents

1. [Architecture](#architecture)
2. [Smart Contract](#smart-contract)
3. [Deployment Guide](#deployment-guide)
4. [Backend Integration](#backend-integration)
5. [Verification](#verification)
6. [Testing](#testing)
7. [Compliance](#compliance)
8. [FAQ](#faq)

---

## 🏗️ Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                      MED-AID SAARTHI                        │
│                    (React + Supabase)                       │
└────────────────────┬────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────┐
│              Express Backend Server                          │
│  ┌──────────────────────────────────────────────────────┐  │
│  │  Blockchain Audit Logger (auditLogger.ts)            │  │
│  │  - Only hashes PII before sending to blockchain      │  │
│  │  - Handles transaction signing                        │  │
│  │  - Manages retry logic                                │  │
│  └──────────────────────────────────────────────────────┘  │
└────────────────────┬────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────┐
│         Polygon Amoy Testnet (Ethereum-compatible)          │
│  ┌──────────────────────────────────────────────────────┐  │
│  │       ConsentAudit.sol Smart Contract                │  │
│  │  - Stores consent logs (hashed)                      │  │
│  │  - Stores record logs (hashed)                       │  │
│  │  - Stores view logs (hashed)                         │  │
│  │  - Emits events for verification                     │  │
│  │  - Access control (only authorized backend can write)│  │
│  └──────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
```

### Data Flow

1. **User Action** (e.g., grant consent, upload record)
2. **Backend receives request** with user IDs
3. **Hash PII** using HMAC-SHA256
4. **Store in Supabase** (internal database)
5. **Log to Blockchain** (only hashes)
6. **Return transaction hash** to user for verification

---

## 📜 Smart Contract

### ConsentAudit.sol

**Location**: `blockchain/contracts/ConsentAudit.sol`

**Key Features**:

- ✅ **Consent Logging**: `logConsent(consentId, patientHash, doctorHash, recordHash)`
- ✅ **Consent Revocation**: `revokeConsent(consentId)`
- ✅ **Record Logging**: `logRecord(recordHash, uploaderRole, uploaderHash)`
- ✅ **View Logging**: `logView(viewerHash, recordHash, accessReason)`
- ✅ **Verification**: `isConsentValid(consentId)`, `getConsent()`, `getRecord()`
- ✅ **Access Control**: Only authorized backend wallet can write
- ✅ **Events**: All actions emit events for audit trail

### Storage Structure

```solidity
struct ConsentLog {
    bytes32 consentId;        // Unique consent ID (hashed)
    bytes32 patientHash;      // HMAC-SHA256(patient_id)
    bytes32 doctorHash;       // HMAC-SHA256(doctor_id)
    bytes32 recordHash;       // HMAC-SHA256(record_id)
    uint256 timestamp;        // Block timestamp
    bool revoked;             // Revocation status
    uint256 revokedAt;        // Revocation timestamp
}
```

**Privacy Note**: All `bytes32` fields contain cryptographic hashes, not real data.

---

## 🚀 Deployment Guide

### Prerequisites

1. **Node.js 18+** and npm
2. **Testnet MATIC tokens** (free from faucet)
3. **Private key** for backend wallet (generated securely)

### Step 1: Install Dependencies

```bash
cd blockchain
npm install
```

### Step 2: Generate Wallet

```bash
# Generate a new private key
node -e "console.log('0x' + require('crypto').randomBytes(32).toString('hex'))"
```

**⚠️ SECURITY**: 
- Store private key in `server/.env` (NOT in git)
- Never commit private keys
- Use hardware wallet for production

### Step 3: Get Testnet MATIC

1. Visit: https://faucet.polygon.technology/
2. Select **Polygon Amoy Testnet**
3. Enter your wallet address (derived from private key)
4. Receive 0.5 MATIC (enough for ~1000 transactions)

To get wallet address from private key:
```bash
node -e "const ethers = require('ethers'); const wallet = new ethers.Wallet('YOUR_PRIVATE_KEY'); console.log('Address:', wallet.address)"
```

### Step 4: Configure Environment

Add to `server/.env`:

```bash
USE_BLOCKCHAIN=true
PRIVATE_KEY=0xYOUR_PRIVATE_KEY_HERE
RPC_URL=https://rpc-amoy.polygon.technology
BACKEND_WALLET_ADDRESS=0xYOUR_WALLET_ADDRESS
```

### Step 5: Deploy Contract

```bash
cd blockchain
npm run deploy
```

**Expected Output**:
```
🚀 Deploying ConsentAudit contract to amoy
📍 Deploying from address: 0x1234...
💰 Account balance: 0.5 MATIC

✅ ConsentAudit deployed successfully!
📍 Contract address: 0xABCD1234...
🌐 Network: amoy

📝 Next Steps:
1. Add to server/.env:
   CONTRACT_ADDRESS=0xABCD1234...
```

### Step 6: Update .env

Add the deployed contract address:

```bash
CONTRACT_ADDRESS=0xABCD1234...
```

### Step 7: Verify Deployment (Optional)

```bash
# Check contract on PolygonScan
https://amoy.polygonscan.com/address/YOUR_CONTRACT_ADDRESS

# Or verify using script
npm run verify
```

### Step 8: Verify Contract on PolygonScan (Optional)

```bash
# Get API key from https://polygonscan.com/apis
npx hardhat verify --network amoy YOUR_CONTRACT_ADDRESS "YOUR_BACKEND_ADDRESS"
```

---

## 🔌 Backend Integration

### Automatic Integration

The blockchain logger is already integrated into backend routes:

- **`server/src/routes/consent.ts`**: Logs consent grant/revoke
- **`server/src/routes/records.ts`**: Logs record uploads and views

### Manual Usage

```typescript
import { blockchainLogger } from './blockchain/auditLogger';

// Log consent
const result = await blockchainLogger.logConsent(
  'consent_abc123',
  'patient_id_456',
  'doctor_id_789',
  'record_id_xyz' // optional
);

if (result.success) {
  console.log('✅ Logged to blockchain:', result.txHash);
  console.log('🔗 View at:', blockchainLogger.getExplorerUrl(result.txHash));
} else {
  console.error('❌ Failed:', result.error);
}
```

### API Endpoints

#### Grant Consent
```bash
POST /api/consent/grant
Body: {
  "patientId": "user_123",
  "doctorId": "doctor_456",
  "recordId": "record_789",
  "scope": "health_records",
  "purpose": "consultation"
}

Response: {
  "success": true,
  "consentId": "consent_123_456_1234567890",
  "blockchain": {
    "txHash": "0xabc...",
    "blockNumber": 12345,
    "explorerUrl": "https://amoy.polygonscan.com/tx/0xabc..."
  }
}
```

#### Revoke Consent
```bash
POST /api/consent/revoke
Body: {
  "consentId": "consent_123_456_1234567890",
  "patientId": "user_123",
  "reason": "Patient requested"
}
```

#### Upload Record
```bash
POST /api/records/upload
Body: {
  "userId": "user_123",
  "recordType": "lab_report",
  "recordData": { ... },
  "uploaderRole": "patient"
}
```

#### Verify Record
```bash
GET /api/records/{recordId}/verify

Response: {
  "success": true,
  "recordId": "record_789",
  "blockchain": {
    "recordHash": "0x123...",
    "uploaderRole": "patient",
    "uploaderHash": "0xabc...",
    "timestamp": 1704326400,
    "viewCount": 5
  }
}
```

---

## 🔍 Verification

### Using Verification Script

```bash
# Verify consent status
node blockchain/verifyAudit.js consent_abc123 consent

# Verify record authenticity
node blockchain/verifyAudit.js record_xyz789 record

# Get contract statistics
node blockchain/verifyAudit.js --stats

# Verify audit chain integrity
node blockchain/verifyAudit.js --integrity
```

### Manual Verification on PolygonScan

1. Go to: https://amoy.polygonscan.com/address/YOUR_CONTRACT_ADDRESS
2. Click **"Events"** tab
3. Search for:
   - `ConsentLogged`: Consent grants
   - `ConsentRevoked`: Consent revocations
   - `RecordLogged`: Record uploads
   - `ViewLogged`: Access logs

4. Verify transaction details:
   - ✅ Transaction hash matches backend response
   - ✅ Block timestamp matches action time
   - ✅ Hashes are consistent

### Programmatic Verification

```typescript
// Check if consent is valid
const isValid = await blockchainLogger.isConsentValid('consent_abc123');
console.log('Consent valid:', isValid); // true/false

// Get consent details
const consent = await blockchainLogger.getConsent('consent_abc123');
console.log('Patient hash:', consent.patientHash);
console.log('Granted at:', new Date(consent.timestamp * 1000));
console.log('Revoked:', consent.revoked);

// Get record view count
const viewCount = await blockchainLogger.getViewCount('record_xyz');
console.log('Times viewed:', viewCount);
```

---

## 🧪 Testing

### Unit Tests (Smart Contract)

```bash
cd blockchain
npm test
```

**Test Coverage**:
- ✅ Consent logging and revocation
- ✅ Record logging
- ✅ View event logging
- ✅ Access control
- ✅ Event emissions
- ✅ Statistics tracking
- ✅ Admin functions

### Integration Tests (Backend)

```bash
cd server
npm test -- blockchain
```

**Test Coverage**:
- ✅ Blockchain logger initialization
- ✅ Mock consent/record/view logging
- ✅ Verification functions
- ✅ E2E tests with real blockchain (if enabled)

### Local Development Testing

```bash
# Start local Hardhat node (Terminal 1)
cd blockchain
npx hardhat node

# Deploy to local network (Terminal 2)
npm run deploy:local

# Update .env to use local network
RPC_URL=http://127.0.0.1:8545
CONTRACT_ADDRESS=<deployed_address>

# Run backend tests
cd ../server
npm test
```

---

## ⚖️ Compliance

### DPDP Act 2023 (India)

✅ **Data Minimization**: Only hashes stored on blockchain  
✅ **Purpose Limitation**: Clear consent purpose logged  
✅ **Right to Erasure**: Off-chain data deleted, on-chain hashes remain (privacy-preserving)  
✅ **Audit Trail**: Immutable record of all data access  
✅ **Consent Management**: Verifiable consent logs with revocation support  

### ABDM Guidelines

✅ **Health ID Protection**: Health IDs hashed before blockchain storage  
✅ **Consent Artifact**: Blockchain transaction hash serves as consent proof  
✅ **Access Logs**: All record views logged with viewer identity (hashed)  
✅ **Tamper-Proof**: Blockchain immutability ensures audit integrity  

### HIPAA-like Standards

✅ **Access Control**: Smart contract restricts writes to authorized backend  
✅ **Audit Logs**: All actions logged with timestamps  
✅ **Data Integrity**: Cryptographic hashing prevents tampering  
✅ **Privacy**: No PHI (Protected Health Information) on blockchain  

---

## 📊 Gas Costs (Polygon Amoy Testnet)

| Action | Gas Used | Cost (30 gwei) | USD (MATIC = $1) |
|--------|----------|----------------|------------------|
| Deploy Contract | ~2,500,000 | 0.075 MATIC | $0.075 |
| Log Consent | ~90,000 | 0.0027 MATIC | $0.0027 |
| Revoke Consent | ~50,000 | 0.0015 MATIC | $0.0015 |
| Log Record | ~95,000 | 0.00285 MATIC | $0.00285 |
| Log View | ~70,000 | 0.0021 MATIC | $0.0021 |

**Production Costs** (Polygon Mainnet, MATIC = $1):
- 1000 consents: ~$2.70
- 10,000 record uploads: ~$28.50
- 100,000 views: ~$210

**Cost Optimization**:
- Batch logging (multiple actions in one transaction)
- Off-chain event storage with on-chain merkle roots
- Use zkEVM for ~10x cost reduction

---

## 🔧 Troubleshooting

### "Blockchain logging disabled"

**Cause**: `USE_BLOCKCHAIN=false` or missing config  
**Fix**: Set `USE_BLOCKCHAIN=true` in `server/.env`

### "Insufficient funds for gas"

**Cause**: Backend wallet has no MATIC  
**Fix**: Get testnet MATIC from faucet: https://faucet.polygon.technology/

### "Unauthorized caller"

**Cause**: Backend wallet address doesn't match `authorizedBackend` in contract  
**Fix**: Redeploy contract with correct backend address or update using `updateBackend()` admin function

### "Record not found"

**Cause**: Record not logged to blockchain yet  
**Fix**: Check that `USE_BLOCKCHAIN=true` and backend is logging correctly

### "Network error"

**Cause**: RPC endpoint down or rate limited  
**Fix**: Use alternative RPC:
- https://rpc-amoy.polygon.technology
- https://polygon-amoy.g.alchemy.com/v2/YOUR_KEY (free 300M compute units/month)

---

## 🎯 Production Deployment

### Checklist

- [ ] Test thoroughly on Amoy testnet
- [ ] Audit smart contract (consider: OpenZeppelin, CertiK, Trail of Bits)
- [ ] Deploy to Polygon mainnet
- [ ] Verify contract on PolygonScan
- [ ] Update RPC_URL to mainnet
- [ ] Fund backend wallet with production MATIC
- [ ] Set up monitoring (Tenderly, Defender)
- [ ] Configure alerts for failed transactions
- [ ] Implement transaction retry logic
- [ ] Set up cold wallet for contract ownership
- [ ] Document incident response plan
- [ ] Configure contract upgrade mechanism (if needed)

### Mainnet Deployment

```bash
# Update hardhat.config.js network to 'polygon'
npm run deploy -- --network polygon

# Verify on PolygonScan
npx hardhat verify --network polygon <contract_address> "<backend_address>"
```

### Monitoring

**Recommended Tools**:
- **Tenderly**: Real-time transaction monitoring, gas alerts
- **OpenZeppelin Defender**: Automated security monitoring
- **Sentry**: Backend error tracking

---

## 📚 FAQ

### Q: Why blockchain for healthcare?

**A**: Blockchain provides:
1. **Immutability**: Audit logs cannot be tampered with
2. **Transparency**: Anyone can verify consent and access logs
3. **Trust**: Government auditors can independently verify compliance
4. **Decentralization**: No single point of failure

### Q: Is patient data stored on blockchain?

**A**: **NO**. Only cryptographic hashes (HMAC-SHA256) are stored. Real data stays in Supabase with traditional security.

### Q: Can patients be identified from blockchain data?

**A**: **NO**. Hashes are one-way functions. Without the original data and secret key, hashes cannot be reversed.

### Q: What if a patient requests data deletion (Right to be Forgotten)?

**A**: 
1. Delete real data from Supabase (complies with DPDP Act)
2. Hashes remain on blockchain (privacy-preserving, cannot identify patient)
3. Blockchain serves as proof of deletion request timestamp

### Q: What happens if private key is compromised?

**A**:
1. Immediately deploy new contract with new backend wallet
2. Migrate data hashes to new contract
3. Update `CONTRACT_ADDRESS` in `.env`
4. Notify authorities (if required by law)
5. Revoke compromised key from old contract using `updateBackend()`

### Q: Can blockchain data be deleted?

**A**: **NO**. Blockchain is immutable. This is by design for audit integrity. Only hashes are stored, so no PII can be exposed.

### Q: Why Polygon instead of Ethereum?

**A**:
- **Cost**: 100x cheaper gas fees (~$0.003 vs $0.30 per transaction)
- **Speed**: 2-3 second block time vs 12 seconds
- **Green**: Proof of Stake (PoS) - energy efficient
- **EVM Compatible**: Can migrate to Ethereum mainnet if needed

### Q: What's the difference between Amoy and mainnet?

| Feature | Amoy Testnet | Polygon Mainnet |
|---------|-------------|-----------------|
| Purpose | Testing | Production |
| MATIC Value | $0 (free) | Real value (~$1) |
| Block Explorer | amoy.polygonscan.com | polygonscan.com |
| Faucet | Available | No (buy MATIC) |
| Data Permanence | May reset | Permanent |

---

## 🛠️ Advanced Features (Future)

### Planned Enhancements

1. **Batch Logging**: Log multiple actions in one transaction (gas optimization)
2. **Zero-Knowledge Proofs**: Prove consent without revealing patient identity
3. **Cross-Chain Bridge**: Support Ethereum, BSC, Arbitrum
4. **DAO Governance**: Community voting on contract upgrades
5. **NFT Certificates**: Issue verifiable health certificates as NFTs

---

## 📞 Support

### Issues & Questions

- **GitHub Issues**: https://github.com/AnshXGrind/medaid-sathi-extract/issues
- **Email**: blockchain@medaid-saarthi.in
- **Documentation**: See `GOV_COMPLIANCE.md` for regulatory details

### Developer Resources

- **Polygon Docs**: https://docs.polygon.technology/
- **Hardhat Docs**: https://hardhat.org/docs
- **Ethers.js Docs**: https://docs.ethers.org/v6/
- **OpenZeppelin**: https://docs.openzeppelin.com/contracts/

---

## 📄 License

MIT License - See LICENSE file

---

## 🙏 Acknowledgments

- **Polygon Team**: For low-cost, scalable blockchain infrastructure
- **OpenZeppelin**: For secure smart contract libraries
- **Hardhat**: For development tooling
- **ABDM**: For digital health standards in India

---

**Built with ❤️ for transparent, privacy-first healthcare in India**

*Last Updated: January 2025*
