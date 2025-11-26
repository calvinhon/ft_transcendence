import { ethers } from "hardhat";

/**
 * @dev Deployment script for TournamentRankings contract
 * Deploys the contract and logs deployment information
 */
async function main() {
  console.log("🚀 Deploying TournamentRankings contract...");

  // Get the contract factory
  const TournamentRankings = await ethers.getContractFactory("TournamentRankings");

  // Deploy the contract
  const tournamentRankings = await TournamentRankings.deploy();

  // Wait for deployment to complete
  await tournamentRankings.waitForDeployment();

  const contractAddress = await tournamentRankings.getAddress();
  const deployer = (await ethers.getSigners())[0];

  console.log("✅ TournamentRankings deployed successfully!");
  console.log(`📍 Contract Address: ${contractAddress}`);
  console.log(`👤 Deployer: ${deployer.address}`);
  console.log(`🌐 Network: ${await ethers.provider.getNetwork().then(n => n.name)}`);

  // Verify contract functionality
  console.log("\n🔍 Verifying deployment...");
  const owner = await tournamentRankings.owner();
  console.log(`👑 Contract Owner: ${owner}`);

  // Test basic functionality
  console.log("\n🧪 Testing basic functionality...");
  const testTournamentId = 1;
  const testPlayer = deployer.address;
  const testRank = 1;

  // Record a test rank
  const tx = await tournamentRankings.recordRank(testTournamentId, testPlayer, testRank);
  await tx.wait();
  console.log(`✅ Recorded rank ${testRank} for player ${testPlayer} in tournament ${testTournamentId}`);

  // Retrieve the rank
  const retrievedRank = await tournamentRankings.getRank(testTournamentId, testPlayer);
  console.log(`✅ Retrieved rank: ${retrievedRank}`);

  if (retrievedRank === testRank) {
    console.log("🎉 Deployment and functionality test successful!");
  } else {
    throw new Error("❌ Functionality test failed");
  }

  // Log deployment summary
  console.log("\n📋 Deployment Summary:");
  console.log(`- Contract: TournamentRankings`);
  console.log(`- Address: ${contractAddress}`);
  console.log(`- Owner: ${owner}`);
  console.log(`- Network: ${await ethers.provider.getNetwork().then(n => n.name)}`);
  console.log(`- Block: ${await ethers.provider.getBlockNumber()}`);

  return contractAddress;
}

// Execute deployment
main()
  .then((address) => {
    console.log(`\n🎯 Deployment completed. Contract address: ${address}`);
    process.exit(0);
  })
  .catch((error) => {
    console.error("❌ Deployment failed:", error);
    process.exit(1);
  });