#!/bin/sh
set -e

# Fix permissions for data directories (Render persistent disk at /var/data, or /app/data)
# Run as root before dropping to nodejs user
for dir in /var/data /app/data; do
  if [ -d "$dir" ]; then
    chown -R nodejs:nodejs "$dir" 2>/dev/null || true
  fi
done

# Create /app/data if it doesn't exist and we have permission
if [ ! -d /app/data ] && [ -w /app ]; then
  mkdir -p /app/data
  chown nodejs:nodejs /app/data
fi

exec su-exec nodejs "$@"
