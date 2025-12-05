# Test Suite: WAF/ModSecurity & Vault

## Module: WAF/ModSecurity with Vault
**Points:** 10 (Major)  
**Components:** Nginx, ModSecurity, Vault  
**Date:** December 5, 2025

---

## Test 1: Vault Startup and Health

### Objective
Verify Vault service starts and is accessible.

### Test Steps
1. Check Vault container running
2. Verify health endpoint
3. Check web UI accessible
4. Verify initialization

### Test Commands
```bash
# Check Vault is running
docker-compose ps | grep vault

# Health check
curl -s http://localhost:8200/v1/sys/health | jq .

# Expected response:
# {
#   "initialized": true,
#   "sealed": false,
#   "standby": false,
#   "performance_standby": false,
#   "replication_performance_mode": "disabled",
#   "replication_dr_mode": "disabled",
#   "server_time_utc": 1733395200,
#   "version": "1.x.x"
# }

# Check UI accessibility
curl -s http://localhost:8200/ui/ | head -50
```

### Pass Criteria
- Vault container running
- Health endpoint responds
- Vault initialized
- Vault unsealed
- Web UI accessible

---

## Test 2: Vault Configuration

### Objective
Verify Vault is configured correctly.

### Test Steps
1. Check config file loaded
2. Verify backend configured
3. Verify listener configured
4. Check authentication methods enabled

### Test Commands
```bash
# Check config file
cat vault/config.hcl

# Expected content:
# listener "tcp" {
#   address = "0.0.0.0:8200"
#   tls_disable = 1
# }
# 
# backend "file" {
#   path = "/vault/data"
# }
# 
# ui = true

# Check listener is working
curl -I http://localhost:8200/v1/sys/health

# Expected: HTTP/1.1 200 OK

# Check auth methods
curl -s -H "X-Vault-Token: dev-token" \
  http://localhost:8200/v1/sys/auth | jq '.data.data'
```

### Pass Criteria
- Config file exists
- Listener configured on 8200
- File backend configured
- UI enabled
- Auth methods available

---

## Test 3: Secrets Storage

### Objective
Verify secrets can be stored and retrieved from Vault.

### Test Steps
1. Store JWT secret
2. Store OAuth credentials
3. Store database password
4. Retrieve each secret
5. Verify no access without token

### Test Commands
```bash
# Set JWT secret
curl -X POST http://localhost:8200/v1/secret/data/jwt \
  -H "X-Vault-Token: dev-token" \
  -H "Content-Type: application/json" \
  -d '{
    "data": {
      "secret": "super-secret-jwt-key-12345"
    }
  }'

# Retrieve JWT secret
curl -s -X GET http://localhost:8200/v1/secret/data/jwt \
  -H "X-Vault-Token: dev-token" | jq '.data.data.secret'

# Expected: "super-secret-jwt-key-12345"

# Set OAuth credentials
curl -X POST http://localhost:8200/v1/secret/data/oauth \
  -H "X-Vault-Token: dev-token" \
  -H "Content-Type: application/json" \
  -d '{
    "data": {
      "google_client_id": "...",
      "google_client_secret": "...",
      "github_client_id": "...",
      "github_client_secret": "..."
    }
  }'

# Try accessing without token (should fail)
curl -s -X GET http://localhost:8200/v1/secret/data/jwt | jq '.errors' | grep -i "permission\|forbidden"
```

### Pass Criteria
- Secrets stored successfully
- Secrets retrieved correctly
- Requires valid token
- Secrets not in logs
- Audit trail maintained

---

## Test 4: ModSecurity Rules Loading

### Objective
Verify ModSecurity WAF rules are loaded.

### Test Steps
1. Check rules file exists
2. Verify Nginx loads rules
3. Check rule count
4. Verify specific rules

### Test Commands
```bash
# Check rules file
ls -lah nginx/modsecurity.conf

# Check file size (should have rules)
wc -l nginx/modsecurity.conf

# Check Nginx includes rules
grep -r "modsecurity" nginx/nginx.conf || grep -r "modsecurity" nginx/ | head -5

# Verify rules syntax (if ModSecurity CLI available)
modsec-rules-check nginx/modsecurity.conf 2>/dev/null || echo "ModSecurity CLI not available"

# Check specific rule examples
grep -i "secule\|sql.*injection\|xss" nginx/modsecurity.conf | head -10
```

