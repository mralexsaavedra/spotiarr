#!/bin/sh
set -e

# Default PUID/PGID (Standard Arr convention)
PUID=${PUID:-1000}
PGID=${PGID:-1000}

echo "🔧 Entrypoint started (PUID=$PUID, PGID=$PGID)..."

# Create group if it doesn't exist
if ! getent group "$PGID" >/dev/null; then
    groupadd -g "$PGID" spotiarr
fi

# Create user if it doesn't exist
if ! getent passwd "$PUID" >/dev/null; then
    useradd -u "$PUID" -g "$PGID" -d /spotiarr -s /bin/sh spotiarr
fi

# Get effective username
USER_NAME=$(getent passwd "$PUID" | cut -d: -f1)

# Fix permissions
echo "🔧 Fixing permissions..."
mkdir -p /spotiarr/config
chown -R "$PUID:$PGID" /spotiarr/config

# Fix downloads root
mkdir -p /downloads
chown "$PUID:$PGID" /downloads 2>/dev/null || true

# Run prisma migrations as root before dropping privileges.
# This avoids permission issues on read-only overlay filesystems (e.g. Kubernetes)
# where node_modules is part of the image layer and not writable by non-root users.
echo "🔧 Running database migrations..."
cd /spotiarr
pnpm --filter backend prisma:migrate:deploy || echo "⚠️ Migration failed (may be first run without DB)"

echo "🚀 Starting application as $USER_NAME..."
exec su-exec "$PUID:$PGID" pnpm start
