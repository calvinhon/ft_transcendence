# Test Suite: Backend Framework (Fastify)

## Module: Use a Framework to Build the Backend
**Points:** 10 (Major)  
**Framework:** Fastify (Node.js)  
**Date:** December 5, 2025

---

## Test 1: Service Startup

### Objective
Verify that all services start successfully with Fastify framework.

### Prerequisites
```bash
cd /workspace
docker-compose up -d
```

### Test Steps
1. Start all services
2. Wait 5 seconds for initialization
3. Check each service status
4. Verify ports are open

### Expected Results
```bash
✅ auth-service listening on port 3001
✅ game-service listening on port 3002
✅ tournament-service listening on port 3003
✅ user-service listening on port 3004
```

### Test Commands
```bash
# Check container status
docker-compose ps

# Check service logs
docker logs auth-service | grep "listening"
docker logs game-service | grep "listening"
docker logs tournament-service | grep "listening"
docker logs user-service | grep "listening"
```

### Pass Criteria
- All 4 services show status "Up"
- Log output contains "listening on port"
- No "EADDRINUSE" errors in logs

---

## Test 2: Health Check Endpoints

### Objective
Verify health check endpoints respond correctly from all services.

### Test Steps
1. Call GET /health on each service
2. Verify response status is 200
3. Check response structure
4. Validate JSON format

### Test Commands
```bash
# Auth Service
curl -X GET http://localhost:3001/health -H "Content-Type: application/json"

# Game Service
curl -X GET http://localhost:3002/health -H "Content-Type: application/json"

# Tournament Service
curl -X GET http://localhost:3003/health -H "Content-Type: application/json"

# User Service
curl -X GET http://localhost:3004/health -H "Content-Type: application/json"
```

### Expected Response
```json
{
  "status": "healthy",
  "service": "auth-service|game-service|tournament-service|user-service",
  "timestamp": "2025-12-05T...",
  "modules": [...]
}
```

### Pass Criteria
- HTTP Status Code: 200
- Response contains "status": "healthy"
- Service name matches called endpoint
- Timestamp is valid ISO format
- Modules array is present

---

## Test 3: CORS Configuration

### Objective
Verify CORS headers are set correctly for cross-origin requests.

### Test Steps
1. Send request with Origin header
2. Check response headers
3. Verify CORS headers are present

### Test Commands
```bash
# Test CORS headers
curl -X OPTIONS http://localhost:3001/health \
  -H "Origin: http://localhost:5173" \
  -H "Access-Control-Request-Method: GET" \
  -v

# Check response headers
curl -X GET http://localhost:3001/health \
  -H "Origin: http://localhost:5173" \
  -v 2>&1 | grep "Access-Control"
```

### Expected Response Headers
```
Access-Control-Allow-Origin: http://localhost:5173
Access-Control-Allow-Credentials: true
Access-Control-Allow-Methods: GET, POST, PUT, DELETE, PATCH, OPTIONS
Access-Control-Allow-Headers: Content-Type, Authorization
```

### Pass Criteria
- CORS headers present in response
- Origin header is reflected correctly
- Credentials allowed
- All HTTP methods supported

---

## Test 4: Cookie Handling

### Objective
Verify HTTP-only cookies are set correctly.

### Test Steps
1. Make authenticated request
2. Check Set-Cookie headers
3. Verify HTTP-only flag
4. Check secure flag

### Test Commands
```bash
# Register user and get cookie
curl -X POST http://localhost:3001/auth/register \
  -H "Content-Type: application/json" \
  -d '{"username":"testuser","email":"test@test.com","password":"TestPass123!"}' \
  -v 2>&1 | grep -i "set-cookie"

# Verify cookie is HTTP-only
curl -X POST http://localhost:3001/auth/register \
  -H "Content-Type: application/json" \
  -d '{"username":"testuser2","email":"test2@test.com","password":"TestPass123!"}' \
  -v 2>&1 | grep -i "httponly"
```

### Expected Response
```
Set-Cookie: jwt=...; HttpOnly; Secure; SameSite=Strict; Path=/
```

### Pass Criteria
- Set-Cookie header present
- HttpOnly flag set
- Secure flag set
- SameSite set to Strict or Lax

---

## Test 5: JWT Token Handling

### Objective
Verify JWT token generation and validation.

### Test Steps
1. Register new user
2. Login to get JWT
3. Use JWT in subsequent requests
4. Verify token validation

### Test Commands
```bash
# Register user
REGISTER=$(curl -s -X POST http://localhost:3001/auth/register \
  -H "Content-Type: application/json" \
  -d '{"username":"jwttest","email":"jwttest@test.com","password":"TestPass123!"}')

# Login to get JWT
LOGIN=$(curl -s -X POST http://localhost:3001/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"jwttest","password":"TestPass123!"}')

echo "Login response: $LOGIN"

# Extract token from response
TOKEN=$(echo $LOGIN | grep -o '"token":"[^"]*' | cut -d'"' -f4)
echo "Token: $TOKEN"

# Use token in request
curl -X GET http://localhost:3004/profile \
  -H "Authorization: Bearer $TOKEN"
```

### Expected Results
- Login returns valid JWT token
- Token contains username claim
- Protected endpoints accept token
- Invalid token rejected with 401

### Pass Criteria
- Token extracted successfully
- Profile endpoint returns 200 with valid token
- Invalid token returns 401 Unauthorized
- Token structure is valid JWT (3 parts separated by dots)

---

## Test 6: Request Validation

### Objective
Verify request validation and error handling.

### Test Steps
1. Send request with invalid data
2. Send request with missing fields
3. Verify error response
4. Check error message

