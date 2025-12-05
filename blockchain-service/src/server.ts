import express from 'express';
import cors from 'cors';
import { ethers } from 'ethers';
import fs from 'fs';
import path from 'path';

const app = express();
app.use(cors());
app.use(express.json());

const RPC = process.env.BLOCKCHAIN_RPC_URL || 'http://hardhat-node:8545';

const PK = process.env.PRIVATE_KEY;
if (!PK)
  throw new Error('PRIVATE_KEY environment variable is required to create signer');

let CONTRACT = process.env.CONTRACT_ADDRESS;
if (!CONTRACT) {
  const deploymentPath = path.join(__dirname, '/app/deployments/contract-address.json');
  if (fs.existsSync(deploymentPath))
    CONTRACT = JSON.parse(fs.readFileSync(deploymentPath, 'utf8')).address as string;
  else
    throw new Error('Contract address is required for blockchain interaction');
}

const provider = new ethers.JsonRpcProvider(RPC);
const signer = new ethers.Wallet(PK, provider);

const abiPath = path.join(__dirname, '/app/artifacts/contracts/TournamentRankings.sol/TournamentRankings.json');
const abi = JSON.parse(fs.readFileSync(abiPath, 'utf8')).abi;
const contract = new ethers.Contract(CONTRACT, abi, signer);

app.post('/record', async (req, res) => {
  try {
    const { tournamentId, walletAddress, rank } = req.body;
    const tx = await contract.recordRank(tournamentId, walletAddress, rank);
    const receipt = await tx.wait();
    res.json({ ok: true, txHash: receipt?.hash });
  } catch (e: any) {
    res.status(500).json({ ok: false, error: e.message });
  }
});

app.get('/rank/:tid/:addr', async (req, res) => {
  try {
    const r = await contract.getRank(+req.params.tid, req.params.addr);
    res.json({ rank: Number(r) });
  } catch (e: any) {
    res.status(500).json({ ok: false, error: e.message });
  }
});

export default app;