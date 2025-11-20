// tournament-service/src/blockchain.ts
import { ethers } from 'ethers';
import fs from 'fs';
import path from 'path';

// TournamentRankings contract ABI
const CONTRACT_ABI = [
  "function recordRank(uint256 tournamentId, address player, uint256 rank) public",
  "function getRank(uint256 tournamentId, address player) public view returns (uint256)",
  "event RankRecorded(uint256 indexed tournamentId, address indexed player, uint256 rank)"
];

// Contract address (should be loaded from deployment artifacts)
const CONTRACT_ADDRESS = process.env.TOURNAMENT_CONTRACT_ADDRESS || '0x5FbDB2315678afecb367f032d93F642f64180aa3';

// RPC URL for hardhat node
const RPC_URL = process.env.BLOCKCHAIN_URL || 'http://hardhat-node:8545';

// Default private key (Hardhat account #0 - publicly known, for development only)
const PRIVATE_KEY = process.env.PRIVATE_KEY || '0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80';

/**
 * Get contract address from deployment artifacts
 */
function getContractAddress(): string {
  try {
    const artifactPath = path.join(__dirname, '../../blockchain/artifacts/contracts/TournamentRankings.sol/TournamentRankings.json');
    if (fs.existsSync(artifactPath)) {
      // In a real deployment, you'd have a separate deployments file with addresses
      // For now, use the hardcoded address
      return CONTRACT_ADDRESS;
    }
  } catch (error) {
    console.error('[Blockchain] Error reading contract artifacts:', error);
  }
  return CONTRACT_ADDRESS;
}

/**
 * Record tournament rankings on blockchain
 * @param tournamentId Database tournament ID
 * @param rankings Array of {userId, rank, address}
 * @returns Transaction hash
 */
export async function recordTournamentOnBlockchain(
  tournamentId: number,
  rankings: Array<{ userId: number; rank: number; address?: string }>
): Promise<string> {
  try {
    // Connect to provider
    const provider = new ethers.JsonRpcProvider(RPC_URL);
    const wallet = new ethers.Wallet(PRIVATE_KEY, provider);
    
    // Get contract
    const contractAddress = getContractAddress();
    const contract = new ethers.Contract(contractAddress, CONTRACT_ABI, wallet);

    console.log('[Blockchain] Recording tournament', tournamentId, 'with', rankings.length, 'players');

    // For demonstration: record only the winner (rank 1)
    // In production, you might want to record all participants or use batch operations
    const winner = rankings.find(r => r.rank === 1);
    if (!winner) {
      throw new Error('No winner found in rankings');
    }

    // Convert user ID to address (in production, you'd have a mapping)
    // For demo, we'll derive an address from the user ID
    const playerAddress = winner.address || deriveAddressFromUserId(winner.userId);

    // Record rank on blockchain
    const tx = await contract.recordRank(tournamentId, playerAddress, winner.rank);
    console.log('[Blockchain] Transaction sent:', tx.hash);

    // Wait for confirmation
    const receipt = await tx.wait();
    console.log('[Blockchain] Transaction confirmed in block:', receipt.blockNumber);

    return tx.hash;
  } catch (error) {
    console.error('[Blockchain] Error recording tournament:', error);
    throw error;
  }
}

/**
 * Derive an Ethereum address from user ID (for demonstration)
 * In production, each user would have an associated wallet address
 */
function deriveAddressFromUserId(userId: number): string {
  // Create a deterministic address from user ID
  // This is just for demonstration - in production, use real wallet addresses
  const hash = ethers.keccak256(ethers.toUtf8Bytes(`user_${userId}`));
  return ethers.getAddress('0x' + hash.substring(26)); // Take last 20 bytes as address
}

/**
 * Get tournament ranking from blockchain
 * @param tournamentId Database tournament ID
 * @param userAddress Ethereum address
 * @returns Rank number (0 if not found)
 */
export async function getTournamentRankFromBlockchain(
  tournamentId: number,
  userAddress: string
): Promise<number> {
  try {
    const provider = new ethers.JsonRpcProvider(RPC_URL);
    const contractAddress = getContractAddress();
    const contract = new ethers.Contract(contractAddress, CONTRACT_ABI, provider);

    const rank = await contract.getRank(tournamentId, userAddress);
    return Number(rank);
  } catch (error) {
    console.error('[Blockchain] Error getting rank:', error);
    return 0;
  }
}

/**
 * Check if blockchain service is available
 */
export async function isBlockchainAvailable(): Promise<boolean> {
  try {
    const provider = new ethers.JsonRpcProvider(RPC_URL);
    await provider.getNetwork();
    return true;
  } catch (error) {
    console.error('[Blockchain] Service not available:', error);
    return false;
  }
}
