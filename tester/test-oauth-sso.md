# Test Suite: Remote Authentication (OAuth/SSO)

## Module: Remote Authentication (OAuth/SSO)
**Points:** 10 (Major)  
**Providers:** Google, GitHub  
**Framework:** Fastify  
**Date:** December 5, 2025

---

## Test 1: OAuth Initialization

### Objective
Verify OAuth flow can be initiated for each provider.

### Test Steps
1. Navigate to OAuth init endpoint
2. Select Google provider
3. Verify redirect to OAuth provider
4. Repeat for GitHub

### Test Commands
```bash
# Google OAuth init
curl -X GET "http://auth:3000/oauth/init?provider=google" -v

# Expected redirect:
# HTTP/1.1 302 Found
# Location: https://accounts.google.com/o/oauth2/v2/auth?...

# GitHub OAuth init
curl -X GET "http://auth:3000/oauth/init?provider=github" -v

# Expected redirect:
# HTTP/1.1 302 Found
# Location: https://github.com/login/oauth/authorize?...
```

### Expected Redirect Parameters
```
Google:
- client_id: configured in environment
- redirect_uri: http://auth:3000/oauth/callback
- scope: profile email
- state: random CSRF token

GitHub:
- client_id: configured in environment
- redirect_uri: http://auth:3000/oauth/callback
- scope: user email
- state: random CSRF token
```

### Pass Criteria
- 302 redirect response
- OAuth provider URL correct
- CSRF state token generated
- Redirect URI matches config
- Scope parameters included

---

## Test 2: CSRF Protection

### Objective
Verify state parameter prevents CSRF attacks.

### Test Steps
1. Initiate OAuth flow (generates state)
2. Simulate callback with wrong state
3. Verify rejected
4. Simulate callback with correct state
5. Verify accepted

### Test Commands
```bash
# Initiate OAuth (get state from response)
STATE=$(curl -s -X GET "http://auth:3000/oauth/init?provider=google" \
  -L -c cookies.txt | grep -o 'state=[^&]*' | cut -d= -f2)

echo "State: $STATE"

# Try callback with wrong state (should fail)
curl -X GET "http://auth:3000/oauth/callback?code=test&state=wrong_state&provider=google" \
  -H "Cookie: $(cat cookies.txt)" \
  | jq '.error' | grep -i "mismatch\|invalid"

# Expected: error about state mismatch

# Try callback with correct state (will fail on auth, but state validation passes)
curl -X GET "http://auth:3000/oauth/callback?code=test&state=$STATE&provider=google" \
  -H "Cookie: $(cat cookies.txt)" \
  | jq '.error' | grep -v "state\|csrf" || echo "State validation passed"
```

### Pass Criteria
- State token generated on init
- Wrong state rejected
- Correct state validated
- CSRF protection functional
- No state reuse

---

## Test 3: Google OAuth Code Exchange

### Objective
Verify Google OAuth code can be exchanged for user info.

### Test Steps
1. (Simulated) Get authorization code from Google
2. Send code to callback endpoint
3. Verify code exchanged for tokens
4. Verify user data retrieved
5. Verify JWT token generated

### Test Commands
```bash
npm test -- --testNamePattern="google.*oauth"

# Manual flow simulation:
// 1. User logs in at Google
// 2. Gets redirected with code:
// http://auth:3000/oauth/callback?code=4/0AY0e-g7...&state=xyz

// 3. Server calls exchangeGoogleCode():
// POST https://oauth2.googleapis.com/token with code
// Expected response: {access_token, id_token, expires_in}

// 4. Server calls user info endpoint:
// GET https://www.googleapis.com/oauth2/v2/userinfo
// Expected response: {id, email, name, picture}

// 5. Server creates/updates user and generates JWT
```

### Expected Flow
```
1. Code exchange → Google API
2. Receive: access_token, id_token, expires_in
3. User info request → Google API
4. Receive: id, email, name, picture
5. Create user in database
6. Generate JWT token
7. Set HTTP-only cookie
8. Redirect to app
```

### Pass Criteria
- Code exchanged successfully
- User info retrieved
- JWT generated
- User created in database
- Redirect to authenticated page

---

## Test 4: GitHub OAuth Code Exchange

### Objective
Verify GitHub OAuth code can be exchanged for user info.

### Test Steps
1. Simulate GitHub authorization
2. Exchange code for token
3. Retrieve user data
4. Create/update user
5. Generate JWT

### Test Commands
```bash
npm test -- --testNamePattern="github.*oauth"

// Manual flow simulation:
// 1. User logs in at GitHub
// 2. Gets redirected with code:
// http://auth:3000/oauth/callback?code=abc123...&state=xyz

// 3. Server calls exchangeGithubCode():
// POST https://github.com/login/oauth/access_token with code
// Expected response: {access_token, token_type, scope}

// 4. Server calls user info endpoint:
// GET https://api.github.com/user
// With header: Authorization: Bearer $ACCESS_TOKEN
// Expected response: {id, login, email, avatar_url}

// 5. Create/update user and generate JWT
```

