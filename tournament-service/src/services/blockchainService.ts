import { ethers } from 'ethers';
const BLOCKCHAIN_URL = process.env.BLOCKCHAIN_URL || 'http://blockchain-service:3000';
const RPC_URL = process.env.BLOCKCHAIN_URL || 'http://blockchain:8545';

type RecordRankResponse = { ok: boolean; txHash?: string };

export async function recordRanks(tournamentId: number, userId: number, rank: number) {
  const res = await fetch(`${BLOCKCHAIN_URL}/record`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ tournamentId, userId, rank })
  });
  if (!res.ok) throw new Error(await res.text());
  const body = (await res.json()) as RecordRankResponse;
  return body;
}

export async function isBlockchainAvailable(): Promise<boolean> {
  try {
    const provider = new ethers.JsonRpcProvider(RPC_URL);
    await provider.getNetwork();
    return true;
  } catch (error) {
    console.error('Blockchain service not available:', error);
    return false;
  }
}