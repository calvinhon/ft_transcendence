# Grafana Monitoring Setup for Docker Compose Services

## Overview

Your ft_transcendence project uses a complete monitoring stack that collects metrics from all services and displays them in Grafana dashboards. Here's how each layer works:

---

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                    Docker Compose Services                       │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐           │
│  │  Auth Svc    │  │  Game Svc    │  │ Tournament   │  ...      │
│  │  :3000       │  │  :3000       │  │  Svc :3000   │           │
│  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘           │
│         │ /metrics         │ /metrics         │ /metrics         │
│         └─────────────────────────────────────┘                  │
└─────────────────────────────────────────────────────────────────┘
                             │
                    (Prometheus scrapes)
                             │
┌─────────────────────────────────────────────────────────────────┐
│            Prometheus (Time Series Database)                     │
│            Container: prometheus                                │
│            Port: 9090                                            │
│            Role: Scrapes /metrics endpoints every 60s           │
└─────────────────────────────────────────────────────────────────┘
                             │
                    (Reads metrics from)
                             │
┌─────────────────────────────────────────────────────────────────┐
│            Grafana (Visualization & Dashboards)                  │
│            Container: grafana                                    │
│            Port: 3000                                            │
│            Role: Display metrics in dashboards                  │
└─────────────────────────────────────────────────────────────────┘
```

---

## Step 1: Services Expose Metrics

### What Changed
Each microservice now exposes a `/metrics` endpoint in Prometheus text format.

### Implementation Details

**Services with metrics:**
- `auth-service` (port 3001)
- `game-service` (port 3002)
- `tournament-service` (port 3003)
- `user-service` (port 3004)

**Metrics exposed by each service:**

```
GET /metrics → Returns Prometheus format text
```

Example output:
```prometheus
# HELP http_request_duration_seconds Duration of HTTP requests in seconds
# TYPE http_request_duration_seconds histogram
http_request_duration_seconds_bucket{le="0.1",method="GET",route="/metrics",status_code="200"} 1
http_request_duration_seconds_bucket{le="0.5",method="GET",route="/metrics",status_code="200"} 1
http_request_duration_seconds_sum{method="GET",route="/metrics",status_code="200"} 0.004
http_request_duration_seconds_count{method="GET",route="/metrics",status_code="200"} 1

# HELP http_requests_total Total number of HTTP requests
# TYPE http_requests_total counter
http_requests_total{method="GET",route="/metrics",status_code="200"} 1
```

**How it's implemented:**
- Library: `prom-client` (v15.1.0)
- Metrics collected via Fastify hooks:
  - `preHandler`: Captures request start time
  - `onResponse`: Records metrics after response sent

---

## Step 2: Prometheus Configuration

### File: `prometheus/prometheus.yml`

Prometheus is configured to scrape metrics from all services:

```yaml
global:
  scrape_interval: 1m        # Scrape every 60 seconds
  scrape_timeout: 10s
  evaluation_interval: 15s

scrape_configs:
  # Auth Service Metrics
  - job_name: 'auth-service'
    static_configs:
      - targets: ['auth-service:3000']
    metrics_path: '/metrics'

  # Game Service Metrics
  - job_name: 'game-service'
    static_configs:
      - targets: ['game-service:3000']
    metrics_path: '/metrics'

  # Tournament Service Metrics
  - job_name: 'tournament-service'
    static_configs:
      - targets: ['tournament-service:3000']
    metrics_path: '/metrics'

  # User Service Metrics
  - job_name: 'user-service'
    static_configs:
      - targets: ['user-service:3000']
    metrics_path: '/metrics'

  # ... other services (prometheus, vault, etc.)
```

### How Prometheus Scrapes Metrics

1. **Every 60 seconds**, Prometheus makes HTTP requests:
   - `http://auth-service:3000/metrics`
   - `http://game-service:3000/metrics`
   - `http://tournament-service:3000/metrics`
   - `http://user-service:3000/metrics`

2. **Metrics are stored** in Prometheus time-series database with timestamps

3. **Metrics are labeled** with:
   - `job`: Service name (e.g., "auth-service")
   - `instance`: Service network address (e.g., "auth-service:3000")
   - Custom labels: `method`, `route`, `status_code`

