#!/bin/bash
# Elasticsearch Data Cleanup Script
# Deletes indices older than specified days

set -e

ELASTICSEARCH_HOST="${ELASTICSEARCH_HOST:-http://localhost:9200}"
DAYS_TO_KEEP="${DAYS_TO_KEEP:-30}"

echo "🧹 Cleaning up Elasticsearch indices older than ${DAYS_TO_KEEP} days..."
echo "📍 Elasticsearch host: ${ELASTICSEARCH_HOST}"

# Check if Elasticsearch is accessible
if ! curl -s "${ELASTICSEARCH_HOST}/_cluster/health" > /dev/null; then
  echo "❌ Error: Cannot connect to Elasticsearch at ${ELASTICSEARCH_HOST}"
  exit 1
fi

# Get current timestamp
current_timestamp=$(date +%s)
cutoff_timestamp=$((current_timestamp - (DAYS_TO_KEEP * 86400)))

echo "📅 Current date: $(date)"
echo "📅 Cutoff date: $(date -d @${cutoff_timestamp})"

# Get all indices with creation dates
indices=$(curl -s "${ELASTICSEARCH_HOST}/_cat/indices?h=index,creation.date&format=json")

if [ -z "$indices" ] || [ "$indices" = "[]" ]; then
  echo "✅ No indices found"
  exit 0
fi

# Parse and delete old indices
deleted_count=0
echo "$indices" | jq -r '.[] | "\(.index)|\(.["creation.date"])"' | while IFS='|' read -r index creation_date; do
  # Convert creation date from milliseconds to seconds
  index_timestamp=$((creation_date / 1000))
  
  if [ "$index_timestamp" -lt "$cutoff_timestamp" ]; then
    echo "🗑️  Deleting index: $index (created: $(date -d @${index_timestamp}))"
    
    delete_response=$(curl -s -X DELETE "${ELASTICSEARCH_HOST}/${index}")
    
    if echo "$delete_response" | jq -e '.acknowledged == true' > /dev/null 2>&1; then
      echo "   ✅ Deleted successfully"
      deleted_count=$((deleted_count + 1))
    else
      echo "   ❌ Failed to delete: $delete_response"
    fi
  fi
done

echo ""
echo "✅ Cleanup complete! Deleted $deleted_count indices"

# Show current disk usage
echo ""
echo "💾 Current disk usage:"
curl -s "${ELASTICSEARCH_HOST}/_cat/allocation?v&h=node,disk.used,disk.avail,disk.percent"

# Force merge to reclaim disk space
echo ""
echo "🔄 Force merging indices to reclaim disk space..."
curl -s -X POST "${ELASTICSEARCH_HOST}/_forcemerge?max_num_segments=1" > /dev/null
echo "✅ Force merge completed"
