require("@nomicfoundation/hardhat-toolbox");
require("dotenv").config();

const config = {
  solidity: "0.8.20",
  networks: {
    localAvalanche: {
      url: "http://0.0.0.0:8545",
      chainId: 43112,
      accounts: [process.env.AVALANCHE_PRIVATE_KEY],
    },
  },
};

module.exports = config;
