import Fastify from 'fastify';
import cors from '@fastify/cors';
import fs from 'fs';
import path from 'path';

import '@fastify/cookie';
import '@fastify/session';
import recordRoute from './routes/record.js';
import { BlockchainService } from './services/blockchainService.js';
import { sessionSecret } from '@ft-transcendence/common';

const fastify = Fastify({ logger: true, trustProxy: true, https: { cert: fs.readFileSync(process.env.HTTPS_CERT_PATH!), key: fs.readFileSync(process.env.HTTPS_KEY_PATH!) } });

const RPC = 'http://blockchain:8545';
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

const abiPath = '/app/artifacts/contracts/TournamentRankings.sol/TournamentRankings.json';

async function start() {
  try {
    if (!fs.existsSync(abiPath)) {
      fastify.log.error('[blockchain-service] ABI not found at ' + abiPath);
      process.exit(1);
    }

    const bs = new BlockchainService(RPC, PK, CONTRACT as string, abiPath);
    await bs.init();

    await fastify.register(cors, { origin: true });
    await fastify.register(sessionSecret);
    await fastify.register(recordRoute as any, { blockchainService: bs });

    await fastify.listen({ port: 3000, host: '0.0.0.0' });
    console.log(`Blockchain service running on port 3000, RPC=${RPC}, contract=${CONTRACT}`);
  } catch (err) {
    fastify.log.error({ err }, 'Failed to start blockchain-service');
    process.exit(1);
  }
}
start();