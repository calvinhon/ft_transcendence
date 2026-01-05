#!/bin/sh
set -e

mkdir -p /app/database
DB=/app/database/game.db
[ -f "$DB" ] || touch "$DB"
chown -R node:node /app/database 2>/dev/null || true
chmod 0755 /app/database 2>/dev/null || true
chmod 0644 "$DB" 2>/dev/null || true
if command -v su-exec >/dev/null 2>&1; then
  exec su-exec node "$@"
else
  exec "$@"
fi
