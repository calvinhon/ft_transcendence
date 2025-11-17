// blockchain-service/src/server.ts
import express, { Request, Response } from 'express';
import { ethers } from 'ethers';
import cors from 'cors';
import * as dotenv from 'dotenv';

dotenv.config();

const app = express();
const port = Number(process.env.API_PORT) || 3001;

// Middleware
app.use(cors());
app.use(express.json());

// Type definitions
interface TournamentPlayer {
  name: string;
  rank: number;
}

interface RankingEntry {
  address: string;
  name: string;
  rank: number;
}

interface WhitelistRequest {
  playerAddress: string;
}

interface RegisterRequest {
  playerName: string;
  playerAddress?: string;
}

interface ResultRequest {
  playerAddress: string;
  rank: number;
}

interface BlockchainResponse {
  success: boolean;
  transactionHash: string;
  tournamentId: string;
  [key: string]: any;
}

interface ContractInfo {
  address: string;
  owner: string;
  network: string;
}

interface HealthResponse {
  status: string;
  blockchain: string;
  contractAddress: string | null;
}

interface PlayerInfo {
  tournamentId: string;
  playerAddress: string;
  name: string;
  rank: string;
  isWhitelisted: boolean;
  isRegistered: boolean;
}

interface GeneratedWallet {
  address: string;
  privateKey: string;
  mnemonic: string;
}

// Blockchain connection setup
let provider: ethers.JsonRpcProvider | undefined;
let contract: ethers.Contract | undefined;
let contractAddress: string | undefined;

// Contract ABI (from compilation)
const contractABI = [
  "constructor()",
  "function whitelistPlayer(uint256 tournamentId, address player) public",
  "function registerPlayer(uint256 tournamentId, string memory name) public",
  "function recordRank(uint256 tournamentId, address player, uint256 rank) public",
  "function tournaments(uint256, address) public view returns (string memory name, uint256 rank)",
  "function whitelistedPlayers(uint256, address) public view returns (bool)",
  "function owner() public view returns (address)",
  "event PlayerWhitelisted(uint256 indexed tournamentId, address indexed player)",
  "event PlayerRegistered(uint256 indexed tournamentId, address indexed player, string name)",
  "event RankRecorded(uint256 indexed tournamentId, address indexed player, uint256 rank)"
];

// Initialize blockchain connection
async function initializeBlockchain(): Promise<void> {
  try {
    // Connect to local hardhat node
    provider = new ethers.JsonRpcProvider('http://localhost:8545');
    
    // Get the first account (owner)
    const signer = await provider.getSigner(0);
    
    // Deploy contract if not exists, or connect to existing
    if (!contractAddress) {
      console.log('Deploying TournamentRankings contract...');
      
      // Load contract bytecode
      let contractBytecode: string;
      try {
        const contractArtifact = require('../artifacts/contracts/TournamentRankings.sol/TournamentRankings.json');
        contractBytecode = contractArtifact.bytecode;
      } catch {
        console.warn('Contract artifacts not found, using mock bytecode');
        contractBytecode = '0x'; // Mock bytecode for development
      }
      
      const TournamentRankings = new ethers.ContractFactory(
        contractABI,
        contractBytecode,
        signer
      );
      
      const deployedContract = await TournamentRankings.deploy();
      await deployedContract.waitForDeployment();
      contractAddress = await deployedContract.getAddress();
      console.log('Contract deployed to:', contractAddress);
    }
    
    // Connect to the contract
    contract = new ethers.Contract(contractAddress, contractABI, signer);
    
    console.log('Blockchain connection initialized successfully');
    console.log('Contract address:', contractAddress);
    
  } catch (error) {
    console.error('Failed to initialize blockchain:', error);
    // Continue without blockchain for development
  }
}

// Health check
app.get('/health', (req: Request, res: Response) => {
  const response: HealthResponse = {
    status: 'ok',
    blockchain: contract ? 'connected' : 'disconnected',
    contractAddress: contractAddress || null
  };
  res.json(response);
});

// Get contract info
app.get('/contract/info', async (req: Request, res: Response): Promise<void> => {
  try {
    if (!contract) {
      res.status(503).json({ error: 'Blockchain not connected' });
      return;
    }
    
    const owner = await contract.owner();
    const info: ContractInfo = {
      address: contractAddress!,
      owner: owner,
      network: 'localhost:8545'
    };
    res.json(info);
  } catch (error) {
    res.status(500).json({ error: (error as Error).message });
  }
});

