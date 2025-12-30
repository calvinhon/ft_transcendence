// auth-service/src/routes/handlers/oauth.ts
console.log('🚀 OAuth module loaded!');
import { FastifyRequest, FastifyReply } from 'fastify';
import axios from 'axios';
import jwt from 'jsonwebtoken';
import { config } from '../../utils/config';
import { getQuery, runQuery } from '../../utils/database';

// Cache for OAuth secrets (avoid repeated Vault calls)
let oauthSecrets: any = null;

/**
 * Load OAuth secrets from Vault
 */
async function loadOAuthSecrets(): Promise<void> {
  if (oauthSecrets) return; // Use cache if available

  try {
    console.log('🔐 Loading OAuth secrets from Vault...');

    const vaultAddr = process.env.VAULT_ADDR || 'http://vault:8200';
    const vaultToken = process.env.VAULT_TOKEN;

    // Load all OAuth provider secrets
    const [school42, google, github] = await Promise.all([
      axios.get(`${vaultAddr}/v1/kv/data/oauth/42school`, { headers: { 'X-Vault-Token': vaultToken } }),
      axios.get(`${vaultAddr}/v1/kv/data/oauth/google`, { headers: { 'X-Vault-Token': vaultToken } }),
      axios.get(`${vaultAddr}/v1/kv/data/oauth/github`, { headers: { 'X-Vault-Token': vaultToken } })
    ]);

    oauthSecrets = {
      school42: {
        client_id: school42.data.data.data.client_id,
        client_secret: school42.data.data.data.client_secret
      },
      google: {
        client_id: google.data.data.data.client_id,
        client_secret: google.data.data.data.client_secret
      },
      github: {
        client_id: github.data.data.data.client_id,
        client_secret: github.data.data.data.client_secret
      }
    };

    console.log('✅ OAuth secrets loaded from Vault');
  } catch (error) {
    console.error('❌ Failed to load OAuth secrets from Vault:', error);
    throw error;
  }
}

/**
 * OAuth callback handler - receives authorization code from OAuth provider
 * Exchanges code for access token and creates/updates user in database
 */
export async function oauthCallbackHandler(
  request: FastifyRequest<{
    Querystring: {
      code: string;
      state: string;
      provider: string;
    };
  }>,
  reply: FastifyReply
): Promise<void> {
  try {
    const { code, state, provider } = request.query;

    // Handle provider detection for 42 School (encoded in state or assume 42 if no provider)
    let actualProvider = provider;
    if (!actualProvider && state && state.startsWith('42_')) {
      actualProvider = '42';
    }
    // If still no provider, assume 42 School (since only 42 uses pure callback URL)
    if (!actualProvider) {
      actualProvider = '42';
    }

    if (!code || !actualProvider) {
      reply.status(400).send({ error: 'Missing code or provider' });
      return;
    }

    let userInfo: any;

    // Handle different OAuth providers
    if (actualProvider === '42') {
      userInfo = await exchange42Code(code);
    } else if (actualProvider === 'google') {
      userInfo = await exchangeGoogleCode(code);
    } else if (actualProvider === 'github') {
      userInfo = await exchangeGithubCode(code);
    } else {
      reply.status(400).send({ error: 'Unsupported provider' });
      return;
    }

    // Get or create user in database
    let user = await getQuery<any>(`SELECT * FROM users WHERE email = ?`, [userInfo.email]);

    if (!user) {
      console.log(`📝 Creating new OAuth user: ${userInfo.email} from ${provider}`);
      
      // Create new OAuth user from OAuth data
      await runQuery(`
        INSERT INTO users (username, email, password_hash, avatar_url, oauth_provider)
        VALUES (?, ?, NULL, ?, ?)
      `, [
        userInfo.name || userInfo.login,
        userInfo.email,
        userInfo.picture || userInfo.avatar_url || null,
        provider
      ]);

      user = await getQuery<any>(`SELECT * FROM users WHERE email = ?`, [userInfo.email]);
      
      if (!user) {
        console.error('❌ Failed to create OAuth user in database');
        reply.status(500).send({ error: 'Failed to create user' });
        return;
      }
      
      console.log(`✅ Created OAuth user: ${user.username} (ID: ${user.id}) from ${provider}`);
      
      // Immediately create user profile in user-service to ensure sync
      try {
        await createUserProfileInUserService(user.id, { ...userInfo, provider });
      } catch (profileError) {
        console.warn(`⚠️ Failed to create user profile in user-service:`, profileError);
        // Don't fail the OAuth flow if profile creation fails
      }
      
    } else {
      console.log(`✅ Existing user found: ${user.username} (ID: ${user.id})`);
      
      // Update avatar if provided and user is OAuth user
      if ((userInfo.picture || userInfo.avatar_url) && user.oauth_provider) {
        await runQuery(`UPDATE users SET avatar_url = ? WHERE id = ?`, [
          userInfo.picture || userInfo.avatar_url,
          user.id
        ]);
        console.log(`✅ Updated avatar for OAuth user: ${user.username}`);
      }
    }

    // Create JWT token with userId field (standard format)
    const token = jwt.sign(
      { userId: user.id, email: user.email, username: user.username },
      config.jwt.secret,
      { expiresIn: '7d' }
    );

    // Set secure HTTP-only cookie
    reply.setCookie('token', token, {
      httpOnly: true,
      secure: true, // Always use secure cookies since we use HTTPS
      sameSite: 'lax',
      path: '/',
      maxAge: 7 * 24 * 60 * 60 // 7 days
    });

    // Return HTML that posts token and user info to opener and closes popup
    const html = `<!DOCTYPE html>
      <html><head><title>OAuth Login Success</title></head><body>
      <script>
        if (window.opener) {
          window.opener.postMessage({
            type: 'OAUTH_SUCCESS',
            token: ${JSON.stringify(token)},
            user: ${JSON.stringify({ id: user.id, username: user.username, email: user.email, provider: actualProvider })}
          }, '*');
          window.close();
        } else {
          document.write('Login successful. You may close this window.');
        }
      </script>
      </body></html>`;
    reply.type('text/html').send(html);
  } catch (err) {
    console.error('❌ OAuth callback error:', err);
    const frontendUrl = process.env.FRONTEND_URL || 'https://localhost';
    reply.redirect(`${frontendUrl}?code=error&message=${encodeURIComponent((err as Error).message)}`);
  }
}

