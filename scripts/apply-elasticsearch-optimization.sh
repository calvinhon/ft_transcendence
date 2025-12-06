#!/bin/bash
# Apply Elasticsearch optimizations
# Run this script after starting the services

set -e

echo "🚀 Applying Elasticsearch optimizations..."

# Wait for Elasticsearch to be ready (via docker exec to avoid networking issues)
echo "⏳ Waiting for Elasticsearch..."
max_attempts=30
attempt=0

# Function to check Elasticsearch health
check_es_health() {
  docker exec elasticsearch curl -s http://localhost:9200/_cluster/health 2>/dev/null | grep -q '"status"'
}

while ! check_es_health; do
  attempt=$((attempt + 1))
  if [ $attempt -ge $max_attempts ]; then
    echo "❌ Elasticsearch not available after ${max_attempts} attempts"
    echo "   Container status: $(docker ps --filter name=elasticsearch --format '{{.Status}}')"
    exit 1
  fi
  echo "   Attempt $attempt/$max_attempts..."
  sleep 2
done
echo "✅ Elasticsearch is ready"

# Use docker exec for all Elasticsearch operations to avoid host networking issues
ES_EXEC="docker exec elasticsearch curl -s http://localhost:9200"

# Apply ILM policy
echo ""
echo "📋 Applying Index Lifecycle Management policy..."
ILM_POLICY=$(cat elasticsearch/ilm-policy.json)
if docker exec elasticsearch curl -X PUT "http://localhost:9200/_ilm/policy/logs-policy" \
  -H 'Content-Type: application/json' \
  -d "$ILM_POLICY" 2>/dev/null | grep -q '"acknowledged":true'; then
  echo "✅ ILM policy applied successfully"
else
  echo "⚠️  Failed to apply ILM policy (may already exist)"
fi

# Apply index template
echo ""
echo "📝 Applying index template..."
INDEX_TEMPLATE=$(cat elasticsearch/index-template.json)
if docker exec elasticsearch curl -X PUT "http://localhost:9200/_index_template/logs-template" \
  -H 'Content-Type: application/json' \
  -d "$INDEX_TEMPLATE" 2>/dev/null | grep -q '"acknowledged":true'; then
  echo "✅ Index template applied successfully"
else
  echo "⚠️  Failed to apply index template (may already exist)"
fi

# Enable slow query logging
echo ""
echo "🐌 Enabling slow query logging..."
if docker exec elasticsearch curl -X PUT "http://localhost:9200/_all/_settings" \
  -H 'Content-Type: application/json' \
  -d '{
    "index.search.slowlog.threshold.query.warn": "2s",
    "index.search.slowlog.threshold.query.info": "1s",
    "index.search.slowlog.threshold.fetch.warn": "1s",
    "index.indexing.slowlog.threshold.index.warn": "2s"
  }' 2>/dev/null | grep -q '"acknowledged":true'; then
  echo "✅ Slow query logging enabled"
else
  echo "⚠️  Failed to enable slow query logging (may have no indices yet)"
fi

# Show current cluster settings
echo ""
echo "📊 Current Elasticsearch cluster status:"
docker exec elasticsearch curl -s "http://localhost:9200/_cluster/health?pretty" 2>/dev/null | grep -E '"status"|"number_of_nodes"|"active_shards"' || echo "Unable to fetch cluster status"

echo ""
echo "💾 Current disk usage:"
docker exec elasticsearch curl -s "http://localhost:9200/_cat/allocation?v&h=node,disk.used,disk.avail,disk.percent" 2>/dev/null || echo "Unable to fetch disk usage"

echo ""
echo "📦 Current indices:"
docker exec elasticsearch curl -s "http://localhost:9200/_cat/indices?v&s=store.size:desc" 2>/dev/null | head -n 10 || echo "No indices yet"

echo ""
echo "✅ Optimization setup complete!"
echo ""
echo "💡 Tips:"
echo "   - Run './scripts/cleanup-elasticsearch.sh' regularly to remove old data"
echo "   - Monitor disk usage: curl -4 127.0.0.1:9200/_cat/allocation?v"
echo "   - Check slow queries: docker logs elasticsearch | grep WARN"
echo "   - View cluster health: curl -4 127.0.0.1:9200/_cluster/health?pretty"
