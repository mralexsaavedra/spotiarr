#!/bin/sh
set -e

# Check if certificates exist in the config volume
if [ ! -f "/spotiarr/config/server.key" ] || [ ! -f "/spotiarr/config/server.cert" ]; then
    echo "🔒 Generating self-signed SSL certificates..."
    mkdir -p /spotiarr/config
    openssl req -nodes -new -x509 -keyout /spotiarr/config/server.key -out /spotiarr/config/server.cert -days 365 -subj "/CN=spotiarr-local"
    echo "✅ Certificates generated at /spotiarr/config/server.{key,cert}"
else
    echo "🔒 SSL certificates found in config directory."
fi

# Execute the command passed to docker run
exec "$@"
