# Test Suite: Blockchain Tournament Scores

## Module: Store Tournament Score in Blockchain
**Points:** 10 (Major)  
**Blockchain:** Solidity Smart Contract + Hardhat  
**Date:** December 5, 2025

---

## Test 1: Smart Contract Compilation

### Objective
Verify Solidity contract compiles successfully.

### Test Steps
1. Check contract syntax
2. Compile with Hardhat
3. Verify bytecode generated
4. Check ABI created

### Test Commands
```bash
cd blockchain

# Compile contracts
npx hardhat compile

# Verify artifacts created
ls -lah artifacts/contracts/TournamentRankings.sol/

# Check ABI
cat artifacts/contracts/TournamentRankings.sol/TournamentRankings.json | jq '.abi' | head -30
```

### Expected Results
```
✅ Compiled successfully
✅ artifacts/contracts/TournamentRankings.sol/TournamentRankings.json created
✅ ABI and bytecode present
```

### Pass Criteria
- Compilation succeeds with no errors
- artifacts/ folder created
- TournamentRankings.json exists
- ABI is valid JSON
- No warnings

---

## Test 2: Hardhat Network

### Objective
Verify Hardhat local network starts correctly.

### Test Steps
1. Start Hardhat network
2. Check network is listening
3. Verify RPC endpoint responds
4. Check gas estimation

### Test Commands
```bash
cd blockchain

# Start Hardhat node in background
npx hardhat node &
HARDHAT_PID=$!
sleep 5

# Check if listening on port 8545
curl -X POST http://localhost:8545 \
  -H "Content-Type: application/json" \
  -d '{"jsonrpc":"2.0","method":"eth_chainId","params":[],"id":1}' \
  | jq .

# Expected response:
# {"jsonrpc":"2.0","result":"0x7a69","id":1}

# Get block number
curl -X POST http://localhost:8545 \
  -H "Content-Type: application/json" \
  -d '{"jsonrpc":"2.0","method":"eth_blockNumber","params":[],"id":1}' \
  | jq .

# Stop Hardhat
kill $HARDHAT_PID
```

### Pass Criteria
- Hardhat listens on port 8545
- RPC endpoints respond
- Block number retrieved
- Chain ID correct

---

## Test 3: Contract Deployment

### Objective
Verify smart contract deploys successfully.

### Test Steps
1. Deploy contract to Hardhat network
2. Verify deployment receipt
3. Check contract address
4. Verify contract state initialized

### Test Commands
```bash
cd blockchain

# Start Hardhat node
npx hardhat node &
HARDHAT_PID=$!
sleep 5

# Run deployment script
npx hardhat run scripts/deploy.js --network localhost

# Expected output:
# Compiling 1 file with 0.8.19
# TournamentRankings deployed to: 0x...

# Check deployment logs
cat deploy_logs.txt 2>/dev/null || echo "No deployment logs"

# Stop Hardhat
kill $HARDHAT_PID
```

### Pass Criteria
- Deployment succeeds
- Contract address returned (0x...)
- Address is valid Ethereum address
- Deployment cost reasonable

---

## Test 4: Record Score Function

### Objective
Verify recordScore function works correctly.

### Test Steps
1. Deploy contract
2. Call recordScore function
3. Verify transaction receipt
4. Check event emitted

### Test Commands
```bash
cd blockchain

# Run test that calls recordScore
npx hardhat test --grep "recordScore"

# Expected output:
# ✓ Records tournament score correctly
# ✓ Score stored with timestamp
# ✓ Event emitted on recording
```

### Expected Test Results
```javascript
it("should record a score for a tournament", async function() {
  const tx = await contract.recordScore(
    1,                              // tournamentId
    "0x...",                        // player address
    100                             // score
  );
  const receipt = await tx.wait();
  expect(receipt.status).to.equal(1);
});
```

### Pass Criteria
- recordScore call succeeds
- Transaction receipt received
- Transaction status is 1 (success)
- Score logged correctly

---

## Test 5: Retrieve Scores

### Objective
Verify scores can be retrieved from blockchain.

### Test Steps
1. Record multiple scores
2. Retrieve tournament scores
3. Verify scores in order
4. Check leaderboard generation

