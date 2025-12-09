# 42 School OAuth Setup Guide

## Overview

This guide walks you through setting up 42 School OAuth authentication for ft_transcendence. With 42 OAuth, users can sign in using their 42 intranet credentials.

## What's Been Implemented

✅ **Frontend UI:**
- "42 School" button on login screen
- "42 School" button on register screen
- Branded cyan color (#00babc)
- Hover effects and transitions

✅ **Backend Integration:**
- OAuth init endpoint: `/api/auth/oauth/init?provider=42`
- OAuth callback endpoint: `/api/auth/oauth/callback?provider=42`
- 42 API integration for token exchange
- User info fetching from 42 API
- Automatic user creation/update

✅ **TypeScript Support:**
- AuthManager method: `loginWithSchool42()`
- OAuth callback handler for 42 provider
- Type-safe provider checking

## Setup Steps

### 1. Register Your Application on 42 API

1. Visit [42 API Applications](https://profile.intra.42.fr/oauth/applications)
2. Log in with your 42 credentials
3. Click **"New Application"**
4. Fill in the application details:
   - **Name:** `ft_transcendence` (or your preferred name)
   - **Redirect URI:** `http://localhost/api/auth/oauth/callback`
   - **Scopes:** `public` (default scope, provides basic user info)
5. Click **"Submit"**
6. You'll be redirected to your application page

### 2. Get Your OAuth Credentials

On your application page, you'll see:
- **UID:** This is your Client ID
- **Secret:** This is your Client Secret (click "Show" to reveal)

**Important:** Keep these credentials secure and never commit them to version control.

### 3. Add Environment Variables

Create or update `.env` file in your project root:

```bash
# 42 School OAuth Configuration
SCHOOL42_CLIENT_ID=your_42_uid_here
SCHOOL42_CLIENT_SECRET=your_42_secret_here
SCHOOL42_CALLBACK_URL=http://localhost/api/auth/oauth/callback

# Optional: Override default auth service URL
AUTH_SERVICE_URL=http://localhost:3000
```

Replace:
- `your_42_uid_here` with the UID from step 2
- `your_42_secret_here` with the Secret from step 2

### 4. Update Database Schema (if not done already)

If you haven't added OAuth columns yet:

```bash
sqlite3 auth-service/database/auth.db
```

Run these SQL commands:

```sql
ALTER TABLE users ADD COLUMN oauth_provider TEXT;
ALTER TABLE users ADD COLUMN oauth_id TEXT;
ALTER TABLE users ADD COLUMN oauth_avatar_url TEXT;

-- Verify the schema
.schema users

-- Exit
.quit
```

### 5. Restart Services

Restart Docker services to pick up the new environment variables:

```bash
docker compose restart auth-service
docker restart ft_transcendence-nginx-1
```

Or restart all services:

```bash
docker compose down
docker compose up -d
```

## Testing the Integration

### Visual Test

1. Open http://localhost/ in your browser
2. You should see three OAuth buttons:
   - **42 School** (cyan/turquoise color)
   - **Google** (blue)
   - **GitHub** (dark)
3. Verify the 42 School button appears on both login and register screens

### Functional Test

1. Click the **"42 School"** button
2. You should be redirected to `https://api.intra.42.fr/oauth/authorize`
3. Log in with your 42 credentials
4. Authorize the application
5. You'll be redirected back to your app
6. You should be automatically logged in

### Verify User Creation

```bash
# Check if user was created with OAuth data
sqlite3 auth-service/database/auth.db "SELECT id, username, email, oauth_provider FROM users WHERE oauth_provider IS NOT NULL;"
```

## How It Works

### Authorization Flow

1. **User clicks "42 School" button**
   - Frontend calls `authManager.loginWithSchool42()`
   - Redirects to `/api/auth/oauth/init?provider=42`

2. **Backend initiates OAuth**
   - Generates state for CSRF protection
   - Redirects to 42's OAuth authorize endpoint
   - URL includes: client_id, redirect_uri, scope, state

3. **User authorizes on 42**
   - User logs in (if not already)
   - User reviews permissions
   - User clicks "Authorize"

4. **42 redirects back with code**
   - 42 redirects to `/api/auth/oauth/callback?code=...&provider=42`
   - Backend receives authorization code

5. **Backend exchanges code for token**
   - POST to `https://api.intra.42.fr/oauth/token`
   - Receives access_token

6. **Backend fetches user info**
   - GET to `https://api.intra.42.fr/v2/me`
   - Receives user profile data

7. **Backend creates/updates user**
   - Checks if user exists by email
   - Creates new user or updates existing
   - Generates JWT token

8. **User is logged in**
   - JWT stored in HTTP-only cookie
   - User redirected to frontend
   - Frontend detects OAuth callback and logs in

### 42 API User Data

The 42 API returns user data like:

```json
{
  "id": 12345,
  "email": "user@student.42.fr",
  "login": "username",
  "first_name": "First",
  "last_name": "Last",
  "image": {
    "link": "https://cdn.intra.42.fr/users/username.jpg",
    "versions": { ... }
  },
  "campus": [...],
  "cursus_users": [...]
}
```

Our backend transforms this to:

```javascript
{
  email: user42.email,        // "user@student.42.fr"
  name: user42.login,         // "username"
  login: user42.login,        // "username"
  picture: user42.image.link, // Avatar URL
  id: user42.id              // 42 user ID
}
```

## Troubleshooting

### "Invalid provider" Error

**Problem:** Backend returns 400 error with "Invalid provider"

**Solution:** 
- Check that provider is exactly `'42'` (not '42school' or 'school42')
- Verify TypeScript types in `oauth.ts` include `'42'`

### "Missing CLIENT_ID or CLIENT_SECRET" Error

**Problem:** Backend can't find OAuth credentials

**Solution:**
1. Verify `.env` file exists in project root
2. Check variable names are `SCHOOL42_CLIENT_ID` and `SCHOOL42_CLIENT_SECRET`
3. Restart auth-service: `docker compose restart auth-service`
4. Check logs: `docker logs ft_transcendence-auth-service-1`

### Redirect URI Mismatch

**Problem:** 42 shows "The redirect_uri MUST match the registered callback URL"

**Solution:**
1. Go to your 42 application settings
2. Verify redirect URI is EXACTLY: `http://localhost/api/auth/oauth/callback`
3. No trailing slash, correct port, correct path
4. Update if needed and save

### Button Not Visible

**Problem:** Can't see the 42 School button

**Solution:**
1. Clear browser cache (Ctrl+Shift+R or Cmd+Shift+R)
2. Verify nginx restarted: `docker ps | grep nginx`
3. Check browser console for errors
4. Verify HTML includes `school42-login-btn` and `school42-register-btn`

### OAuth Callback Not Working

**Problem:** Redirected back to app but not logged in

**Solution:**
1. Open browser DevTools (F12)
2. Check Console for JavaScript errors
3. Check Network tab for failed API calls
4. Verify callback URL includes `code` and `provider=42` parameters
5. Check auth-service logs: `docker logs ft_transcendence-auth-service-1`

## Security Considerations

### Production Deployment

When deploying to production:

1. **Update Redirect URI:**
   ```
   https://yourdomain.com/api/auth/oauth/callback
   ```

2. **Update Environment Variables:**
   ```bash
   SCHOOL42_CALLBACK_URL=https://yourdomain.com/api/auth/oauth/callback
   AUTH_SERVICE_URL=https://yourdomain.com
   FRONTEND_URL=https://yourdomain.com
   NODE_ENV=production
   ```

3. **Use HTTPS:**
   - Enable secure cookies
   - Configure SSL certificates
   - Force HTTPS redirects

4. **Protect Secrets:**
   - Use environment variable management (Vault, AWS Secrets Manager)
   - Never commit .env to git
   - Rotate secrets periodically

### CSRF Protection

The OAuth flow includes CSRF protection:
- State parameter generated on each request
- State should be validated on callback (consider implementing state storage)

### Token Security

JWT tokens are stored in HTTP-only cookies:
- Not accessible via JavaScript
- Protected from XSS attacks
- SameSite policy prevents CSRF

## Additional Features

### Display 42 Avatar

User avatars from 42 are stored in `avatar_url` column:

```typescript
// In your frontend user profile:
if (user.avatar_url) {
  avatarImg.src = user.avatar_url;
}
```

### Link 42 Account to Existing User

If user already has an account and wants to link 42:

```typescript
// Consider implementing account linking
// Check if email exists → prompt to link accounts
// Store oauth_provider = '42' and oauth_id = user42.id
```

### Logout from 42

Note: Logging out of your app doesn't log out of 42. Users remain logged into their 42 session.

## Testing Checklist

- [ ] 42 School button visible on login screen
- [ ] 42 School button visible on register screen
- [ ] Button has cyan color (#00babc)
- [ ] Button hover effect works
- [ ] Clicking button redirects to 42 OAuth
- [ ] Can log in with 42 credentials
- [ ] Can authorize application
- [ ] Redirected back to app after authorization
- [ ] Automatically logged in after redirect
- [ ] User created in database with OAuth data
- [ ] Avatar displayed correctly
- [ ] Can access protected routes after OAuth login
- [ ] JWT cookie set correctly
- [ ] Can log out and log back in

## References

- [42 API Documentation](https://api.intra.42.fr/apidoc)
- [42 OAuth Guide](https://api.intra.42.fr/apidoc/guides/web_application_flow)
- [OAuth 2.0 Specification](https://oauth.net/2/)

## Support

If you encounter issues:

1. Check browser console for errors
2. Check auth-service logs: `docker logs ft_transcendence-auth-service-1`
3. Verify OAuth credentials are correct
4. Test with curl to isolate frontend/backend issues
5. Review 42 API documentation for API changes

## Next Steps

After setting up 42 OAuth:

1. **Test with Real Users:** Have other 42 students test the login
2. **Add Profile Sync:** Consider syncing campus, cursus data from 42
3. **Implement Account Linking:** Allow existing users to link their 42 account
4. **Add OAuth Providers:** Configure Google and GitHub OAuth similarly
5. **Production Deployment:** Update redirect URIs for your domain

---

**Implementation completed:** December 6, 2025  
**Tested with:** 42 API v2  
**Status:** ✅ Ready for configuration and testing
