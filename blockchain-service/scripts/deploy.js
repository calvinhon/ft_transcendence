const { ethers } = require("hardhat");

async function main() {
  const Tournament = await ethers.getContractFactory("TournamentRankings");
  const tournament = await Tournament.deploy();
  await tournament.waitForDeployment();
  console.log("TournamentRankings deployed to:", await tournament.getAddress());
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
