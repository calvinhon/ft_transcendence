import { ethers } from "hardhat";
import fs from "fs";
import path from "path";

async function main() {
  const TournamentRankings = await ethers.getContractFactory("TournamentRankings");
  const contract = await TournamentRankings.deploy();
  await contract.waitForDeployment();

  const address = await contract.getAddress();
  console.log("TournamentRankings deployed to:", address);

  const deploymentInfo = {
    address: address,
    deployedAt: new Date().toISOString()
  };
  
  const outputPath = path.join(__dirname, "../deployments/contract-address.json");
  fs.mkdirSync(path.dirname(outputPath), { recursive: true });
  fs.writeFileSync(outputPath, JSON.stringify(deploymentInfo, null, 2));
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});