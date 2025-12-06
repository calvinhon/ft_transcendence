# Test Suite: GDPR Compliance

## Module: GDPR Compliance
**Points:** 5 (Minor)  
**Framework:** Fastify  
**Date:** December 5, 2025

---

## Test 1: GDPR Routes Registration

### Objective
Verify GDPR endpoints are registered and accessible.

### Test Steps
1. Check GDPR routes exist
2. Verify endpoints respond
3. Check authentication required
4. Verify HTTP methods

### Test Commands
```bash
# Test GDPR status endpoint
curl -X GET "http://localhost:3004/gdpr/status/1" \
  -H "Authorization: Bearer $TOKEN" | jq .

# Expected: 200 OK with user rights info

# Test GDPR export endpoint
curl -X GET "http://localhost:3004/gdpr/export/1" \
  -H "Authorization: Bearer $TOKEN" | jq . | head -20

# Expected: 200 OK with user data

# Test GDPR anonymize endpoint
curl -X POST "http://localhost:3004/gdpr/anonymize/1" \
  -H "Authorization: Bearer $TOKEN" | jq .

# Expected: 200 OK or 204 No Content

# Test GDPR delete endpoint
curl -X DELETE "http://localhost:3004/gdpr/delete/1" \
  -H "Authorization: Bearer $TOKEN" | jq .

# Expected: 200 OK or 204 No Content

# Verify auth required (no token)
curl -X GET "http://localhost:3004/gdpr/status/1"
# Expected: 401 Unauthorized
```

### Pass Criteria
- All 4 GDPR endpoints exist
- GET /gdpr/status/:userId
- GET /gdpr/export/:userId
- POST /gdpr/anonymize/:userId
- DELETE /gdpr/delete/:userId
- All require authentication
- Correct HTTP methods

---

## Test 2: Right to Access (Data Export)

### Objective
Verify users can export their data.

### Test Steps
1. Request data export
2. Verify response format
3. Check all user data included
4. Verify timestamp

### Test Commands
```bash
# Request user data export
curl -X GET "http://localhost:3004/gdpr/export/1" \
  -H "Authorization: Bearer $TOKEN" | jq .

# Expected response structure:
# {
#   "user": {
#     "id": 1,
#     "username": "player1",
#     "email": "player@example.com",
#     "created_at": "2025-01-01T00:00:00Z",
#     "last_login": "2025-12-05T10:00:00Z"
#   },
#   "games": [
#     {
#       "id": 1,
#       "opponent": "player2",
#       "score": 5,
#       "opponent_score": 3,
#       "date": "2025-12-01T14:30:00Z"
#     }
#   ],
#   "tournaments": [
#     {
#       "id": 1,
#       "name": "Winter Cup",
#       "place": 2,
#       "date": "2025-12-05T15:00:00Z"
#     }
#   ],
#   "export_timestamp": "2025-12-05T10:30:00Z",
#   "export_format": "application/json"
# }

# Verify can save as JSON
curl -X GET "http://localhost:3004/gdpr/export/1" \
  -H "Authorization: Bearer $TOKEN" > user_data_export.json

# Check file created
ls -lah user_data_export.json
wc -l user_data_export.json
```

### Pass Criteria
- Export endpoint returns data
- Includes user profile
- Includes game history
- Includes tournament results
- JSON format valid
- Timestamp included
- All personal data included

---

## Test 3: Right to Erasure (Account Deletion)

### Objective
Verify users can delete their accounts and data.

### Test Steps
1. Get user info before deletion
2. Delete user account
3. Verify user removed
4. Verify related data removed
5. Check audit log

### Test Commands
```bash
# Get user info before deletion
USER_ID=2
curl -X GET "http://localhost:3004/profile" \
  -H "Authorization: Bearer $TOKEN" | jq '.user.username'

# Expected: player_name

# Delete user account
curl -X DELETE "http://localhost:3004/gdpr/delete/$USER_ID" \
  -H "Authorization: Bearer $TOKEN" | jq .

# Expected: 200 OK or 204 No Content

# Try to access deleted user
curl -X GET "http://localhost:3004/profile" \
  -H "Authorization: Bearer $TOKEN"

# Expected: 404 Not Found or 401 Unauthorized

# Verify user removed from database
sqlite3 user-service/database/user.db \
  "SELECT COUNT(*) FROM users WHERE id=$USER_ID;"

# Expected: 0

# Try to login with deleted account
curl -X POST "http://localhost:3001/auth/login" \
  -H "Content-Type: application/json" \
  -d '{"username":"player_name","password":"password"}'

# Expected: 401 Unauthorized (user not found)
```

