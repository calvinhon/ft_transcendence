# Test Suite: Monitoring (Prometheus/Grafana)

## Module: Monitoring (Prometheus/Grafana)
**Points:** 5 (Minor)  
**Components:** Prometheus, Grafana  
**Date:** December 5, 2025

---

## Test 1: Prometheus Startup and Health

### Objective
Verify Prometheus starts and collects metrics.

### Test Steps
1. Check Prometheus container running
2. Verify health endpoint
3. Check targets
4. Verify metrics collected

### Test Commands
```bash
# Check Prometheus running
docker-compose ps | grep prometheus

# Health check (Prometheus doesn't have traditional health check)
curl -s http://localhost:9090/-/healthy

# Expected: 200 OK

# Check targets page
curl -s http://localhost:9090/api/v1/targets | jq '.data.activeTargets | length'

# Expected: Should show active targets (services)

# Get list of active targets
curl -s http://localhost:9090/api/v1/targets | jq '.data.activeTargets[] | {job: .labels.job, state}'
```

### Pass Criteria
- Prometheus container running
- Health endpoint responds
- Active targets present
- Metrics being collected
- No scrape errors

---

## Test 2: Prometheus Configuration

### Objective
Verify Prometheus is configured correctly.

### Test Steps
1. Check config file
2. Verify scrape configs
3. Check target discovery
4. Verify evaluation interval

### Test Commands
```bash
# Check configuration file
cat prometheus/prometheus.yml | head -50

# Expected content:
# global:
#   scrape_interval: 15s
#   evaluation_interval: 15s
# scrape_configs:
#   - job_name: 'auth'
#     static_configs:
#       - targets: ['auth:3000']

# Reload configuration without restart
curl -X POST http://localhost:9090/-/reload

# Check if configuration is valid
curl -s http://localhost:9090/api/v1/alerts | jq '.status'
# Expected: "success"
```

### Pass Criteria
- Config file present and valid
- Scrape interval 15s or reasonable
- All services configured
- Metrics path specified
- Static configs with targets

---

## Test 3: Metrics Collection from Services

### Objective
Verify Prometheus collects metrics from each service.

### Test Steps
1. Check auth metrics
2. Check game metrics
3. Check other services
4. Verify metric names

### Test Commands
```bash
# Get metrics directly from auth
curl -s http://localhost:3001/metrics | head -30

# Expected format (Prometheus text format):
# # HELP process_cpu_usage_seconds_total Total user and system CPU time spent in seconds
# # TYPE process_cpu_usage_seconds_total counter
# process_cpu_usage_seconds_total 12.34

# Check Prometheus has scraped the service
curl -s "http://localhost:9090/api/v1/query?query=up{job='auth'}" | jq '.data'

# Expected: value [timestamp, "1"] (1 = up)

# Check request metrics
curl -s "http://localhost:9090/api/v1/query?query=http_requests_total" | jq '.data.result[] | {job: .metric.job, requests: .value[1]}'

# Check latency metrics
curl -s "http://localhost:9090/api/v1/query?query=http_request_duration_seconds" | jq '.data.result[] | {job: .metric.job}'
```

### Pass Criteria
- Metrics endpoint accessible on each service
- Prometheus scrapes successfully
- Up metric shows 1 (service up)
- Request metrics collected
- Duration metrics collected

---

## Test 4: Grafana Startup and Access

### Objective
Verify Grafana starts and is accessible.

### Test Steps
1. Check Grafana container running
2. Verify web UI accessible
3. Check default login credentials
4. Verify Prometheus datasource

### Test Commands
```bash
# Check Grafana running
docker-compose ps | grep grafana

# Health check
curl -s http://localhost:3000/api/health | jq '.database'

# Expected: "ok"

# Check if can access web UI (returns HTML)
curl -s http://localhost:3000/ | grep -i "grafana" | head -3

# Check Prometheus datasource configured
curl -s -H "Authorization: Bearer admin:admin" \
  http://localhost:3000/api/datasources | jq '.[] | {name, type, url}'

# Expected: Prometheus datasource with type="prometheus"
```

### Pass Criteria
- Grafana container running
- Web UI accessible on port 3000
- Health check passes
- Prometheus datasource configured
- Default credentials work

---

## Test 5: Service Health Dashboard

### Objective
Verify dashboard shows service health status.

### Test Steps
1. Access Grafana
2. Navigate to dashboard
3. Check service status
4. Verify uptime metric

