import { FastifyPluginAsync } from 'fastify';
import { BlockchainService } from '../services/blockchainService.js';
import { sendError } from '@ft-transcendence/common';
import axios from 'axios';

let serverSecret: string | null = null;

async function getServerSecret(): Promise<string | null> {
	if (serverSecret) return serverSecret;
	try {
		const vaultAddr = process.env.VAULT_ADDR;
		const vaultToken = process.env.VAULT_TOKEN;
		if (!vaultAddr || !vaultToken) return null;

		const vaultResponse = await axios.get(`${vaultAddr}/v1/kv/data/Server_Session`, {
			headers: { 'X-Vault-Token': vaultToken }
		});
		const secret = vaultResponse?.data?.data?.data?.Secret ?? null;
		if (!secret) return null;
		serverSecret = secret;
		return serverSecret;
	} catch {
		return null;
	}
}

async function isAuthorized(request: any): Promise<boolean> {
	if (request.session && request.session.userId) return true;
	const headerSecret = request.headers?.['x-microservice-secret'];
	if (typeof headerSecret !== 'string' || !headerSecret) return false;
	const expected = await getServerSecret();
	return !!expected && headerSecret === expected;
}

const plugin: FastifyPluginAsync<{ blockchainService: BlockchainService }> = async (fastify, opts) => {
  const svc = (opts as any).blockchainService as BlockchainService;

  fastify.post('/record', async (request, reply) => {
	if (!(await isAuthorized(request))) return sendError(reply, 'Unauthorized', 401);
	try {
		const { tournamentId, players, ranks } = request.body as any;
		if (!Number.isInteger(tournamentId) || !Array.isArray(players) || !Array.isArray(ranks) || players.length !== ranks.length) {
			return reply.status(400).send({ ok: false, error: 'Invalid payload' });
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
