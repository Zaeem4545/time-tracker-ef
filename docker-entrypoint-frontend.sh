#!/bin/sh

# Generate config.json from environment variables at container startup
# This allows runtime configuration without rebuilding the image

CONFIG_FILE="/usr/share/nginx/html/assets/config.json"

# Default values
API_BASE="${API_BASE:-/api}"
PRODUCTION="${PRODUCTION:-true}"

# Create config.json with environment variables
cat > "$CONFIG_FILE" <<EOF
{
  "apiBase": "${API_BASE}",
  "production": ${PRODUCTION}
}
EOF

echo "Generated config.json:"
cat "$CONFIG_FILE"

# Start nginx
exec nginx -g "daemon off;"

