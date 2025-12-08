import 'dotenv/config';
import Fastify, { FastifyRequest, FastifyReply } from 'fastify';
import cors from '@fastify/cors';
import { ethers } from 'ethers';
import fs from 'fs';
import path from 'path';
import process from 'node:process';

const fastify = Fastify({ logger: true });

const RPC = process.env.BLOCKCHAIN_RPC_URL || 'http://blockchain:8545';
const DEFAULT_PRIVATE_KEY = '0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80';
const PK = process.env.PRIVATE_KEY || DEFAULT_PRIVATE_KEY;

let CONTRACT = process.env.CONTRACT_ADDRESS;
if (!CONTRACT) {
  const deploymentPath = path.join('/app/deployments', 'contract-address.json');
  if (fs.existsSync(deploymentPath)) {
    try {
      const { address } = JSON.parse(fs.readFileSync(deploymentPath, 'utf8'));
      CONTRACT = address;
    } catch (e) {
      fastify.log.error({ err: e }, '[blockchain-service] Failed to parse deployment file');
    }
  }
}

if (!PK) {
  fastify.log.error('[blockchain-service] PRIVATE_KEY missing');
  process.exit(1);
}
if (!CONTRACT) {
  fastify.log.error('[blockchain-service] CONTRACT_ADDRESS not set and deployments file missing');
  process.exit(1);
}

const provider = new ethers.JsonRpcProvider(RPC);
const signer = new ethers.Wallet(PK, provider);

const abiPath = '/app/artifacts/contracts/TournamentRankings.sol/TournamentRankings.json';
if (!fs.existsSync(abiPath)) {
  fastify.log.error('[blockchain-service] ABI not found at ' + abiPath);
  process.exit(1);
}
const abi = JSON.parse(fs.readFileSync(abiPath, 'utf8')).abi;
const contract = new ethers.Contract(CONTRACT, abi, signer);

fastify.post('/record', async (request: FastifyRequest, reply: FastifyReply) => {
  try {
    const body = request.body as { tournamentId: number; userId: number; rank: number };
    const tx = await contract.recordRank(body.tournamentId, body.userId, body.rank);
    const receipt = await tx.wait();
    return reply.send({ ok: true, txHash: receipt?.transactionHash });
  } catch (e: any) {
    fastify.log.error({ err: e }, '[blockchain-service] /record error');
    return reply.status(500).send({ ok: false, error: e.message });
  }
});

fastify.get('/rank/:tid/:userId', async (request: FastifyRequest, reply: FastifyReply) => {
  try {
    const { tid, userId } = request.params as { tid: string; userId: number };
    const r = await contract.getRank(Number(tid), userId);
    return reply.send({ rank: Number(r) });
  } catch (e: any) {
    fastify.log.error({ err: e }, '[blockchain-service] /rank error');
    return reply.status(500).send({ ok: false, error: e.message });
  }
});

// Bootstrap without top-level await
async function start() {
  try {
    await fastify.register(cors, { origin: true });
    await fastify.listen({ port: Number(process.env.PORT || 3000), host: '0.0.0.0' });
    fastify.log.info(`[blockchain-service] Listening on ${Number(process.env.PORT || 3000)}, RPC=${RPC}, contract=${CONTRACT}`);
  } catch (err) {
    fastify.log.error({ err }, 'Failed to start blockchain-service');
    process.exit(1);
  }
}
start();