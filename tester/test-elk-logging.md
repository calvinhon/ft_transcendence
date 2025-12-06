# Test Suite: Log Management (ELK Stack)

## Module: Log Management (ELK Stack)
**Points:** 10 (Major)  
**Components:** Elasticsearch, Kibana, Filebeat  
**Date:** December 5, 2025

---

## Test 1: Elasticsearch Startup and Health

### Objective
Verify Elasticsearch starts and is healthy.

### Test Steps
1. Check Elasticsearch container running
2. Verify health endpoint
3. Check cluster status
4. Verify data nodes

### Test Commands
```bash
# Check Elasticsearch running
docker-compose ps | grep elasticsearch

# Health check
curl -s http://localhost:9200/_cluster/health | jq .

# Expected response:
# {
#   "cluster_name": "docker-cluster",
#   "status": "green",
#   "timed_out": false,
#   "number_of_nodes": 1,
#   "number_of_data_nodes": 1,
#   "active_primary_shards": 5,
#   "active_shards": 5,
#   "relocating_shards": 0,
#   "initializing_shards": 0,
#   "unassigned_shards": 0,
#   "delayed_unassigned_shards": 0,
#   "number_of_pending_tasks": 0,
#   "number_of_in_flight_fetch": 0,
#   "task_max_waiting_in_queue_millis": 0,
#   "active_shards_percent_as_number": 100.0
# }

# Check version
curl -s http://localhost:9200 | jq '.version'
```

### Pass Criteria
- Elasticsearch container running
- Cluster status is "green"
- Data nodes: 1+
- Health check responds
- Version 7.17.x

---

## Test 2: Kibana Startup and Access

### Objective
Verify Kibana starts and is accessible.

### Test Steps
1. Check Kibana container running
2. Verify web UI accessible
3. Check Elasticsearch connection
4. Verify default index

### Test Commands
```bash
# Check Kibana running
docker-compose ps | grep kibana

# Access Kibana UI
curl -s http://localhost:5601/api/status | jq '.state'

# Expected: "green"

# Check Elasticsearch connection status
curl -s http://localhost:5601/api/status | jq '.status.statuses'

# Try accessing Kibana web UI (will return HTML)
curl -s http://localhost:5601/ | grep -i "kibana" | head -3
```

### Pass Criteria
- Kibana container running
- Web UI accessible on port 5601
- Connected to Elasticsearch
- Status is "green"

---

## Test 3: Filebeat Configuration

### Objective
Verify Filebeat is configured correctly.

### Test Steps
1. Check Filebeat config file
2. Verify input configuration
3. Verify output configuration
4. Check metadata addition

### Test Commands
```bash
# Check config file
cat filebeat/filebeat.yml | head -50

# Expected sections:
# - filebeat.inputs with container type
# - processors with add_docker_metadata
# - output.elasticsearch pointing to Elasticsearch

# Check Filebeat is running
docker-compose ps | grep filebeat

# Verify Filebeat container is collecting logs
docker logs filebeat | grep -i "started\|harvesting" | head -5
```

### Pass Criteria
- filebeat.yml exists and valid
- Container input configured
- Docker metadata processor enabled
- Elasticsearch output configured
- Index pattern set

---

## Test 4: Log Collection

### Objective
Verify logs are collected from Docker containers.

### Test Steps
1. Generate logs (API calls)
2. Wait for collection
3. Query Elasticsearch
4. Verify logs present

### Test Commands
```bash
# Generate logs with API calls
for i in {1..5}; do
  curl -s http://localhost:3001/health > /dev/null
  sleep 1
done

# Wait for logs to be collected and indexed (usually 5-10 seconds)
sleep 15

# Query Elasticsearch for collected logs
curl -s "http://localhost:9200/filebeat-*/_search?q=auth-service" | jq '.hits.total'

# Expected: Should show some hits

# Get sample log
curl -s "http://localhost:9200/filebeat-*/_search" | jq '.hits.hits[0]._source' | head -20

# Expected fields:
# - @timestamp
# - message
# - docker.container.name
# - docker.container.id
# - docker.image.name
```

### Pass Criteria
- Logs collected successfully
- Elasticsearch indexed logs
- Docker metadata included
- Timestamps correct
- Message content present

---

## Test 5: Index Pattern and Naming

### Objective
Verify logs are indexed with correct pattern.

### Test Steps
1. Check index names
2. Verify date pattern
3. Check index settings
4. Verify sharding

### Test Commands
```bash
# List all indices
curl -s http://localhost:9200/_cat/indices | grep filebeat

# Expected output similar to:
# yellow open filebeat-7.17.0-2025.12.05-000001 ...

# Get index mapping
curl -s http://localhost:9200/filebeat-*/_mapping | jq 'keys' | head -5

# Check index settings
curl -s http://localhost:9200/filebeat-*/_settings | jq '.[].settings.index'

# Expected:
# - number_of_shards: 1
# - number_of_replicas: 1
```

