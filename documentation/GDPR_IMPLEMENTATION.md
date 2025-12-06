# GDPR Compliance Implementation

## Overview
This document outlines the GDPR (General Data Protection Regulation) compliance measures implemented in the FT_Transcendence application.

## Date: December 6, 2025
**Compliance Status**: Implemented  
**Last Updated**: December 6, 2025

---

## 1. Data Subject Rights

### Right to Access (Article 15)
Users can request and receive a copy of their personal data through:
- **Endpoint**: `GET /gdpr/export`
- **Formats**: JSON, CSV
- **Implementation**: User Service `/gdpr/export` endpoint
- **Response Time**: < 30 days (typically instant for digital data)

### Right to Rectification (Article 16)
Users can update their personal information through:
- **Endpoint**: `PUT /api/profile`
- **Fields**: Username, email, avatar, preferences
- **Implementation**: User Service profile update endpoints

### Right to Erasure / "Right to be Forgotten" (Article 17)
Users can request complete data deletion:
- **Endpoint**: `DELETE /gdpr/delete`
- **Process**: 
  - User profile anonymization
  - Game history anonymization (preserves statistics)
  - Tournament participation records anonymized
  - 2FA secrets removed
  - OAuth tokens revoked
- **Implementation**: User Service with cascading deletion logic
- **Retention**: Anonymized data retained for legal/statistical purposes

### Right to Data Portability (Article 20)
Users can export their data in machine-readable formats:
- **Endpoint**: `GET /gdpr/export?format=json`
- **Data Included**:
  - User profile information
  - Game statistics and history
  - Tournament participation
  - Achievement records
  - Blockchain tournament records
- **Format**: JSON (structured and portable)

### Right to Object (Article 21)
Users can opt-out of:
- Statistical tracking (anonymized analytics)
- Leaderboard participation
- Public profile visibility

---

## 2. Data Collection & Processing

### Lawful Basis for Processing
- **Consent**: Required for account creation and data processing
- **Contract Performance**: Game services, tournaments
- **Legitimate Interests**: Service improvement, security

### Data Minimization
We only collect essential data:
- **User Account**: Username, email, password (hashed)
- **Authentication**: JWT tokens (HTTP-only cookies), 2FA secrets
- **Game Data**: Match results, scores, timestamps
- **Tournament Data**: Participation records, rankings
- **Optional**: Avatar, bio, display preferences

### Purpose Limitation
Data is used only for:
- User authentication and authorization
- Game service provision
- Tournament management
- Leaderboards and statistics
- Service improvement

---

## 3. Security Measures

### Data Encryption
- **In Transit**: TLS/HTTPS for all communications
- **At Rest**: 
  - Password hashing (bcrypt, salt rounds 10)
  - Database encryption capabilities
  - Secure environment variable storage (Vault)

### Access Control
- **Authentication**: JWT with HTTP-only cookies
- **Authorization**: Role-based access control
- **2FA**: Optional TOTP-based two-factor authentication
- **Session Management**: Secure session handling

### Security Monitoring
- **WAF**: ModSecurity Web Application Firewall
- **Logging**: ELK Stack (Elasticsearch, Kibana) for audit trails
- **Monitoring**: Prometheus & Grafana for security metrics
- **Intrusion Detection**: SQL injection, XSS prevention

---

## 4. Data Retention & Deletion

### Retention Periods
- **Active Accounts**: Data retained while account is active
- **Inactive Accounts**: Reviewed after 2 years of inactivity
- **Deleted Accounts**: 
  - Personal data removed immediately
  - Anonymized statistics retained for legitimate interests
  - Blockchain records immutable but contain no PII

### Anonymization Process
When a user requests deletion:
1. Username replaced with "Deleted User #[ID]"
2. Email removed
3. Password hash removed
4. 2FA secrets deleted
5. OAuth tokens revoked
6. Game history preserved (anonymized)
7. Tournament rankings preserved (anonymized)

---

## 5. Data Breach Response

### Breach Detection
- Real-time monitoring via ELK Stack
- Automated alerts for suspicious activities
- Regular security audits

### Breach Response Protocol
1. **Detection**: Immediate identification via monitoring
2. **Assessment**: Evaluate scope and impact (< 24 hours)
3. **Containment**: Isolate affected systems
4. **Notification**: 
   - Supervisory authority within 72 hours
   - Affected users without undue delay
5. **Remediation**: Implement fixes and preventive measures
6. **Documentation**: Complete incident report

---

## 6. Third-Party Data Processing