---

## Step 3: Grafana Configuration

### File: `grafana/provisioning/dashboards/transcendence-monitoring.json`

Grafana is configured with:

**Data Source**: Prometheus
- URL: `http://prometheus:9090`
- Scrape interval: 60s

**Dashboard Panels** query Prometheus for metrics:

```json
{
  "datasource": "Prometheus",
  "targets": [
    {
      "expr": "http_requests_total{job='auth-service'}",
      "legendFormat": "Auth - {{method}} {{route}}"
    },
    {
      "expr": "http_request_duration_seconds_count{job='game-service'}",
      "legendFormat": "Game - {{route}}"
    }
  ]
}
```

---

## How Each Layer Works

### Layer 1: Service Metrics Collection
```
request → [preHandler hook: capture start time]
         → [process request]
         → [onResponse hook: record duration & increment counter]
         → response
         → metrics stored in prom-client registry
```

### Layer 2: Prometheus Scraping
```
Every 60 seconds:
  1. GET http://service:3000/metrics
  2. Parse Prometheus text format
  3. Store metrics with timestamp
  4. Discard old data (retention: 15 days)
```

### Layer 3: Grafana Visualization
```
Dashboard load:
  1. Query Prometheus: "http_requests_total{job='auth-service'}"
  2. Receive time-series data
  3. Render panels: graphs, tables, gauges
  4. Update every few seconds (configurable)
```

---

## Monitoring Workflow

### 1. Start all services
```bash
docker compose up -d
```

### 2. Verify services are running
```bash
docker compose ps
```

Expected output - all services UP:
```
auth            ft_transcendence-auth-service       Up 15 seconds    0.0.0.0:3001->3000/tcp
game            ft_transcendence-game-service       Up 15 seconds    0.0.0.0:3002->3000/tcp
tournament      ft_transcendence-tournament-service Up 15 seconds    0.0.0.0:3003->3000/tcp
user            ft_transcendence-user-service       Up 15 seconds    0.0.0.0:3004->3000/tcp
prometheus      prom/prometheus:latest              Up 15 seconds    0.0.0.0:9090->9090/tcp
grafana         grafana/grafana:latest              Up 15 seconds    0.0.0.0:3000->3000/tcp
```

### 3. Verify /metrics endpoints are accessible
```bash
curl http://localhost:3001/metrics  # Auth service
curl http://localhost:3002/metrics  # Game service
curl http://localhost:3003/metrics  # Tournament service
curl http://localhost:3004/metrics  # User service
```

Expected: Prometheus format text with metrics

### 4. Check Prometheus targets
Visit: **http://localhost:9090/targets**

Expected: All services show `UP` (green)

### 5. Access Grafana Dashboard
Visit: **http://localhost:3000**
- Username: `admin`
- Password: `admin`

Navigate to: **Dashboards → Transcendence → Transcendence Monitoring**

Expected: Panels display metrics from all services

---

## Metrics Available

### Request Metrics (Per Service)

#### `http_requests_total` (Counter)
- **What**: Total number of HTTP requests processed
- **Labels**: `method`, `route`, `status_code`
- **Example**: 
  ```
  http_requests_total{method="GET",route="/api/users",status_code="200"} 42
  ```

#### `http_request_duration_seconds` (Histogram)
- **What**: HTTP request duration distribution
- **Labels**: `method`, `route`, `status_code`
- **Buckets**: 0.1s, 0.5s, 1s, 2s, 5s, +Inf
- **Example**:
  ```
  http_request_duration_seconds_bucket{le="0.5",method="POST",route="/api/login",status_code="200"} 15
  http_request_duration_seconds_sum{method="POST",route="/api/login",status_code="200"} 3.45
  http_request_duration_seconds_count{method="POST",route="/api/login",status_code="200"} 20
  ```

### Useful PromQL Queries

