# Transcendence Testing Suite

## Overview

This comprehensive testing suite validates the entire Transcendence microservices system, ensuring all services work correctly both individually and in integration. The suite includes automated tests for all REST API endpoints, WebSocket connectivity, and cross-service data consistency.

## Architecture

The system consists of 4 microservices:
- **Auth Service** (Port 3001): User authentication and authorization
- **Game Service** (Port 3002): Real-time game management and statistics
- **Tournament Service** (Port 3003): Tournament creation and management
- **User Service** (Port 3004): User profiles, achievements, and leaderboards
- **Blockchain Service** (Port 8545): Hardhat Ethereum node for tournament records

## Prerequisites

### System Requirements
- Docker and Docker Compose
- Bash shell (Linux/macOS/WSL)
- curl (for HTTP requests)
- Node.js and npm (for individual service testing)

### Environment Setup
1. Ensure all services are properly configured in `docker-compose.yml`
2. Database volumes are available for data persistence
3. All service dependencies are installed (`npm install` in each service directory)

## Quick Start

### Full System Test
Run the complete integration test suite:

```bash
./test.sh
```

This will:
1. Start all services with Docker Compose
2. Wait for services to become healthy
3. Run individual service tests
4. Perform cross-service integration tests
5. Clean up and report results

### Individual Service Tests
Test specific services when they're already running:

```bash
# Test authentication service
./auth-service/test.sh

# Test game service
./game-service/test.sh

# Test tournament service
./tournament-service/test.sh

# Test user service
./user-service/test.sh
```

## Test Coverage

### Auth Service Tests
- ✅ Health check endpoint
- ✅ User registration
- ✅ User login and token generation
- ✅ JWT token verification
- ✅ Protected profile access
- ✅ Password reset workflow

### Game Service Tests
- ✅ Health check endpoint
- ✅ Game history retrieval
- ✅ User game statistics
- ✅ Online users listing
- ✅ WebSocket endpoint availability

### Tournament Service Tests
- ✅ Health check endpoint
- ✅ Tournament listing and creation
- ✅ Tournament details retrieval
- ✅ User joining/leaving tournaments
- ✅ Tournament starting
- ✅ Match result submission
- ✅ Tournament leaderboards
- ✅ User tournament history

### User Service Tests
- ✅ Health check endpoint
- ✅ User profile CRUD operations
- ✅ Game statistics updates
- ✅ Achievement system (listing, unlocking, checking)
- ✅ User search functionality
- ✅ Online users display
- ✅ Leaderboards (wins, games played, win rate)

### Integration Tests
- ✅ End-to-end user registration flow
- ✅ Cross-service data consistency
- ✅ Authentication → Profile → Game Stats → Tournament workflow
- ✅ Data synchronization between services

## Test Execution Options

### Keep Services Running
After running the full test, keep services running for manual testing:

```bash
./test.sh --keep-running
```

Press `Ctrl+C` to stop services when done.

### Standalone Service Testing
For development and debugging, test individual services:

```bash
# In each service directory
cd auth-service
npm run dev &
./test.sh
```

## Test Results Interpretation

### Success Indicators
- 🟢 Green `[SUCCESS]` messages for passed tests
- ✅ All endpoint tests completed messages
- 🎉 Final success message

### Warning Signs
- 🟡 Yellow `[WARNING]` messages for non-critical issues
- Service health check timeouts
- Individual test failures

### Error Conditions
- 🔴 Red `[ERROR]` messages for critical failures
- Service startup failures
- Database connection issues
- Network connectivity problems

## Troubleshooting

### Common Issues

#### Services Won't Start
```bash
# Check Docker status
docker ps
docker-compose logs

# Clean restart
docker-compose down -v
docker-compose up -d
```

#### Port Conflicts
```bash
# Check what's using the ports
netstat -tulpn | grep :300[1-4]
lsof -i :3001

# Change ports in docker-compose.yml if needed
```

#### Database Issues
```bash
# Reset databases
docker-compose down -v
docker volume prune -f

# Check database logs
docker-compose logs user-service
```

#### Test Script Permissions
```bash
# Make scripts executable
chmod +x test.sh
chmod +x */test.sh
```

### Debug Mode
Run tests with verbose output:

```bash
# Enable debug logging in services
export DEBUG=*
./test.sh
```

## Development Workflow

### Adding New Tests
1. Edit the appropriate `test.sh` in the service directory
2. Add curl commands for new endpoints
3. Update the master `test.sh` if integration tests are needed
4. Test locally before committing

### Test Data Management
- Tests create test users and data
- Data persists between test runs unless volumes are cleaned
- Use different test user IDs to avoid conflicts

### Continuous Integration
For CI/CD pipelines, use:

```bash
# Non-interactive mode
./test.sh --ci

# With custom timeouts
TIMEOUT=60 ./test.sh
```

## Performance Considerations

### Test Execution Time
- Full test suite: ~2-3 minutes
- Individual service tests: ~30 seconds each
- Health checks: Up to 30 seconds per service

### Resource Usage
- Docker containers consume ~2GB RAM
- Database files grow with test data
- Clean up regularly to maintain performance

## Security Testing

The test suite includes basic security validation:
- JWT token authentication
- Protected endpoint access
- Password hashing verification
- CORS configuration testing

## Future Enhancements

### Planned Improvements
- WebSocket functional testing with `websocat`
- Load testing with Apache Bench
- Database migration testing
- Blockchain integration testing
- Frontend E2E testing integration

### Contributing
When adding new features:
1. Add corresponding tests to the appropriate `test.sh`
2. Update this README with new test coverage
3. Ensure tests pass in CI/CD pipeline
4. Document any new prerequisites or setup steps

## Support

For issues with the testing suite:
1. Check the troubleshooting section above
2. Review Docker and service logs
3. Verify network connectivity between containers
4. Ensure all dependencies are properly installed

---

**Last Updated**: November 25, 2025
**Test Suite Version**: 1.0.0