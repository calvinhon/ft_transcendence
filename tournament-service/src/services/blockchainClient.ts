import axios from 'axios';
import { getMicroserviceSecret } from './microserviceSecret';

export async function recordTournamentRanksOnChain(params: {
  tournamentId: number;
  players: number[];
  ranks: number[];
}): Promise<string | null> {
  const secret = await getMicroserviceSecret();
  const res = await axios.post(
    'http://blockchain-service:3000/record',
    {
      tournamentId: params.tournamentId,
      players: params.players,
      ranks: params.ranks
    },
    {
      timeout: 15000,
      headers: {
        'X-Microservice-Secret': secret
      }
    }
  );

  const data = res.data;
  return data?.txHash ?? data?.transactionHash ?? null;
}
