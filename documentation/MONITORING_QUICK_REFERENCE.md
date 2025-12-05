# Monitoring Stack Quick Reference

## 🚀 Quick Start

```bash
# 1. Start services
make start

# 2. Apply optimizations (IMPORTANT - run once after first start)
make optimize-monitoring

# 3. Regular cleanup (run weekly or when disk is full)
make cleanup-logs
```

---

## 📊 Performance Improvements

| Metric | Before | After | Improvement |
|--------|--------|-------|-------------|
| Elasticsearch heap | 256 MB | 512 MB | 2x |
| Prometheus memory | 256 MB | 512 MB | 2x |
| Elasticsearch container | 512 MB | 1024 MB | 2x |
| Query timeout | No limit | 30 seconds | Controlled |
| Data retention | Unlimited | 30 days | Managed |
| Prometheus retention | 30 days | 15 days + 5GB | Optimized |
| Scrape interval | 15s | 30-60s | Less overhead |
| Kibana sample size | 500 | 500 | Limited |
| Filebeat batch size | 2048 | 50 | Reduced load |

**Expected Results:**
- 5-10x faster queries
- No more out-of-memory errors
- Controlled disk usage
- Faster dashboard loads

---

## 🔧 Configuration Files Added

```
elasticsearch/
├── elasticsearch.yml       # Query limits, cache settings
├── ilm-policy.json        # 30-day data retention
└── index-template.json    # Index optimization

kibana/
└── kibana.yml             # Timeout and sample size limits

scripts/
├── apply-elasticsearch-optimization.sh  # Setup script
└── cleanup-elasticsearch.sh             # Cleanup script

Updated:
├── filebeat/filebeat.yml           # Reduced batch size, field filtering
├── prometheus/prometheus.yml       # Increased scrape intervals
└── docker-compose.yml             # Increased memory, added configs
```

---

## 🎯 Common Issues & Solutions

### Issue: Grafana Dashboard Slow
```bash
# Check query count in dashboard
grep "interval" grafana/provisioning/dashboards/*.json

# Solution: Increase interval to 30s or 1m
# Edit dashboard JSON: "interval": "30s"
```

### Issue: Elasticsearch Out of Memory
```bash
# Check heap usage
docker logs elasticsearch | grep -i "memory"

# Solution: Already increased to 512m in optimization
# If still issues, increase to 1g in docker-compose.yml
```

### Issue: Disk Full
```bash
# Check disk usage
df -h | grep docker
curl localhost:9200/_cat/allocation?v

# Solution: Run cleanup
make cleanup-logs

# Or manual cleanup of specific indices
curl -X DELETE "localhost:9200/transcendence-2024.11.*"
```

### Issue: Kibana Discovery Timeout
```bash
# Check sample size
docker exec kibana cat /usr/share/kibana/config/kibana.yml | grep sampleSize

# Solution: Already limited to 500 in optimization
# Reduce time range in Kibana (use last 15 minutes instead of 24 hours)
```

### Issue: Slow Queries
```bash
# Enable slow query log (already enabled if you ran optimize-monitoring)
curl -X GET "localhost:9200/_nodes/stats/indices/search?pretty" | jq '.nodes[].indices.search'

# View slow queries
docker logs elasticsearch 2>&1 | grep "took\["

# Solution: Use time-based filters and limit result size
```

---

## 📈 Monitoring Commands

### Elasticsearch Health
```bash
# Cluster health
curl localhost:9200/_cluster/health?pretty

# Index list (sorted by size)
curl localhost:9200/_cat/indices?v&s=store.size:desc

# Disk allocation
curl localhost:9200/_cat/allocation?v

# Memory usage
curl localhost:9200/_nodes/stats/jvm?pretty
```

### Kibana Health
```bash
# Status check
curl localhost:5601/api/status | jq '.status'

# Dashboard count
ls -la grafana/provisioning/dashboards/
```

