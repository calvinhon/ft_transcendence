// auth-service/src/routes/handlers/oauth.ts
import { FastifyRequest, FastifyReply } from 'fastify';
import axios from 'axios';
import jwt from 'jsonwebtoken';
import { config } from '../../utils/config';
import { getQuery, runQuery } from '../../utils/database';

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

    if (!code || !provider) {
      reply.status(400).send({ error: 'Missing code or provider' });
      return;
    }

    let userInfo: any;

    // Handle different OAuth providers
    if (provider === '42') {
      userInfo = await exchange42Code(code);
    } else if (provider === 'google') {
      userInfo = await exchangeGoogleCode(code);
    } else if (provider === 'github') {
      userInfo = await exchangeGithubCode(code);
    } else {
      reply.status(400).send({ error: 'Unsupported provider' });
      return;
    }

    // Get or create user in database
    let user = await getQuery<any>(`SELECT * FROM users WHERE email = ?`, [userInfo.email]);

    if (!user) {
      // Create new user from OAuth data
      await runQuery(`
        INSERT INTO users (username, email, password_hash, avatar_url)
        VALUES (?, ?, ?, ?)
      `, [
        userInfo.name || userInfo.login,
        userInfo.email,
        'oauth_' + provider, // Mark as OAuth user
        userInfo.picture || userInfo.avatar_url || null
      ]);

      user = await getQuery<any>(`SELECT * FROM users WHERE email = ?`, [userInfo.email]);
    } else {
      // Update avatar if provided
      if (userInfo.picture || userInfo.avatar_url) {
        await runQuery(`UPDATE users SET avatar_url = ? WHERE id = ?`, [
          userInfo.picture || userInfo.avatar_url,
          user.id
        ]);
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
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 7 * 24 * 60 * 60 // 7 days
    });

    // Redirect to frontend with success parameters
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost';
    console.log(`✅ OAuth success for provider ${provider}, user: ${user.username}, redirecting to: ${frontendUrl}?code=success&provider=${provider}`);
    reply.redirect(`${frontendUrl}?code=success&provider=${provider}`);
  } catch (err) {
    console.error('❌ OAuth callback error:', err);
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost';
    reply.redirect(`${frontendUrl}?code=error&message=${encodeURIComponent((err as Error).message)}`);
  }
}

/**
 * Exchange 42 School authorization code for access token and user info
 */
async function exchange42Code(code: string): Promise<any> {
  try {
    const callbackUrl = `${process.env.SCHOOL42_CALLBACK_URL || 'http://localhost/api/auth/oauth/callback'}?provider=42`;
    console.log(`🔄 Exchanging 42 code for token, callback URL: ${callbackUrl}`);
    
    const response = await axios.post('https://api.intra.42.fr/oauth/token', {
      code,
      client_id: process.env.SCHOOL42_CLIENT_ID,
      client_secret: process.env.SCHOOL42_CLIENT_SECRET,
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
  const callbackUrl = `${process.env.GOOGLE_CALLBACK_URL || 'http://localhost/api/auth/oauth/callback'}?provider=google`;
  const response = await axios.post('https://oauth2.googleapis.com/token', {
    code,
    client_id: process.env.GOOGLE_CLIENT_ID,
    client_secret: process.env.GOOGLE_CLIENT_SECRET,
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
  const callbackUrl = `${process.env.GITHUB_CALLBACK_URL || 'http://localhost/api/auth/oauth/callback'}?provider=github`;
  const response = await axios.post('https://github.com/login/oauth/access_token', {
    code,
    client_id: process.env.GITHUB_CLIENT_ID,
    client_secret: process.env.GITHUB_CLIENT_SECRET,
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
      provider: '42' | 'google' | 'github';
    };
  }>,
  reply: FastifyReply
): Promise<void> {
  try {
    const { provider } = request.query;

    if (!provider || !['42', 'google', 'github'].includes(provider)) {
      reply.status(400).send({ error: 'Invalid provider' });
      return;
    }

    // Generate state for CSRF protection
    const state = Math.random().toString(36).substring(7);

    let authUrl: string;

    if (provider === '42') {
      const callbackUrl = `${process.env.SCHOOL42_CALLBACK_URL || 'http://localhost/api/auth/oauth/callback'}?provider=42`;
      authUrl = `https://api.intra.42.fr/oauth/authorize?${new URLSearchParams({
        client_id: process.env.SCHOOL42_CLIENT_ID || '',
        redirect_uri: callbackUrl,
        response_type: 'code',
        scope: 'public',
        state
      }).toString()}`;
    } else if (provider === 'google') {
      const callbackUrl = `${process.env.GOOGLE_CALLBACK_URL || 'http://localhost/api/auth/oauth/callback'}?provider=google`;
      authUrl = `https://accounts.google.com/o/oauth2/v2/auth?${new URLSearchParams({
        client_id: process.env.GOOGLE_CLIENT_ID || '',
        redirect_uri: callbackUrl,
        response_type: 'code',
        scope: 'openid profile email',
        state
      }).toString()}`;
    } else if (provider === 'github') {
      const callbackUrl = `${process.env.GITHUB_CALLBACK_URL || 'http://localhost/api/auth/oauth/callback'}?provider=github`;
      authUrl = `https://github.com/login/oauth/authorize?${new URLSearchParams({
        client_id: process.env.GITHUB_CLIENT_ID || '',
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
