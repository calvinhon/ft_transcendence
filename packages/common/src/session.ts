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
	try {
		response = await axios.get(`${process.env.VAULT_ADDR}/v1/kv/data/Client_Session`, { headers: { 'X-Vault-Token': process.env.VAULT_TOKEN } });
		console.log("Successfully retrieved secret key for signing session tokens.");
	} catch (err: any) {
		console.log("Error encounter while attempting to retrieve session secret: ", err.message);
		process.exit(1);
	}
	const secretKey = response?.data.data.data.Secret;

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
