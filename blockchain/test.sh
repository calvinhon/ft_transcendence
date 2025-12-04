#!/bin/bash

echo "⛓️ Testing Blockchain Service (Hardhat)"
echo "======================================"

# Note: This script assumes the Hardhat node is already running
# For standalone testing, uncomment the following lines:
# npm run node &
# NODE_PID=$!
# sleep 5

echo -e "\n1. Testing Hardhat Node Health:"
# Check if Hardhat node is responding
if curl -s -X POST -H "Content-Type: application/json" \
    --data '{"jsonrpc":"2.0","method":"eth_blockNumber","params":[],"id":1}' \
    http://localhost:8545 | grep -q '"result"'; then
    echo "✅ Hardhat node is responding"
else
    echo "❌ Hardhat node not responding"
    exit 1
fi

echo -e "\n2. Running Smart Contract Tests:"
# Run Hardhat tests
cd /home/honguyen/ft_transcendence/blockchain
if npm test; then
    echo "✅ Smart contract tests passed"
else
    echo "❌ Smart contract tests failed"
    exit 1
fi

echo -e "\n3. Testing Contract Deployment:"
# Test deployment script
if npm run deploy:localhost; then
    echo "✅ Contract deployment successful"
else
    echo "❌ Contract deployment failed"
    exit 1
fi

# For standalone testing, uncomment the following line:
# kill $NODE_PID 2>/dev/null

echo -e "\n\n✅ All blockchain tests completed!"