### Test Commands
```bash
# Browser-based test (manual):
# 1. Open http://localhost:3000 in browser
# 2. Login with admin/admin
# 3. Navigate to Dashboards
# 4. Open "Transcendence" dashboard (if provisioned)
# 5. Look for service health sections
# 6. Verify each service shows "UP" or "HEALTHY"
# 7. Check uptime counter

# API test for dashboard
curl -s -H "Authorization: Bearer admin:admin" \
  http://localhost:3000/api/search?type=dash-db | jq '.[] | {title, tags}'

# Get specific dashboard
curl -s -H "Authorization: Bearer admin:admin" \
  http://localhost:3000/api/dashboards/db/transcendence | jq '.dashboard.title'
```

### Pass Criteria
- Dashboard accessible
- Service health visible
- Uptime metric shown
- Status accurate
- Graphs loading

---

## Test 6: Metrics Visualization

### Objective
Verify metrics are visualized in graphs.

### Test Steps
1. Navigate to Prometheus graph page
2. Query metrics
3. View graph
4. Check time range

### Test Commands
```bash
# Browser-based test:
# 1. Open http://localhost:9090 in browser
# 2. Go to "Graph" tab
# 3. In query box, enter: up{job="auth"}
# 4. Click "Execute"
# 5. Verify graph shows service up/down status
# 6. Change time range (1h, 6h, 24h)

# API test for querying metrics
curl -s "http://localhost:9090/api/v1/query_range" \
  --data-urlencode 'query=up{job="auth"}' \
  --data-urlencode 'start=2025-12-05T09:00:00Z' \
  --data-urlencode 'end=2025-12-05T11:00:00Z' \
  --data-urlencode 'step=60s' \
  | jq '.data.result[0] | {metric: .metric.job, values: .values | length}'

# Expected: Should show multiple data points
```

### Pass Criteria
- Metrics can be queried
- Graphs render correctly
- Time series data visible
- Multiple data points
- Time range adjustable

---

## Test 7: Alert Rules

### Objective
Verify alert rules are configured.

### Test Steps
1. Check alert rules file
2. Verify rule syntax
3. Check rule evaluation
4. Verify alert triggers

### Test Commands
```bash
# Check if alert rules configured
ls prometheus/alert*.yml 2>/dev/null || echo "Alert rules not found (optional)"

# Check alert rules in prometheus.yml
grep -A 5 "rule_files:" prometheus/prometheus.yml

# Get alerts from Prometheus
curl -s http://localhost:9090/api/v1/alerts | jq '.data.alerts | length'

# Expected: 0 if no alerts configured

# If rules exist, check evaluation
curl -s http://localhost:9090/api/v1/rules | jq '.data.groups | length'

# Expected: Number of configured rule groups
```

### Pass Criteria
- Alert rules configured (optional)
- Rule syntax valid
- Rules evaluating
- Can list active rules
- Alert thresholds set

---

## Test 8: Dashboard Provisioning

### Objective
Verify dashboards are auto-provisioned.

### Test Steps
1. Check provisioning directory
2. Verify dashboard files
3. Verify Grafana loads them
4. Check dashboard list

### Test Commands
```bash
# Check provisioning files
ls -lah grafana/provisioning/dashboards/

# Expected:
# - dashboards.yml (provisioning config)
# - transcendence.json (dashboard definition)

# Verify content
cat grafana/provisioning/dashboards/dashboards.yml | head -20

# Check if Grafana loaded dashboards
curl -s -H "Authorization: Bearer admin:admin" \
  http://localhost:3000/api/search | jq '.[] | {title, id}'

# Expected: Should list provisioned dashboards
```

### Pass Criteria
- Provisioning directory exists
- Dashboard files present
- Provisioning config valid
- Grafana loads dashboards
- Dashboards list shows them

---

## Test 9: Datasource Configuration

### Objective
Verify Prometheus datasource is properly configured.

### Test Steps
1. Check datasource definition
2. Verify connection to Prometheus
3. Test datasource query
4. Check datasource health

### Test Commands
```bash
# Check provisioning datasources
cat grafana/provisioning/datasources/prometheus.yml

# Expected:
# apiVersion: 1
# datasources:
# - name: Prometheus
#   type: prometheus
#   url: http://prometheus:9090
#   access: proxy
#   isDefault: true

# Test datasource query via API
curl -s -H "Authorization: Bearer admin:admin" \
  http://localhost:3000/api/datasources | jq '.[] | {name, type, url}'

# Check datasource health
curl -s -H "Authorization: Bearer admin:admin" \
  http://localhost:3000/api/datasources/1/health | jq '.status'

# Expected: "ok"
```

