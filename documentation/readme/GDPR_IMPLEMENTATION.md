# GDPR Implementation & Privacy Policy

**Last Updated**: December 7, 2025  
**Compliance Standard**: EU General Data Protection Regulation (GDPR) 2016/679

This document describes how ft_transcendence implements GDPR compliance and protects user privacy.

---

## Table of Contents

1. [Privacy Policy](#privacy-policy)
2. [Data Controller Information](#data-controller-information)
3. [Legal Basis for Processing](#legal-basis-for-processing)
4. [User Rights Implementation](#user-rights-implementation)
5. [Data Protection Measures](#data-protection-measures)
6. [Data Retention Policies](#data-retention-policies)
7. [Technical Implementation](#technical-implementation)

---

## Privacy Policy

### What Data We Collect

**Account Information**:
- Username (required for gameplay)
- Email address (required for account recovery)
- Password hash (bcrypt, never plain text)
- Registration timestamp
- Last login timestamp

**Game Activity Data**:
- Match history (opponents, scores, timestamps)
- Tournament participation records
- Win/loss statistics
- Campaign progress level
- Achievement unlocks

**Security Data**:
- 2FA secrets (encrypted, if enabled)
- Session tokens (JWT, temporary)
- Login attempt logs (IP addresses, timestamps)
- Failed authentication attempts

**Optional Data**:
- Display name (if different from username)
- Avatar/profile picture (if uploaded)
- Bio/description (if provided)
- Friend connections (if added)

### Why We Collect Data

- **Account Management**: Maintain your account and authenticate logins
- **Gameplay**: Enable multiplayer matches and tournaments
- **Statistics**: Track your progress and achievements
- **Security**: Prevent unauthorized access and detect abuse
- **Legal**: Comply with applicable laws and prevent fraud

### How We Use Data

✅ **We DO**:
- Store data securely in encrypted SQLite databases
- Use HTTPS for all data transmission
- Hash passwords with bcrypt (one-way encryption)
- Implement HTTP-only cookies for session management
- Provide data export in JSON format (right to access)
- Support full account deletion (right to erasure)
- Anonymize match history when accounts deleted

❌ **We DON'T**:
- Sell your data to third parties
- Share data without consent
- Store plain text passwords
- Track you across other websites
- Use data for advertising
- Send spam emails

---

## Data Controller Information

**Project**: ft_transcendence  
**Type**: Educational project (42 School curriculum)  
**Environment**: Local development (localhost only)  
**Data Location**: SQLite databases on host machine  

**Contact**: For GDPR requests, contact the system administrator.

---

## Legal Basis for Processing

Under GDPR Article 6, we process data based on:

1. **Consent** (Art. 6(1)(a)): You provide consent when registering an account
2. **Contract** (Art. 6(1)(b)): Processing necessary to provide game services
3. **Legitimate Interest** (Art. 6(1)(f)): Security, fraud prevention, service improvement

---

## User Rights Implementation

### 1. Right to Access (Article 15)

**Endpoint**: `GET /api/user/gdpr/export`

**Implementation**:
- Export all personal data in machine-readable JSON format
- Includes account info, game history, statistics, achievements
- Available instantly via authenticated API call
- Download as `gdpr_export_user_{id}_{timestamp}.json`

**Example Export**:
```json
{
  "exportDate": "2025-12-07T10:00:00Z",
  "personalData": {
    "userId": 123,
    "username": "player1",
    "email": "player1@example.com",
    "registeredAt": "2025-12-01T12:00:00Z"
  },
  "gameHistory": [...],
  "statistics": {...},
  "achievements": [...]
}
```

### 2. Right to Erasure / "Right to be Forgotten" (Article 17)

**Endpoint**: `DELETE /api/user/gdpr/delete`

**Implementation**:
- Complete account deletion with password confirmation
- Removes personal data from all microservices
- Anonymizes match history (preserves stats, removes identity)
- Revokes all active sessions
- Blockchain records remain (immutable by design)

**What Gets Deleted**:
- ✅ Username, email, password hash
- ✅ Profile information
- ✅ Friend connections
- ✅ Session tokens
- ✅ 2FA secrets
- ✅ Login history

**What Gets Anonymized**:
- Match history (username → "DELETED_USER_123")
- Tournament participation (for bracket integrity)
- Opponent records (can't delete other players' history)

**What Remains**:
- Aggregate statistics (anonymized)
- Blockchain records (immutable, pseudonymous)

### 3. Right to Data Portability (Article 20)

**Implementation**:
- Data export in JSON format (standard, machine-readable)
- Compatible with other systems
- Includes all personal and activity data
- Available instantly via API

### 4. Right to Rectification (Article 16)

**Endpoints**:
- `PUT /api/user/profile` - Update profile information
- `PUT /api/user/email` - Change email address
- `PUT /api/user/password` - Change password

**Implementation**:
- Self-service profile editing
- Email verification for email changes
- Password confirmation required for sensitive changes

### 5. Right to Restriction of Processing (Article 18)

**Implementation**:
- Account suspension (blocks login, preserves data)
- Optional in user settings

### 6. Right to Object (Article 21)

**Implementation**:
- Opt-out of optional data collection (display name, bio)
- Account deletion available at any time

---

## Data Protection Measures

### Technical Security

**1. Encryption**:
- Passwords: bcrypt hashing (cost factor 10)
- 2FA secrets: Encrypted at rest
- JWT tokens: Signed with HS256 algorithm
- Database: SQLite with file system encryption support
- Transmission: HTTPS (development: HTTP localhost only)

**2. Access Control**:
- Authentication required for all user data access
- JWT tokens with 24-hour expiration
- HTTP-only cookies (prevents XSS attacks)
- SameSite=Strict (prevents CSRF attacks)

**3. Web Application Firewall**:
- ModSecurity WAF blocks:
  - SQL injection attempts
  - XSS (Cross-Site Scripting) attacks
  - CSRF (Cross-Site Request Forgery)
  - Rate limit violations (10 req/sec per IP)

**4. Secrets Management**:
- HashiCorp Vault for sensitive credentials
- No secrets in source code or environment variables
- API keys and OAuth secrets encrypted

**5. Logging & Monitoring**:
- ELK Stack (Elasticsearch, Logstash, Kibana)
- 30-day log retention
- Audit trail of GDPR operations
- No PII (Personally Identifiable Information) in logs

### Organizational Security

**1. Data Minimization**:
- Only collect necessary data for service functionality
- No tracking cookies or analytics
- No third-party data sharing

**2. Purpose Limitation**:
- Data only used for stated purposes
- No secondary uses without consent

**3. Storage Limitation**:
- Deleted accounts purged after 30 days
- Logs automatically deleted after 30 days
- Inactive sessions expire after 24 hours

---

## Data Retention Policies

| Data Type | Retention Period | Reason |
|-----------|------------------|--------|
| **Active Accounts** | Indefinite | Service provision |
| **Deleted Accounts** | 30 days | Backup retention |
| **Anonymized Match History** | Indefinite | Statistics integrity |
| **Session Tokens (JWT)** | 24 hours | Security best practice |
| **Login Attempt Logs** | 30 days | Security monitoring |
| **Audit Logs** | 30 days | GDPR compliance tracking |
| **Blockchain Records** | Permanent | Immutable by design |
| **Backups** | 30 days | Disaster recovery |

### Automatic Data Deletion

**After Account Deletion**:
- Day 0: Personal data removed, match history anonymized
- Day 30: Backup copies purged, audit logs deleted
- Permanent: Blockchain records remain (pseudonymous, no PII)

---

## Technical Implementation

### Service Architecture

**4 Microservices with SQLite Databases**:

1. **auth-service** (Port 3001)
   - Database: `auth.db`
   - Data: Users, passwords, sessions, 2FA secrets
   - GDPR: Deletes user credentials, revokes sessions

2. **user-service** (Port 3003)
   - Database: `user.db`
   - Data: Profiles, friends, preferences
   - GDPR: Exports profile data, deletes personal info

3. **game-service** (Port 3002)
   - Database: `game.db`
   - Data: Match history, statistics
   - GDPR: Anonymizes match history, exports stats

4. **tournament-service** (Port 3004)
   - Database: `tourn.db`
   - Data: Tournaments, registrations
   - GDPR: Removes pending registrations, anonymizes completed

### GDPR Endpoints

**User Service** (`/api/user/gdpr/`):

```typescript
// Export all user data
GET /api/user/gdpr/export
Response: JSON file download

// Delete account
DELETE /api/user/gdpr/delete
Body: { password, confirmation: "DELETE" }
Response: { success: true, deletedAt: "timestamp" }

// Anonymize account
POST /api/user/gdpr/anonymize
Body: { password, keepStatistics: true }
Response: { success: true, anonymizedAt: "timestamp" }

// Get consents
GET /api/user/gdpr/consents
Response: [{ type, granted, timestamp }]

// Update consent
PUT /api/user/gdpr/consents/:type
Body: { granted: boolean }
Response: { success: true }
```

### Data Flow for GDPR Requests

**Data Export Flow**:
```
1. User → GET /api/user/gdpr/export (authenticated)
2. user-service → Collect data from user.db
3. user-service → Call other services:
   - auth-service → Get registration date, 2FA status
   - game-service → Get match history, statistics
   - tournament-service → Get tournament participation
4. user-service → Merge all data into JSON
5. user-service → Return file download
6. Audit log → Record export request
```

**Account Deletion Flow**:
```
1. User → DELETE /api/user/gdpr/delete (password confirmed)
2. user-service → Verify password
3. user-service → Broadcast deletion to all services:
   - auth-service → Delete credentials, revoke sessions
   - game-service → Anonymize match history
   - tournament-service → Remove pending registrations
   - blockchain → Keep records (immutable, pseudonymous)
4. user-service → Delete profile data
5. user-service → Return confirmation
6. Audit log → Record deletion request
7. Email → Send confirmation to user
```

### Database Schema Changes

**User Table** (anonymization support):
```sql
-- Before deletion
username: "player1"
email: "player1@example.com"
status: "active"

-- After deletion (anonymized)
username: "DELETED_USER_123"
email: "deleted_user_123@deleted.local"
status: "deleted"
deleted_at: "2025-12-07T10:00:00Z"
```

**Match History** (opponent records preserved):
```sql
-- Player1 deletes account, Player2 keeps theirs
player1_username: "DELETED_USER_123"  -- Anonymized
player2_username: "player2"            -- Preserved
winner: "DELETED_USER_123"             -- Anonymized
scores: "5-3"                          -- Preserved
timestamp: "2025-12-06T15:30:00Z"      -- Preserved
```

### Testing

**180 Automated Tests Include**:
- ✅ GDPR endpoint availability
- ✅ Data export completeness
- ✅ Account deletion cascade
- ✅ Data anonymization correctness
- ✅ Consent management
- ✅ Audit trail accuracy
- ✅ Response time compliance (<24 hours)
- ✅ Secure data transmission

**Test Execution**:
```bash
cd tester && ./test-gdpr-compliance.sh
```

---

## Compliance Statement

ft_transcendence implements GDPR requirements through:

✅ **Transparency**: Privacy policy clearly explains data usage  
✅ **User Rights**: All GDPR rights implemented via API endpoints  
✅ **Security**: Encryption, access control, WAF protection  
✅ **Data Minimization**: Only essential data collected  
✅ **Purpose Limitation**: Data used only for stated purposes  
✅ **Storage Limitation**: Automatic deletion after 30 days  
✅ **Accountability**: Audit logs track all GDPR operations  
✅ **Technical Measures**: SQLite databases, HTTP-only cookies, bcrypt  
✅ **Organizational Measures**: Clear policies, user control, consent management  

---

## Contact for GDPR Requests

For questions about data protection or to exercise your GDPR rights:

1. **Via Web Interface**: Use account settings → Privacy & Data
2. **Via API**: Use GDPR endpoints (requires authentication)
3. **Via Contact**: Email the project administrator

**Response Time**: GDPR requests processed within 24 hours (typically instant)

---

## Changes to This Policy

This privacy policy may be updated to reflect:
- Changes in GDPR regulations
- New features or data processing
- User feedback and improvements

Last updated: December 7, 2025

---

## References

- **GDPR Text**: [EUR-Lex 32016R0679](https://eur-lex.europa.eu/eli/reg/2016/679/oj)
- **Article 15**: Right of access by the data subject
- **Article 16**: Right to rectification
- **Article 17**: Right to erasure ('right to be forgotten')
- **Article 18**: Right to restriction of processing
- **Article 20**: Right to data portability
- **Article 21**: Right to object

---

**This implementation is for educational purposes as part of the 42 School ft_transcendence project.**
