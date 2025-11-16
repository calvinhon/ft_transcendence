# Security Recommendations for Authentication

## Current Security Status

### ⚠️ Issues Identified:
1. **localStorage storage** - Vulnerable to XSS attacks
2. **24-hour token lifetime** - Long exposure window if compromised
3. **No token refresh mechanism** - Cannot revoke access before expiration
4. **Auto-login on page refresh** - No option for "Remember Me" vs session-only

## Recommended Improvements (Priority Order)

### 1. HIGH PRIORITY: Reduce Token Expiration
**Change in:** `auth-service/src/routes/auth.ts` (lines 123, 191)
```typescript
// CHANGE FROM:
{ expiresIn: '24h' }

// TO:
{ expiresIn: '1h' }  // or even '15m' with refresh tokens
```

### 2. HIGH PRIORITY: Implement Refresh Tokens
**Benefits:**
- Short-lived access tokens (15 minutes)
- Long-lived refresh tokens (7 days)
- Can revoke refresh tokens in database

**Implementation:**
```typescript
// Store in database:
CREATE TABLE refresh_tokens (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id),
  token VARCHAR(255) UNIQUE NOT NULL,
  expires_at TIMESTAMP NOT NULL,
  created_at TIMESTAMP DEFAULT NOW()
);

// Backend generates both tokens:
const accessToken = jwt.sign(payload, { expiresIn: '15m' });
const refreshToken = jwt.sign(payload, { expiresIn: '7d' });

// Frontend auto-refreshes before expiration:
if (tokenExpiresIn < 5 * 60) { // 5 minutes before expiry
  await refreshAccessToken();
}
```

### 3. MEDIUM PRIORITY: Use httpOnly Cookies
**Change:** Store tokens in httpOnly cookies instead of localStorage

**Benefits:**
- Not accessible to JavaScript (XSS protection)
- Automatically sent with requests
- Can be secured with SameSite and Secure flags

**Drawbacks:**
- Need CSRF protection
- Slightly more complex setup

### 4. MEDIUM PRIORITY: Activity Timeout
```typescript
// frontend/src/auth.ts
private lastActivity: number = Date.now();
private INACTIVITY_TIMEOUT = 30 * 60 * 1000; // 30 minutes

checkActivity(): void {
  if (Date.now() - this.lastActivity > this.INACTIVITY_TIMEOUT) {
    this.logout();
  }
}

// Track activity
trackActivity(): void {
  this.lastActivity = Date.now();
}
```

### 5. LOW PRIORITY: "Remember Me" Option
```typescript
// Give users choice:
login(username, password, rememberMe: boolean) {
  const storage = rememberMe ? localStorage : sessionStorage;
  storage.setItem('token', token);
}
```

## Quick Wins (Implement Today)

### Option 1: Reduce Token Lifetime to 2 hours
```bash
# Change in: auth-service/src/routes/auth.ts
# Lines 123 and 191
{ expiresIn: '2h' }
```

### Option 2: Use sessionStorage instead of localStorage
```typescript
// frontend/src/auth.ts
// CHANGE ALL:
localStorage.getItem('token')
localStorage.setItem('token', token)
localStorage.removeItem('token')

// TO:
sessionStorage.getItem('token')
sessionStorage.setItem('token', token)
sessionStorage.removeItem('token')

// Result: Auto-logout when browser closes
```

### Option 3: Add User Logout Button Prominently
Make logout easily accessible so users can manually end sessions.

## Is Current Setup Safe for Development?

**For localhost development:** ✅ **Acceptable**
- Low risk environment
- No external attackers
- Fast iteration needed

**For production deployment:** ❌ **NOT RECOMMENDED**
- Implement at least:
  1. HTTPS enforcement
  2. Shorter token expiration (2 hours max)
  3. Activity timeout
  4. Prominent logout button

## Testing Security

```bash
# Test token expiration:
# 1. Login
# 2. Change system time forward 25 hours
# 3. Refresh page - should logout

# Test XSS vulnerability:
# In browser console:
console.log(localStorage.getItem('token')); // ⚠️ Visible!

# With httpOnly cookies:
console.log(document.cookie); // ✅ Token not visible
```

## References
- [OWASP JWT Security Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/JSON_Web_Token_for_Java_Cheat_Sheet.html)
- [Token Storage Best Practices](https://auth0.com/docs/secure/security-guidance/data-security/token-storage)
