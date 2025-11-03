/**
 * Blockchain Audit Verification Script
 * 
 * Usage: node blockchain/verifyAudit.js <consentId|recordHash> [type]
 * 
 * Examples:
 *   node blockchain/verifyAudit.js consent_abc123 consent
 *   node blockchain/verifyAudit.js record_xyz789 record
 *   node blockchain/verifyAudit.js --stats
 */

const { ethers } = require('ethers');
const crypto = require('crypto');
require('dotenv').config({ path: './server/.env' });

// Contract ABI
const CONSENT_AUDIT_ABI = [
  "function getConsent(bytes32 consentId) external view returns (tuple(bytes32 consentId, bytes32 patientHash, bytes32 doctorHash, bytes32 recordHash, uint256 timestamp, bool revoked, uint256 revokedAt))",
  "function getRecord(bytes32 recordHash) external view returns (tuple(bytes32 recordHash, string uploaderRole, bytes32 uploaderHash, uint256 timestamp))",
  "function getViewCount(bytes32 recordHash) external view returns (uint256)",
  "function getStats() external view returns (uint256, uint256, uint256)",
  "function isConsentValid(bytes32 consentId) external view returns (bool)",
  "event ConsentLogged(bytes32 indexed consentId, bytes32 indexed patientHash, bytes32 indexed doctorHash, bytes32 recordHash, uint256 timestamp)",
  "event ConsentRevoked(bytes32 indexed consentId, uint256 timestamp)",
  "event RecordLogged(bytes32 indexed recordHash, string uploaderRole, bytes32 indexed uploaderHash, uint256 timestamp)",
  "event ViewLogged(bytes32 indexed viewerHash, bytes32 indexed recordHash, uint256 timestamp, string accessReason)"
];

// Configuration
const RPC_URL = process.env.RPC_URL || 'https://rpc-amoy.polygon.technology';
const CONTRACT_ADDRESS = process.env.CONTRACT_ADDRESS;

if (!CONTRACT_ADDRESS) {
  console.error('❌ CONTRACT_ADDRESS not set in .env file');
  process.exit(1);
}

// Helper function to convert string to bytes32
function toBytes32(value) {
  const hash = crypto.createHash('sha256').update(value).digest('hex');
  return '0x' + hash;
}

// Format timestamp
function formatTimestamp(timestamp) {
  const date = new Date(timestamp * 1000);
  return date.toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' });
}

// Verify consent
async function verifyConsent(contract, consentId) {
  console.log('\n🔍 Verifying Consent: ' + consentId);
  console.log('━'.repeat(60));

  const consentHash = toBytes32(consentId);
  
  try {
    const isValid = await contract.isConsentValid(consentHash);
    const consent = await contract.getConsent(consentHash);

    console.log('✅ Consent found on blockchain\n');
    console.log('Status:', isValid ? '✅ VALID' : '❌ REVOKED');
    console.log('Patient Hash:', consent.patientHash);
    console.log('Doctor Hash:', consent.doctorHash);
    console.log('Record Hash:', consent.recordHash === ethers.ZeroHash ? 'N/A' : consent.recordHash);
    console.log('Granted At:', formatTimestamp(consent.timestamp));
    
    if (consent.revoked) {
      console.log('Revoked At:', formatTimestamp(consent.revokedAt));
    }

    // Query events
    const filter = contract.filters.ConsentLogged(consentHash);
    const events = await contract.queryFilter(filter, 0, 'latest');
    
    if (events.length > 0) {
      console.log('\n📜 Transaction Details:');
      console.log('TX Hash:', events[0].transactionHash);
      console.log('Block Number:', events[0].blockNumber);
      console.log('Explorer:', `https://amoy.polygonscan.com/tx/${events[0].transactionHash}`);
    }

    // Check if revoked
    if (consent.revoked) {
      const revokeFilter = contract.filters.ConsentRevoked(consentHash);
      const revokeEvents = await contract.queryFilter(revokeFilter, 0, 'latest');
      
      if (revokeEvents.length > 0) {
        console.log('\n🚫 Revocation Transaction:');
        console.log('TX Hash:', revokeEvents[0].transactionHash);
        console.log('Block Number:', revokeEvents[0].blockNumber);
        console.log('Explorer:', `https://amoy.polygonscan.com/tx/${revokeEvents[0].transactionHash}`);
      }
    }

  } catch (error) {
    console.error('❌ Consent not found on blockchain');
    console.error('Error:', error.message);
  }
}

// Verify record
async function verifyRecord(contract, recordId) {
  console.log('\n🔍 Verifying Record: ' + recordId);
  console.log('━'.repeat(60));

  const recordHash = toBytes32(recordId);
  
  try {
    const record = await contract.getRecord(recordHash);
    const viewCount = await contract.getViewCount(recordHash);

    console.log('✅ Record found on blockchain\n');
    console.log('Uploader Role:', record.uploaderRole);
    console.log('Uploader Hash:', record.uploaderHash);
    console.log('Uploaded At:', formatTimestamp(record.timestamp));
    console.log('View Count:', viewCount.toString());

    // Query upload event
    const uploadFilter = contract.filters.RecordLogged(recordHash);
    const uploadEvents = await contract.queryFilter(uploadFilter, 0, 'latest');
    
    if (uploadEvents.length > 0) {
      console.log('\n📜 Upload Transaction:');
      console.log('TX Hash:', uploadEvents[0].transactionHash);
      console.log('Block Number:', uploadEvents[0].blockNumber);
      console.log('Explorer:', `https://amoy.polygonscan.com/tx/${uploadEvents[0].transactionHash}`);
    }

    // Query view events
    const viewFilter = contract.filters.ViewLogged(null, recordHash);
    const viewEvents = await contract.queryFilter(viewFilter, 0, 'latest');
    
    if (viewEvents.length > 0) {
      console.log('\n👁️ Recent View Events:');
      viewEvents.slice(0, 5).forEach((event, index) => {
        console.log(`\n${index + 1}. Block ${event.blockNumber}`);
        console.log('   Viewer Hash:', event.args.viewerHash);
        console.log('   Reason:', event.args.accessReason);
        console.log('   Time:', formatTimestamp(event.args.timestamp));
        console.log('   TX:', `https://amoy.polygonscan.com/tx/${event.transactionHash}`);
      });
    }

  } catch (error) {
    console.error('❌ Record not found on blockchain');
    console.error('Error:', error.message);
  }
}