/**
 * Ensure user profile exists in user-service database
 */
async function createUserProfileInUserService(userId: number, userInfo: any): Promise<void> {
  const userServiceUrl = process.env.USER_SERVICE_URL || 'http://user:3000';
  
  try {
    // Try to get existing profile first
    const getResponse = await axios.get(`${userServiceUrl}/api/user/profile/${userId}`, {
      timeout: 5000 // 5 second timeout
    });
    
    if (getResponse.status === 200) {
      console.log(`✅ User profile already exists in user-service for user ${userId}`);
      return;
    }
  } catch (error: any) {
    // Profile doesn't exist (404) or service unavailable - try to create it
    if (error.response?.status !== 404) {
      console.warn(`⚠️ User-service unavailable for profile creation:`, error.message);
      return; // Don't fail OAuth if user-service is down
    }
  }
  
  try {
    // Create profile in user-service
    const createResponse = await axios.put(`${userServiceUrl}/api/user/profile/${userId}`, {
      displayName: userInfo.name || userInfo.login,
      bio: `OAuth user from ${userInfo.provider || 'external provider'}`,
      avatarUrl: userInfo.picture || userInfo.avatar_url
    }, {
      timeout: 5000
    });
    
    if (createResponse.status === 200) {
      console.log(`✅ Created user profile in user-service for OAuth user ${userId}`);
    }
  } catch (error: any) {
    console.warn(`⚠️ Failed to create user profile in user-service:`, error.message);
    // Don't fail the OAuth flow if profile creation fails
  }
}

/**
 * Exchange 42 School authorization code for access token and user info
 */
async function exchange42Code(code: string): Promise<any> {
  try {
    // Load secrets from Vault if not cached
    await loadOAuthSecrets();

    // Always use the pure callback URL for 42 School (no query params)
    const callbackUrl = 'https://localhost/api/auth/oauth/callback';
    console.log(`🔄 Exchanging 42 code for token, callback URL: ${callbackUrl}`);
    
    const response = await axios.post('https://api.intra.42.fr/oauth/token', {
      code,
      client_id: oauthSecrets.school42.client_id,        // 🔐 FROM VAULT
      client_secret: oauthSecrets.school42.client_secret, // 🔐 FROM VAULT
      redirect_uri: callbackUrl,
      grant_type: 'authorization_code'
    });

    const { access_token } = response.data;
    console.log(`✅ Got 42 access token`);

    // Get user info from 42 API
    const userResponse = await axios.get('https://api.intra.42.fr/v2/me', {
      headers: { Authorization: `Bearer ${access_token}` }
    });

    // Transform 42 API response to match our format
    const user42 = userResponse.data;
    console.log(`✅ Got 42 user info: ${user42.login} (${user42.email})`);
    
    return {
      email: user42.email,
      name: user42.login,
      login: user42.login,
      picture: user42.image?.link || user42.image_url,
      id: user42.id
    };
  } catch (error: any) {
    console.error('❌ 42 OAuth exchange error:', error.response?.data || error.message);
    throw error;
  }
}

/**
 * Exchange Google authorization code for access token and user info
 */
async function exchangeGoogleCode(code: string): Promise<any> {
  console.log('🔄 Exchanging Google authorization code...');

  // Load secrets from Vault if not cached
  await loadOAuthSecrets();

  const callbackUrl = `${process.env.GOOGLE_CALLBACK_URL || 'https://localhost/api/auth/oauth/callback'}?provider=google`;
  const response = await axios.post('https://oauth2.googleapis.com/token', {
    code,
    client_id: oauthSecrets.google.client_id,        // 🔐 FROM VAULT
    client_secret: oauthSecrets.google.client_secret, // 🔐 FROM VAULT
    redirect_uri: callbackUrl,
    grant_type: 'authorization_code'
  });

  const { access_token } = response.data;
  console.log('✅ Got Google access token');

  // Get user info from Google
  const userResponse = await axios.get('https://www.googleapis.com/oauth2/v2/userinfo', {
    headers: { Authorization: `Bearer ${access_token}` }
  });

  const userData = userResponse.data;
  console.log('✅ Got Google user info:', { email: userData.email, name: userData.name });

  // Normalize response
  return {
    email: userData.email,
    name: userData.name || userData.given_name || 'Google User',
    picture: userData.picture,
    id: userData.id
  };
}

