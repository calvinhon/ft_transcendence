import { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import { sendError, sendSuccess } from '@ft-transcendence/common';
import { ParticipantService } from '../../services/participantService';
import { TournamentService } from '../../services/tournamentService';
import { recordTournamentRanksOnChain } from '../../services/blockchainClient';

export default async function tournamentBlockchainRoutes(fastify: FastifyInstance): Promise<void> {
  // Trigger blockchain recording (server-computed payload; browser cannot spoof ranks)
  fastify.post<{
    Params: { tournamentId: string };
  }>(
    '/tournaments/:tournamentId/blockchain/record',
    async (
      request: FastifyRequest<{ Params: { tournamentId: string } }>,
      reply: FastifyReply
    ) => {
      if (!request.session || !request.session.userId) return sendError(reply, 'Unauthorized', 401);

      const tournamentId = parseInt(request.params.tournamentId, 10);
      if (Number.isNaN(tournamentId)) return sendError(reply, 'Invalid tournament ID', 400);

      const tournament = await TournamentService.getTournamentById(tournamentId);
      if (!tournament) return sendError(reply, 'Tournament not found', 404);
      if (tournament.status !== 'finished' || tournament.winner_id == null) {
        return sendError(reply, 'Tournament not finished', 400);
      }

      const participants = await ParticipantService.getTournamentParticipants(tournamentId);
      if (!participants.length) return sendError(reply, 'No participants', 400);

      const players: number[] = [];
      const ranks: number[] = [];
      for (const p of participants) {
        if (typeof p.final_rank !== 'number') {
          return sendError(reply, 'Tournament ranks not finalized', 409);
        }
        players.push(Number(p.user_id));
        ranks.push(Number(p.final_rank));
      }

      try {
        const txHash = await recordTournamentRanksOnChain({ tournamentId, players, ranks });
        return sendSuccess(reply, { txHash }, 'Recorded on blockchain');
      } catch (err: any) {
        fastify.log.error({ err }, '[tournament-service] blockchain record failed');
        return sendError(reply, err?.message ?? 'Blockchain recording failed', 502);
      }
    }
  );
}