### Pass Criteria
- Datasource file exists and valid
- Prometheus URL correct
- Datasource name set
- Health check passes
- Queries work

---

## Test 10: Custom Metrics Dashboard

### Objective
Verify custom dashboards can display service metrics.

### Test Steps
1. Create custom dashboard (if applicable)
2. Add metrics panels
3. Query service metrics
4. Verify visualization

### Test Commands
```bash
# List available metrics from Prometheus
curl -s http://localhost:9090/api/v1/label/__name__/values | jq '.data | length'

# Expected: Multiple metric names

# Get some example metrics
curl -s http://localhost:9090/api/v1/label/__name__/values | jq '.data | .[0:10]'

# Create sample metric query via API
curl -s http://localhost:9090/api/v1/query?query='http_request_duration_seconds_bucket' | jq '.data'

# Browser test:
# 1. Open Grafana
# 2. Click "+" to create new dashboard
# 3. Add panel
# 4. Select Prometheus datasource
# 5. Query: up{job="auth"}
# 6. Verify graph shows service up/down
```

### Pass Criteria
- Can list available metrics
- Can query metrics
- Custom dashboard creation works
- Metrics display in graphs
- Legends and labels correct

---

## Test 11: Performance Monitoring

### Objective
Verify performance metrics are collected.

### Test Steps
1. Check CPU metrics
2. Check memory metrics
3. Check request latency
4. Check error rates

### Test Commands
```bash
# CPU usage of services
curl -s "http://localhost:9090/api/v1/query?query=rate(process_cpu_seconds_total[5m])" \
  | jq '.data.result[] | {job: .metric.job, cpu_time: .value[1]}'

# Memory usage
curl -s "http://localhost:9090/api/v1/query?query=process_resident_memory_bytes" \
  | jq '.data.result[] | {job: .metric.job, memory: .value[1]}'

# Request latency (if available)
curl -s "http://localhost:9090/api/v1/query?query=http_request_duration_seconds" \
  | jq '.data.result[] | {job: .metric.job, le: .metric.le}' | head -10

# Error rate (if available)
curl -s "http://localhost:9090/api/v1/query?query=http_requests_total{status=~'5...'}" \
  | jq '.data.result[] | {job: .metric.job, errors: .value[1]}'
```

### Pass Criteria
- CPU metrics available
- Memory metrics available
- Request metrics available
- Error metrics available
- Data accurate

---

## Test 12: Metrics Storage and History

### Objective
Verify metrics are stored and historical data available.

### Test Steps
1. Query metrics from different times
2. Check data retention
3. Verify time series data
4. Check storage usage

### Test Commands
```bash
# Check metrics from 1 hour ago
curl -s "http://localhost:9090/api/v1/query_range" \
  --data-urlencode 'query=up' \
  --data-urlencode 'start=2025-12-05T09:00:00Z' \
  --data-urlencode 'end=2025-12-05T10:00:00Z' \
  --data-urlencode 'step=5m' \
  | jq '.data.result | length'

# Expected: Multiple results for multiple time points

# Check storage size
curl -s http://localhost:9090/api/v1/query?query=prometheus_tsdb_symbol_table_size_bytes \
  | jq '.data.result[0].value[1]'

# Check number of time series
curl -s http://localhost:9090/api/v1/query?query=prometheus_tsdb_metric_chunks_created_total \
  | jq '.data.result[0].value[1]'

# Check retention settings
docker inspect prometheus | grep -i "retention\|storage" || echo "Check in prometheus.yml"

cat prometheus/prometheus.yml | grep -i "storage"
```

### Pass Criteria
- Historical data available
- Time range queries work
- Multiple data points retained
- Storage size reasonable
- Data not lost

---

## Summary

**Prometheus/Grafana Module:** ✅  
**Components:** Prometheus, Grafana  
**Total Tests:** 12  
**Pass Criteria:** All 12 must pass

### Quick Test Commands
```bash
# Check Prometheus
curl http://localhost:9090/-/healthy

# Check Grafana
curl http://localhost:3000/api/health | jq '.database'

# Query metrics
curl "http://localhost:9090/api/v1/query?query=up" | jq '.data.result | length'

# Access Prometheus UI
open http://localhost:9090

# Access Grafana UI
open http://localhost:3000
```

---

*Test Suite Created: December 5, 2025*