### Pass Criteria
- Rules file exists and readable
- Nginx configuration includes rules
- Rules have proper syntax
- SQL injection rules present
- XSS protection rules present

---

## Test 5: SQL Injection Prevention

### Objective
Verify WAF blocks SQL injection attempts.

### Test Steps
1. Send normal request
2. Send SQL injection payload
3. Verify injection blocked
4. Check logging

### Test Commands
```bash
# Normal request (should pass)
curl -X GET "http://localhost/api/users/1" \
  -H "Authorization: Bearer $TOKEN"

# Expected: 200 OK or 404 if not found

# SQL Injection attempt (should be blocked)
curl -X GET "http://localhost/api/users/1 OR 1=1" \
  -H "Authorization: Bearer $TOKEN" -v

# Expected: 403 Forbidden

# Another injection attempt
curl -X GET "http://localhost/api/users?username=admin' OR '1'='1" -v

# Expected: 403 Forbidden

# Check Nginx error log
docker logs nginx 2>&1 | grep -i "SQL\|injection\|ModSecurity" | tail -10
```

### Pass Criteria
- Normal requests pass through
- SQL injection payloads blocked
- 403 response on blocked request
- Logged for audit
- False positives minimal

---

## Test 6: XSS Prevention

### Objective
Verify WAF blocks XSS attempts.

### Test Steps
1. Send normal HTML content
2. Send XSS payload
3. Verify blocked
4. Check various XSS vectors

### Test Commands
```bash
# Normal POST (should pass)
curl -X POST "http://localhost/api/comments" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{"text":"This is a normal comment"}'

# Expected: 201 Created

# XSS attempt 1: Script tag
curl -X POST "http://localhost/api/comments" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{"text":"<script>alert(1)</script>"}' -v

# Expected: 403 Forbidden

# XSS attempt 2: Event handler
curl -X POST "http://localhost/api/comments" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{"text":"<img onerror=alert(1)>"}' -v

# Expected: 403 Forbidden

# XSS attempt 3: JavaScript protocol
curl -X POST "http://localhost/api/comments" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{"text":"<a href=\"javascript:alert(1)\">Click</a>"}' -v

# Expected: 403 Forbidden
```

### Pass Criteria
- Normal content passes
- Script tags blocked
- Event handlers blocked
- JavaScript protocols blocked
- All requests logged

---

## Test 7: Rate Limiting

### Objective
Verify rate limiting prevents abuse.

### Test Steps
1. Normal request rate
2. Rapid fire requests
3. Verify rate limit enforced
4. Check rate limit headers

### Test Commands
```bash
# Normal requests (should pass)
for i in {1..5}; do
  curl -s http://localhost:3001/health | jq '.status'
done

# Expected: 5 successful responses

# Rapid requests (may trigger rate limit)
for i in {1..100}; do
  curl -s http://localhost:3001/health &
done

sleep 5

# Check if rate limited
curl -I http://localhost:3001/health | grep -i "rate\|429\|x-ratelimit"

# If implemented, expect:
# X-RateLimit-Limit: 1000
# X-RateLimit-Remaining: 850
# X-RateLimit-Reset: 1733395260
```

### Pass Criteria
- Normal rate allowed
- Excessive requests detected
- 429 Too Many Requests on limit
- Rate limit headers present
- Limits configurable

---

## Test 8: Request Size Limits

### Objective
Verify large requests are rejected.

### Test Steps
1. Send normal sized request
2. Send very large request
3. Verify limit enforced
4. Check error message

### Test Commands
```bash
# Normal sized request (should pass)
curl -X POST "http://localhost/api/games" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{"moves":[1,2,3,4,5]}'

# Expected: 201 Created

# Very large request (should fail)
LARGE_DATA=$(printf 'a%.0s' {1..10000000})

curl -X POST "http://localhost/api/games" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d "{\"data\":\"$LARGE_DATA\"}" -v

# Expected: 413 Payload Too Large or 403 Forbidden
```

### Pass Criteria
- Normal requests pass
- Oversized requests rejected
- Clear error response
- Request body limit enforced

---

## Test 9: HTTPS/TLS Configuration

### Objective
Verify SSL/TLS is properly configured (in production).

### Test Steps
1. Check for HTTPS support
2. Verify certificate
3. Check security headers
4. Verify TLS version