```promql
# Request rate per service (requests/sec)
rate(http_requests_total[1m])

# Average request duration
rate(http_request_duration_seconds_sum[1m]) / rate(http_request_duration_seconds_count[1m])

# Error rate (non-2xx responses)
rate(http_requests_total{status_code!~"2.."}[1m])

# P95 latency
histogram_quantile(0.95, http_request_duration_seconds_bucket)

# Requests by method
sum by (method) (rate(http_requests_total[5m]))
```

---

## Troubleshooting

### Services not appearing in Prometheus targets
**Problem**: Services show `DOWN` in Prometheus targets

**Solutions**:
1. Verify services are running: `docker compose ps`
2. Verify `/metrics` endpoint: `curl http://service-name:3000/metrics`
3. Check Prometheus logs: `docker logs prometheus`
4. Check service logs: `docker logs auth` (or other service name)

### No data in Grafana
**Problem**: Grafana dashboards are empty

**Solutions**:
1. Wait 60+ seconds for first Prometheus scrape
2. Query Prometheus directly: http://localhost:9090
3. Try a simple query: `up{job="auth-service"}`
4. Check Prometheus targets are UP
5. Verify Grafana data source: **Admin → Data Sources → Prometheus**

### Metrics reset after service restart
**Problem**: Metrics show zero after container restart

**Note**: This is expected behavior. Metrics are stored in memory and reset when services restart. Prometheus retains historical data.

---

## Adding New Services to Monitoring

### 1. Add `/metrics` endpoint to your service

```typescript
import { register, Counter, Histogram } from 'prom-client';

// Create metrics
const httpRequestDuration = new Histogram({
  name: 'http_request_duration_seconds',
  help: 'Duration of HTTP requests in seconds',
  labelNames: ['method', 'route', 'status_code'],
  buckets: [0.1, 0.5, 1, 2, 5]
});

const httpRequestsTotal = new Counter({
  name: 'http_requests_total',
  help: 'Total number of HTTP requests',
  labelNames: ['method', 'route', 'status_code']
});

// Register /metrics endpoint
app.get('/metrics', async (req, res) => {
  res.set('Content-Type', register.contentType);
  res.end(await register.metrics());
});

// Track metrics with hooks
app.addHook('preHandler', (request) => {
  (request as any).startTime = Date.now();
});

app.addHook('onResponse', (request, reply) => {
  const duration = (Date.now() - ((request as any).startTime || Date.now())) / 1000;
  httpRequestDuration.observe(
    { method: request.method, route: request.url, status_code: reply.statusCode },
    duration
  );
  httpRequestsTotal.inc({
    method: request.method,
    route: request.url,
    status_code: reply.statusCode
  });
});
```

### 2. Add to Prometheus configuration

Edit `prometheus/prometheus.yml`:

```yaml
scrape_configs:
  - job_name: 'my-new-service'
    static_configs:
      - targets: ['my-new-service:3000']
    metrics_path: '/metrics'
    scrape_interval: 1m
```

### 3. Reload Prometheus

```bash
curl -X POST http://localhost:9090/-/reload
```

---

## Performance Considerations

### Metrics Overhead
- **Memory**: Each service uses ~10-20MB for metrics storage
- **CPU**: Minimal (only increments counters on requests)
- **Network**: One HTTP request per service every 60 seconds to Prometheus

### Data Retention
- **Prometheus**: 15 days (configured in docker-compose.yml)
- **Prometheus storage**: 5GB max (configured in docker-compose.yml)

### Dashboard Refresh Rate
- Default: 30 seconds (configurable in Grafana)
- Minimum recommended: 30 seconds (avoid overwhelming Prometheus)

---

## Summary

**How Grafana monitors Docker Compose services:**

1. **Services expose metrics** at `/metrics` endpoint
2. **Prometheus scrapes** every 60 seconds and stores data
3. **Grafana queries** Prometheus for metrics
4. **Dashboards visualize** the data in real-time

**Current monitoring status:**
- ✅ Auth Service: Monitored
- ✅ Game Service: Monitored
- ✅ Tournament Service: Monitored
- ✅ User Service: Monitored
- ✅ Prometheus: Collecting metrics
- ✅ Grafana: Displaying dashboards

**To access monitoring:**
- Prometheus: http://localhost:9090
- Grafana: http://localhost:3000 (admin/admin)
