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
# Prisma writes engine binaries into node_modules at startup; chown those dirs
# so they're writable when PUID != 1000 (the uid used during the Docker build).
find /spotiarr/node_modules/.pnpm -path "*/@prisma/engines" -type d \
    -exec chown -R "$PUID:$PGID" {} + 2>/dev/null || true

# Fix downloads root
mkdir -p /downloads
chown "$PUID:$PGID" /downloads 2>/dev/null || true

echo "🚀 Starting application as $USER_NAME..."
# Point corepack at the system-wide cache pre-populated during the Docker build
# so pnpm doesn't try to download itself to the (root-owned) user home dir.
export COREPACK_HOME=/usr/local/share/corepack
exec su-exec "$PUID:$PGID" "$@"
