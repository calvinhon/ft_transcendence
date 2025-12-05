#!/bin/bash
# Apply Elasticsearch optimizations
# Run this script after starting the services

set -e

ELASTICSEARCH_HOST="${ELASTICSEARCH_HOST:-http://localhost:9200}"

echo "🚀 Applying Elasticsearch optimizations..."

# Wait for Elasticsearch to be ready
echo "⏳ Waiting for Elasticsearch..."
max_attempts=30
attempt=0
while ! curl -s "${ELASTICSEARCH_HOST}/_cluster/health" > /dev/null; do
  attempt=$((attempt + 1))
  if [ $attempt -ge $max_attempts ]; then
    echo "❌ Elasticsearch not available after ${max_attempts} attempts"
    exit 1
  fi
  echo "   Attempt $attempt/$max_attempts..."
  sleep 2
done
echo "✅ Elasticsearch is ready"

# Apply ILM policy
echo ""
echo "📋 Applying Index Lifecycle Management policy..."
if curl -X PUT "${ELASTICSEARCH_HOST}/_ilm/policy/logs-policy" \
  -H 'Content-Type: application/json' \
  -d @elasticsearch/ilm-policy.json | jq -e '.acknowledged == true' > /dev/null 2>&1; then
  echo "✅ ILM policy applied successfully"
else
  echo "⚠️  Failed to apply ILM policy (may already exist)"
fi

# Apply index template
echo ""
echo "📝 Applying index template..."
if curl -X PUT "${ELASTICSEARCH_HOST}/_index_template/logs-template" \
  -H 'Content-Type: application/json' \
  -d @elasticsearch/index-template.json | jq -e '.acknowledged == true' > /dev/null 2>&1; then
  echo "✅ Index template applied successfully"
else
  echo "⚠️  Failed to apply index template (may already exist)"
fi

# Enable slow query logging
echo ""
echo "🐌 Enabling slow query logging..."
curl -X PUT "${ELASTICSEARCH_HOST}/_all/_settings" \
  -H 'Content-Type: application/json' \
  -d '{
    "index.search.slowlog.threshold.query.warn": "2s",
    "index.search.slowlog.threshold.query.info": "1s",
    "index.search.slowlog.threshold.fetch.warn": "1s",
    "index.indexing.slowlog.threshold.index.warn": "2s"
  }' > /dev/null 2>&1
echo "✅ Slow query logging enabled"

# Show current cluster settings
echo ""
echo "📊 Current Elasticsearch cluster status:"
curl -s "${ELASTICSEARCH_HOST}/_cluster/health?pretty" | jq '{status, number_of_nodes, active_shards}'

echo ""
echo "💾 Current disk usage:"
curl -s "${ELASTICSEARCH_HOST}/_cat/allocation?v&h=node,disk.used,disk.avail,disk.percent"

echo ""
echo "📦 Current indices:"
curl -s "${ELASTICSEARCH_HOST}/_cat/indices?v&s=store.size:desc" | head -n 10

echo ""
echo "✅ Optimization setup complete!"
echo ""
echo "💡 Tips:"
echo "   - Run './scripts/cleanup-elasticsearch.sh' regularly to remove old data"
echo "   - Monitor disk usage: curl localhost:9200/_cat/allocation?v"
echo "   - Check slow queries: docker logs elasticsearch | grep WARN"
echo "   - View cluster health: curl localhost:9200/_cluster/health?pretty"
