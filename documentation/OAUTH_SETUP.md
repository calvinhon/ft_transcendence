# OAuth/SSO Setup Guide

## Overview

The ft_transcendence application now supports OAuth sign-in with 42 School, Google, and GitHub. This document explains how to configure OAuth providers.

## Current Status

✅ **Frontend UI:** OAuth buttons added to login and register screens  
✅ **Backend Endpoints:** OAuth flow endpoints exist in auth-service  
⚠️ **OAuth Credentials:** Need to be configured  
⚠️ **Database Schema:** `oauth_provider` column needs to be added

## Prerequisites

1. Running ft_transcendence application
2. 42 School account (for 42 OAuth)
3. Google Cloud Console account (for Google OAuth)
4. GitHub account (for GitHub OAuth)

## Setup Steps

### 1. Add OAuth Column to Database

```bash
# Connect to auth database
sqlite3 auth-service/database/auth.db

# Add OAuth columns
ALTER TABLE users ADD COLUMN oauth_provider TEXT;
ALTER TABLE users ADD COLUMN oauth_id TEXT;
ALTER TABLE users ADD COLUMN oauth_avatar_url TEXT;

# Verify schema
.schema users

# Exit
.quit
```

### 2. Configure 42 School OAuth

1. Go to [42 API Applications](https://profile.intra.42.fr/oauth/applications)
2. Click **New Application**
3. Fill in details:
   - Name: ft_transcendence
   - Redirect URI: `http://localhost/api/auth/oauth/callback`
   - Scopes: `public` (default)
4. Click **Submit**
5. Copy **UID** (Client ID) and **Secret** (Client Secret)

### 3. Configure Google OAuth

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select existing one
3. Enable Google+ API
4. Go to **Credentials** → **Create Credentials** → **OAuth 2.0 Client ID**
5. Configure OAuth consent screen:
   - Application name: ft_transcendence
   - Authorized domains: localhost
6. Create OAuth Client ID:
   - Application type: Web application
   - Authorized redirect URIs: `http://localhost/api/auth/oauth/callback`
7. Copy **Client ID** and **Client Secret**

### 4. Configure GitHub OAuth

1. Go to [GitHub Settings](https://github.com/settings/developers)
2. Click **OAuth Apps** → **New OAuth App**
3. Fill in details:
   - Application name: ft_transcendence
   - Homepage URL: `http://localhost`
   - Authorization callback URL: `http://localhost/api/auth/oauth/callback`
4. Click **Register application**
5. Copy **Client ID** and generate **Client Secret**

### 5. Add Environment Variables

Create or update `.env` file in the project root:

```bash
# 42 School OAuth
SCHOOL42_CLIENT_ID=your_42_client_id_here
SCHOOL42_CLIENT_SECRET=your_42_client_secret_here
SCHOOL42_CALLBACK_URL=http://localhost/api/auth/oauth/callback

# Google OAuth
GOOGLE_CLIENT_ID=your_google_client_id_here
GOOGLE_CLIENT_SECRET=your_google_client_secret_here
GOOGLE_CALLBACK_URL=http://localhost/api/auth/oauth/callback

# GitHub OAuth
GITHUB_CLIENT_ID=your_github_client_id_here
GITHUB_CLIENT_SECRET=your_github_client_secret_here
GITHUB_CALLBACK_URL=http://localhost/api/auth/oauth/callback

# OAuth Settings
OAUTH_ENABLED=true
```

### 5. Update Docker Compose (if needed)

Add environment variables to `docker-compose.yml`:

```yaml
services:
  auth-service:
    environment:
      - GOOGLE_CLIENT_ID=${GOOGLE_CLIENT_ID}
      - GOOGLE_CLIENT_SECRET=${GOOGLE_CLIENT_SECRET}
      - GITHUB_CLIENT_ID=${GITHUB_CLIENT_ID}
      - GITHUB_CLIENT_SECRET=${GITHUB_CLIENT_SECRET}
      - OAUTH_ENABLED=${OAUTH_ENABLED:-true}
```

### 6. Update Auth Service OAuth Handler

Edit `auth-service/src/routes/handlers/oauth.ts` to use environment variables:

```typescript
const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID;
const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET;
const GITHUB_CLIENT_ID = process.env.GITHUB_CLIENT_ID;
const GITHUB_CLIENT_SECRET = process.env.GITHUB_CLIENT_SECRET;
```

### 7. Restart Services

```bash
# Rebuild and restart
docker-compose down
docker-compose build auth-service
docker-compose up -d

# Or use make
make restart
```

## Testing OAuth

### Browser Testing

1. Navigate to `http://localhost/`
2. Click **"Login with Google"** or **"Login with GitHub"**
3. Authorize the application
4. You should be redirected back and logged in

### Manual API Testing

```bash
# Get OAuth authorization URL
curl "http://localhost/api/auth/oauth/init?provider=google"

# This will redirect to Google's authorization page
# After authorization, you'll be redirected to:
# http://localhost/api/auth/oauth/callback?code=AUTHORIZATION_CODE&provider=google
```

## Troubleshooting

### OAuth Buttons Not Visible
- Clear browser cache
- Check that Font Awesome is loaded (icons should show)
- Verify `frontend/index.html` has OAuth button HTML

### "OAuth credentials not configured"
- Check `.env` file exists with correct credentials
- Verify environment variables are loaded in Docker container:
  ```bash
  docker exec ft_transcendence-auth-service-1 env | grep OAUTH
  ```

### Redirect URI Mismatch
- Ensure callback URL in OAuth provider matches exactly:
  - Local: `http://localhost/api/auth/oauth/callback`
  - Production: `https://yourdomain.com/api/auth/oauth/callback`

### Database Errors
- Verify `oauth_provider` column exists:
  ```bash
  sqlite3 auth-service/database/auth.db ".schema users"
  ```

### Backend Errors
- Check auth-service logs:
  ```bash
  docker logs ft_transcendence-auth-service-1 -f
  ```

## OAuth Flow Diagram

```
User clicks "Login with Google"
    ↓
Frontend: window.location.href = "/api/auth/oauth/init?provider=google"
    ↓
Backend: Redirect to Google authorization page
    ↓
User authorizes on Google
    ↓
Google redirects: /api/auth/oauth/callback?code=XXX&provider=google
    ↓
Backend: Exchange code for access token
    ↓
Backend: Fetch user profile from Google
    ↓
Backend: Create or find user in database
    ↓
Backend: Issue JWT token (set as HTTP-only cookie)
    ↓
Frontend: User logged in, navigate to main menu
```

## Security Considerations

1. **HTTP-Only Cookies:** JWT tokens are stored in HTTP-only cookies (not accessible via JavaScript)
2. **HTTPS in Production:** Always use HTTPS in production to encrypt OAuth tokens
3. **State Parameter:** Consider adding CSRF protection with state parameter
4. **Token Validation:** Verify OAuth tokens server-side
5. **Scope Limitations:** Request only necessary OAuth scopes

## Feature Status

| Feature | Status | Notes |
|---------|--------|-------|
| Google OAuth UI | ✅ Complete | Buttons visible on login/register |
| GitHub OAuth UI | ✅ Complete | Buttons visible on login/register |
| Backend Endpoints | ✅ Complete | `/oauth/init` and `/oauth/callback` |
| Database Schema | ⚠️ Manual | Need to add `oauth_provider` column |
| OAuth Credentials | ⚠️ Manual | Need to configure in `.env` |
| Google Provider | ⚠️ Needs Config | Backend code exists |
| GitHub Provider | ⚠️ Needs Config | Backend code exists |
| Frontend Callback | ✅ Complete | Handles OAuth redirect |
| JWT Integration | ✅ Complete | Issues JWT after OAuth success |

## Next Steps

1. ✅ Add OAuth buttons to UI (DONE)
2. ⚠️ Add database columns for OAuth data
3. ⚠️ Configure OAuth credentials in `.env`
4. ⚠️ Update backend OAuth handler with real API calls
5. ⚠️ Test with actual OAuth providers
6. ⚠️ Update compliance documentation

## References

- [Google OAuth Documentation](https://developers.google.com/identity/protocols/oauth2)
- [GitHub OAuth Documentation](https://docs.github.com/en/developers/apps/building-oauth-apps)
- [OAuth 2.0 RFC](https://tools.ietf.org/html/rfc6749)
