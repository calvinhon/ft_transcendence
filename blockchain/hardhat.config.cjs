require('@nomicfoundation/hardhat-toolbox');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.resolve(__dirname, '../.env') });

// Default Hardhat account #0 private key (publicly known test key)
const DEFAULT_PRIVATE_KEY = '0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80';

const privateKey = process.env.PRIVATE_KEY || DEFAULT_PRIVATE_KEY;

if (!process.env.PRIVATE_KEY) {
  console.log('⚠️  No PRIVATE_KEY in .env, using default Hardhat key');
  console.log('📍 Default Address: 0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266');
  console.log('💡 For production, add PRIVATE_KEY to .env\n');
}

const config = {
  solidity: "0.8.20",
  networks: {
    hardhat: {
      chainId: 1337,
      mining: {
        auto: true,
        interval: 0  // Instant mining
      },
      accounts: {
        count: 20,
        accountsBalance: "10000000000000000000000" // 10000 ETH
      }
    },
    localhost: {
      url: "http://hardhat-node:8545",
      chainId: 1337,
      accounts: [privateKey]
    }
  },
  paths: {
    sources: "./contracts",
    tests: "./test",
    cache: "./cache",
    artifacts: "./artifacts"
  }
};

module.exports = config;