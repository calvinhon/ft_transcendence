// tournament-service/src/services/blockchain-notifier.ts
// Centralized service for recording tournament ranks on blockchain-service

import axios from 'axios';
import { createLogger } from '@ft-transcendence/common';

const logger = createLogger('TOURNAMENT-SERVICE');

let serverSecret: string | null = null;

async function getServerSecret(): Promise<string | null> {
  if (serverSecret) return serverSecret;
  try {
    const vaultAddr = process.env.VAULT_ADDR;
    const vaultToken = process.env.VAULT_TOKEN;
    if (!vaultAddr || !vaultToken) return null;

    const response = await axios.get(`${vaultAddr}/v1/kv/data/Server_Session`, {
      headers: { 'X-Vault-Token': vaultToken }
    });

    const secret = response?.data?.data?.data?.Secret ?? null;
    if (!secret) return null;

    serverSecret = secret;
    return serverSecret;
  } catch (err: any) {
    logger.warn('Failed to retrieve Server_Session secret from Vault', { error: err?.message });
    return null;
  }
}

export async function notifyBlockchainRecordRanks(
  tournamentId: number,
  players: number[],
  ranks: number[]
): Promise<void> {
  if (!Number.isInteger(tournamentId) || tournamentId <= 0) return;
  if (!Array.isArray(players) || !Array.isArray(ranks) || players.length !== ranks.length) return;

  try {
    const secret = await getServerSecret();
    const res = await fetch('https://blockchain-service:3000/record', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(secret ? { 'X-Microservice-Secret': secret } : {})
      },
      body: JSON.stringify({ tournamentId, players, ranks })
    });

    if (!res.ok) {
      const text = await res.text().catch(() => '');
      logger.warn('Blockchain /record failed', { status: res.status, body: text, tournamentId });
      return;
    }

    const json = await res.json().catch(() => null);
    logger.info('Blockchain ranks recorded', { tournamentId, txHash: json?.txHash });
  } catch (err: any) {
    logger.warn('Problem recording ranks on blockchain', { tournamentId, error: err?.message });
  }
}
