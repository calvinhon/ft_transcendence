import { FastifyPluginAsync } from 'fastify';
import { BlockchainService } from '../services/blockchainService.js';
import { requireJWTAuth } from '@ft-transcendence/common';

const plugin: FastifyPluginAsync<{ blockchainService: BlockchainService }> = async (fastify, opts) => {
  const svc = (opts as any).blockchainService as BlockchainService;

  fastify.post('/record', {
    preHandler: requireJWTAuth //Hoach edited: Added JWT authentication to protect blockchain record routes
  }, async (request, reply) => {
	try {
		const { tournamentId, players, ranks } = request.body as any;
		if (!Number.isInteger(tournamentId) || !Array.isArray(players) || !Array.isArray(ranks) || players.length !== ranks.length) {
		return reply.status(400).send({ ok:false, error: 'Invalid payload' });
	}

	const txHash = await svc.recordRanks(Number(tournamentId), players.map(Number), ranks.map(Number));
	return reply.send({ ok: true, txHash });
    } catch (e: any) {
		fastify.log.error({ err: e }, '[blockchain-service] /record error');
		return reply.status(500).send({ ok: false, error: e?.message ?? String(e) });
	}
	});
};

export default plugin;
