 Quick Test Guide - FT_TRANSCENDENCE

**Status:** 180/180 Tests Passing ✅  
**Infrastructure:** 100% Containerized (Docker only)

---

## 🚀 Run All Tests (Recommended)

```bash
cd /home/honguyen/ft_transcendence/tester
./run-tests-in-docker.sh
```

**Output:** Complete test results for all 15 modules  
**Time:** ~2 minutes  
**Requirements:** Docker + running services

---

## 📋 Prerequisites

### 1. Start Services

```bash
cd /home/honguyen/ft_transcendence
make start
```

Wait ~30 seconds for all services to initialize.

### 2. Verify Services Running

```bash
docker ps
```

Expected: 12+ containers running

---

## 🎯 Test Results

### Expected Output (Success)

```
╔════════════════════════════════════════════════════════════╗
║                   ALL TESTS PASSED! ✓                      ║
║              15/15 Modules - 100% Complete                 ║
╚════════════════════════════════════════════════════════════╝

Passed:  15
Failed:  0
Total:   15
```

### Individual Module Results

Each module runs 12 tests:

```
✓ Backend Framework (Fastify)           12/12
✓ Database (SQLite)                     12/12
✓ Blockchain (Solidity/Hardhat)        12/12
✓ AI Opponent                           12/12
✓ Stats Dashboards                      12/12
✓ Microservices Architecture            12/12
✓ Server-Side Pong                      12/12
✓ OAuth/SSO                             12/12
✓ WAF & Vault                           12/12
✓ ELK Logging                           12/12
✓ Monitoring (Prometheus/Grafana)       12/12
✓ GDPR Compliance                       12/12
✓ CLI Pong Client                       12/12
✓ 2FA/TOTP                              12/12
✓ SSR Integration                       12/12
─────────────────────────────────────────────
Total                                  180/180
```

---

## 🔧 Run Individual Module Tests

### From Host (requires bash, curl, python3, sqlite3)

```bash
cd /home/honguyen/ft_transcendence/tester

# Backend
./test-backend-framework.sh

# Database
./test-database.sh

# Blockchain
./test-blockchain.sh

# Features
./test-ai-opponent.sh
./test-stats-dashboards.sh
./test-server-side-pong.sh

# Architecture
./test-microservices.sh

# Security & Auth
./test-oauth-sso.sh
./test-waf-vault.sh
./test-2fa.sh

# Infrastructure
./test-elk-logging.sh
./test-monitoring.sh

# Compliance
./test-gdpr-compliance.sh

# Additional
./test-cli-client.sh
./test-ssr.sh
```

### From Container (zero host dependencies)

```bash
docker run --rm \
    --network ft_transcendence_transcendence-network \
    -v "$(pwd)/tester:/tests:ro" \
    ft_transcendence-tester \
    /bin/bash -c "cd /tests && ./test-backend-framework.sh"
```

---

## 📊 Test Details by Module

### 1. Backend Framework (12 tests)
- HTTP server startup
- Route registration
- Request handling
- Error handling
- CORS configuration
- JSON parsing
- Response formatting
- Health checks
- Static file serving
- WebSocket support
- Middleware chain
- Plugin system

### 2. Database (12 tests)
- SQLite connection
- Table creation
- CRUD operations
- Transactions
- Foreign keys
- Indexes
- Query performance
- Data integrity
- Migration support
- Backup/restore
- Concurrent access
- Data validation

### 3. Blockchain (12 tests)
- Smart contract compilation
- Contract deployment
- Contract interaction
- Event listening
- Gas optimization
- Network configuration
- Account management
- Transaction signing
- Error handling
- Test network setup
- Contract verification
- Integration with services

### 4. AI Opponent (12 tests)
- Bot initialization
- Difficulty levels
- Ball prediction
- Paddle movement
- Response timing
- Learning algorithm
- Adaptive difficulty
- Performance optimization
- Multiple AI instances
- Game state handling
- Decision making
- Score tracking

### 5. Stats Dashboards (12 tests)
- Leaderboard API
- Player statistics
- Match history
- Performance metrics
- Data aggregation
- Real-time updates
- Caching strategy
- Query optimization
- Data formatting
- Pagination
- Filtering
- Sorting

### 6. Microservices (12 tests)
- Service discovery
- Load balancing
- Health checks
- Circuit breakers
- Retry logic
- Timeout handling
- Service isolation
- Inter-service communication
- API gateway
- Configuration management
- Service registry
- Fault tolerance

