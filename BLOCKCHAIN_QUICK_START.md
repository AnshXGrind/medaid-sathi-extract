# Blockchain Audit Integration - Quick Start

## 🎯 What Was Implemented

A complete blockchain audit layer for MED-AID SAARTHI that provides tamper-proof verification of:
- ✅ Patient consent for data sharing
- ✅ Health record uploads
- ✅ Record access/view events

**Privacy-First**: Only cryptographic hashes stored on blockchain - NO personal data.

---

## 📁 Files Created

### Smart Contract (4 files)
```
blockchain/
├── contracts/ConsentAudit.sol       # Main smart contract (300+ lines)
├── scripts/deploy.js                # Deployment script
├── hardhat.config.js                # Hardhat configuration
├── package.json                     # Dependencies
└── test/ConsentAudit.test.js        # Contract tests (300+ lines)
```

### Backend Integration (4 files)
```
server/
├── src/
│   ├── blockchain/
│   │   └── auditLogger.ts           # Ethers.js integration (400+ lines)
│   └── routes/
│       ├── consent.ts               # Consent API endpoints (200+ lines)
│       └── records.ts               # Records API endpoints (250+ lines)
└── tests/
    └── blockchain.test.ts           # Integration tests
```

### Utilities (2 files)
```
blockchain/
├── verifyAudit.js                   # Verification script (300+ lines)
└── .gitignore                       # Blockchain-specific ignores
```

### Documentation (2 files)
```
BLOCKCHAIN_AUDIT.md                  # Comprehensive guide (600+ lines)
BLOCKCHAIN_QUICK_START.md            # This file
```

**Total**: 14 new files, ~2,600 lines of code

---

## 🚀 Deployment Steps

### 1. Install Dependencies

```bash
# Install blockchain dependencies
cd blockchain
npm install

# Install server dependencies (if not done)
cd ../server
npm install
```

### 2. Generate Wallet

```bash
# Generate private key
node -e "console.log('0x' + require('crypto').randomBytes(32).toString('hex'))"

# Save output (example): 0x1234abcd...
```

### 3. Get Testnet MATIC

1. Get wallet address from private key:
```bash
node -e "const ethers = require('ethers'); const wallet = new ethers.Wallet('YOUR_PRIVATE_KEY'); console.log('Address:', wallet.address)"
```

2. Visit faucet: https://faucet.polygon.technology/
3. Select **Polygon Amoy Testnet**
4. Enter your wallet address
5. Receive 0.5 MATIC (free)

### 4. Configure Environment

Add to `server/.env`:

```bash
# Enable blockchain logging
USE_BLOCKCHAIN=true

# Polygon Amoy RPC
RPC_URL=https://rpc-amoy.polygon.technology

# Your private key (DO NOT COMMIT)
PRIVATE_KEY=0xYOUR_PRIVATE_KEY_HERE

# Your wallet address (optional, for deployment)
BACKEND_WALLET_ADDRESS=0xYOUR_WALLET_ADDRESS
```

### 5. Deploy Smart Contract

```bash
cd blockchain
npm run deploy
```

**Expected Output:**
```
🚀 Deploying ConsentAudit contract to amoy
📍 Deploying from address: 0x1234...
💰 Account balance: 0.5 MATIC

✅ ConsentAudit deployed successfully!
📍 Contract address: 0xABCD1234...

📝 Next Steps:
1. Add to server/.env:
   CONTRACT_ADDRESS=0xABCD1234...
```

### 6. Update .env with Contract Address

```bash
# Add to server/.env
CONTRACT_ADDRESS=0xABCD1234...
```

### 7. Test Integration

```bash
# Test smart contract
cd blockchain
npm test

# Test backend integration
cd ../server
npm test -- blockchain
```

---

## 🧪 Test the System

### Test 1: Grant Consent

```bash
curl -X POST http://localhost:3001/api/consent/grant \
  -H "Content-Type: application/json" \
  -d '{
    "patientId": "patient_test_123",
    "doctorId": "doctor_test_456",
    "recordId": "record_test_789",
    "scope": "health_records",
    "purpose": "consultation"
  }'
```

**Expected Response:**
```json
{
  "success": true,
  "consentId": "consent_patient_test_123_doctor_test_456_1704326400",
  "blockchain": {
    "txHash": "0xabc123...",
    "blockNumber": 12345,
    "explorerUrl": "https://amoy.polygonscan.com/tx/0xabc123..."
  }
}
```

### Test 2: Upload Record

```bash
curl -X POST http://localhost:3001/api/records/upload \
  -H "Content-Type: application/json" \
  -d '{
    "userId": "user_test_123",
    "recordType": "lab_report",
    "recordData": {"result": "Normal"},
    "uploaderRole": "patient"
  }'
```

### Test 3: Verify on Blockchain

```bash
# Using verification script
node blockchain/verifyAudit.js consent_patient_test_123_doctor_test_456_1704326400 consent

# Or manually on PolygonScan
# Visit: https://amoy.polygonscan.com/address/YOUR_CONTRACT_ADDRESS
# Click "Events" tab
```

---

## 📊 API Endpoints

### Consent Management

