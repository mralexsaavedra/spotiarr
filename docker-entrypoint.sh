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
# Note: /spotiarr code is already owned by node:node from build, 
# but if PUID!=1000 we might need to adjust, though usually read-only is fine for code.

# Fix downloads root
mkdir -p /downloads
chown "$PUID:$PGID" /downloads 2>/dev/null || true

echo "🚀 Starting application as $USER_NAME..."
exec su-exec "$PUID:$PGID" "$@"