### Pass Criteria
- Delete endpoint accepts request
- User record removed from database
- Game records removed or anonymized
- Cannot login with deleted account
- Audit trail maintained

---

## Test 4: Right to Rectification (Data Correction)

### Objective
Verify users can update their data.

### Test Steps
1. Get current user data
2. Update user profile
3. Verify changes saved
4. Check in export

### Test Commands
```bash
# Get current profile
curl -X GET "http://localhost:3004/profile" \
  -H "Authorization: Bearer $TOKEN" | jq '.user'

# Expected:
# {
#   "id": 1,
#   "username": "oldname",
#   "email": "old@example.com",
#   "bio": "old bio"
# }

# Update profile
curl -X PUT "http://localhost:3004/profile" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "new@example.com",
    "bio": "new bio"
  }' | jq .

# Verify changes
curl -X GET "http://localhost:3004/profile" \
  -H "Authorization: Bearer $TOKEN" | jq '.user'

# Expected:
# {
#   "id": 1,
#   "username": "oldname",
#   "email": "new@example.com",
#   "bio": "new bio"
# }

# Verify in export
curl -X GET "http://localhost:3004/gdpr/export/1" \
  -H "Authorization: Bearer $TOKEN" | jq '.user.email'

# Expected: "new@example.com"
```

### Pass Criteria
- Can update own data
- Changes saved to database
- Changes reflected in export
- Audit trail records changes

---

## Test 5: Right to Data Portability (Standard Format)

### Objective
Verify data can be exported in standard format.

### Test Steps
1. Export user data
2. Verify JSON format
3. Check data structure
4. Verify portable format

### Test Commands
```bash
# Export data
curl -X GET "http://localhost:3004/gdpr/export/1" \
  -H "Authorization: Bearer $TOKEN" > export.json

# Verify valid JSON
jq . export.json > /dev/null && echo "Valid JSON"

# Check structure
jq 'keys' export.json

# Expected:
# [
#   "export_format",
#   "export_timestamp",
#   "games",
#   "tournaments",
#   "user"
# ]

# Verify can parse and use
jq '.user.username' export.json

# Verify machine-readable
file export.json
# Expected: ASCII text

# Create machine-readable CSV from exported data (example)
jq -r '.games[] | [.id, .opponent, .score, .opponent_score, .date] | @csv' export.json
```

### Pass Criteria
- Export format is JSON (standard)
- Structure is hierarchical
- All data machine-readable
- Can be imported elsewhere
- Portable format

---

## Test 6: GDPR Status and User Rights

### Objective
Verify users can check their GDPR status.

### Test Steps
1. Request GDPR status
2. Verify rights listed
3. Check right descriptions
4. Verify accurate info

### Test Commands
```bash
# Get GDPR status
curl -X GET "http://localhost:3004/gdpr/status/1" \
  -H "Authorization: Bearer $TOKEN" | jq .

# Expected response:
# {
#   "user_id": 1,
#   "username": "player1",
#   "rights": {
#     "access": {
#       "available": true,
#       "description": "Right to access your personal data",
#       "endpoint": "/gdpr/export/:userId"
#     },
#     "rectification": {
#       "available": true,
#       "description": "Right to correct inaccurate data",
#       "endpoint": "/profile"
#     },
#     "erasure": {
#       "available": true,
#       "description": "Right to delete your account and data",
#       "endpoint": "/gdpr/delete/:userId"
#     },
#     "portability": {
#       "available": true,
#       "description": "Right to receive data in portable format",
#       "endpoint": "/gdpr/export/:userId"
#     }
#   },
#   "last_export": "2025-12-05T10:00:00Z",
#   "data_processing": {
#     "purpose": "Game statistics and tournament tracking",
#     "legal_basis": "User consent"
#   }
# }

# Verify all rights present
curl -s -X GET "http://localhost:3004/gdpr/status/1" \
  -H "Authorization: Bearer $TOKEN" | jq '.rights | keys'

# Expected: ["access", "erasure", "portability", "rectification"]
```

### Pass Criteria
- Status endpoint returns all rights
- Rights descriptions clear
- Endpoints documented
- Processing purpose listed
- Legal basis shown

---

## Test 7: Data Anonymization

### Objective
Verify user data can be anonymized instead of deleted.