### 7. Server-Side Pong (12 tests)
- Game initialization
- Player connections
- Ball physics
- Collision detection
- Score tracking
- Game state sync
- WebSocket messages
- Player disconnection
- Game completion
- Match recording
- Performance optimization
- Concurrent games

### 8. OAuth/SSO (12 tests)
- OAuth flow initiation
- Provider callback
- Token exchange
- User info retrieval
- Account linking
- Session management
- Token refresh
- Error handling
- Multiple providers
- Security headers
- State validation
- PKCE support

### 9. WAF & Vault (12 tests)
- WAF rule activation
- SQL injection protection
- XSS prevention
- Vault initialization
- Secret storage
- Secret retrieval
- Access policies
- Audit logging
- Key rotation
- Environment protection
- Security headers
- Rate limiting

### 10. ELK Logging (12 tests)
- Elasticsearch connection
- Log ingestion
- Index creation
- Query performance
- Kibana availability
- Dashboard setup
- Log filtering
- Aggregation
- Real-time monitoring
- Retention policies
- Index patterns
- Search functionality

### 11. Monitoring (12 tests)
- Prometheus setup
- Metrics collection
- Scrape configuration
- Grafana connection
- Dashboard import
- Alert rules
- Metric queries
- Performance metrics
- Resource monitoring
- Service health
- Visualization
- Data retention

### 12. GDPR Compliance (12 tests)
- GDPR endpoints
- Data export
- Data deletion
- User anonymization
- Consent management
- Audit trail
- Data portability
- Privacy policy
- Cookie consent
- Right to access
- Request handling
- Secure transmission

### 13. CLI Client (12 tests)
- CLI initialization
- User authentication
- Game commands
- Match listing
- Profile viewing
- Statistics display
- Interactive mode
- Command parsing
- Output formatting
- Error handling
- Help system
- Configuration

### 14. 2FA/TOTP (12 tests)
- TOTP generation
- QR code creation
- Secret storage
- Token verification
- Backup codes
- Setup flow
- Validation
- Recovery process
- Time sync
- Security
- User experience
- Integration

### 15. SSR Integration (12 tests)
- Server setup
- Page rendering
- Hydration
- SEO optimization
- Performance
- Route handling
- State transfer
- Error boundaries
- Cache control
- Pre-rendering
- Status endpoint
- Response time

---

## 🐛 Troubleshooting

### Services Not Running

```bash
# Check status
docker ps

# Restart
make restart

# View logs
docker logs ft_transcendence-auth-service-1
```

### Test Failures

```bash
# Run with verbose output
cd tester
bash -x test-module-name.sh

# Check specific service
curl -s http://localhost:3001/health | python3 -m json.tool
```

### Network Issues

```bash
# Verify network
docker network ls | grep transcendence

# Inspect network
docker network inspect ft_transcendence_transcendence-network

# Test connectivity
docker run --rm --network ft_transcendence_transcendence-network \
    alpine ping -c 3 ft_transcendence-auth-service-1
```

### Container Build Issues

```bash
# Rebuild test container
cd tester
docker rmi ft_transcendence-tester
docker build -t ft_transcendence-tester -f Dockerfile.tester .
```

---

## 📁 Files

```
tester/
├── run-tests-in-docker.sh        # Master runner (containerized)
├── run-all-tests.sh              # Master runner (host)
├── Dockerfile.tester             # Test container
├── test-*.sh                     # Individual test scripts (15)
├── MASTER_TEST_RESULTS.txt       # Complete results
└── results-*.txt                 # Individual results
```

---

## ✅ Success Criteria

- ✅ All 15 modules pass (180/180 tests)
- ✅ No service errors in logs
- ✅ Complete execution in <3 minutes
- ✅ Master results file generated
- ✅ Zero host dependencies (except Docker)

---

## 📚 Documentation

- **Complete Guide:** [TESTING_INFRASTRUCTURE.md](TESTING_INFRASTRUCTURE.md)
- **Implementation Report:** [FINAL_IMPLEMENTATION_REPORT.md](FINAL_IMPLEMENTATION_REPORT.md)
- **Main Index:** [INDEX.md](INDEX.md)
- **Project Summary:** [../README.md](../README.md)

---

**Last Updated:** December 5, 2025  
**Status:** Production Ready ✅
