#!/bin/sh
set -e

# Default PUID/PGID if not specified (Standard Arr convention)
PUID=${PUID:-1000}
PGID=${PGID:-1000}

echo "🔧 Entrypoint started..."
echo "👤 User/Group setup: PUID=$PUID, PGID=$PGID"

# --- User/Group Logic ---

# Check if group exists with PGID
if ! getent group "$PGID" >/dev/null; then
    echo "Creating group spotiarr with GID $PGID"
    groupadd -g "$PGID" spotiarr
else
    echo "Group with GID $PGID already exists"
fi

# Check if user exists with PUID
if ! getent passwd "$PUID" >/dev/null; then
    echo "Creating user spotiarr with UID $PUID"
    # We use the GID corresponding to PGID
    TARGET_GID=$(getent group "$PGID" | cut -d: -f3)
    useradd -u "$PUID" -g "$TARGET_GID" -d /spotiarr -s /bin/sh spotiarr
else
    echo "User with UID $PUID already exists"
    # Ensure existing user is in the right group if needed? 
    # Usually easier to just use the existing user
fi

# Get the effective username/groupname
USER_NAME=$(getent passwd "$PUID" | cut -d: -f1)
GROUP_NAME=$(getent group "$PGID" | cut -d: -f1)

echo "👤 Running as effective user: $USER_NAME:$GROUP_NAME"

# --- Permission Fixes ---

# Fix permissions for config directory and app directory
echo "🔧 Fixing permissions for /spotiarr..."
mkdir -p /spotiarr/config
chown -R "$PUID:$PGID" /spotiarr/config
chown -R "$PUID:$PGID" /spotiarr/src /spotiarr/package.json

# Fix permissions for /downloads ROOT ONLY
echo "🔧 Ensuring /downloads is writable..."
mkdir -p /downloads
# Only chown the directory itself if possible
chown "$PUID:$PGID" /downloads 2>/dev/null || echo "⚠️  Could not change ownership of /downloads (host mount?). Continuing..."

# Check if certificates exist in the config volume
if [ ! -f "/spotiarr/config/server.key" ] || [ ! -f "/spotiarr/config/server.cert" ]; then
    echo "🔒 Generating self-signed SSL certificates..."
    
    # Generate certs
    openssl req -nodes -new -x509 -keyout /spotiarr/config/server.key -out /spotiarr/config/server.cert -days 365 -subj "/CN=spotiarr-local"
    
    # Fix permissions on generated files
    chown "$PUID:$PGID" /spotiarr/config/server.key /spotiarr/config/server.cert
    echo "✅ Certificates generated at /spotiarr/config/server.{key,cert}"
else
    echo "🔒 SSL certificates found in config directory."
fi

# Switch to configured user and execute the command
echo "🚀 Starting application as $USER_NAME ($PUID:$PGID)..."
exec su-exec "$PUID:$PGID" "$@"
