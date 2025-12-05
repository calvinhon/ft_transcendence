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
    if (provider === 'google') {
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

    // Create JWT token
    const token = jwt.sign(
      { id: user.id, email: user.email, username: user.username },
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

    // Redirect to frontend with token in query (fallback)
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
    reply.redirect(`${frontendUrl}?token=${token}&userId=${user.id}`);
  } catch (err) {
    console.error('OAuth callback error:', err);
    reply.status(500).send({ error: 'OAuth authentication failed' });
  }
}

/**
 * Exchange Google authorization code for access token and user info
 */
async function exchangeGoogleCode(code: string): Promise<any> {
  const response = await axios.post('https://oauth2.googleapis.com/token', {
    code,
    client_id: process.env.GOOGLE_CLIENT_ID,
    client_secret: process.env.GOOGLE_CLIENT_SECRET,
    redirect_uri: `${process.env.AUTH_SERVICE_URL || 'http://localhost:3000'}/oauth/callback?provider=google`,
    grant_type: 'authorization_code'
  });

  const { access_token } = response.data;

  // Get user info from Google
  const userResponse = await axios.get('https://www.googleapis.com/oauth2/v2/userinfo', {
    headers: { Authorization: `Bearer ${access_token}` }
  });

  return userResponse.data;
}

/**
 * Exchange GitHub authorization code for access token and user info
 */
async function exchangeGithubCode(code: string): Promise<any> {
  const response = await axios.post('https://github.com/login/oauth/access_token', {
    code,
    client_id: process.env.GITHUB_CLIENT_ID,
    client_secret: process.env.GITHUB_CLIENT_SECRET,
    redirect_uri: `${process.env.AUTH_SERVICE_URL || 'http://localhost:3000'}/oauth/callback?provider=github`
  }, {
    headers: { Accept: 'application/json' }
  });

  const { access_token } = response.data;

  // Get user info from GitHub
  const userResponse = await axios.get('https://api.github.com/user', {
    headers: { Authorization: `Bearer ${access_token}` }
  });

  return userResponse.data;
}

/**
 * OAuth initiation endpoint - generates state and redirects to provider
 */
export async function oauthInitHandler(
  request: FastifyRequest<{
    Querystring: {
      provider: 'google' | 'github';
    };
  }>,
  reply: FastifyReply
): Promise<void> {
  try {
    const { provider } = request.query;

    if (!provider || !['google', 'github'].includes(provider)) {
      reply.status(400).send({ error: 'Invalid provider' });
      return;
    }

    // Generate state for CSRF protection
    const state = Math.random().toString(36).substring(7);

    let authUrl: string;

    if (provider === 'google') {
      authUrl = `https://accounts.google.com/o/oauth2/v2/auth?${new URLSearchParams({
        client_id: process.env.GOOGLE_CLIENT_ID || '',
        redirect_uri: `${process.env.AUTH_SERVICE_URL || 'http://localhost:3000'}/oauth/callback?provider=google`,
        response_type: 'code',
        scope: 'openid profile email',
        state
      }).toString()}`;
    } else if (provider === 'github') {
      authUrl = `https://github.com/login/oauth/authorize?${new URLSearchParams({
        client_id: process.env.GITHUB_CLIENT_ID || '',
        redirect_uri: `${process.env.AUTH_SERVICE_URL || 'http://localhost:3000'}/oauth/callback?provider=github`,
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