### Prometheus Health
```bash
# Metrics endpoint
curl localhost:9090/metrics | grep prometheus_

# TSDB stats
curl localhost:9090/api/v1/status/tsdb

# Target status
curl localhost:9090/api/v1/targets | jq '.data.activeTargets[] | {job, health}'
```

### Grafana Health
```bash
# Health check
curl http://admin:admin@localhost:3000/api/health

# Datasource list
curl http://admin:admin@localhost:3000/api/datasources | jq '.[] | {name, type}'
```

---

## 🛠️ Advanced Tuning

### Increase Elasticsearch Memory Further
```yaml
# In docker-compose.yml
elasticsearch:
  environment:
    - "ES_JAVA_OPTS=-Xms1g -Xmx1g"  # Increase from 512m
  mem_limit: 2048m  # Increase from 1024m
```

### Reduce Prometheus Retention
```yaml
# In docker-compose.yml prometheus command section
- '--storage.tsdb.retention.time=7d'   # Reduce from 15d
- '--storage.tsdb.retention.size=2GB'  # Reduce from 5GB
```

### Increase Scrape Intervals
```yaml
# In prometheus/prometheus.yml
global:
  scrape_interval: 60s  # Increase from 30s
  
# For specific jobs
- job_name: 'services'
  scrape_interval: 120s  # 2 minutes
```

### Aggressive Data Cleanup
```bash
# Delete data older than 7 days instead of 30
DAYS_TO_KEEP=7 ./scripts/cleanup-elasticsearch.sh

# Or add to crontab for daily cleanup
echo "0 2 * * * DAYS_TO_KEEP=7 /path/to/cleanup-elasticsearch.sh" | crontab -
```

---

## 📋 Maintenance Schedule

| Task | Frequency | Command |
|------|-----------|---------|
| Check disk usage | Daily | `df -h \| grep docker` |
| Cleanup old logs | Weekly | `make cleanup-logs` |
| Review slow queries | Weekly | `docker logs elasticsearch \| grep WARN` |
| Check cluster health | Daily | `curl localhost:9200/_cluster/health?pretty` |
| Optimize indices | Monthly | `curl -X POST "localhost:9200/_forcemerge"` |
| Review dashboards | Monthly | Check for slow-loading panels |
| Update retention | As needed | Adjust ILM policy |

---

## 🎓 Best Practices

1. **Always use time ranges** - Never query all data
2. **Limit result size** - Use `size: 100` or less in queries
3. **Use aggregations** - Instead of returning raw documents
4. **Monitor disk space** - Set up alerts at 80% usage
5. **Regular cleanup** - Automate with cron jobs
6. **Cache results** - Enable Elasticsearch query cache (already done)
7. **Sample large datasets** - Don't load millions of records
8. **Optimize dashboards** - Reduce panels, increase intervals

---

## 🔗 Quick Links

- Elasticsearch: http://localhost:9200
- Kibana: http://localhost:5601
- Prometheus: http://localhost:9090
- Grafana: http://localhost:3000 (admin/admin)

---

## 📚 Full Documentation

For complete details, see:
- [MONITORING_OPTIMIZATION.md](./MONITORING_OPTIMIZATION.md) - Full optimization guide
- [STARTUP_OPTIMIZATION.md](./STARTUP_OPTIMIZATION.md) - Docker startup optimization

---

## ✅ Checklist After First Setup

- [ ] Run `make start` to start all services
- [ ] Run `make optimize-monitoring` to apply optimizations
- [ ] Verify Elasticsearch health: `curl localhost:9200/_cluster/health?pretty`
- [ ] Check Kibana is accessible: http://localhost:5601
- [ ] Verify Grafana dashboards load: http://localhost:3000
- [ ] Test a query in Kibana (should be fast < 3s)
- [ ] Set up weekly cleanup cron job
- [ ] Monitor disk usage first week

**Done!** Your monitoring stack is now optimized for handling large data queries! 🎉