/**
 * Exchange GitHub authorization code for access token and user info
 */
async function exchangeGithubCode(code: string): Promise<any> {
  console.log('🔄 Exchanging GitHub authorization code...');

  // Load secrets from Vault if not cached
  await loadOAuthSecrets();

  const callbackUrl = `${process.env.GITHUB_CALLBACK_URL || 'https://localhost/api/auth/oauth/callback'}?provider=github`;
  const response = await axios.post('https://github.com/login/oauth/access_token', {
    code,
    client_id: oauthSecrets.github.client_id,        // 🔐 FROM VAULT
    client_secret: oauthSecrets.github.client_secret, // 🔐 FROM VAULT
    redirect_uri: callbackUrl
  }, {
    headers: { Accept: 'application/json' }
  });

  const { access_token } = response.data;
  console.log('✅ Got GitHub access token');

  // Get user info from GitHub
  const userResponse = await axios.get('https://api.github.com/user', {
    headers: { Authorization: `Bearer ${access_token}` }
  });

  const userData = userResponse.data;
  console.log('✅ Got GitHub user info:', { login: userData.login, name: userData.name });

  // Get email from separate endpoint if not public
  let email = userData.email;
  if (!email) {
    console.log('🔍 Email not in profile, fetching from emails endpoint...');
    const emailResponse = await axios.get('https://api.github.com/user/emails', {
      headers: { Authorization: `Bearer ${access_token}` }
    });
    const emails = emailResponse.data;
    const primaryEmail = emails.find((e: any) => e.primary) || emails[0];
    email = primaryEmail?.email;
    console.log('✅ Got GitHub email:', email);
  }

  // Normalize response
  return {
    email: email,
    name: userData.name || userData.login || 'GitHub User',
    picture: userData.avatar_url,
    id: userData.id
  };
}

/**
 * OAuth initiation endpoint - generates state and redirects to provider
 */
export async function oauthInitHandler(
  request: FastifyRequest<{
    Querystring: {
      provider?: '42' | 'google' | 'github';
    };
  }>,
  reply: FastifyReply
): Promise<void> {
  console.log('🎯 oauthInitHandler called!');
  try {
    const { provider = '42' } = request.query; // Default to '42' if no provider specified
    console.log(`🔍 OAuth init called with provider: "${provider}"`);

    if (!['42', 'google', 'github'].includes(provider)) {
      console.log(`❌ Invalid provider: "${provider}"`);
      reply.status(400).send({ error: 'Invalid provider' });
      return;
    }

    // Load OAuth secrets from Vault if not cached
    await loadOAuthSecrets();

    // Generate state for CSRF protection (include provider for 42 School)
    const state = provider === '42' ? `42_${Math.random().toString(36).substring(7)}` : Math.random().toString(36).substring(7);

    let authUrl: string;

    if (provider === '42') {
      // Always use the pure callback URL for 42 School (no query params)
      const callbackUrl = 'https://localhost/api/auth/oauth/callback';
      console.log(`🔄 42 School OAuth init - callbackUrl: ${callbackUrl}`);
      authUrl = `https://api.intra.42.fr/oauth/authorize?${new URLSearchParams({
        client_id: oauthSecrets.school42.client_id,        // 🔐 FROM VAULT
        redirect_uri: callbackUrl,
        response_type: 'code',
        state
      }).toString()}`;
      console.log(`🔄 42 School OAuth URL: ${authUrl}`);
    } else if (provider === 'google') {
      const callbackUrl = `${process.env.GOOGLE_CALLBACK_URL || 'https://localhost/api/auth/oauth/callback'}?provider=google`;
      authUrl = `https://accounts.google.com/o/oauth2/v2/auth?${new URLSearchParams({
        client_id: oauthSecrets.google.client_id,          // 🔐 FROM VAULT
        redirect_uri: callbackUrl,
        response_type: 'code',
        scope: 'openid profile email',
        state
      }).toString()}`;
    } else if (provider === 'github') {
      const callbackUrl = `${process.env.GITHUB_CALLBACK_URL || 'https://localhost/api/auth/oauth/callback'}?provider=github`;
      authUrl = `https://github.com/login/oauth/authorize?${new URLSearchParams({
        client_id: oauthSecrets.github.client_id,          // 🔐 FROM VAULT
        redirect_uri: callbackUrl,
        scope: 'user:email',
        state
      }).toString()}`;
    } else {
      reply.status(400).send({ error: 'Unsupported provider' });
      return;
    }

    reply.redirect(authUrl);
  } catch (err) {
    console.error('OAuth init error:', err);
    reply.status(500).send({ error: 'OAuth initialization failed' });
  }
}
