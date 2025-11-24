// blockchain-service/src/server.ts
import express, { Request, Response } from 'express';
import { ethers } from 'ethers';
import cors from 'cors';
import * as dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';

dotenv.config();

const app = express();
const port = 3000;

app.use(cors());
app.use(express.json());

// --- 1. Corrected ABI to match TournamentRankings.sol ---
const contractABI = [
  "function recordRank(uint256 tournamentId, address player, uint256 rank) public",
  "function tournamentRankings(uint256, address) public view returns (uint256)", // The public mapping getter
  "function owner() public view returns (address)",
  "event RankRecorded(uint256 indexed tournamentId, address indexed player, uint256 rank)"
];

let contract: ethers.Contract | undefined;
let contractAddress: string | undefined;

async function initializeBlockchain(): Promise<void> {
  try {
    const provider = new ethers.JsonRpcProvider('http://hardhat-node:8545');
    const signer = await provider.getSigner(0);

    const artifactPath = '/app/artifacts/contracts/TournamentRankings.sol/TournamentRankings.json';
    
    if (!fs.existsSync(artifactPath)) {
      console.error(`❌ Artifact not found at ${artifactPath}. Ensure Hardhat compiled successfully.`);
      return;
    }

    const contractArtifact = JSON.parse(fs.readFileSync(artifactPath, 'utf8'));

    console.log('Deploying TournamentRankings contract...');
    const factory = new ethers.ContractFactory(contractABI, contractArtifact.bytecode, signer);
    const deployedContract = await factory.deploy();
    await deployedContract.waitForDeployment();
    
    contractAddress = await deployedContract.getAddress();
    contract = new ethers.Contract(contractAddress, contractABI, signer);
    
    console.log(`✅ Blockchain service initialized. Contract: ${contractAddress}`);
    
  } catch (error) {
    console.error('❌ Failed to initialize blockchain:', error);
  }
}

// --- 3. Simplified Record Endpoint ---
app.post('/record', async (req: Request, res: Response): Promise<void> => {
  try {
    const { tournamentId, playerAddress, rank } = req.body;

    if (!contract) {
      res.status(503).json({ error: 'Blockchain not connected' });
      return;
    }

    console.log(`Recording rank: ID=${tournamentId}, Player=${playerAddress}, Rank=${rank}`);

    // Call the Solidity function
    const tx = await contract.recordRank(tournamentId, playerAddress, rank);
    const receipt = await tx.wait();

    res.json({
      success: true,
      transactionHash: receipt.hash,
      blockNumber: receipt.blockNumber
    });
  } catch (error) {
    console.error("Blockchain Error:", error);
    res.status(500).json({ error: (error as Error).message });
  }
});

// --- 4. Corrected Get Rank Endpoint ---
app.get('/rank/:tournamentId/:playerAddress', async (req: Request, res: Response): Promise<void> => {
  try {
    const { tournamentId, playerAddress } = req.params;
    
    if (!contract) {
      res.status(503).json({ error: 'Blockchain not connected' });
      return;
    }

    // Call the mapping getter
    // Returns a BigInt, so we convert to string/number
    const rank = await contract.tournamentRankings(tournamentId, playerAddress);
    
    res.json({
      tournamentId,
      playerAddress,
      rank: rank.toString() // Convert BigInt to string for JSON
    });
  } catch (error) {
    res.status(500).json({ error: (error as Error).message });
  }
});

app.listen(port, '0.0.0.0', () => {
  console.log(`Blockchain API running on port ${port}`);
  setTimeout(initializeBlockchain, 5000); // Wait for Hardhat node
});

export default app;