### Test Commands
```bash
cd blockchain

# Run test for score retrieval
npx hardhat test --grep "retrieveScores"

# Expected output:
# ✓ Retrieves scores for tournament
# ✓ Scores sorted correctly
# ✓ Leaderboard generated
```

### Expected Results
```javascript
it("should retrieve scores from tournament", async function() {
  // Record scores
  await contract.recordScore(1, player1, 100);
  await contract.recordScore(1, player2, 95);
  await contract.recordScore(1, player3, 110);
  
  // Retrieve
  const scores = await contract.getTournamentScores(1);
  expect(scores.length).to.equal(3);
  expect(scores[0].score).to.equal(110); // Highest first
});
```

### Pass Criteria
- All recorded scores retrieved
- Scores ordered by value (highest first)
- Player addresses correct
- Timestamps accurate

---

## Test 6: Leaderboard Ranking

### Objective
Verify leaderboard ranking calculations.

### Test Steps
1. Record multiple scores
2. Calculate rankings
3. Verify rank order
4. Check tie-breaking

### Test Commands
```bash
cd blockchain

# Run ranking tests
npx hardhat test --grep "ranking|leaderboard"

# Expected output:
# ✓ Calculates rankings correctly
# ✓ Handles tied scores
# ✓ Updates on new records
```

### Test Scenario
```
Player 1: 100 points → Rank 2
Player 2: 120 points → Rank 1
Player 3: 100 points → Rank 2 (tied)
Player 4: 95 points  → Rank 4
```

### Pass Criteria
- Rankings calculated correctly
- Tied scores handled properly
- Ranking updates on new scores
- Rank numbers sequential

---

## Test 7: Tournament Multiple Instances

### Objective
Verify multiple tournaments can run independently.

### Test Steps
1. Create scores for tournament 1
2. Create scores for tournament 2
3. Verify no data mixing
4. Check isolation

### Test Commands
```bash
cd blockchain

# Run tournament isolation tests
npx hardhat test --grep "multiTournament|isolation"

# Expected output:
# ✓ Maintains separate tournament data
# ✓ No cross-tournament contamination
# ✓ Each tournament independent
```

### Test Scenario
```javascript
it("should keep tournaments separate", async function() {
  // Record for tournament 1
  await contract.recordScore(1, player1, 100);
  await contract.recordScore(1, player2, 95);
  
  // Record for tournament 2
  await contract.recordScore(2, player1, 120);
  
  const tour1Scores = await contract.getTournamentScores(1);
  const tour2Scores = await contract.getTournamentScores(2);
  
  expect(tour1Scores.length).to.equal(2);
  expect(tour2Scores.length).to.equal(1);
  expect(tour2Scores[0].score).to.equal(120);
});
```

### Pass Criteria
- Tournament data isolated
- No cross-contamination
- Correct number of scores per tournament
- Correct scores retrieved

---

## Test 8: Timestamp Recording

### Objective
Verify timestamps are recorded correctly.

### Test Steps
1. Record score
2. Check timestamp
3. Verify block time used
4. Check timestamp ordering

### Test Commands
```bash
cd blockchain

# Run timestamp tests
npx hardhat test --grep "timestamp"

# Expected output:
# ✓ Records timestamp on scoring
# ✓ Timestamps in order
# ✓ Uses block.timestamp
```

### Expected Results
```javascript
it("should record timestamp with score", async function() {
  const blockBefore = await ethers.provider.getBlock('latest');
  
  const tx = await contract.recordScore(1, player1, 100);
  const receipt = await tx.wait();
  
  const blockAfter = await ethers.provider.getBlock(receipt.blockNumber);
  const scores = await contract.getTournamentScores(1);
  
  expect(scores[0].timestamp).to.be.at.least(blockAfter.timestamp);
  expect(scores[0].timestamp).to.be.at.most(blockAfter.timestamp);
});
```

### Pass Criteria
- Timestamps recorded with each score
- Timestamps in ascending order
- Uses blockchain block time
- No future timestamps

---

## Test 9: Gas Estimation

### Objective
Verify contract operations use reasonable gas.

### Test Steps
1. Estimate gas for recordScore
2. Estimate gas for getTournamentScores
3. Check against limits
4. Verify optimization

