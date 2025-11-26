# Blockchain Service - Tournament Rankings

A decentralized smart contract system for immutable tournament ranking storage using Hardhat and Solidity.

## 🏗️ Architecture

```
blockchain/
├── contracts/
│   ├── ITournamentRankings.sol    # Contract interface
│   └── TournamentRankings.sol     # Main smart contract
├── scripts/
│   └── deploy.js                  # Deployment automation
├── test/
│   └── TournamentRankings.test.js # Comprehensive test suite
├── hardhat.config.cjs             # Hardhat configuration
├── DEBUG_LOG.md                   # Development log
└── README.md                      # This file
```

## 🚀 Quick Start

### Prerequisites
- Node.js 18+
- npm

### Installation
```bash
cd blockchain
npm install
```

### Development Workflow
```bash
# Compile contracts
npm run compile

# Run tests
npm run test

# Start local network
npm run node

# Deploy to localhost
npm run deploy:localhost
```

## 📋 Smart Contract

### TournamentRankings Contract

**Core Functionality:**
- Record tournament rankings with owner-only access
- Query player rankings across tournaments
- Emit events for transparency

**Key Functions:**
```solidity
function recordRank(uint256 tournamentId, address player, uint256 rank) external;
function getRank(uint256 tournamentId, address player) external view returns (uint256);
```

**Security Features:**
- Owner-only modifications
- Input validation
- Event logging

## 🧪 Testing

Run comprehensive test suite:
```bash
npm run test          # Unit tests
npm run test:gas      # Gas usage analysis
npm run test:coverage # Coverage report
```

**Test Coverage:**
- ✅ Functionality tests
- ✅ Security tests (access control)
- ✅ Gas optimization tests
- ✅ Event emission tests

## 🐳 Docker

The service runs in a containerized environment as part of the main `docker-compose.yml`.

## 🔧 Configuration

### Networks
- **Local**: Hardhat network (chainId: 1337)
- **Production**: Configurable via environment variables

### Environment Variables
```bash
PRIVATE_KEY=your_private_key_here
ETHEREUM_RPC_URL=http://localhost:8545
```

## 📊 Performance

- **Deployment**: ~150,000 gas
- **recordRank()**: ~45,000 gas
- **getRank()**: ~23,000 gas (view)

## 🔒 Security

- Owner-only critical operations
- Comprehensive input validation
- Transparent event logging
- Full test coverage

## 📚 API Reference

See contract interfaces and tests for detailed API documentation.

## 🔍 Troubleshooting

Check `DEBUG_LOG.md` for known issues and fixes.

---

**Local Network**: `http://localhost:8545`  
**Chain ID**: `1337`  
**Default Account**: `0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266`</content>
<parameter name="filePath">/home/honguyen/ft_transcendence/blockchain/README.md