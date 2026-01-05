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

	let response = null;
	let retries = 5;
	while (retries > 0) {
		try {
			response = await axios.get(`${process.env.VAULT_ADDR}/v1/kv/data/Client_Session`, {
				headers: { 'X-Vault-Token': process.env.VAULT_TOKEN }
			});
			console.log("Successfully retrieved secret key for signing session tokens.");
			break;
		} catch (err: any) {
			console.log(`Error encounter while attempting to retrieve session secret (Retries left: ${retries}): `, err.message);
			retries--;
			if (retries === 0) {
				console.log("Failed to retrieve session secret after multiple attempts.");
				process.exit(1);
			}
			await new Promise(resolve => setTimeout(resolve, 2000));
		}
	}
	const secretKey = response?.data.data.data.Secret;

	await fastify.register(fastifyCookie);
	await fastify.register(fastifySession, {
		secret: secretKey,
		cookie: {
			path: '/',
			httpOnly: true,
			secure: true,
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
