// auth-service/src/routes/handlers/oauth.ts
import axios from 'axios';
import { sendError } from '@ft-transcendence/common';
import { FastifyRequest, FastifyReply } from 'fastify';
import { getAPISecrets } from '../../utils/vault';
import { randomBytes } from 'crypto';
import { getQuery, runQuery } from '../../utils/database';

let providerSecrets : any[3] = [];

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

	// Identify the provider
	const provider = request.query.provider === '42' ? 0 : request.query.provider === 'GitHub' ? 1 : request.query.provider === 'Google' ? 2 : 3;
	// Check for invalid provider
	if (provider === 3)
		return generateOAuthPopupResponse(reply, 503, { success: false, error: 'Unsupported provider'});

	// Use secrets cache if available
	if (!providerSecrets[provider] || providerSecrets[provider] instanceof Error)
		providerSecrets[provider] = await getAPISecrets(provider);

	// Return error in case of secret retrieval failing
	if (providerSecrets[provider] instanceof Error)
		return generateOAuthPopupResponse(reply, 500, { success: false, error: providerSecrets[provider].message});

	// Create state token to prevent CSRF attacks
	const state = !provider ? '42_' + randomBytes(16).toString('hex') : randomBytes(16).toString('hex');

	// Create the state cookie
	reply.setCookie('oauth_state', state, {
		path: '/',
		secure: true,
		httpOnly: true,
		maxAge: 180
	});

	// Create API Sign In redirect
	const redirectUrl = !provider ? 'https://api.intra.42.fr/oauth/authorize?' : provider === 1 ? 'https://github.com/login/oauth/authorize?' : 'https://accounts.google.com/o/oauth2/v2/auth?';

	return reply.redirect(`${redirectUrl}${new URLSearchParams({
			client_id: providerSecrets[provider].clientID,
			redirect_uri: providerSecrets[provider].clientCallbackURL,
			scope: provider === 1 ? 'user:email' : provider === 2 ? 'openid profile email' : '',
			response_type: 'code',
			state: state
		}).toString()}`);
}

// Still need to test 42 and GitHub.
async function retrieveUserDataFromExternalAuthenticator(providerStore: string, code: string) : Promise<{email: string, name: string, picture: string}> {
	const provider = providerStore === '42' ? 0 : providerStore === 'GitHub' ? 1 : 2;

	if (providerStore === '42') {
		const response = await axios.post('https://api.intra.42.fr/oauth/token', {
			code,
			client_id: providerSecrets[provider].clientID,
			client_secret: providerSecrets[provider].clientSecret,
			redirect_uri: providerSecrets[provider].clientCallbackURL,
			grant_type: 'authorization_code'
		});

		const userInfo = await axios.get('https://api.intra.42.fr/v2/me', { headers: { Authorization: `Bearer ${response?.data}` } });
		return {
			email: userInfo.data.email,
			name: userInfo.data.login || '42 User',
			picture: userInfo.data.image?.link || userInfo.data.image_url
		};

	} else if (providerStore === 'GitHub') {
		const response = await axios.post('https://github.com/login/oauth/access_token', {
			code,
			client_id: providerSecrets[provider].clientID,
			client_secret: providerSecrets[provider].clientSecret,
			redirect_uri: providerSecrets[provider].clientCallbackURL
		}, {
			headers: { Accept: 'application/json' }
		});

		const access_token = response.data.access_token;
		console.log(response.data);
		console.log(access_token);

		const userInfo = await axios.get('https://api.github.com/user', { headers: { Authorization: `token ${access_token}` } });
		// ensure the email is present.
		let email = userInfo.data.email;
		if (!email) {
			const emails = await axios.get('https://api.github.com/user/emails', { headers: { Authorization: `token ${response?.data}` } });
			const primaryEmail = emails.data.find((e: any) => e.primary) || emails.data[0];
			email = primaryEmail?.email;
		}
		return {
			email: email,
			name: userInfo.data.name || userInfo.data.login || 'GitHub User',
			picture: userInfo.data.avatar_url
		};
	}
	else {
		const response = await axios.post('https://oauth2.googleapis.com/token', {
			code,
			client_id: providerSecrets[provider].clientID,
			client_secret: providerSecrets[provider].clientSecret,
			redirect_uri: providerSecrets[provider].clientCallbackURL,
			grant_type: 'authorization_code'
		});

		const userInfo = JSON.parse(Buffer.from(response?.data.id_token.split('.')[1], 'base64').toString());

		return {
			email: userInfo.email,
			name: userInfo.name || userInfo.given_name || 'Google User',
			picture: userInfo.picture
		};
	}
}

