import { FastifyPluginAsync } from 'fastify';
import { BlockchainService } from '../services/blockchainService.js';
import { sendError } from '@ft-transcendence/common';
import axios from 'axios';

const plugin: FastifyPluginAsync<{ blockchainService: BlockchainService }> = async (fastify, opts) => {
  const svc = (opts as any).blockchainService as BlockchainService;

	let serverSecret: string | null = null;
	try {
		const response = await axios.get(`${process.env.VAULT_ADDR}/v1/kv/data/Server_Session`, {
			headers: { 'X-Vault-Token': process.env.VAULT_TOKEN }
		});
		serverSecret = response?.data?.data?.data?.Secret ?? null;
		if (!serverSecret) {
			fastify.log.error('[blockchain-service] Vault Server_Session secret missing');
		}
	} catch (err: any) {
		fastify.log.error({ err }, '[blockchain-service] Failed to retrieve Server_Session secret from Vault');
	}

  fastify.post('/record', async (request, reply) => {
	const serverCheck = request.headers['x-microservice-secret'];
	if (!serverSecret) return sendError(reply, 'Service unavailable', 503);
	if (serverCheck !== serverSecret) return sendError(reply, 'Unauthorized', 401);
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
