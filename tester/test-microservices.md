# Test Suite: Microservices Architecture

## Module: Designing Backend as Microservices
**Points:** 10 (Major)  
**Architecture:** Docker Compose, 4 independent services  
**Date:** December 5, 2025

---

## Test 1: Service Startup and Independence

### Objective
Verify each service starts independently without others.

### Test Steps
1. Start only auth
2. Verify it runs independently
3. Start only game
4. Repeat for all services
5. Start all services together

### Test Commands
```bash
# Start only auth
docker-compose up -d auth
sleep 5
docker-compose ps | grep auth

# Check it's running
curl http://auth:3000/health

# Cleanup
docker-compose stop auth

# Start only game
docker-compose up -d game
sleep 5
curl http://game:3000/health

# Cleanup
docker-compose stop game

# Start all services
docker-compose up -d
sleep 10
docker-compose ps
```

### Expected Results
```
✅ auth starts independently
✅ game starts independently
✅ tournament starts independently
✅ user starts independently
✅ All services start together
```

### Pass Criteria
- Each service runs on different port
- Services don't depend on startup order
- Health checks pass for all
- Logs show successful startup

---

## Test 2: Service Isolation - Database

### Objective
Verify each service has isolated database.

### Test Steps
1. Insert data in auth database
2. Verify it's not in game database
3. Check all 4 databases are separate
4. Verify schema isolation

### Test Commands
```bash
# Check database files
ls -la auth/database/
ls -la game/database/
ls -la tournament/database/
ls -la user/database/

# Verify each has different schema
sqlite3 auth/database/auth.db ".tables"
sqlite3 game/database/game.db ".tables"

# Create test data in one service
curl -X POST http://auth:3000/auth/register \
  -H "Content-Type: application/json" \
  -d '{"username":"testuser","email":"test@example.com","password":"pass123"}'

# Verify data not in game database
sqlite3 game/database/game.db "SELECT * FROM users WHERE username='testuser';" || echo "Not found (expected)"
```

### Pass Criteria
- Each service has own database file
- Schemas are service-specific
- Data isolated between services
- Cross-service queries require API calls

---

## Test 3: Inter-Service Communication

### Objective
Verify services can communicate via HTTP.

### Test Steps
1. Make request to one service
2. Trace call to second service
3. Verify response propagation
4. Check service discovery

### Test Commands
```bash
# Verify services can reach each other internally
docker exec game curl -s http://auth:3000/health
docker exec user curl -s http://game:3000/health
docker exec tournament curl -s http://user:3000/health

# Check logs for inter-service calls
docker logs game | grep "http://" || echo "No cross-calls yet"

# Make request that triggers chain
curl -X GET "http://user:3000/profile" \
  -H "Authorization: Bearer $TOKEN"

# Check logs
docker logs user | tail -5
docker logs game | tail -5
```

### Expected Communication Flow
```
Frontend → Nginx (80) → auth (3001)
Frontend → Nginx (80) → game (3002)
game → tournament (3000)
user → game (3000)
```

### Pass Criteria
- Services reach each other on internal network
- HTTP calls succeed
- Response timing reasonable
- No DNS resolution errors

---

## Test 4: Nginx Routing

### Objective
Verify Nginx correctly routes requests to services.