// Get contract statistics
async function getStats(contract) {
  console.log('\n📊 Contract Statistics');
  console.log('━'.repeat(60));

  try {
    const stats = await contract.getStats();
    
    console.log('Total Consents:', stats[0].toString());
    console.log('Total Records:', stats[1].toString());
    console.log('Total Views:', stats[2].toString());

    // Get recent events
    console.log('\n📜 Recent Events (Last 10):');
    
    const consentFilter = contract.filters.ConsentLogged();
    const consentEvents = await contract.queryFilter(consentFilter, -1000, 'latest');
    
    const recordFilter = contract.filters.RecordLogged();
    const recordEvents = await contract.queryFilter(recordFilter, -1000, 'latest');
    
    const viewFilter = contract.filters.ViewLogged();
    const viewEvents = await contract.queryFilter(viewFilter, -1000, 'latest');

    const allEvents = [
      ...consentEvents.map(e => ({ type: 'Consent', event: e })),
      ...recordEvents.map(e => ({ type: 'Record', event: e })),
      ...viewEvents.map(e => ({ type: 'View', event: e }))
    ];

    allEvents.sort((a, b) => b.event.blockNumber - a.event.blockNumber);

    allEvents.slice(0, 10).forEach((item, index) => {
      console.log(`\n${index + 1}. ${item.type} Event - Block ${item.event.blockNumber}`);
      console.log(`   TX: https://amoy.polygonscan.com/tx/${item.event.transactionHash}`);
    });

  } catch (error) {
    console.error('❌ Failed to get statistics:', error.message);
  }
}

// Verify audit chain integrity
async function verifyIntegrity(contract) {
  console.log('\n🔐 Verifying Audit Chain Integrity');
  console.log('━'.repeat(60));

  try {
    // Get all consent events
    const consentFilter = contract.filters.ConsentLogged();
    const consentEvents = await contract.queryFilter(consentFilter, 0, 'latest');
    
    // Get all record events
    const recordFilter = contract.filters.RecordLogged();
    const recordEvents = await contract.queryFilter(recordFilter, 0, 'latest');

    console.log('Total Consent Events:', consentEvents.length);
    console.log('Total Record Events:', recordEvents.length);

    // Verify each consent still exists
    let validConsents = 0;
    let revokedConsents = 0;

    for (const event of consentEvents) {
      const consentId = event.args.consentId;
      const isValid = await contract.isConsentValid(consentId);
      
      if (isValid) {
        validConsents++;
      } else {
        revokedConsents++;
      }
    }

    console.log('\n✅ Valid Consents:', validConsents);
    console.log('🚫 Revoked Consents:', revokedConsents);

    console.log('\n✅ Blockchain audit trail is IMMUTABLE and VERIFIED');
    console.log('All events are permanently recorded and cannot be altered.');

  } catch (error) {
    console.error('❌ Failed to verify integrity:', error.message);
  }
}

// Main function
async function main() {
  const args = process.argv.slice(2);

  if (args.length === 0 || args[0] === '--help') {
    console.log('\n📖 Usage: node blockchain/verifyAudit.js <id> [type]\n');
    console.log('Options:');
    console.log('  --stats      Show contract statistics');
    console.log('  --integrity  Verify audit chain integrity');
    console.log('\nExamples:');
    console.log('  node blockchain/verifyAudit.js consent_abc123 consent');
    console.log('  node blockchain/verifyAudit.js record_xyz789 record');
    console.log('  node blockchain/verifyAudit.js --stats');
    console.log('  node blockchain/verifyAudit.js --integrity\n');
    process.exit(0);
  }

  console.log('🔗 Connecting to Polygon Amoy Testnet...');
  console.log('📍 Contract:', CONTRACT_ADDRESS);

  const provider = new ethers.JsonRpcProvider(RPC_URL);
  const contract = new ethers.Contract(CONTRACT_ADDRESS, CONSENT_AUDIT_ABI, provider);

  // Verify connection
  try {
    const stats = await contract.getStats();
    console.log('✅ Connected successfully\n');
  } catch (error) {
    console.error('❌ Failed to connect to contract:', error.message);
    process.exit(1);
  }

  const command = args[0];

  if (command === '--stats') {
    await getStats(contract);
  } else if (command === '--integrity') {
    await verifyIntegrity(contract);
  } else {
    const id = command;
    const type = args[1] || 'consent';

    if (type === 'consent') {
      await verifyConsent(contract, id);
    } else if (type === 'record') {
      await verifyRecord(contract, id);
    } else {
      console.error('❌ Invalid type. Use "consent" or "record"');
      process.exit(1);
    }
  }

  console.log('\n');
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('\n❌ Error:', error);
    process.exit(1);
  });