### Expected Flow
```
1. Code exchange → GitHub API
2. Receive: access_token, token_type
3. User info request → GitHub API
4. Receive: id, login, email, avatar_url
5. Create user with avatar from GitHub
6. Generate JWT token
7. Set HTTP-only cookie
8. Redirect to app
```

### Pass Criteria
- Code exchanged successfully
- GitHub user info retrieved
- Avatar URL stored
- User created in database
- JWT generated

---

## Test 5: User Auto-Registration

### Objective
Verify users are automatically created on first OAuth login.

### Test Steps
1. Login with OAuth (new user)
2. Verify user created in database
3. Verify user properties set
4. Login again with same OAuth
5. Verify same user used (not duplicate)

### Test Commands
```bash
# Check user before OAuth login
sqlite3 auth/database/auth.db "SELECT COUNT(*) FROM users WHERE email='newauser@gmail.com';"
# Expected: 0

# Simulate OAuth login
# [User goes through Google OAuth flow]
# [Code exchanged, user created]

sleep 2

# Check user after OAuth login
sqlite3 auth/database/auth.db \
  "SELECT username, email, avatar_url FROM users WHERE email='newuser@gmail.com';"

# Expected:
# google_newuser123|newuser@gmail.com|https://avatars.example.com/123

# Try login again with same OAuth account
# [User logs in via Google again]

# Verify only one user record
sqlite3 auth/database/auth.db \
  "SELECT COUNT(*) FROM users WHERE email='newuser@gmail.com';"
# Expected: 1
```

### Pass Criteria
- User auto-created on first login
- Email and name captured
- Avatar URL stored
- Duplicate accounts not created
- Existing user reused on re-login

---

## Test 6: Avatar Sync

### Objective
Verify user avatar from OAuth provider is stored.

### Test Steps
1. Login with OAuth
2. Check avatar_url in database
3. Verify avatar displays in UI
4. Update OAuth provider avatar
5. Verify avatar updates

### Test Commands
```bash
# Check avatar after login
curl -s -X GET "http://auth:3000/user/profile" \
  -H "Authorization: Bearer $TOKEN" | jq '.user.avatar_url'

# Expected: https://lh3.googleusercontent.com/...

# Or check database
sqlite3 auth/database/auth.db \
  "SELECT avatar_url FROM users WHERE id=1;"

# Expected: URL to image

# Verify image accessible
curl -I $(curl -s "http://auth:3000/user/profile" \
  -H "Authorization: Bearer $TOKEN" | jq -r '.user.avatar_url')

# Expected: HTTP/1.1 200 OK
```

### Pass Criteria
- Avatar URL stored in database
- Avatar URL correct for provider
- Avatar image accessible
- Avatar displays in UI
- Avatar persistent

---

## Test 7: Token Generation and Validation

### Objective
Verify JWT tokens are generated and validated correctly.

### Test Steps
1. Get JWT after OAuth login
2. Verify token structure
3. Verify claims included
4. Use token in API calls
5. Verify token expiration

### Test Commands
```bash
# Get token after OAuth
TOKEN=$(curl -s -X GET "http://auth:3000/oauth/callback?code=test&state=$STATE" \
  -H "Cookie: jwt=$TOKEN" | jq -r '.token')

# Decode JWT (without verification)
echo "$TOKEN" | cut -d'.' -f2 | base64 -d | jq .

# Expected payload:
# {
#   "sub": "user_id",
#   "username": "google_1234567890",
#   "email": "user@gmail.com",
#   "iat": 1733395200,
#   "exp": 1733481600
# }

# Verify token works in API
curl -X GET "http://user:3000/profile" \
  -H "Authorization: Bearer $TOKEN" | jq '.user.username'

# Expected: google_1234567890

# Try with invalid token
curl -X GET "http://user:3000/profile" \
  -H "Authorization: Bearer invalid_token" 
# Expected: 401 Unauthorized
```

### Pass Criteria
- JWT generated after OAuth
- Contains user ID
- Contains username
- Contains email
- Token expiration set
- Token works in requests
- Invalid token rejected

---

## Test 8: Session Persistence

### Objective
Verify OAuth session persists across page refreshes.

### Test Steps
1. Login via OAuth
2. Verify logged in
3. Refresh page
4. Verify still logged in
5. Close/reopen browser
6. Check session

### Test Commands
```bash
# Browser test (manual):
npm run dev

// 1. Click "Login with Google"
// 2. Complete OAuth flow
// 3. Verify logged in, see profile page
// 4. F5 / Refresh page
// 5. Verify still logged in, profile visible
// 6. Close tab, reopen
// 7. Verify still logged in

// Check HTTP-only cookie:
// Open DevTools > Application > Cookies
// Verify "jwt" cookie present
// Verify "HttpOnly" flag set
```

