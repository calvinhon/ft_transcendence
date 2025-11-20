require('@nomicfoundation/hardhat-toolbox');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.resolve(__dirname, '../.env') });

// Default Hardhat account #0 private key (publicly known test key)
const DEFAULT_PRIVATE_KEY = '0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80';

const privateKey = process.env.PRIVATE_KEY || process.env.WALLET_PRIVATE_KEY || DEFAULT_PRIVATE_KEY;

// Check if we have a valid private key (not placeholder)
const isValidPrivateKey = privateKey && privateKey !== 'your_private_key_here' && privateKey.startsWith('0x');

if (!isValidPrivateKey) {
  console.log('⚠️  Using default Hardhat development key (not secure for production)');
  console.log('📍 Default Address: 0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266');
  console.log('💡 For production, set PRIVATE_KEY or WALLET_PRIVATE_KEY in .env\n');
}

const config = {
  solidity: "0.8.20",
  networks: {
    hardhat: {
      chainId: 1337,
    },
    localhost: {
      url: "http://hardhat-node:8545",
      chainId: 1337,
      accounts: isValidPrivateKey ? [privateKey] : undefined
    }
  },
};

module.exports = config;