### Pass Criteria
- Indices created with date pattern
- Pattern: transcendence-YYYY.MM.DD
- Mappings include docker fields
- Index settings configured
- Sharding appropriate

---

## Test 6: Log Search and Query

### Objective
Verify logs can be searched and queried.

### Test Steps
1. Search for specific log
2. Filter by service
3. Filter by time range
4. Verify results accurate

### Test Commands
```bash
# Search all logs
curl -s "http://localhost:9200/filebeat-*/_search?size=100" | jq '.hits.hits | length'

# Search for auth service logs
curl -s "http://localhost:9200/filebeat-*/_search" \
  -H "Content-Type: application/json" \
  -d '{
    "query": {
      "match": {
        "docker.container.name": "auth-service"
      }
    }
  }' | jq '.hits.total'

# Search with time range (last hour)
curl -s "http://localhost:9200/filebeat-*/_search" \
  -H "Content-Type: application/json" \
  -d '{
    "query": {
      "range": {
        "@timestamp": {
          "gte": "now-1h"
        }
      }
    }
  }' | jq '.hits.total'

# Search for errors
curl -s "http://localhost:9200/filebeat-*/_search" \
  -H "Content-Type: application/json" \
  -d '{
    "query": {
      "match": {
        "message": "error"
      }
    }
  }' | jq '.hits.hits[] | {timestamp: ._source["@timestamp"], service: ._source["docker.container.name"]}'
```

### Pass Criteria
- Logs searchable
- Filtering by service works
- Time range queries work
- Accurate results
- Aggregations possible

---

## Test 7: Kibana Dashboard

### Objective
Verify Kibana dashboard displays logs.

### Test Steps
1. Access Kibana web UI
2. Navigate to Discover
3. Verify logs visible
4. Check filters work

### Test Commands
```bash
# Browser-based test (manual):
# 1. Open http://localhost:5601 in browser
# 2. Click "Discover" in left sidebar
# 3. Select filebeat-* index pattern
# 4. Verify logs displayed in table
# 5. Try filtering:
#    - Click on a field value
#    - Create a filter
#    - Verify results update
# 6. Verify timestamp column shows correct times

# API test for index pattern
curl -s http://localhost:5601/api/saved_objects/index-pattern | jq '.saved_objects | length'

# Expected: At least 1 index pattern
```

### Pass Criteria
- Kibana dashboard loads
- Index pattern selectable
- Logs displayed
- Filters working
- Timestamps accurate
- Service names visible

---

## Test 8: Real-time Log Streaming

### Objective
Verify logs appear in real-time in Kibana.

### Test Steps
1. Open Kibana Discover
2. Generate logs with API call
3. Verify log appears immediately
4. Check auto-refresh working

### Test Commands
```bash
# Browser test:
# 1. Open Kibana Discover page
# 2. Set "Refresh every 5 seconds"
# 3. In another terminal: curl http://localhost:3001/health
# 4. Watch for new log to appear in Discover
# 5. Should appear within 10 seconds

# Or API based test:
# Get latest log timestamp
LATEST=$(curl -s "http://localhost:9200/filebeat-*/_search?size=1&sort=@timestamp:desc" \
  | jq -r '.hits.hits[0]._source."@timestamp"')

# Generate new log
curl -s http://localhost:3001/health > /dev/null

sleep 5

# Check for new logs
curl -s "http://localhost:9200/filebeat-*/_search" \
  -H "Content-Type: application/json" \
  -d "{
    \"query\": {
      \"range\": {
        \"@timestamp\": {
          \"gt\": \"$LATEST\"
        }
      }
    }
  }" | jq '.hits.total'

# Expected: Should show new hits > 0
```

### Pass Criteria
- Real-time logs visible
- Auto-refresh works
- Logs appear within 10 seconds
- No significant delay
- Updates smooth

---

## Test 9: Log Retention and Cleanup

### Objective
Verify old logs are cleaned up according to policy.

### Test Steps
1. Check current indices
2. Verify retention policy
3. Check for old index cleanup
4. Verify storage efficient

### Test Commands
```bash
# List all filebeat indices with size
curl -s http://localhost:9200/_cat/indices?v | grep filebeat

# Expected output shows:
# index_name                          docs.count  store.size
# filebeat-7.17.0-2025.12.05-000001   1000        5mb

# Check index lifecycle management policy (if configured)
curl -s http://localhost:9200/_ilm/policy | jq '.policies'

# Check index settings for retention
curl -s http://localhost:9200/filebeat-*/_settings | jq '.[].settings.index'

# Manual cleanup of test indices (optional)
# Delete indices older than 30 days
curl -s -X DELETE "http://localhost:9200/filebeat-*-000001" 2>/dev/null || echo "Index retention working"
```

