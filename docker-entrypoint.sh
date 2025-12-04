#!/bin/sh
set -e

# Fix permissions for config and downloads directories
# We do this as root before switching to node user
echo "🔧 Fixing permissions..."
chown -R node:node /spotiarr /downloads

# Check if certificates exist in the config volume
if [ ! -f "/spotiarr/config/server.key" ] || [ ! -f "/spotiarr/config/server.cert" ]; then
    echo "🔒 Generating self-signed SSL certificates..."
    # Ensure directory exists and has correct permissions
    mkdir -p /spotiarr/config
    chown node:node /spotiarr/config
    
    # Generate certs
    openssl req -nodes -new -x509 -keyout /spotiarr/config/server.key -out /spotiarr/config/server.cert -days 365 -subj "/CN=spotiarr-local"
    
    # Fix permissions on generated files
    chown node:node /spotiarr/config/server.key /spotiarr/config/server.cert
    echo "✅ Certificates generated at /spotiarr/config/server.{key,cert}"
else
    echo "🔒 SSL certificates found in config directory."
fi

# Switch to 'node' user and execute the command
echo "🚀 Starting application as user 'node'..."
exec su-exec node "$@"
