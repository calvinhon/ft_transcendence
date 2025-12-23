import { FastifyPluginAsync } from 'fastify';
import { BlockchainService } from '../services/blockchainService.js';

const plugin: FastifyPluginAsync<{ blockchainService: BlockchainService }> = async (fastify, opts) => {
  const svc = (opts as any).blockchainService as BlockchainService;

  fastify.post('/record', async (request, reply) => {
    try {
      const body = request.body as any;

      // Normalize body to an array of participants
      let participants: Array<{ tournamentId: number; userId: number; rank: number }> = [];

      if (Array.isArray(body?.participants)) {
        participants = body.participants.map((p: any) => ({
          tournamentId: Number(p.tournamentId),
          userId: Number(p.userId),
          rank: Number(p.rank),
        }));
      } else {
        return reply.status(400).send({ ok: false, error: 'Array of tournamentId, userId, rank and participants is required' });
      }

      // Validate participants
      for (const p of participants) {
        if (
          Number.isNaN(p.tournamentId) ||
          Number.isNaN(p.userId) ||
          Number.isNaN(p.rank)
        ) {
          return reply.status(400).send({ ok: false, error: 'All participants must include numeric tournamentId, userId and rank' });
        }
      }

      const txHashes = await svc.recordRanks(participants);
      return reply.send({ ok: true, txHashes });
    } catch (e: any) {
      fastify.log.error({ err: e }, '[blockchain-service] /record error');
      return reply.status(500).send({ ok: false, error: e?.message ?? String(e) });
    }
  });
};

export default plugin;