### Pass Criteria
- Session persists after refresh
- HTTP-only cookie maintained
- Token validated on each request
- Session expires correctly
- No session hijacking possible

---

## Test 9: Error Handling

### Objective
Verify OAuth errors are handled gracefully.

### Test Steps
1. User denies permission
2. Invalid code sent
3. Network error during exchange
4. Provider unavailable
5. Verify error messages

### Test Commands
```bash
npm test -- --testNamePattern="oauth.*error"

# User denies permission (simulated):
curl -X GET "http://auth:3000/oauth/callback?error=access_denied&state=$STATE"

# Expected: redirect to login with error message

# Invalid code:
curl -X GET "http://auth:3000/oauth/callback?code=invalid&state=$STATE&provider=google"

# Expected: 400 Bad Request or redirect with error

# Check error handling in code:
grep -n "error\|catch\|Error" auth/src/routes/handlers/oauth.ts | head -20
```

### Pass Criteria
- User denial handled gracefully
- Error messages user-friendly
- No token exposure in errors
- Redirect to login on error
- Logging includes error details

---

## Test 10: Multiple Provider Support

### Objective
Verify same user can link multiple OAuth providers.

### Test Steps
1. Login with Google
2. Create user profile
3. Link GitHub account
4. Verify both providers work
5. Verify same user account

### Test Commands
```bash
npm test -- --testNamePattern="multiple.*provider|provider.*link"

# Manual flow:
// 1. Login with Google (creates user_id=1 with google_abc@gmail.com)
// 2. In settings, click "Link GitHub"
// 3. Complete GitHub OAuth
// 4. Verify linked to same user
// 5. Try logging in with GitHub
// 6. Should recognize same account
```

### Pass Criteria
- Users can link multiple providers
- Same user account regardless of provider
- All providers authenticated successfully
- Profile unified across providers

---

## Test 11: Security and HTTPS

### Objective
Verify OAuth security best practices.

### Test Steps
1. Verify HTTPS used (or localhost)
2. Verify state parameter in use
3. Verify tokens not in URL
4. Verify HTTP-only cookies
5. Check security headers

### Test Commands
```bash
# Check security headers
curl -I http://auth:3000/oauth/init?provider=google | grep -i "security\|csrf\|x-"

# Expected headers:
# X-Content-Type-Options: nosniff
# X-Frame-Options: DENY
# X-CSRF-Token: (if using form-based)

# Check HTTPS in production config
grep -r "https\|secure" oauth.ts | grep -v "//" | head -10

# Verify tokens not in logs
docker logs auth | grep -i "access_token\|refresh_token" || echo "No tokens in logs (good)"
```

### Pass Criteria
- HTTPS enforced in production
- State parameter used for CSRF
- Tokens not in URLs
- HTTP-only cookies set
- Security headers present
- No tokens logged
- Secure cookie flags

---

## Test 12: Integration Test

### Objective
Verify complete OAuth flow end-to-end.

### Test Steps
1. User starts on login page
2. Clicks "Login with Google"
3. Completes Google auth
4. Returns to app authenticated
5. Can access protected resources
6. Can logout and login again

### Test Commands
```bash
# Manual e2e test:
npm run dev

// 1. Navigate to app (not logged in)
// 2. Click "Login with Google"
// 3. Complete Google OAuth in popup/redirect
// 4. Redirected back to app
// 5. Verify logged in (avatar, profile link visible)
// 6. Click profile
// 7. Verify user data displayed
// 8. Click logout
// 9. Verify logged out
// 10. Click "Login with GitHub"
// 11. Repeat flow
// 12. Verify works with GitHub
```

### Expected Flow
```
1. Login page → Click "OAuth button"
2. Redirect to OAuth provider
3. User authenticates
4. Redirect back with code
5. Server exchanges code
6. Server creates user
7. Generate JWT
8. Set HTTP-only cookie
9. Redirect to authenticated page
10. User sees profile
```

### Pass Criteria
- Complete flow works
- User authenticated correctly
- Profile data displayed
- Can logout and relogin
- Works for both providers
- No broken redirects
- Smooth user experience

---

## Summary

**OAuth/SSO Module:** ✅  
**Providers:** Google, GitHub  
**Total Tests:** 12  
**Pass Criteria:** All 12 must pass

### Quick Test Commands
```bash
# Test OAuth init
curl http://auth:3000/oauth/init?provider=google -v

# Test with real OAuth flow (manual browser)
npm run dev
// Click "Login with Google" or "Login with GitHub"

# Check database for created users
sqlite3 auth/database/auth.db "SELECT * FROM users LIMIT 5;"
```

---

*Test Suite Created: December 5, 2025*
