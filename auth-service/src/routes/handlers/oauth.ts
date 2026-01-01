// auth-service/src/routes/handlers/oauth.ts
import axios from 'axios';
import { FastifyRequest, FastifyReply } from 'fastify';
import { randomBytes } from 'crypto';
import { getQuery, runQuery } from '../../utils/database';

let googleSecrets: any = null;
// Hoach edited - Add secret caching for 42 School and GitHub OAuth
let fortyTwoSecrets: any = null;
let githubSecrets: any = null;
// Hoach edit ended

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
	// Hoach edited - Support multiple OAuth providers
	const { provider } = request.query;
	const supportedProviders = ['Google', '42', 'GitHub'];
	if (!supportedProviders.includes(provider))
		return generateOAuthPopupResponse(reply, 503, { success: false, error: 'Unsupported provider' });

	// Get secrets for the requested provider
	let secrets: any = null;
	let vaultPath: string = '';
	
	if (provider === 'Google') {
		if (!googleSecrets) {
			try {
				const vaultResponse = await axios.get(`${process.env.VAULT_ADDR}/v1/kv/data/Google_API`, { headers: { 'X-Vault-Token': process.env.VAULT_TOKEN } });
				const data = vaultResponse.data.data.data;
				if (!data || !data.Client_ID || !data.Client_Secret || !data.Callback_URL)
					throw new Error('Vault response missing Google secrets');
				googleSecrets = { clientID: data.Client_ID as string, clientSecret: data.Client_Secret as string, clientCallbackURL: data.Callback_URL as string };
			} catch (err: any) {
				return generateOAuthPopupResponse(reply, 500, { success: false, error: err.message });
			}
		}
		secrets = googleSecrets;
		vaultPath = 'Google_API';
	} else if (provider === '42') {
		if (!fortyTwoSecrets) {
			try {
				const vaultResponse = await axios.get(`${process.env.VAULT_ADDR}/v1/kv/data/42_API`, { headers: { 'X-Vault-Token': process.env.VAULT_TOKEN } });
				const data = vaultResponse.data.data.data;
				if (!data || !data.UID || !data.SECRET || !data.CALLBACK_URL)
					throw new Error('Vault response missing 42 secrets');
				fortyTwoSecrets = { clientID: data.UID as string, clientSecret: data.SECRET as string, clientCallbackURL: data.CALLBACK_URL as string };
			} catch (err: any) {
				return generateOAuthPopupResponse(reply, 500, { success: false, error: err.message });
			}
		}
		secrets = fortyTwoSecrets;
		vaultPath = '42_API';
	} else if (provider === 'GitHub') {
		if (!githubSecrets) {
			try {
				const vaultResponse = await axios.get(`${process.env.VAULT_ADDR}/v1/kv/data/GitHub_API`, { headers: { 'X-Vault-Token': process.env.VAULT_TOKEN } });
				const data = vaultResponse.data.data.data;
				if (!data || !data.Client_ID || !data.Client_Secret || !data.Callback_URL)
					throw new Error('Vault response missing GitHub secrets');
				githubSecrets = { clientID: data.Client_ID as string, clientSecret: data.Client_Secret as string, clientCallbackURL: data.Callback_URL as string };
			} catch (err: any) {
				return generateOAuthPopupResponse(reply, 500, { success: false, error: err.message });
			}
		}
		secrets = githubSecrets;
		vaultPath = 'GitHub_API';
	}
	// Hoach edit ended

	// Create state token to prevent CSRF attacks
	const randomState = randomBytes(16).toString('hex');
	const state = `${provider}:${randomState}`;

	// Create the state cookie
	reply.setCookie('oauth_state', state, {
		path: '/',
		secure: true,
		httpOnly: true,
		maxAge: 180
	});

	// Hoach edited - Generate OAuth URL based on provider
	let authUrl: string;
	if (provider === 'Google') {
		authUrl = `https://accounts.google.com/o/oauth2/v2/auth?${new URLSearchParams({
			client_id: secrets.clientID,
			redirect_uri: secrets.clientCallbackURL,
			scope: 'openid profile email',
			response_type: 'code',
			state: state
		}).toString()}`;
	} else if (provider === '42') {
		authUrl = `https://api.intra.42.fr/oauth/authorize?${new URLSearchParams({
			client_id: secrets.clientID,
			redirect_uri: secrets.clientCallbackURL,
			scope: 'public',
			response_type: 'code',
			state: state
		}).toString()}`;
	} else if (provider === 'GitHub') {
		authUrl = `https://github.com/login/oauth/authorize?${new URLSearchParams({
			client_id: secrets.clientID,
			redirect_uri: secrets.clientCallbackURL,
			scope: 'user:email',
			response_type: 'code',
			state: state
		}).toString()}`;
	} else {
		return generateOAuthPopupResponse(reply, 503, { success: false, error: 'Unsupported provider' });
	}
	// Hoach edit ended

	return reply.redirect(authUrl);
}

