# Debugging Log: Login Failed Network Error

## Issue Summary
User reported persistent "Login Failed: Network Error" when attempting to log in with the "calvin" user through the frontend.

## Debugging Steps Taken

### 1. Initial Investigation (Previous Session)
- **Checked nginx configuration**: Found upstream was set to `host.docker.internal:3000` which doesn't resolve on Linux Docker. Fixed to `auth-service:3000`.
- **Added debug logging** to backend login handler (`auth-service/src/routes/handlers/login.ts`).
- **Unified response formats** in backend handlers to ensure consistent API responses.
- **Validated API endpoints** via curl - backend was responding correctly.
- **Rebuilt nginx** with corrected upstream.

### 2. Current Debugging Session
- **Verified nginx config**: Confirmed `/api/auth/` proxies to `auth-service:3000` with CORS enabled.
- **Examined frontend auth.ts**: Found login method expects response format `{ success: true, user: {...}, token: "..." }`.
- **Checked backend login handler**: Working correctly, logs show successful logins.
- **Inspected authService.ts**: Login logic correct - queries user, validates password, generates JWT.
- **Queried database**: Confirmed "calvin" user exists with password hash.
- **Reviewed backend logs**: Show successful login attempts (HTTP 200 responses) for "calvin" user.

### 3. Root Cause Identified
**Response Format Mismatch**: 
- Backend sends: `{ success: true, data: { user: {...}, token: "..." }, message: "..." }`
- Frontend login expects: `{ success: true, user: {...}, token: "..." }`

The frontend was trying to access `data.user` and `data.token` directly, but they were nested under `data.data`.

### 4. Fix Applied
- **Updated frontend auth.ts login method** to handle both direct and nested response formats:
  ```typescript
  const userData = data.user || data.data?.user;
  const token = data.token || data.data?.token;
  ```
- **Fixed TypeScript error** by adding null check before sessionStorage.setItem.
- **Rebuilt nginx container** with updated frontend code.

### 5. Validation
- Backend logs confirm successful authentication.
- Frontend now correctly parses nested response structure.
- Login should work if user credentials are correct.

## Files Modified
- `frontend/src/auth.ts`: Updated login method to handle nested response data.

## Tools Used
- Docker logs for backend inspection
- SQLite3 for database queries
- File reading for code inspection
- Docker Compose for container rebuilds

## Outcome
The "Network Error" was actually a parsing error in the frontend. With the fix, the login flow should work correctly.</content>
<parameter name="filePath">/home/honguyen/ft_transcendence/DEBUG_LOG.md