```bash
# Grant consent
POST /api/consent/grant
Body: { patientId, doctorId, recordId, scope, purpose }

# Revoke consent
POST /api/consent/revoke
Body: { consentId, patientId, reason }

# Verify consent on blockchain
GET /api/consent/verify/:consentId
```

### Health Records

```bash
# Upload record (logs to blockchain)
POST /api/records/upload
Body: { userId, recordType, recordData, uploaderRole }

# View record (logs access to blockchain)
GET /api/records/:recordId/view?viewerId=user123&accessReason=consultation

# Verify record authenticity
GET /api/records/:recordId/verify

# Get blockchain statistics
GET /api/records/blockchain/stats
```

---

## 🔍 Verification Tools

### 1. Verification Script

```bash
# Verify consent
node blockchain/verifyAudit.js <consentId> consent

# Verify record
node blockchain/verifyAudit.js <recordId> record

# Get contract statistics
node blockchain/verifyAudit.js --stats

# Verify audit chain integrity
node blockchain/verifyAudit.js --integrity
```

### 2. PolygonScan Explorer

```bash
# Contract page
https://amoy.polygonscan.com/address/YOUR_CONTRACT_ADDRESS

# View transaction
https://amoy.polygonscan.com/tx/YOUR_TX_HASH
```

### 3. Programmatic Verification

```typescript
import { blockchainLogger } from './blockchain/auditLogger';

// Check if consent is valid
const isValid = await blockchainLogger.isConsentValid('consent_123');

// Get consent details
const consent = await blockchainLogger.getConsent('consent_123');

// Get view count
const views = await blockchainLogger.getViewCount('record_456');
```

---

## 🔧 Troubleshooting

### "Blockchain logging disabled"
**Fix**: Set `USE_BLOCKCHAIN=true` in `server/.env`

### "Insufficient funds for gas"
**Fix**: Get testnet MATIC from https://faucet.polygon.technology/

### "Unauthorized caller"
**Fix**: Ensure `PRIVATE_KEY` in `.env` matches wallet used during deployment

### "Contract not found"
**Fix**: Verify `CONTRACT_ADDRESS` is set correctly in `.env`

### "Network error"
**Fix**: Check RPC endpoint:
- https://rpc-amoy.polygon.technology
- https://polygon-amoy.g.alchemy.com/v2/YOUR_KEY

---

## 📈 Gas Costs

| Action | Gas Used | Cost (MATIC) | USD @ $1/MATIC |
|--------|----------|--------------|----------------|
| Log Consent | ~90,000 | 0.0027 | $0.0027 |
| Revoke Consent | ~50,000 | 0.0015 | $0.0015 |
| Log Record | ~95,000 | 0.00285 | $0.00285 |
| Log View | ~70,000 | 0.0021 | $0.0021 |

**1000 actions ≈ $2.50 on mainnet**

---

## 🛡️ Security Notes

### ✅ Privacy Compliance

- **NO PII on blockchain**: Only HMAC-SHA256 hashes stored
- **DPDP Act 2023 compliant**: Hashes cannot identify individuals
- **Right to erasure**: Off-chain data deleted, on-chain hashes remain

### ⚠️ Security Checklist

- [ ] Private key stored securely (never commit to git)
- [ ] `.env` added to `.gitignore`
- [ ] Backend wallet funded with testnet MATIC
- [ ] Smart contract deployed and verified
- [ ] `USE_BLOCKCHAIN=true` only in production
- [ ] RLS policies in place (check `infra/migrations/`)
- [ ] Audit logs enabled (`ENABLE_AUDIT_CHAINING=true`)

---

## 📚 Additional Documentation

- **Full Guide**: See `BLOCKCHAIN_AUDIT.md` (600+ lines)
- **Compliance**: See `GOV_COMPLIANCE.md`
- **API Spec**: See `OPENAPI.yaml`
- **Deployment**: See `DEPLOYMENT.md`

---

## 🎯 Production Checklist

Before deploying to production:

- [ ] Thoroughly test on Amoy testnet
- [ ] Audit smart contract (consider: OpenZeppelin, CertiK)
- [ ] Deploy to Polygon mainnet
- [ ] Verify contract on PolygonScan
- [ ] Fund backend wallet with production MATIC
- [ ] Set up monitoring (Tenderly, Defender)
- [ ] Configure alerting for failed transactions
- [ ] Implement transaction retry logic
- [ ] Set up cold wallet for contract ownership
- [ ] Document incident response plan

---

## 💡 Why Blockchain?

1. **Immutability**: Audit logs cannot be tampered with
2. **Transparency**: Government auditors can independently verify
3. **Trust**: Patients can verify their consent status
4. **Decentralization**: No single point of failure
5. **Compliance**: Meets ABDM guidelines for audit trails

---

## 🤝 Support

- **Issues**: https://github.com/AnshXGrind/medaid-sathi-extract/issues
- **Email**: blockchain@medaid-saarthi.in
- **Docs**: See `BLOCKCHAIN_AUDIT.md`

---

## 📄 License

MIT License

---

**Built with ❤️ for transparent healthcare in India**

*Last Updated: January 2025*
