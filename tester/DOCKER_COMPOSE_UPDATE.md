# Docker Compose Update

## What Changed
Updated all shell test scripts from `docker-compose` (v1) to `docker compose` (v2) command format.

## Updated Files
- `test-backend-framework.sh` - 3 occurrences updated
- `test-microservices.sh` - 2 occurrences updated

## Changes Made
```bash
# Old (v1)
docker-compose -f "$PROJECT_ROOT/docker-compose.yml" ps

# New (v2)
docker compose -f "$PROJECT_ROOT/docker-compose.yml" ps
```

## Why This Matters
- Docker Compose v2 is the newer format (included in modern Docker Desktop)
- `docker-compose` (standalone) is the deprecated v1 format
- `docker compose` is now the standard command

## Verification
The new format has been verified to work:
```bash
$ docker compose version
Docker Compose version v2.20.2
```

## How to Run Tests Now

### Start Services
```bash
cd /path/to/calvin_ft_transcendence
docker compose up -d
sleep 10  # Wait for services to be healthy
```

### Run All Tests
```bash
cd tester/
bash run-all-tests.sh
```

### Run Single Module Test
```bash
bash test-backend-framework.sh
bash test-database.sh
# etc...
```

## Expected Results
Once services are fully running:
- 12 modules × 12 tests = 144 total tests
- Each test should pass (✓) when services are operational
- Results saved to:
  - `results-[module-name].txt` (individual results)
  - `MASTER_TEST_RESULTS.txt` (consolidated results)

## Troubleshooting

### Issue: "Cannot connect to service"
**Cause**: Services still starting up  
**Solution**: Wait longer for services to be healthy
```bash
docker compose ps  # Check status
docker compose logs <service-name>  # View logs
```

### Issue: "Image not found: vault:latest"
**Cause**: Vault image isn't in docker-compose.yml properly  
**Solution**: Either use a specific vault image or skip vault tests

### Issue: "Port already in use"
**Cause**: Service already running  
**Solution**: Stop and remove existing containers
```bash
docker compose down
```

## Status
✅ Scripts updated to use `docker compose` v2  
✅ Compatible with modern Docker installations  
⏳ Ready for test execution once services are running