### Test Steps
1. Get user data before anonymization
2. Anonymize account
3. Verify personal data removed
4. Check account still exists

### Test Commands
```bash
# Get user data before
curl -X GET "http://localhost:3004/profile" \
  -H "Authorization: Bearer $TOKEN" | jq '.user'

# Expected: Full user info with email, name, etc.

# Anonymize account
curl -X POST "http://localhost:3004/gdpr/anonymize/1" \
  -H "Authorization: Bearer $TOKEN" | jq .

# Check user still exists but anonymized
curl -X GET "http://localhost:3004/profile" \
  -H "Authorization: Bearer $TOKEN" | jq '.user'

# Expected:
# {
#   "id": 1,
#   "username": "user_[ANONYMIZED]_1",
#   "email": "anonymized-1@example.com",
#   "bio": null
# }

# Verify can still login (if credentials changed)
# Or verify old credentials no longer work

# Check games still linked (anonymized)
sqlite3 user-service/database/user.db \
  "SELECT username, email FROM users WHERE id=1;"

# Expected: Anonymized values
```

### Pass Criteria
- Anonymization endpoint works
- Personal data removed/anonymized
- Username changed to anonymized version
- Email anonymized
- Account still exists
- Game history preserved but anonymized

---

## Test 8: Audit Trail and Logging

### Objective
Verify GDPR actions are logged for audit.

### Test Steps
1. Perform GDPR operation
2. Check audit logs
3. Verify operation recorded
4. Check timestamp and user

### Test Commands
```bash
# Check if audit log table exists
sqlite3 user-service/database/user.db ".tables" | grep -i "gdpr\|audit"

# Expected: gdpr_actions table (or similar)

# Check audit table schema
sqlite3 user-service/database/user.db ".schema gdpr_actions"

# Expected columns:
# - id (PRIMARY KEY)
# - user_id
# - action (export, delete, anonymize, etc.)
# - timestamp
# - status (success, failed)

# Perform GDPR operation
curl -X GET "http://localhost:3004/gdpr/export/1" \
  -H "Authorization: Bearer $TOKEN" > /dev/null

# Check audit log
sqlite3 user-service/database/user.db \
  "SELECT user_id, action, timestamp, status FROM gdpr_actions ORDER BY timestamp DESC LIMIT 5;"

# Expected recent entries:
# 1|export|2025-12-05T10:35:00Z|success

# Verify all actions logged
sqlite3 user-service/database/user.db \
  "SELECT DISTINCT action FROM gdpr_actions;"

# Expected: export, delete, anonymize, status_check
```

### Pass Criteria
- Audit table created
- Actions logged with timestamps
- User ID recorded
- Action type recorded
- Status logged (success/failure)
- Complete audit trail

---

## Test 9: Consent and Legal Basis

### Objective
Verify data processing bases are documented.

### Test Steps
1. Check consent in status
2. Verify processing purposes
3. Check legal basis
4. Verify documentation

### Test Commands
```bash
# Check GDPR status for consent info
curl -X GET "http://localhost:3004/gdpr/status/1" \
  -H "Authorization: Bearer $TOKEN" | jq '.data_processing'

# Expected:
# {
#   "purpose": "Game statistics and tournament tracking",
#   "legal_basis": "User consent / Legitimate interest",
#   "retention_period": "Account active + 90 days",
#   "recipients": "Auth service, Game service, Tournament service"
# }

# Check if consent documented in code
grep -r "consent\|legal.*basis" user-service/src/ | head -10

# Check privacy policy (if exists)
cat documentation/GDPR_IMPLEMENTATION.md | grep -i "consent\|legal" | head -10
```

### Pass Criteria
- Legal basis documented
- Processing purpose clear
- Data recipients listed
- Retention period specified
- Consent mechanism in place

---

## Test 10: Response Time Compliance

### Objective
Verify GDPR requests are processed within legal timeframe.

### Test Steps
1. Request data export
2. Measure response time
3. Check within 30 days (requirement)
4. Verify timely access

### Test Commands
```bash
# Time the export request
time curl -X GET "http://localhost:3004/gdpr/export/1" \
  -H "Authorization: Bearer $TOKEN" > /dev/null

# Expected: real < 1s (should be immediate)

# Check if delayed processing implemented
grep -r "30.*day\|schedule\|queue" user-service/src/routes/handlers/gdpr.ts || \
  echo "Immediate processing (compliant)"

# Performance test: Multiple requests
for i in {1..10}; do
  time curl -s -X GET "http://localhost:3004/gdpr/export/1" \
    -H "Authorization: Bearer $TOKEN" > /dev/null
done

# Expected: Consistent sub-second response times
```