### Test Commands
```bash
cd blockchain

# Run gas tests
npx hardhat test --grep "gas"

# Expected output with estimated gas costs
npx hardhat run scripts/estimateGas.js

# Expected output:
# recordScore: ~85,000 gas
# getTournamentScores: read-only
```

### Pass Criteria
- recordScore < 100,000 gas
- getTournamentScores < 50,000 gas
- No gas-intensive operations
- Optimized contract code

---

## Test 10: Event Emission

### Objective
Verify contract events are emitted correctly.

### Test Steps
1. Define event in contract
2. Emit event on recording
3. Listen for event
4. Verify event data

### Test Commands
```bash
cd blockchain

# Run event tests
npx hardhat test --grep "event"

# Expected output:
# ✓ Emits ScoreRecorded event
# ✓ Event contains correct data
# ✓ Events can be filtered
```

### Expected Contract Code
```solidity
event ScoreRecorded(
  uint256 indexed tournamentId,
  address indexed player,
  uint256 score,
  uint256 timestamp
);

function recordScore(
  uint256 tournamentId,
  address player,
  uint256 score
) public {
  tournamentScores[tournamentId].push(
    TournamentScore(player, score, block.timestamp)
  );
  emit ScoreRecorded(tournamentId, player, score, block.timestamp);
}
```

### Pass Criteria
- Events defined in contract
- Events emitted on state change
- Event data matches function parameters
- Events can be queried

---

## Test 11: Solidity Security

### Objective
Verify contract security best practices.

### Test Steps
1. Check for reentrancy vulnerability
2. Check access control
3. Verify bounds checking
4. Check for integer overflow

### Test Commands
```bash
cd blockchain

# Run security tests
npx hardhat test --grep "security"

# Check contract with slither (if installed)
slither contracts/TournamentRankings.sol --json > analysis.json || echo "Slither not installed"

# Manual checks
grep -n "payable\|delegatecall" contracts/TournamentRankings.sol || echo "No dangerous patterns"
```

### Pass Criteria
- No reentrancy vulnerabilities
- No integer overflow/underflow
- No unauthorized access possible
- Input validation in place

---

## Test 12: Integration Test

### Objective
Verify full tournament lifecycle.

### Test Steps
1. Create tournament
2. Register players
3. Record multiple scores
4. Calculate final rankings
5. Verify blockchain state

### Test Commands
```bash
cd blockchain

# Run integration test
npx hardhat test --grep "integration|tournament-lifecycle"

# Expected output:
# ✓ Complete tournament workflow
# ✓ Final standings correct
# ✓ All data persisted
```

### Full Test Scenario
```javascript
it("should complete full tournament lifecycle", async function() {
  const tournamentId = 1;
  
  // Register scores
  await contract.recordScore(tournamentId, player1.address, 100);
  await contract.recordScore(tournamentId, player2.address, 120);
  await contract.recordScore(tournamentId, player3.address, 95);
  
  // Get final standings
  const standings = await contract.getTournamentScores(tournamentId);
  
  // Verify
  expect(standings.length).to.equal(3);
  expect(standings[0].score).to.equal(120); // Winner
  expect(standings[0].player).to.equal(player2.address);
});
```

### Pass Criteria
- Full tournament workflow completes
- All scores recorded
- Rankings correct
- Data persists on blockchain

---

## Summary

**Blockchain:** Solidity + Hardhat ✅  
**Contract:** TournamentRankings  
**Total Tests:** 12  
**Pass Criteria:** All 12 must pass

### Quick Test Command
```bash
cd blockchain && npm test
```

### Expected Output
```
  TournamentRankings
    ✓ Should compile successfully (123ms)
    ✓ Should deploy to network (234ms)
    ✓ Should record scores (145ms)
    ✓ Should retrieve scores (87ms)
    ✓ Should calculate rankings (102ms)
    ✓ Should maintain tournament isolation (134ms)
    ✓ Should record timestamps (98ms)
    ✓ Should estimate gas correctly (156ms)
    ✓ Should emit events (112ms)
    ✓ Should pass security checks (203ms)
    ✓ Should complete tournament lifecycle (267ms)

  12 passing (2.5s)
```

---

*Test Suite Created: December 5, 2025*
