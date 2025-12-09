# How to Verify JWT is Stored in HTTP-Only Cookie

This guide shows multiple ways to verify that the JWT authentication token is correctly stored in an HTTP-only cookie.

## 1. Using curl (Command Line)

```bash
curl -v -X POST http://localhost/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"youruser","password":"yourpass"}' 2>&1 | grep "set-cookie"
```

**What to look for:**
- `set-cookie: token=...` - The JWT token
- `HttpOnly` - Confirms JavaScript cannot access it
- `SameSite=Strict` - Prevents CSRF attacks
- `Max-Age=86400` - Cookie expires in 24 hours

**Example output:**
```
< set-cookie: token=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...; Max-Age=86400; Path=/; HttpOnly; SameSite=Strict
```

## 2. Using Browser DevTools (Chrome/Firefox)

### Step-by-step:
1. Open your browser and go to `http://localhost`
2. Open DevTools (F12 or Right-click → Inspect)
3. Go to the **Application** tab (Chrome) or **Storage** tab (Firefox)
4. Click on **Cookies** in the left sidebar
5. Select `http://localhost`
6. Look for a cookie named `token`
7. Check the **HttpOnly** column - it should show ✓ (checkmark)
8. Check the **SameSite** column - should show `Strict`

**Important:** You'll see the cookie listed, but if you try to access it via JavaScript console with `document.cookie`, it will NOT appear because it's HttpOnly.

## 3. Using Browser Network Tab

1. Open DevTools → **Network** tab
2. Perform a login or registration
3. Click on the `/api/auth/login` or `/api/auth/register` request
4. Go to the **Headers** section
5. Scroll to **Response Headers**
6. Look for `set-cookie` header showing:
   ```
   token=eyJhbG...; Max-Age=86400; Path=/; HttpOnly; SameSite=Strict
   ```

## 4. Try to Access Cookie from JavaScript Console (Security Test)

Open browser console (F12 → Console) and type:
```javascript
document.cookie
```

**Expected result:** The `token` cookie should **NOT appear** in the output because it's HttpOnly. 

This proves JavaScript cannot access it, which is the security goal against XSS attacks.

## 5. Verify Cookie is Sent Automatically

After logging in, check any subsequent API request in Network tab:
1. Click on any `/api/...` request (e.g., `/api/user/profile`)
2. Go to **Headers** → **Request Headers**
3. Look for `Cookie: token=...`

This shows the browser automatically sends the cookie with each request, and you don't need to manually manage it in JavaScript.

## Security Indicators Checklist

✅ **HttpOnly flag is set** - Cookie not accessible via JavaScript
✅ **SameSite=Strict** - Cookie only sent to same-site requests
✅ **Secure flag** (in production) - Cookie only sent over HTTPS
✅ **document.cookie doesn't show token** - Confirms HttpOnly protection
✅ **Cookie sent automatically** - Browser handles authentication

## Testing All Endpoints

Test the complete authentication flow:

### Registration
```bash
curl -v -X POST http://localhost/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"username":"testuser","email":"test@example.com","password":"password123"}' \
  -c cookies.txt
```

### Login
```bash
curl -v -X POST http://localhost/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"testuser","password":"password123"}' \
  -c cookies.txt
```

### Verify (uses cookie from previous request)
```bash
curl -v -X POST http://localhost/api/auth/verify \
  -b cookies.txt
```

### Logout
```bash
curl -v -X POST http://localhost/api/auth/logout \
  -b cookies.txt
```

After logout, the cookie should be cleared (empty value with expired date).

## Troubleshooting

### Cookie not being set
- Check nginx CORS configuration includes `Access-Control-Allow-Credentials: true`
- Verify frontend uses `credentials: 'include'` in fetch calls
- Ensure backend sets cookie with correct domain and path

### Cookie not being sent
- Verify `credentials: 'include'` is in all fetch calls
- Check CORS origin matches exactly (e.g., `http://localhost` not `*`)
- Ensure SameSite policy allows the request

### Cookie visible in document.cookie
- HttpOnly flag is NOT set - security issue!
- Check backend cookie configuration

## Comparison: Before vs After

### Before (sessionStorage)
- ❌ Token accessible via `sessionStorage.getItem('token')`
- ❌ Vulnerable to XSS attacks
- ❌ Manual token management required
- ❌ Token in JavaScript memory

### After (HTTP-only Cookie)
- ✅ Token NOT accessible via JavaScript
- ✅ Protected against XSS attacks
- ✅ Browser handles token automatically
- ✅ Token only in HTTP headers