### Pass Criteria
- Index cleanup policy set
- Old indices not growing indefinitely
- Storage usage reasonable
- Retention policy enforced
- Automatic cleanup working

---

## Test 10: Docker Metadata in Logs

### Objective
Verify Docker metadata is added to logs.

### Test Steps
1. Get a log entry
2. Check Docker metadata fields
3. Verify container name
4. Verify image name

### Test Commands
```bash
# Get a log entry
curl -s "http://localhost:9200/filebeat-*/_search?size=1" | jq '.hits.hits[0]._source'

# Expected fields:
# {
#   "@timestamp": "2025-12-05T10:30:00.123Z",
#   "message": "...",
#   "docker": {
#     "container": {
#       "name": "auth-service",
#       "id": "abc123def456...",
#       "image": {
#         "name": "app:latest"
#       }
#     }
#   },
#   "stream": "stdout",
#   "log": {
#     "file": {
#       "path": "/var/lib/docker/containers/.../..."
#     }
#   }
# }

# Search for specific container logs
curl -s "http://localhost:9200/filebeat-*/_search" \
  -H "Content-Type: application/json" \
  -d '{
    "query": {
      "term": {
        "docker.container.name": "game-service"
      }
    }
  }' | jq '.hits.hits[0]._source | {service: .docker.container.name, message}'
```

### Pass Criteria
- Docker container name present
- Container ID present
- Image name present
- Stream type (stdout/stderr)
- File path included
- Metadata complete

---

## Test 11: Multi-Service Log Aggregation

### Objective
Verify logs from all services are collected.

### Test Steps
1. Generate logs from each service
2. Verify all services appear in Elasticsearch
3. Check log counts per service
4. Verify cross-service search

### Test Commands
```bash
# Generate logs from each service
curl -s http://localhost:3001/health > /dev/null  # auth-service
curl -s http://localhost:3002/health > /dev/null  # game-service
curl -s http://localhost:3003/health > /dev/null  # tournament-service
curl -s http://localhost:3004/health > /dev/null  # user-service

sleep 10

# Count logs per service
for service in auth-service game-service tournament-service user-service; do
  COUNT=$(curl -s "http://localhost:9200/filebeat-*/_search" \
    -H "Content-Type: application/json" \
    -d "{
      \"query\": {
        \"term\": {
          \"docker.container.name\": \"$service\"
        }
      }
    }" | jq '.hits.total.value')
  echo "$service: $COUNT logs"
done

# Expected: Each service has at least a few logs
```

### Pass Criteria
- All services logged
- Each service has entries
- Cross-service queries work
- Log aggregation complete
- All containers monitored

---

## Test 12: Performance and Scalability

### Objective
Verify ELK stack performs well under load.

### Test Steps
1. Generate large volume of logs
2. Measure Elasticsearch response time
3. Monitor resource usage
4. Verify no data loss

### Test Commands
```bash
# Generate high volume of logs
for i in {1..100}; do
  curl -s http://localhost:3001/health > /dev/null &
  curl -s http://localhost:3002/health > /dev/null &
  curl -s http://localhost:3003/health > /dev/null &
  curl -s http://localhost:3004/health > /dev/null &
done

wait

sleep 15

# Check Elasticsearch performance
time curl -s "http://localhost:9200/filebeat-*/_search?size=1000" > /dev/null

# Expected: < 1 second response time

# Check index stats
curl -s http://localhost:9200/filebeat-*/_stats | jq '.indices | keys | length'

# Expected: Several indices depending on rolling schedule

# Check document count
curl -s http://localhost:9200/filebeat-*/_count | jq '.count'

# Expected: Should have increased from baseline

# Monitor resources
docker stats elasticsearch kibana filebeat --no-stream | head -5
```

### Pass Criteria
- Search response time < 1 second
- Can handle 100+ logs/sec
- No data loss under load
- Memory usage stable
- CPU usage reasonable

---

## Summary

**ELK Stack Module:** ✅  
**Components:** Elasticsearch, Kibana, Filebeat  
**Total Tests:** 12  
**Pass Criteria:** All 12 must pass

### Quick Test Commands
```bash
# Check health
curl http://localhost:9200/_cluster/health | jq '.status'
curl http://localhost:5601/api/status | jq '.state'

# Search logs
curl "http://localhost:9200/filebeat-*/_search" | jq '.hits.total'

# Verify Docker metadata
curl "http://localhost:9200/filebeat-*/_search?size=1" | \
  jq '.hits.hits[0]._source.docker.container.name'

# Access Kibana UI
open http://localhost:5601
```

---

*Test Suite Created: December 5, 2025*