### Test Commands
```bash
# Check if HTTPS available (not on localhost development)
# In production:
curl -I https://example.com 2>&1 | head -20

# Expected:
# HTTP/1.1 200 OK
# Strict-Transport-Security: max-age=31536000; includeSubDomains
# X-Content-Type-Options: nosniff
# X-Frame-Options: DENY

# Check certificate (if available)
openssl s_client -connect example.com:443 -servername example.com 2>/dev/null | \
  openssl x509 -noout -dates

# Check Vault has TLS disabled for localhost
cat vault/config.hcl | grep "tls_disable"
# Expected: tls_disable = 1 (for development)
```

### Pass Criteria
- HTTPS enforced (production)
- Valid certificate
- Security headers set
- TLS 1.2+ required
- HTTP redirects to HTTPS

---

## Test 10: Vault Access Control

### Objective
Verify Vault enforces access control.

### Test Steps
1. Store secret with token
2. Try accessing with wrong token
3. Try accessing with no token
4. Verify access denied

### Test Commands
```bash
# Store secret with dev-token
curl -X POST http://localhost:8200/v1/secret/data/test \
  -H "X-Vault-Token: dev-token" \
  -H "Content-Type: application/json" \
  -d '{"data": {"secret": "confidential"}}'

# Try accessing with wrong token
curl -s http://localhost:8200/v1/secret/data/test \
  -H "X-Vault-Token: wrong-token" | jq '.errors'

# Expected: Permission denied

# Try accessing with no token
curl -s http://localhost:8200/v1/secret/data/test | jq '.errors'

# Expected: missing token

# Try deleting secret with wrong token
curl -s -X DELETE http://localhost:8200/v1/secret/data/test \
  -H "X-Vault-Token: wrong-token" | jq '.errors'

# Expected: Permission denied
```

### Pass Criteria
- Valid token required
- Wrong token denied
- No token denied
- Access control enforced
- Audit logged

---

## Test 11: Security Headers

### Objective
Verify security headers are present in responses.

### Test Steps
1. Request endpoint
2. Check response headers
3. Verify security headers
4. Check header values

### Test Commands
```bash
# Check response headers
curl -I http://localhost/api/health | head -20

# Expected headers:
# X-Content-Type-Options: nosniff
# X-Frame-Options: DENY or SAMEORIGIN
# X-XSS-Protection: 1; mode=block
# Strict-Transport-Security: max-age=31536000 (on HTTPS)
# Content-Security-Policy: ...

# Full header check
curl -I http://localhost/api/auth/login | grep -i "x-\|strict\|content-security"

# Verify no Server header (don't expose software)
curl -I http://localhost/api/health | grep -i "^Server:" || echo "No Server header exposed (good)"
```

### Pass Criteria
- Security headers present
- X-Content-Type-Options set
- X-Frame-Options set
- XSS protection enabled
- No sensitive header exposure

---

## Test 12: Audit Logging

### Objective
Verify security events are logged for audit.

### Test Steps
1. Perform normal request
2. Trigger security rule
3. Check logs for events
4. Verify log completeness

### Test Commands
```bash
# Normal request
curl -s http://localhost/api/health | jq .

# Check logs for this request
docker logs nginx 2>&1 | grep "health" | tail -3

# SQL injection attempt
curl -s "http://localhost/api/search?q=1' OR '1'='1" || true

# Check logs for blocked request
docker logs nginx 2>&1 | grep -i "SQL\|injection\|ModSecurity" | tail -5

# Check Vault audit logs
curl -s -H "X-Vault-Token: dev-token" \
  http://localhost:8200/v1/sys/audit | jq '.data'

# Expected logs to include:
# - Timestamp
# - Request path/method
# - Response status
# - Client IP
# - Blocked reason (if applicable)
```

### Pass Criteria
- All requests logged
- Security events captured
- Audit trail complete
- Timestamps accurate
- Searchable logs

---

## Summary

**WAF/Vault Module:** ✅  
**Components:** ModSecurity, Vault, Nginx  
**Total Tests:** 12  
**Pass Criteria:** All 12 must pass

### Quick Test Commands
```bash
# Check Vault health
curl http://localhost:8200/v1/sys/health | jq .status

# Test WAF - SQL injection blocked
curl "http://localhost/api/users?id=1' OR '1'='1" -v

# Test WAF - XSS blocked
curl -X POST http://localhost/api/test \
  -d '{"data":"<script>alert(1)</script>"}'

# Check security headers
curl -I http://localhost/api/health | grep -i "x-\|strict"
```

---

*Test Suite Created: December 5, 2025*
