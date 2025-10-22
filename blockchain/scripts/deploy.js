import hre from 'hardhat';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

async function main() {
  const TournamentRankings = await hre.ethers.getContractFactory("TournamentRankings");
  const tournament = await TournamentRankings.deploy();
  
  await tournament.waitForDeployment();
  
  const address = await tournament.getAddress();
  console.log(`TournamentRankings deployed to: ${address}`);
  
  const envPath = path.resolve(__dirname, '../../.env');
  let envContent = '';
  
  if (fs.existsSync(envPath)) {
  envContent = fs.readFileSync(envPath, 'utf8');
  
  const contractAddressLine = `CONTRACT_ADDRESS=${address}`;
  const contractAddressRegex = /^CONTRACT_ADDRESS=.*/m;
  
  if (contractAddressRegex.test(envContent))
    envContent = envContent.replace(contractAddressRegex, contractAddressLine);
  else
    envContent += `\n${contractAddressLine}`;
  
  fs.writeFileSync(envPath, envContent.trim() + '\n');
  console.log(`✅ Updated CONTRACT_ADDRESS in .env file`);
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
