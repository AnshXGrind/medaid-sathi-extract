/**
 * Deployment script for ConsentAudit smart contract
 * Usage: npx hardhat run scripts/deploy.js --network amoy
 */

const hre = require("hardhat");

async function main() {
  console.log("🚀 Deploying ConsentAudit contract to", hre.network.name);
  console.log("⏳ Please wait...\n");

  // Get deployer account
  const [deployer] = await hre.ethers.getSigners();
  console.log("📍 Deploying from address:", deployer.address);
  
  const balance = await hre.ethers.provider.getBalance(deployer.address);
  console.log("💰 Account balance:", hre.ethers.formatEther(balance), "MATIC\n");

  if (balance === 0n) {
    console.error("❌ ERROR: Deployer account has no funds!");
    console.error("🔗 Get testnet MATIC from: https://faucet.polygon.technology/");
    process.exit(1);
  }

  // Get authorized backend address from env or use deployer
  const backendAddress = process.env.BACKEND_WALLET_ADDRESS || deployer.address;
  console.log("🔐 Authorized backend address:", backendAddress);

  // Deploy contract
  const ConsentAudit = await hre.ethers.getContractFactory("ConsentAudit");
  const consentAudit = await ConsentAudit.deploy(backendAddress);

  await consentAudit.waitForDeployment();
  const contractAddress = await consentAudit.getAddress();

  console.log("\n✅ ConsentAudit deployed successfully!");
  console.log("📍 Contract address:", contractAddress);
  console.log("🌐 Network:", hre.network.name);
  console.log("⛽ Gas used:", (await consentAudit.deploymentTransaction().wait()).gasUsed.toString());

  // Verify contract stats
  const stats = await consentAudit.getStats();
  console.log("\n📊 Initial Stats:");
  console.log("   Total consents:", stats[0].toString());
  console.log("   Total records:", stats[1].toString());
  console.log("   Total views:", stats[2].toString());

  console.log("\n📝 Next Steps:");
  console.log("1. Add to server/.env:");
  console.log(`   CONTRACT_ADDRESS=${contractAddress}`);
  console.log(`   USE_BLOCKCHAIN=true`);
  console.log("\n2. Verify contract (optional):");
  console.log(`   npx hardhat verify --network ${hre.network.name} ${contractAddress} "${backendAddress}"`);
  console.log("\n3. Test blockchain integration:");
  console.log("   cd ../server && npm test -- blockchain");

  // Save deployment info
  const fs = require('fs');
  const deploymentInfo = {
    network: hre.network.name,
    contractAddress: contractAddress,
    deployerAddress: deployer.address,
    backendAddress: backendAddress,
    timestamp: new Date().toISOString(),
    blockNumber: await hre.ethers.provider.getBlockNumber()
  };

  fs.writeFileSync(
    './deployments.json',
    JSON.stringify(deploymentInfo, null, 2)
  );

  console.log("\n💾 Deployment info saved to blockchain/deployments.json");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("\n❌ Deployment failed:", error);
    process.exit(1);
  });
