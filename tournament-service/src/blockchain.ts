const BLOCKCHAIN_URL = process.env.BLOCKCHAIN_URL || 'http://blockchain-service:3000';

type RecordRankResponse = { ok: boolean; txHash?: string };
type GetRankResponse = { rank?: number };

export async function recordRank(tournamentId: number, userId: number, rank: number) {
  const res = await fetch(`${BLOCKCHAIN_URL}/record`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ tournamentId, userId, rank })
  });
  if (!res.ok) throw new Error(await res.text());
  const body = (await res.json()) as RecordRankResponse;
  return body;
}

export async function getTournamentRankFromBlockchain(tournamentId: number, userId: number): Promise<number> {
  const res = await fetch(`${BLOCKCHAIN_URL}/rank/${tournamentId}/${userId}`);
  if (!res.ok) return 0;
  const body = await (res.json()) as GetRankResponse;
  return Number(body.rank ?? 0);
}