export async function oauthCallbackHandler(request: FastifyRequest<{ Querystring: { code: string, state: string } }>, reply: FastifyReply): Promise<void> {
	const { code, state: fullState } = request.query;

	if (!code || !fullState)
		return generateOAuthPopupResponse(reply, 400, { success: false, error: 'Missing code or state' });

	// Parse provider from state (format: "provider:randomState")
	const [provider, randomState] = fullState.split(':');
	if (!provider || !randomState)
		return generateOAuthPopupResponse(reply, 400, { success: false, error: 'Invalid state format' });

	// Hoach edited - Support multiple OAuth providers
	const supportedProviders = ['Google', '42', 'GitHub'];
	if (!supportedProviders.includes(provider))
		return generateOAuthPopupResponse(reply, 503, { success: false, error: 'Unsupported provider' });
	// Hoach edit ended
	if (request.cookies.oauth_state !== fullState)
		return generateOAuthPopupResponse(reply, 403, { success: false, error: 'Invalid State' });

	let userData: { email: string, name: string, picture: string } = { email: '', name: '', picture: '' };

	// Hoach edited - Get secrets for the provider
	let secrets: any = null;
	if (provider === 'Google') {
		secrets = googleSecrets;
	} else if (provider === '42') {
		secrets = fortyTwoSecrets;
	} else if (provider === 'GitHub') {
		secrets = githubSecrets;
	}
	// Hoach edit ended

	try {
		// Hoach edited - Handle token exchange and user data retrieval for different providers
		if (provider === 'Google') {
			const response = await axios.post('https://oauth2.googleapis.com/token', {
				code,
				client_id: secrets.clientID,
				client_secret: secrets.clientSecret,
				redirect_uri: secrets.clientCallbackURL,
				grant_type: 'authorization_code'
			});

			const userInfo = JSON.parse(Buffer.from(response?.data.id_token.split('.')[1], 'base64').toString());

			userData = {
				email: userInfo.email,
				name: userInfo.name || userInfo.given_name || 'Google User',
				picture: userInfo.picture
			};
		} else if (provider === '42') {
			const response = await axios.post('https://api.intra.42.fr/oauth/token', {
				grant_type: 'authorization_code',
				client_id: secrets.clientID,
				client_secret: secrets.clientSecret,
				code: code,
				redirect_uri: secrets.clientCallbackURL
			});

			const userResponse = await axios.get('https://api.intra.42.fr/v2/me', {
				headers: { 'Authorization': `Bearer ${response.data.access_token}` }
			});

			userData = {
				email: userResponse.data.email,
				name: userResponse.data.displayname || userResponse.data.login || '42 User',
				picture: userResponse.data.image?.link || ''
			};
		} else if (provider === 'GitHub') {
			const response = await axios.post('https://github.com/login/oauth/access_token', {
				client_id: secrets.clientID,
				client_secret: secrets.clientSecret,
				code: code,
				redirect_uri: secrets.clientCallbackURL
			}, {
				headers: { 'Accept': 'application/json' }
			});

			const userResponse = await axios.get('https://api.github.com/user', {
				headers: { 'Authorization': `Bearer ${response.data.access_token}` }
			});

			// Get user email if not public
			let email = userResponse.data.email;
			if (!email) {
				const emailsResponse = await axios.get('https://api.github.com/user/emails', {
					headers: { 'Authorization': `Bearer ${response.data.access_token}` }
				});
				const primaryEmail = emailsResponse.data.find((e: any) => e.primary);
				email = primaryEmail ? primaryEmail.email : userResponse.data.login + '@github.com';
			}

			userData = {
				email: email,
				name: userResponse.data.name || userResponse.data.login || 'GitHub User',
				picture: userResponse.data.avatar_url || ''
			};
		}
		// Hoach edit ended
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
		try {
			const response = await axios.get(`http://user-service:3000/profile/${user.id}`, { timeout: 5000 });
			if (!response.data.is_custom_avatar && userData.picture) {
				const profile = await axios.put(`http://user-service:3000/profile/${user.id}`, { avatarUrl: userData.picture, is_custom_avatar: 0 }, { timeout: 5000 });
				if (profile.status === 200)
					console.log('Updated the image of the user');
			}
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
			//Hoach edited - Use dynamic provider instead of hardcoded Google
			await runQuery('INSERT INTO users (username, email, password_hash, oauth_provider) VALUES (?, ?, NULL, ?)', [userData.name, userData.email, provider]);
			//Hoach edit ended
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
				// Hoach edited - Use dynamic provider name in bio
				bio: `External user connected through ${provider}`,
				// Hoach edit ended
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