### Test Steps
1. Send request to /api/auth/*
2. Verify routed to auth
3. Send request to /api/games/*
4. Verify routed to game
5. Test all service routes

### Test Commands
```bash
# Test auth routes
curl -X POST http://localhost/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"username":"nginxtest","email":"nginx@test.com","password":"pass123"}'

# Test game routes
curl -X GET "http://localhost/api/games" \
  -H "Authorization: Bearer $TOKEN"

# Test tournament routes
curl -X GET "http://localhost/api/tournaments"

# Check Nginx logs
docker logs nginx | grep "GET\|POST" | tail -10
```

### Expected Routing Rules
```
/auth/*          → auth:3000
/games/*         → game:3000
/tournaments/*   → tournament:3000
/users/*         → user:3000
/api/*           → appropriate service
```

### Pass Criteria
- All routes reach correct service
- Response comes from right service
- Routing transparent to client
- No routing errors (502/504)

---

## Test 5: Service Health Checks

### Objective
Verify health checks monitor service status.

### Test Steps
1. Check health endpoint for each service
2. Verify response indicates "healthy"
3. Stop a service
4. Verify health check detects failure

### Test Commands
```bash
# Individual health checks
curl -X GET http://auth:3000/health | jq '.status'
curl -X GET http://game:3000/health | jq '.status'
curl -X GET http://tournament:3000/health | jq '.status'
curl -X GET http://user:3000/health | jq '.status'

# Check Docker health status
docker-compose ps --format "table {{.Names}}\t{{.Status}}"

# Stop a service and check health
docker-compose stop game
sleep 3

# Try to access game service
curl -X GET http://game:3000/health || echo "Service down (expected)"

# Restart service
docker-compose start game
sleep 3

# Verify recovered
curl -X GET http://game:3000/health | jq '.status'
```

### Expected Results
```
All services: status = "healthy"
Stopped service: curl fails or 503
Restarted service: status = "healthy" within 10 seconds
```

### Pass Criteria
- Health endpoints respond
- Status is "healthy" when running
- Docker reports "Up" status
- Failed services detected quickly

---

## Test 6: Horizontal Scaling

### Objective
Verify services can be scaled to multiple instances.

### Test Steps
1. Scale game to 2 instances
2. Verify both respond to requests
3. Check load balancing works
4. Stop one instance
5. Verify other continues handling requests

### Test Commands
```bash
# Scale game to 2 instances
docker-compose up -d --scale game=2

# Wait for startup
sleep 5

# Check running instances
docker-compose ps | grep game

# Make requests and observe which instance handles it
for i in {1..5}; do
  curl -X GET http://game:3000/health | jq '.container_id'
done

# Should see responses from different container IDs

# Stop one instance
CONTAINER=$(docker-compose ps -q game | head -1)
docker stop $CONTAINER

# Make more requests - should work on remaining instance
curl -X GET http://game:3000/health | jq '.status'

# Cleanup: Reset to 1 instance
docker-compose up -d --scale game=1
```

### Pass Criteria
- Services scale successfully
- Load balancing distributes requests
- Requests succeed even with instance down
- Cleanup removes extra instances

---

## Test 7: Secrets and Configuration Management

### Objective
Verify services use environment variables for config.

### Test Steps
1. Check docker-compose.yml for environment variables
2. Verify services read from environment
3. Test with different configurations
4. Verify no hardcoded secrets

### Test Commands
```bash
# Check environment variables in docker-compose.yml
grep -A 20 "environment:" docker-compose.yml

# Get service environment
docker exec auth env | grep -i "jwt\|database\|port"

# Verify secrets are not in logs
docker logs auth | grep -i "password\|secret\|token" || echo "No secrets in logs (good)"

# Check for hardcoded values in code
grep -r "password" auth/src/ --exclude="*.json" || echo "No hardcoded passwords (good)"
```

### Expected Results
```
✅ DATABASE_URL in environment
✅ JWT_SECRET in environment
✅ PORT in environment
✅ No hardcoded credentials
✅ No secrets in logs
```

### Pass Criteria
- All config from environment
- No hardcoded secrets in code
- Docker-compose doesn't contain secrets
- Services read environment correctly

---

## Test 8: Service Dependencies

### Objective
Verify services start in correct order when dependencies exist.

### Test Steps
1. Check depends_on in docker-compose.yml
2. Stop all services
3. Start services fresh
4. Verify startup order
5. Check no "connection refused" errors

### Test Commands
```bash
# Check dependencies
grep -B 2 "depends_on" docker-compose.yml

# Full restart with fresh containers
docker-compose down -v
docker-compose up -d

# Monitor startup in order
sleep 2
docker-compose logs --timestamps | grep "listening\|started\|ready" | sort

# Check for connection errors
docker-compose logs | grep -i "econnrefused\|unable to connect" || echo "No connection errors (good)"
```

### Expected Startup Order
```
1. Databases start
2. Cache/message queues start
3. Auth service starts
4. Other services start
5. Load balancer (Nginx) starts
```

### Pass Criteria
- Services respect dependencies
- No premature connections
- All services ready before accepting requests
- Proper wait logic in place

---

## Test 9: Data Consistency Across Services

### Objective
Verify data remains consistent when accessed via different services.

### Test Steps
1. Create user via auth
2. Query user via user
3. Update user via one service
4. Verify update seen by other service
5. Test transactional consistency

### Test Commands
```bash
# Create user via auth
curl -X POST http://auth:3000/auth/register \
  -H "Content-Type: application/json" \
  -d '{"username":"consistency","email":"cons@test.com","password":"pass123"}' \
  | jq '.user.id'

# Query via user
USER_ID=1
curl -X GET "http://user:3000/users/$USER_ID" \
  -H "Authorization: Bearer $TOKEN" | jq '.user.username'

# Should be "consistency"

# Update profile via one service
curl -X PUT "http://user:3000/users/$USER_ID" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"bio":"Updated bio"}'

# Verify update via other service
curl -X GET "http://auth:3000/users/$USER_ID" \
  -H "Authorization: Bearer $TOKEN" | jq '.user.bio'

# Should be "Updated bio"
```

### Pass Criteria
- User appears in all services
- Updates propagate correctly
- No stale data
- Eventual consistency achieved

---

## Test 10: Service Logging and Monitoring

### Objective
Verify logs are collected and services are monitored.

### Test Steps
1. Check service logs are available
2. Verify structured logging
3. Check for errors and warnings
4. Monitor service metrics

### Test Commands
```bash
# View logs for each service
docker-compose logs auth | tail -20
docker-compose logs game | tail -20

# Check for errors
docker-compose logs | grep -i "error\|exception" | head -20

# Long-running service test with log monitoring
docker-compose logs -f auth &
sleep 30
kill %1
```

### Expected Log Format
```
[timestamp] [service] [level] [message]
Example: 2025-12-05T10:30:00Z auth INFO Server listening on port 3000
```

### Pass Criteria
- Logs are structured
- Timestamps present
- Log levels (DEBUG, INFO, WARN, ERROR) used
- No sensitive data in logs

---

## Test 11: Graceful Service Shutdown

### Objective
Verify services shut down gracefully without data loss.

### Test Steps
1. Start all services
2. Make in-flight request
3. Signal graceful shutdown
4. Verify clean termination
5. Verify no data loss

### Test Commands
```bash
# Start services
docker-compose up -d

# Make request and immediately shutdown
(curl -X GET http://game:3000/health &) 
sleep 1
docker-compose stop game

# Check logs for graceful shutdown message
docker-compose logs game | tail -5

# Verify database is clean
docker-compose start game
sleep 3
curl -X GET http://game:3000/health | jq '.status'
```

### Pass Criteria
- Services terminate within 30 seconds
- Active connections closed cleanly
- Database connections released
- No orphaned processes
- Clean logs on shutdown

---

## Test 12: Network and Docker Compose Configuration

### Objective
Verify Docker Compose configuration is correct.

### Test Steps
1. Validate docker-compose.yml syntax
2. Verify network configuration
3. Check volume mounting
4. Verify port mapping

### Test Commands
```bash
# Validate docker-compose.yml
docker-compose config > /dev/null && echo "Config valid"

# Check network
docker network ls | grep transcendence
docker inspect transcendence_default | jq '.Containers'

# Verify volumes
docker volume ls | grep transcendence
docker volume inspect transcendence_auth-db

# Verify port mapping
docker-compose ps | grep "PORTS"

# Test port accessibility
for port in 3001 3002 3003 3004 80 5601 9200 9090 3000; do
  timeout 1 bash -c "echo > /dev/tcp/localhost/$port" 2>/dev/null && echo "Port $port: OK" || echo "Port $port: FAILED"
done
```

### Pass Criteria
- docker-compose.yml is valid
- Network connects all services
- Volumes properly mounted
- Ports correctly mapped
- All services accessible

---

## Summary

**Microservices Architecture:** ✅  
**Services:** 4 (auth, game, tournament, user)  
**Total Tests:** 12  
**Pass Criteria:** All 12 must pass

### Quick Test Commands
```bash
# Start all services
docker-compose up -d
sleep 10

# Check all services running
docker-compose ps

# Test all health endpoints
for port in 3001 3002 3003 3004; do
  echo "Testing port $port..."
  curl -s http://localhost:$port/health | jq '.status'
done
```

---

*Test Suite Created: December 5, 2025*
