require('@nomicfoundation/hardhat-toolbox');

const config = {
  solidity: "0.8.20",
  defaultNetwork: "docker",
  networks: {
    docker: { 
      url: "http://blockchain:8545",
      chainId: 1337
    }
  }
};

module.exports = config;