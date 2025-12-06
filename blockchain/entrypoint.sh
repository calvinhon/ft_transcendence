#!/bin/sh
set -e

# start hardhat node
npx hardhat node --hostname 0.0.0.0 --port 8545 &

# wait a moment for node
sleep 3

# compile and deploy
npx hardhat compile
npx hardhat run scripts/deploy.ts --network localhost || {
  echo "Deploy failed"; exit 1;
}

# keep container alive (node already running)
tail -f /dev/null