# Prometheus & Grafana Monitoring Implementation

**Date:** December 5, 2025

## Components Installed

### 1. Prometheus
- Version: Latest
- Port: 9090 (Time-series database and query engine)
- Storage: prometheus-data volume
- Configuration: `prometheus/prometheus.yml`

**Monitored Services:**
- Auth Service
- Game Service
- Tournament Service
- User Service
- Elasticsearch
- Vault
- Docker daemon (if available)

### 2. Grafana
- Version: Latest
- Port: 3000 (Visualization and dashboarding)
- Default credentials: admin / admin
- Dashboards: Auto-provisioned from config files
- Data source: Prometheus (pre-configured)

## How to Use

### Access Services

**Prometheus:** http://localhost:9090
- Query metrics using PromQL
- View scrape targets and their status
- Check alert rules and status

**Grafana:** http://localhost:3000
- Username: admin
- Password: admin
- Pre-configured Prometheus datasource
- Basic monitoring dashboard included

### Available Metrics

#### Service Health
```promql
up{job="auth-service"}        # 1 = up, 0 = down
up{job="game-service"}
up{job="tournament-service"}
up{job="user-service"}
```

#### Common Prometheus Metrics
```promql
node_cpu_seconds_total          # CPU usage
node_memory_MemAvailable_bytes  # Available memory
node_network_receive_bytes_total # Network I/O
```

### Create Custom Dashboards

1. Go to http://localhost:3000
2. Click "Create" > "Dashboard"
3. Click "Add panel"
4. Select "Prometheus" as datasource
5. Write PromQL queries to visualize metrics
6. Save the dashboard

### Example Queries

**Service Uptime:**
```promql
up{job=~"auth-service|game-service|tournament-service|user-service"}
```

**Request Rate:**
```promql
rate(http_requests_total[5m])
```

**Error Rate:**
```promql
rate(http_requests_total{status=~"5.."}[5m])
```

## Enabling Metrics in Services

Each service needs to expose a `/metrics` endpoint. Add to your Node.js services:

### 1. Install Prometheus client
```bash
npm install prom-client
```

### 2. Add metrics middleware to Fastify

```typescript
// auth-service/src/utils/metrics.ts
import client from 'prom-client';

// Default metrics
client.collectDefaultMetrics();

// Custom metrics
export const httpRequestDuration = new client.Histogram({
  name: 'http_request_duration_seconds',
  help: 'Duration of HTTP requests in seconds',
  labelNames: ['method', 'route', 'status_code'],
  buckets: [0.1, 0.5, 1, 2, 5]
});

export const httpRequestTotal = new client.Counter({
  name: 'http_requests_total',
  help: 'Total number of HTTP requests',
  labelNames: ['method', 'route', 'status_code']
});

export function metricsRegister() {
  return client.register;
}
```

```typescript
// auth-service/src/server.ts
import { metricsRegister } from './utils/metrics';

fastify.get('/metrics', async (request, reply) => {
  reply.type('text/plain');
  return metricsRegister().metrics();
});
```

### 3. Add middleware to track requests

```typescript
fastify.addHook('onRequest', async (request, reply) => {
  request.startTime = Date.now();
});

fastify.addHook('onResponse', async (request, reply) => {
  const duration = (Date.now() - request.startTime) / 1000;
  httpRequestDuration
    .labels(request.method, request.url, reply.statusCode)
    .observe(duration);
  httpRequestTotal
    .labels(request.method, request.url, reply.statusCode)
    .inc();
});
```

## Configuration Files

- `prometheus/prometheus.yml` - Prometheus scrape configuration
- `grafana/provisioning/datasources/prometheus.yml` - Prometheus datasource config
- `grafana/provisioning/dashboards/` - Dashboard definitions
- `docker-compose.yml` - Prometheus and Grafana services

## Data Retention

Prometheus retains metrics for **15 days** by default. To change:

```bash
prometheus --storage.tsdb.retention.time=30d
```

## Production Considerations

1. **High Availability:**
   - Deploy Prometheus with remote storage (e.g., AWS S3, InfluxDB)
   - Use Grafana Enterprise for HA setup
   - Load balance Grafana instances

2. **Security:**
   - Change Grafana default password
   - Enable SSL/TLS for connections
   - Use authentication providers (LDAP, OAuth, etc.)
   - Restrict access to Prometheus endpoints

3. **Performance:**
   - Optimize scrape intervals for large environments
   - Use recording rules for complex queries
   - Implement service discovery (Kubernetes, Consul, etc.)

4. **Alerting:**
   - Configure alert rules in Prometheus
   - Set up notification channels (Slack, PagerDuty, etc.)
   - Define escalation policies

## Testing

1. Start the stack:
   ```bash
   docker-compose up -d
   ```

2. Check Prometheus targets:
   ```bash
   curl http://localhost:9090/api/v1/targets
   ```

3. View metrics:
   ```bash
   curl http://localhost:9090/api/v1/query?query=up
   ```

4. Access Grafana:
   ```
   http://localhost:3000
   ```

## Files Modified

- `docker-compose.yml` - Added prometheus and grafana services
- `prometheus/prometheus.yml` - Scrape configuration
- `grafana/provisioning/datasources/prometheus.yml` - Datasource config
- `grafana/provisioning/dashboards/` - Dashboard definitions

## Points Earned

**Module: Monitoring system**
- Status: ✅ Completed
- Points: 5 (Minor)