### OAuth Providers
- **Google OAuth**: Profile information (name, email)
- **GitHub OAuth**: Profile information (username, email)
- **Purpose**: Authentication only
- **Data Sharing**: Minimal (only authentication tokens)

### Blockchain Integration
- **Hardhat Network**: Local development blockchain
- **Data Stored**: Tournament rankings (no PII)
- **Immutability**: Rankings cannot be altered once recorded
- **Privacy**: User IDs used instead of personal information

---

## 7. User Consent Management

### Consent Collection
- **Registration**: Explicit consent during account creation
- **Terms of Service**: User must accept before service use
- **Cookie Consent**: Informational (only essential cookies used)

### Consent Withdrawal
- Users can withdraw consent and request data deletion at any time
- **Process**: DELETE /gdpr/delete endpoint
- **Effect**: Complete account and data removal

---

## 8. Data Protection Officer (DPO)

**Contact**: dpo@ft-transcendence.example.com  
**Responsibilities**:
- Monitor GDPR compliance
- Handle data subject requests
- Conduct privacy impact assessments
- Liaise with supervisory authorities

---

## 9. Cross-Border Data Transfers

**Current Status**: Single-region deployment (no cross-border transfers)  
**Future**: If international transfers are implemented:
- Standard Contractual Clauses (SCCs)
- Adequacy decisions
- Binding Corporate Rules (BCRs)

---

## 10. Children's Privacy

**Age Restriction**: Service intended for users 13+ years old  
**Verification**: Age confirmation during registration  
**Parental Consent**: Required for users under 16 (per GDPR Article 8)

---

## 11. Automated Decision Making

**Current Status**: No automated decision-making that significantly affects users  
**AI Opponent**: Game-only feature, no profiling or user-affecting decisions

---

## 12. Privacy by Design & Default

### Design Principles
- Data minimization from the start
- Default privacy-protective settings
- Pseudonymization where possible
- Security built into architecture

### Technical Measures
- Microservices architecture (service isolation)
- HTTP-only cookies (XSS prevention)
- CSRF protection
- Input validation and sanitization
- Rate limiting

---

## 13. Data Processing Records

### Documentation Maintained
- **Processing Activities**: Complete register
- **Data Categories**: User data, game data, logs
- **Processing Purposes**: Service provision, security
- **Recipients**: Internal systems only (no third-party sharing)
- **Retention Periods**: As documented in Section 4
- **Security Measures**: As documented in Section 3

---

## 14. Supervisory Authority

**Relevant Authority**: Depends on deployment location  
**Example (EU)**: Data Protection Commission of deployment country  
**Right to Lodge Complaint**: Users can complain to supervisory authority

---

## 15. Compliance Verification

### Audit Trail
- All GDPR requests logged in ELK Stack
- User actions tracked for security
- Admin actions audited

### Regular Reviews
- **Quarterly**: Privacy impact assessments
- **Annually**: Full GDPR compliance audit
- **Continuous**: Security monitoring

---

## 16. Contact & Requests

### GDPR Request Submission
1. **API Endpoints**: 
   - Export: `GET /gdpr/export`
   - Delete: `DELETE /gdpr/delete`
2. **Email**: privacy@ft-transcendence.example.com
3. **Response Time**: Within 30 days

### User Rights Summary
✅ Right to access your data  
✅ Right to rectify inaccurate data  
✅ Right to erasure ("right to be forgotten")  
✅ Right to data portability  
✅ Right to restrict processing  
✅ Right to object to processing  
✅ Right to withdraw consent  
✅ Right to lodge a complaint  

---

## Implementation Status

| Requirement | Status | Implementation |
|-------------|--------|----------------|
| Data Access | ✅ Complete | `/gdpr/export` endpoint |
| Data Deletion | ✅ Complete | `/gdpr/delete` endpoint |
| Data Portability | ✅ Complete | JSON export format |
| Consent Management | ✅ Complete | Registration flow |
| Encryption | ✅ Complete | bcrypt, HTTPS |
| Audit Logging | ✅ Complete | ELK Stack |
| Access Control | ✅ Complete | JWT + 2FA |
| Breach Response | ✅ Complete | Monitoring + Protocol |
| DPO Designation | ⚠️ Pending | Contact to be assigned |
| Privacy Policy | ✅ Complete | This document |

---

## Revision History

| Date | Version | Changes |
|------|---------|---------|
| 2025-12-06 | 1.0 | Initial GDPR implementation documentation |

---

## References

- **GDPR Full Text**: https://gdpr-info.eu/
- **Data Protection Authorities**: https://edpb.europa.eu/
- **Project Implementation**: See `/user-service/src/routes/gdpr.ts`

---

**End of Document**
