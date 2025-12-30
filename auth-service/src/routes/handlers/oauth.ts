// auth-service/src/routes/handlers/oauth.ts
import axios from 'axios';
import { FastifyRequest, FastifyReply } from 'fastify';
import { randomBytes } from 'crypto';
import { getQuery, runQuery } from '../../utils/database';

let googleSecrets: any = null;

function generateOAuthPopupResponse(reply: FastifyReply, status: number, data: { success: boolean, user?: any, error?: string }): void {
	const messageData = data.success
		? { type: 'OAUTH_SUCCESS', payload: data }
		: { type: 'OAUTH_ERROR', error: data.error };

	const jsonMessage = JSON.stringify(messageData);

	reply.status(status).type('text/html').send(`
	<!DOCTYPE html>
	<html lang="en">
	<head><title>Auth</title></head>
	<body>
		<script>
			if (window.opener) {
				window.opener.postMessage(${jsonMessage}, window.location.origin);
				window.close();
			} else {
				document.body.innerHTML = '${data.success ? "Success" : "Error: " + (data.error || "Unknown")}';
			}
		</script>
	</body>
	</html>`);
}

export async function oauthInitHandler(request: FastifyRequest<{ Querystring: { provider: string } }>, reply: FastifyReply): Promise<void> {
	// Check for invalid provider
	if (request.query.provider !== 'Google')
		return generateOAuthPopupResponse(reply, 503, { success: false, error: 'Unsupported provider' });

	// Use secrets cache if available (check clientID to determine if populated)
	if (!googleSecrets.clientID) {
		try {
			const vaultResponse = await axios.get(`${process.env.VAULT_ADDR}/v1/kv/data/Google_API`, { headers: { 'X-Vault-Token': process.env.VAULT_TOKEN } });
			const secrets = vaultResponse.data.data.data;
			if (!secrets || !secrets.Client_ID || !secrets.Client_Secret || !secrets.clientCallbackURL)
				throw new Error('Vault response missing secrets');
			googleSecrets = { clientID: secrets.Client_ID as string, clientSecret: secrets.Client_Secret as string, clientCallbackURL: secrets.Callback_URL as string };
		} catch (err: any) {
			return generateOAuthPopupResponse(reply, 500, { success: false, error: err.message });
		}
	}

	// Create state token to prevent CSRF attacks
	const state = randomBytes(16).toString('hex');

	// Create the state cookie
	reply.setCookie('oauth_state', state, {
		path: '/',
		secure: true,
		httpOnly: true,
		maxAge: 180
	});

	// Create API Sign In redirect
	return reply.redirect(`https://accounts.google.com/o/oauth2/v2/auth?${new URLSearchParams({
		client_id: googleSecrets.clientID,
		redirect_uri: googleSecrets.clientCallbackURL,
		scope: 'openid profile email',
		response_type: 'code',
		state: state
	}).toString()}`);
}

export async function oauthCallbackHandler(request: FastifyRequest<{ Querystring: { code: string, state: string, provider: string } }>, reply: FastifyReply): Promise<void> {
	const { code, state, provider } = request.query;

	if (!code || !state)
		return generateOAuthPopupResponse(reply, 400, { success: false, error: 'Missing code or state' });
	if (provider !== 'Google')
		return generateOAuthPopupResponse(reply, 503, { success: false, error: 'Unsupported provider' });
	if (request.cookies.oauth_state !== state)
		return generateOAuthPopupResponse(reply, 403, { success: false, error: 'Invalid State' });

	let userData: { email: string, name: string, picture: string } = { email: '', name: '', picture: '' };

	try {
		const response = await axios.post('https://oauth2.googleapis.com/token', {
			code,
			client_id: googleSecrets.clientID,
			client_secret: googleSecrets.clientSecret,
			redirect_uri: googleSecrets.clientCallbackURL,
			grant_type: 'authorization_code'
		});

		const userInfo = JSON.parse(Buffer.from(response?.data.id_token.split('.')[1], 'base64').toString());

		userData = {
			email: userInfo.email,
			name: userInfo.name || userInfo.given_name || 'Google User',
			picture: userInfo.picture
		};
	} catch (error: any) {
		console.log(`Failed data retrieval: ${error.message}: ${error.data}`);
		return generateOAuthPopupResponse(reply, 500, { success: false, error: 'Error encountered during credential exchange' });
	}

	// This will now register the new user, or log in the old one.
	// Assume the user is an existing user - just signing in using the remote authentication options.
	let user = await getQuery('SELECT * FROM users WHERE email = ?', [userData.email]);
	if (user) {
		if (!user.oauth_provider)
			return generateOAuthPopupResponse(reply, 409, { success: false, error: 'Email is already in use' });
		if (userData.picture)
			try {
				const profile = await axios.put(`http://user-service:3000/profile/${user.id}`, { avatarUrl: userData.picture }, { timeout: 5000 });
				if (profile.status === 200)
					console.log('Updated the image of the user');
			} catch (err) {
				console.log('Image update for existing user failed');
			}
		return generateOAuthPopupResponse(reply, 200, { success: true, user: { userId: user.id, username: user.username, email: user.email } });
	} else { // register the new user
		try {
			const store = await getQuery('SELECT * FROM users WHERE username = ?', [userData.name]);
			if (store) {
				console.log('Found duplicate usernames - assigning random username instead.');
				console.log(store);
				userData.name += Math.random().toString();
			}
			await runQuery('INSERT INTO users (username, email, password_hash, oauth_provider) VALUES (?, ?, NULL, Google)', [userData.name, userData.email]);
			user = await getQuery('SELECT * FROM users WHERE email = ?', [userData.email]);
			console.log(user ? 'User was created successfully.' : 'User was not created.');
			if (!user)
				throw new Error('User was not created');
		} catch (err: any) {
			console.log('User creation failed.');
			return generateOAuthPopupResponse(reply, 500, { success: false, error: err.message });
		}
		try {
			// Add a profile for the user in the user database.
			console.log('Attempting to create a user profile for the new user');
			let profile = await axios.get(`http://user-service:3000/profile/${user.id}`, { timeout: 5000 });
			console.log(profile);
			if (profile.status === 200)
				console.log('User profile ready for update');

			console.log('Attempting to update the user profile for the new user');
			profile = await axios.put(`http://user-service:3000/profile/${user.id}`, {
				displayName: userData.name,
				bio: 'External user connected through Google',
				avatarUrl: userData.picture || null
			}, { timeout: 5000 });
			if (profile.status === 200)
				console.log('User profile ready');
		} catch (err: any) {
			console.log('Something went wrong');
		}
		return generateOAuthPopupResponse(reply, 200, { success: true, user: { userId: user.id, username: user.username, email: user.email } });
	}
}
