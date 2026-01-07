import fp from 'fastify-plugin';
import fastifyCookie from '@fastify/cookie';
import fastifySession from '@fastify/session';
import RedisStore from 'connect-redis';
import Redis from 'ioredis';
import axios from 'axios';

declare module 'fastify' {
	interface Session {
		userId: number,
		authenticated: boolean;
	}
}

export const sessionSecret = fp(async (fastify) => {
	const redisClient = new Redis({ host: 'redis', port: 6379 });
	redisClient.on('error', (err) => { console.log('Redis Client Error: ', err); })

	const vaultAddr = process.env.VAULT_ADDR;
	const vaultToken = process.env.VAULT_TOKEN;

	if (!vaultAddr || !vaultToken) {
		console.log('Missing VAULT_ADDR or VAULT_TOKEN; cannot initialize session secret.');
		process.exit(1);
	}

	const fetchSecretWithRetry = async (): Promise<string> => {
		const url = `${vaultAddr}/v1/kv/data/Client_Session`;
		const start = Date.now();
		const timeoutMs = Number(process.env.VAULT_STARTUP_TIMEOUT_MS ?? 60_000);
		let attempt = 0;
		let delayMs = 500;

		while (true) {
			attempt++;
			try {
				const response = await axios.get(url, { headers: { 'X-Vault-Token': vaultToken } });
				const secretKey = response?.data?.data?.data?.Secret;
				if (!secretKey) throw new Error('Vault response missing Client_Session Secret');
				console.log('Successfully retrieved secret key for signing session tokens.');
				return secretKey;
			} catch (err: any) {
				const elapsed = Date.now() - start;
				const status = err?.response?.status;
				const message = err?.message ?? String(err);

				if (elapsed >= timeoutMs) {
					console.log(`Error encounter while attempting to retrieve session secret after ${attempt} attempts: ${message}`);
					throw err;
				}

				// Common transient startup failures: Vault not ready (503), sealed, or networking race.
				// Keep retrying up to timeout.
				console.log(`Vault not ready for Client_Session (attempt ${attempt}${status ? `, status ${status}` : ''}): ${message}. Retrying in ${delayMs}ms...`);
				await new Promise((r) => setTimeout(r, delayMs));
				delayMs = Math.min(delayMs * 2, 5000);
			}
		}
	};

	let secretKey: string;
	try {
		secretKey = await fetchSecretWithRetry();
	} catch {
		process.exit(1);
		return;
	}

	await fastify.register(fastifyCookie);
	await fastify.register(fastifySession, {
		secret: secretKey,
		cookie: {
			path: '/',
			httpOnly: true,
			secure: process.env.NODE_ENV === 'production', // Only secure in production
			maxAge: 3600000,
			sameSite: 'lax'
		},
		store: new RedisStore({
			client: redisClient,
			prefix: 'session: '
		}) as any,
		saveUninitialized: false
	});
})
