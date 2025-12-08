#!/bin/bash

# Wrapper script to fix localhost references for Docker network testing

# First, copy all test scripts to /tmp to avoid modifying the mounted volume
echo "📝 Preparing test scripts for Docker network..."
cp -r /tests /tmp/tests-docker
cd /tmp/tests-docker

# Replace localhost with Docker service names in all shell scripts
# NOTE: Services listen on port 3000 internally, but are exposed as 3001-3004 externally
echo "🔧 Updating service URLs for Docker network..."
find /tmp/tests-docker -name "*.sh" -type f -exec sed -i \
    -e 's|http://localhost:3001|http://localhost:3001|g' \
    -e 's|http://localhost:3002|http://localhost:3002|g' \
    -e 's|http://localhost:3003|http://localhost:3003|g' \
    -e 's|http://localhost:3004|http://localhost:3004|g' \
    -e 's|PROJECT_ROOT="\$(dirname "\$SCRIPT_DIR")"|PROJECT_ROOT="/project"|g' \
    {} +

# Fix PROJECT_ROOT references to use /project
export PROJECT_ROOT="/project"
export DATABASE_DIR="$PROJECT_ROOT"

# Make all scripts executable
chmod +x /tmp/tests-docker/*.sh

echo "✅ Test scripts prepared for Docker network"
echo "   PROJECT_ROOT: $PROJECT_ROOT"
echo ""

# Run the test suite from the temporary directory
cd /tmp/tests-docker
exec ./run-all-tests.sh
