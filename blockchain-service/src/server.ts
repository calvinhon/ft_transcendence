import express from 'express';
import cors from 'cors';
import { ethers } from 'ethers';
import fs from 'fs';
import path from 'path';

const app = express();
app.use(cors());
app.use(express.json());

const RPC = process.env.BLOCKCHAIN_RPC_URL || 'http://hardhat-node:8545';
const PK = process.env.PRIVATE_KEY!;
const CONTRACT = process.env.CONTRACT_ADDRESS!;
const provider = new ethers.JsonRpcProvider(RPC);
const signer = new ethers.Wallet(PK, provider);

// Load ABI (ensure the ABI file is copied into this service at build time)
const abiPath = path.join(__dirname, '../abi/TournamentRankings.json');
const abi = JSON.parse(fs.readFileSync(abiPath, 'utf8')).abi;
const contract = new ethers.Contract(CONTRACT, abi, signer);

app.post('/record', async (req, res) => {
  try {
    const { tournamentId, playerAddress, rank } = req.body;
    const tx = await contract.recordRank(tournamentId, playerAddress, rank);
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