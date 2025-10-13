import hre from 'hardhat';

async function main() {
  const TournamentRankings = await hre.ethers.getContractFactory("TournamentRankings");
  const tournament = await TournamentRankings.deploy();
  
  await tournament.waitForDeployment();
  
  const address = await tournament.getAddress();
  console.log(`TournamentRankings deployed to: ${address}`);
  
  // Save address to .env format
  console.log(`\nAdd to your .env file:`);
  console.log(`CONTRACT_ADDRESS=${address}`);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
