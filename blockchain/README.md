# Blockchain Audit Layer

## Overview

Tamper-proof audit trail for MED-AID SAARTHI using Polygon Amoy testnet.

**Privacy-First**: Only HMAC-SHA256 hashes stored on blockchain - NO personal data.

## Quick Start

```bash
# Install dependencies
npm install

# Deploy to testnet
npm run deploy

# Run tests
npm test

# Verify audit
npm run verify
```

## Structure

```
blockchain/
├── contracts/          # Solidity smart contracts
│   └── ConsentAudit.sol
├── scripts/            # Deployment scripts
│   └── deploy.js
├── test/              # Contract tests
│   └── ConsentAudit.test.js
├── hardhat.config.js  # Hardhat configuration
└── verifyAudit.js     # Verification utility
```

## Features

- ✅ Consent logging with revocation
- ✅ Record upload tracking
- ✅ Access event logging
- ✅ Immutable audit trail
- ✅ Privacy-preserving (only hashes)
- ✅ Government auditor verification

## Environment Variables

Required in `../server/.env`:

```bash
USE_BLOCKCHAIN=true
PRIVATE_KEY=0x...
RPC_URL=https://rpc-amoy.polygon.technology
CONTRACT_ADDRESS=0x...
```

## Documentation

See `../BLOCKCHAIN_AUDIT.md` for comprehensive guide.

## Commands

```bash
npm run compile      # Compile contracts
npm test            # Run tests
npm run deploy      # Deploy to Amoy testnet
npm run deploy:local # Deploy to local Hardhat node
npm run verify      # Verify audit trail
npm run node        # Start local Hardhat node
```

## Gas Costs (Testnet)

- Deploy: ~2.5M gas (~0.075 MATIC)
- Log Consent: ~90k gas (~0.003 MATIC)
- Log Record: ~95k gas (~0.003 MATIC)
- Log View: ~70k gas (~0.002 MATIC)

## License

MIT