### Test Commands
```bash
# Missing required field
curl -X POST http://localhost:3001/auth/register \
  -H "Content-Type: application/json" \
  -d '{"username":"test"}'

# Invalid email format
curl -X POST http://localhost:3001/auth/register \
  -H "Content-Type: application/json" \
  -d '{"username":"test","email":"invalid","password":"pass"}'

# Password too weak
curl -X POST http://localhost:3001/auth/register \
  -H "Content-Type: application/json" \
  -d '{"username":"test","email":"test@test.com","password":"123"}'
```

### Expected Response
```json
{
  "error": "Validation failed",
  "message": "...",
  "details": [...]
}
```

### Pass Criteria
- HTTP Status Code: 400 or 422
- Response contains error message
- Specific validation error details provided
- No personal data leaked in error

---

## Test 7: Error Handling

### Objective
Verify error handling and exception management.

### Test Steps
1. Call non-existent endpoint
2. Trigger server error
3. Check error response
4. Verify stack trace not exposed

### Test Commands
```bash
# Non-existent endpoint
curl -X GET http://localhost:3001/api/nonexistent

# Duplicate user registration
curl -X POST http://localhost:3001/auth/register \
  -H "Content-Type: application/json" \
  -d '{"username":"duplicate","email":"dup@test.com","password":"TestPass123!"}'

curl -X POST http://localhost:3001/auth/register \
  -H "Content-Type: application/json" \
  -d '{"username":"duplicate","email":"dup@test.com","password":"TestPass123!"}'
```

### Expected Response
```json
{
  "statusCode": 404,
  "error": "Not Found",
  "message": "Route not found"
}
```

### Pass Criteria
- 404 for non-existent endpoints
- Appropriate error code for duplicate
- No stack trace in production response
- Error message is user-friendly

---

## Test 8: Middleware Chain

### Objective
Verify middleware execution order and functionality.

### Test Steps
1. Check middleware registration
2. Verify execution order
3. Test middleware functionality
4. Check logging middleware

### Test Commands
```bash
# Check service logs for middleware execution
docker logs auth-service | grep -i "middleware\|cors\|jwt" | head -20

# Make request and check logs
curl -X GET http://localhost:3001/health
docker logs auth-service | tail -5
```

### Expected Results
- CORS middleware applied first
- JWT middleware after CORS
- Health check logged
- No errors in middleware chain

### Pass Criteria
- All requests logged
- Middleware order correct
- No middleware errors
- Performance acceptable

---

## Test 9: Graceful Shutdown

### Objective
Verify services shut down gracefully.

### Test Steps
1. Make a request in progress
2. Send shutdown signal
3. Wait for cleanup
4. Verify clean shutdown

### Test Commands
```bash
# Start a long operation (adjust endpoint as needed)
curl -X GET http://localhost:3001/health &

# Gracefully stop the service
docker-compose stop auth-service

# Check logs
docker logs auth-service | tail -10
```

### Expected Results
- Service stops within 30 seconds
- Active connections closed properly
- No data corruption
- Clean log output

### Pass Criteria
- Exit code 0 or 143
- No error messages during shutdown
- Logs show "shutting down" or similar
- Database connections closed

---

## Test 10: Multi-Service Communication

### Objective
Verify services can communicate with each other.

### Test Steps
1. Make request that requires inter-service call
2. Trace communication
3. Verify response propagation
4. Check error handling

### Test Commands
```bash
# Make request that might trigger inter-service communication
curl -X GET http://localhost:3004/stats \
  -H "Authorization: Bearer $TOKEN"

# Check game-service received request
docker logs game-service | grep -i "request\|stats"

# Check for service-to-service calls
docker exec auth-service curl -s http://game-service:3000/health
```

### Expected Results
- Services communicate successfully
- Response includes data from multiple services
- No timeout errors
- Proper error handling on service unavailability

### Pass Criteria
- Inter-service HTTP calls succeed
- Proper error messages on failure
- No circular dependencies
- Timeout handling in place

---

## Test 11: Request Logging

### Objective
Verify request/response logging functionality.

### Test Steps
1. Make various requests
2. Check logs for request details
3. Verify log format
4. Check for sensitive data

### Test Commands
```bash
# Make request
curl -X POST http://localhost:3001/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"testuser","password":"password"}'

# Check logs
docker logs auth-service | grep -i "login\|post" | tail -5
```

### Expected Log Format
```
[timestamp] [level] [method] [path] [status] [duration]
```

### Pass Criteria
- All requests logged
- Log includes method, path, status
- Duration/latency tracked
- No passwords logged
- No tokens logged

---

## Test 12: Type Safety (TypeScript)

### Objective
Verify TypeScript compilation and type checking.

### Test Steps
1. Rebuild services
2. Check for type errors
3. Verify compiled output
4. Check source maps

### Test Commands
```bash
# Rebuild auth-service
cd auth-service && npm run build

# Check output
ls -la dist/

# Check for TypeScript errors
npm run build 2>&1 | grep -i "error\|warning"

# Verify source maps
ls -la dist/*.js.map
```

### Expected Results
- Build succeeds with no errors
- dist/ folder contains compiled JavaScript
- Source maps present for debugging
- Type checking strict mode enabled

### Pass Criteria
- npm run build exits with code 0
- No TypeScript errors
- No tsc warnings (or acceptable warnings)
- Source maps generated

---

## Summary

**Framework:** Fastify ✅  
**Services:** 4 (auth, game, tournament, user) ✅  
**Total Tests:** 12  
**Pass Criteria:** All 12 must pass

### Quick Test Command
```bash
# Run all health checks
for port in 3001 3002 3003 3004; do
  echo "Testing port $port..."
  curl -s http://localhost:$port/health | jq .
done
```

---

*Test Suite Created: December 5, 2025*
