const { ethers } = require("hardhat");
const fs = require("fs");
const path = require("path");

async function main() {
  const Tournament = await ethers.getContractFactory("TournamentRankings");
  const tournament = await Tournament.deploy();
  await tournament.waitForDeployment();
  
  const contractAddress = await tournament.getAddress();
  console.log("TournamentRankings deployed to:", contractAddress);

  const deploymentInfo = {
    address: contractAddress,
  };

  fs.writeFileSync(
    path.join(__dirname, "../deployment.json"),
    JSON.stringify(deploymentInfo, null, 2)
  );

  console.log("Contract deployed and address saved to deployment.json");
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});

// // In your frontend or backend
// const deploymentInfo = require('../blockchain-service/deployment.json');
// const artifact = require('../blockchain-service/artifacts/contracts/TournamentRankings.sol/TournamentRankings.json');

// const contractAddress = deploymentInfo.address;
// const contractABI = artifact.abi;