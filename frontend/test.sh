#!/bin/bash

echo "🌐 Testing Frontend Service (Nginx)"
echo "==================================="

# Note: This script assumes the frontend/nginx is already running
# For standalone testing, you would need to start nginx separately

echo -e "\n1. Testing Frontend Health (Nginx):"
HTTP=$(curl -s -o /dev/null -w "%{http_code}" http://localhost/)
if [ "$HTTP" = "200" ]; then
    echo "✅ Frontend is serving content"
else
    echo "❌ Frontend not responding: $HTTP"
    exit 1
fi

echo -e "\n2. Testing Main Page Content:"
CONTENT=$(curl -s http://localhost/)
if echo "$CONTENT" | grep -q "<!DOCTYPE html>"; then
    echo "✅ Main page loaded successfully"
else
    echo "❌ Main page content invalid"
    exit 1
fi

echo -e "\n3. Testing Static Assets:"
# Test if CSS is served
CSS_HTTP=$(curl -s -o /dev/null -w "%{http_code}" http://localhost/css/style.css)
if [ "$CSS_HTTP" = "200" ]; then
    echo "✅ CSS assets accessible"
else
    echo "❌ CSS assets not accessible: $CSS_HTTP"
fi

# Test if JS is served (assuming there's a main.js or similar)
JS_HTTP=$(curl -s -o /dev/null -w "%{http_code}" http://localhost/src/main.ts)
if [ "$JS_HTTP" = "200" ]; then
    echo "✅ JS assets accessible"
else
    echo "❌ JS assets not accessible: $JS_HTTP"
fi

echo -e "\n\n✅ All frontend tests completed!"