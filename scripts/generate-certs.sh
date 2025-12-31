#!/bin/bash
# Generate self-signed SSL certificates for localhost development

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
ASSETS_DIR="$PROJECT_ROOT/assets"

mkdir -p "$ASSETS_DIR"

echo "Generating self-signed SSL certificate for localhost..."

openssl req -x509 -newkey rsa:2048 \
  -keyout "$ASSETS_DIR/localhost-privkey.pem" \
  -out "$ASSETS_DIR/localhost-cert.pem" \
  -days 365 \
  -nodes \
  -subj "/CN=localhost"

echo "Certificates generated:"
echo "  - $ASSETS_DIR/localhost-cert.pem"
echo "  - $ASSETS_DIR/localhost-privkey.pem"
echo ""
echo "Note: You'll need to accept the self-signed certificate warning in your browser."
