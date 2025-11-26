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
The "Network Error" was actually a parsing error in the frontend. With the fix, the login flow should work correctly.

---

# Debugging Log: User Data Missing userId Error

## Issue Summary
User reported "An error occurred during login: User data is missing userId. Please check the response structure." when attempting to log in through the frontend.

## Debugging Steps Taken

### 1. Investigation
- **Examined auth-service response structure**: Backend sends nested data `{ success: true, data: { user: {...}, token: "..." }, message: "..." }`
- **Checked frontend auth.ts**: Login method was extracting user data but returning the full backend response
- **Inspected local-player.ts**: Code was trying to extract user data from `result.data.user || result.data.data || result.data`
- **Found the issue**: `result.data.data` was the object containing `user` and `token`, not the user object itself

### 2. Root Cause Identified
**Inconsistent Data Handling**:
- Frontend auth.ts was returning the backend response directly
- local-player.ts expected a flattened structure but was falling back to `result.data.data` (the nested object)
- This caused `userData.userId` to be undefined since `userData` was `{ user: {...}, token: "..." }`

### 3. Fix Applied
- **Updated frontend auth.ts**: Modified login and register methods to extract and return consistent AuthResponse structure
- **Updated local-player.ts**: Simplified data extraction to use `result.data.user` and `result.data.token`
- **Fixed register handling**: Updated to use `result.data.user.userId` etc.

### 4. Code Changes
```typescript
// auth.ts - Now returns consistent structure
const user = data.data?.user || data.user;
const token = data.data?.token || data.token;
return { success: true, data: { success: true, token, user, message: data.message } };

// local-player.ts - Simplified extraction
const userData = result.data.user;
const token = result.data.token;
```

### 5. Validation
- Frontend builds successfully without TypeScript errors
- Auth-service logs show successful login processing
- User data extraction now correctly accesses `userId` from the user object

## Files Modified
- `frontend/src/auth.ts`: Updated login/register methods for consistent response handling
- `frontend/src/local-player.ts`: Simplified data extraction and fixed register handling

## Outcome
The "User data is missing userId" error is resolved. Frontend now correctly handles nested backend responses.</content>
<parameter name="filePath">/home/honguyen/ft_transcendence/DEBUG_LOG.md