// Whitelist a player for a tournament
app.post('/tournament/:id/whitelist', async (req: Request<{ id: string }, any, WhitelistRequest>, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const { playerAddress } = req.body;
    
    if (!contract) {
      res.status(503).json({ error: 'Blockchain not connected' });
      return;
    }
    
    if (!ethers.isAddress(playerAddress)) {
      res.status(400).json({ error: 'Invalid player address' });
      return;
    }
    
    const tx = await contract.whitelistPlayer(id, playerAddress);
    const receipt = await tx.wait();
    
    const response: BlockchainResponse = {
      success: true,
      transactionHash: receipt.hash,
      tournamentId: id,
      playerAddress: playerAddress
    };
    res.json(response);
  } catch (error) {
    res.status(500).json({ error: (error as Error).message });
  }
});

// Register a player for a tournament
app.post('/tournament/:id/register', async (req: Request<{ id: string }, any, RegisterRequest>, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const { playerName, playerAddress } = req.body;
    
    if (!contract) {
      res.status(503).json({ error: 'Blockchain not connected' });
      return;
    }
    
    // For demo purposes, we'll use a pre-configured signer
    // In production, this would require the player's signature
    const tx = await contract.registerPlayer(id, playerName);
    const receipt = await tx.wait();
    
    const response: BlockchainResponse = {
      success: true,
      transactionHash: receipt.hash,
      tournamentId: id,
      playerName: playerName
    };
    res.json(response);
  } catch (error) {
    res.status(500).json({ error: (error as Error).message });
  }
});

// Record tournament result
app.post('/tournament/:id/result', async (req: Request<{ id: string }, any, ResultRequest>, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const { playerAddress, rank } = req.body;
    
    if (!contract) {
      res.status(503).json({ error: 'Blockchain not connected' });
      return;
    }
    
    if (!ethers.isAddress(playerAddress)) {
      res.status(400).json({ error: 'Invalid player address' });
      return;
    }
    
    const tx = await contract.recordRank(id, playerAddress, rank);
    const receipt = await tx.wait();
    
    const response: BlockchainResponse = {
      success: true,
      transactionHash: receipt.hash,
      tournamentId: id,
      playerAddress: playerAddress,
      rank: rank
    };
    res.json(response);
  } catch (error) {
    res.status(500).json({ error: (error as Error).message });
  }
});

// Get tournament player info
app.get('/tournament/:id/player/:address', async (req: Request<{ id: string; address: string }>, res: Response): Promise<void> => {
  try {
    const { id, address } = req.params;
    
    if (!contract) {
      res.status(503).json({ error: 'Blockchain not connected' });
      return;
    }
    
    if (!ethers.isAddress(address)) {
      res.status(400).json({ error: 'Invalid player address' });
      return;
    }
    
    const [name, rank] = await contract.tournaments(id, address);
    const isWhitelisted = await contract.whitelistedPlayers(id, address);
    
    const playerInfo: PlayerInfo = {
      tournamentId: id,
      playerAddress: address,
      name: name,
      rank: rank.toString(),
      isWhitelisted: isWhitelisted,
      isRegistered: name !== ''
    };
    res.json(playerInfo);
  } catch (error) {
    res.status(500).json({ error: (error as Error).message });
  }
});

// Get tournament rankings
app.get('/tournament/:id/rankings', async (req: Request<{ id: string }>, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    
    if (!contract) {
      res.status(503).json({ error: 'Blockchain not connected' });
      return;
    }
    
    // For demo, return mock rankings
    // In production, you'd query events or maintain a player list
    const mockRankings: RankingEntry[] = [
      { address: '0x1234...', name: 'Player1', rank: 1 },
      { address: '0x5678...', name: 'Player2', rank: 2 },
      { address: '0x9ABC...', name: 'Player3', rank: 3 }
    ];
    
    res.json({
      tournamentId: id,
      rankings: mockRankings
    });
  } catch (error) {
    res.status(500).json({ error: (error as Error).message });
  }
});

// Generate mock wallet address for testing
app.post('/wallet/generate', (req: Request, res: Response) => {
  try {
    const wallet = ethers.Wallet.createRandom();
    const generatedWallet: GeneratedWallet = {
      address: wallet.address,
      privateKey: wallet.privateKey, // Never expose in production!
      mnemonic: wallet.mnemonic?.phrase || ''
    };
    res.json(generatedWallet);
  } catch (error) {
    res.status(500).json({ error: (error as Error).message });
  }
});

// Start server
app.listen(port, '0.0.0.0', async () => {
  console.log(`Blockchain API server running on port ${port}`);
  
  // Wait a bit for hardhat node to start, then initialize
  setTimeout(async () => {
    await initializeBlockchain();
  }, 5000);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM received, shutting down gracefully');
  process.exit(0);
});

export default app;