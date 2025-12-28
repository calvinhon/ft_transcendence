import pkg from 'hardhat';
const { ethers } = pkg;

async function main() {
  const [deployer] = await ethers.getSigners();
  console.log('Deploying with:', await deployer.getAddress());

  const TournamentRankings = await ethers.getContractFactory('TournamentRankings');
  const contract = await TournamentRankings.deploy();
  await contract.waitForDeployment();
  const address = await contract.getAddress();
  console.log('TournamentRankings deployed at:', address);

  const fs = await import('fs');
  const path = await import('path');
  const dir = path.join(process.cwd(), 'deployments');
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(path.join(dir, 'contract-address.json'), JSON.stringify({ address }, null, 2));
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});