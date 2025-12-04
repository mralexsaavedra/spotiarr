#!/bin/sh
set -e

echo "🔧 Entrypoint started..."

# Fix permissions for config directory (recursive is fine here, it's small)
echo "🔧 Fixing permissions for /spotiarr/config..."
mkdir -p /spotiarr/config
chown -R 1000:1000 /spotiarr/config

# Fix permissions for /downloads ROOT ONLY (avoid recursive chown on large libraries)
echo "🔧 Ensuring /downloads is writable..."
mkdir -p /downloads
# Only chown the directory itself, not contents
chown 1000:1000 /downloads

# Check if certificates exist in the config volume
if [ ! -f "/spotiarr/config/server.key" ] || [ ! -f "/spotiarr/config/server.cert" ]; then
    echo "🔒 Generating self-signed SSL certificates..."
    
    # Generate certs
    openssl req -nodes -new -x509 -keyout /spotiarr/config/server.key -out /spotiarr/config/server.cert -days 365 -subj "/CN=spotiarr-local"
    
    # Fix permissions on generated files
    chown 1000:1000 /spotiarr/config/server.key /spotiarr/config/server.cert
    echo "✅ Certificates generated at /spotiarr/config/server.{key,cert}"
else
    echo "🔒 SSL certificates found in config directory."
fi

# Switch to 'node' user (uid 1000) and execute the command
echo "🚀 Starting application as user 'node' (1000)..."
exec su-exec 1000:1000 "$@"