export async function oauthCallbackHandler(request: FastifyRequest<{ Querystring: {code: string, state: string, provider: string}}>, reply: FastifyReply) : Promise<void> {
	const { code, state, provider} = request.query;

	const providerStore = !provider && state && state.startsWith('42_') ? '42' : provider === 'GitHub' ? provider : provider === 'Google' ? provider : '';

	if (!code || !state)
		return generateOAuthPopupResponse(reply, 400, { success: false, error: 'Missing code or state'});
	if (providerStore === '')
		return generateOAuthPopupResponse(reply, 503, { success: false, error: 'Unsupported provider'});
	if (request.cookies.oauth_state !== state)
		return generateOAuthPopupResponse(reply, 403, { success: false, error: 'Invalid State'});

	let userData : {email: string, name: string, picture: string} = { email: '', name: '', picture: '' };

	try {
		userData = await retrieveUserDataFromExternalAuthenticator(providerStore, code);
		console.log('Successful data retrieval: ', userData.name);
	} catch (error: any) {
		console.log(`Failed data retrieval: ${error.message}: ${error.data}`);
		return generateOAuthPopupResponse(reply, 500, { success: false, error: 'Error encountered during credential exchange'});
	}

	// This will now register the new user, or log in the old one.
	// Assume the user is an existing user - just signing in using the remote authentication options.
	let user = await getQuery('SELECT * FROM users WHERE email = ?', [userData.email]);
	if (user) {
		if (!user.oauth_provider || user.oauth_provider != providerStore)
			return generateOAuthPopupResponse(reply, 409, { success: false, error: 'Email is already in use'});
		if (userData.picture)
			try {
				const profile = await axios.put(`http://user-service:3000/profile/${user.id}`, { avatarUrl: userData.picture }, { timeout: 5000 });
				if (profile.status === 200)
					console.log('Updated the image of the user');
			} catch (err) {
				console.log('Image update for existing user failed');
			}
		return generateOAuthPopupResponse(reply, 200, {success: true, user: { userId: user.id, username: user.username, email: user.email }});
	} else { // register the new user
		try {
			const store = await getQuery('SELECT * FROM users WHERE username = ?', [userData.name]);
			if (store) {
				console.log('Found duplicate usernames - assigning random username instead.');
				console.log(store);
				userData.name += Math.random().toString();
			}
			await runQuery('INSERT INTO users (username, email, password_hash, oauth_provider) VALUES (?, ?, NULL, ?)', [userData.name, userData.email, providerStore]);
			user = await getQuery('SELECT * FROM users WHERE email = ?', [userData.email]);
			console.log(user ? 'User was created successfully.' : 'User was not created.');
			if (!user)
				throw new Error('User was not created');
		} catch (err: any) {
			console.log('User creation failed.');
			return generateOAuthPopupResponse(reply, 500, {success: false, error: err.message});
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
				bio: `External user connected through ${providerStore}`,
				avatarUrl: userData.picture || null
			}, { timeout: 5000 });
			if (profile.status === 200)
				console.log('User profile ready');
		} catch (err: any) {
			console.log('Something went wrong');
		}
		return generateOAuthPopupResponse(reply, 200, {success: true, user: { userId: user.id, username: user.username, email: user.email }});
	}
}
