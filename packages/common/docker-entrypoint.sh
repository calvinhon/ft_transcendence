#!/bin/sh
set -e

# Fix permissions on the database directory
if [ -d "/app/database" ]; then
    echo "Fixing permissions for /app/database..."
    chown -R node:node /app/database
fi

if [ -d "/app/auth-database" ]; then
    echo "Fixing permissions for /app/auth-database..."
    chown -R node:node /app/auth-database
fi

# Execute the command as the node user
exec su-exec node "$@"
