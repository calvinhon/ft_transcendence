import { FastifyPluginAsync } from 'fastify';
import { BlockchainService } from '../services/blockchainService.js';

const plugin: FastifyPluginAsync<{ blockchainService: BlockchainService }> = async (fastify, opts) => {
  const svc = (opts as any).blockchainService as BlockchainService;

  fastify.post('/record', async (request, reply) => {
    try {
      const body = request.body as { tournamentId?: number | string; userId?: number | string; rank?: number | string };
      if (body.tournamentId == null || body.userId == null || body.rank == null) {
        return reply.status(400).send({ ok: false, error: 'tournamentId, userId, rank are required' });
      }

      const txHash = await svc.recordRank(body.tournamentId, body.userId, body.rank);
      return reply.send({ ok: true, txHash });
    } catch (e: any) {
      fastify.log.error({ err: e }, '[blockchain-service] /record error');
      return reply.status(500).send({ ok: false, error: e.message });
    }
  });
};

export default plugin;