### Pass Criteria
- Export available immediately (< 1 second)
- Compliance with 30-day requirement
- No delay in providing data
- Efficient processing
- Fast response times

---

## Test 11: Third-Party Data Sharing

### Objective
Verify control over third-party data sharing.

### Test Steps
1. Check data sharing settings
2. Verify consent for sharing
3. Check third-party list
4. Test sharing controls

### Test Commands
```bash
# Check if user preferences for sharing
curl -X GET "http://localhost:3004/profile/sharing-preferences" \
  -H "Authorization: Bearer $TOKEN" | jq . 2>/dev/null || echo "Endpoint not implemented"

# Check documentation for sharing policy
grep -r "third.*party\|sharing\|recipient" documentation/GDPR_IMPLEMENTATION.md | head -10

# Check if sharing data is minimized
grep -r "share\|third" user-service/src/ | grep -v "test\|log" | head -10

# Verify no sharing without consent
curl -X GET "http://localhost:3004/gdpr/status/1" \
  -H "Authorization: Bearer $TOKEN" | jq '.data_processing.recipients'
```

### Pass Criteria
- Data sharing policies documented
- User consent obtained for sharing
- Third parties listed
- No unauthorized sharing
- Users can control sharing

---

## Test 12: GDPR Compliance Verification

### Objective
Complete end-to-end GDPR compliance check.

### Test Steps
1. Register new user
2. Export data
3. Update data
4. Request status
5. Anonymize account
6. Verify audit trail

### Test Commands
```bash
# 1. Register new user for GDPR testing
curl -X POST "http://localhost:3001/auth/register" \
  -H "Content-Type: application/json" \
  -d '{
    "username": "gdpr_test",
    "email": "gdpr@example.com",
    "password": "GdprTest123!"
  }'

# 2. Login and get token
TOKEN=$(curl -s -X POST "http://localhost:3001/auth/login" \
  -H "Content-Type: application/json" \
  -d '{"username":"gdpr_test","password":"GdprTest123!"}' \
  | jq -r '.token')

# 3. Export data (Right to Access)
curl -X GET "http://localhost:3004/gdpr/export/[USER_ID]" \
  -H "Authorization: Bearer $TOKEN" | jq '.user.email'
# Expected: gdpr@example.com

# 4. Check GDPR status
curl -X GET "http://localhost:3004/gdpr/status/[USER_ID]" \
  -H "Authorization: Bearer $TOKEN" | jq '.rights | keys'
# Expected: All 4 rights

# 5. Update profile (Right to Rectification)
curl -X PUT "http://localhost:3004/profile" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"bio":"Updated bio"}' | jq '.user.bio'

# 6. Anonymize account
curl -X POST "http://localhost:3004/gdpr/anonymize/[USER_ID]" \
  -H "Authorization: Bearer $TOKEN" | jq '.'

# 7. Verify audit trail
sqlite3 user-service/database/user.db \
  "SELECT action, status FROM gdpr_actions WHERE user_id=[USER_ID] ORDER BY timestamp DESC;"

# Expected: Multiple actions recorded (export, anonymize, etc.)
```

### Pass Criteria
- All GDPR rights functional
- Data accessible
- Updates reflected
- Status check works
- Anonymization works
- Audit trail complete
- Full compliance verified

---

## Summary

**GDPR Compliance Module:** ✅  
**Rights Implemented:** 4 (Access, Erasure, Rectification, Portability)  
**Total Tests:** 12  
**Pass Criteria:** All 12 must pass

### Quick Test Commands
```bash
# Get GDPR status
curl http://localhost:3004/gdpr/status/1 -H "Authorization: Bearer $TOKEN" | jq

# Export user data
curl http://localhost:3004/gdpr/export/1 -H "Authorization: Bearer $TOKEN" | jq '.user'

# Check audit trail
sqlite3 user-service/database/user.db "SELECT * FROM gdpr_actions LIMIT 5;"
```

### GDPR Rights Checklist
- ✅ Right to Access (Data Export)
- ✅ Right to Erasure (Delete)
- ✅ Right to Rectification (Update)
- ✅ Right to Data Portability (JSON Export)
- ✅ Audit Trail
- ✅ Consent Management
- ✅ Legal Basis Documentation
- ✅ Third-Party Disclosure Control

---

*Test Suite Created: December 5, 2025*
