#!/bin/bash

# Generate self-signed certificate
# Can be run from anywhere - uses script location to find project root

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"

openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
  -keyout "$PROJECT_DIR/frontend/certs/nginx-selfsigned.key" \
  -out "$PROJECT_DIR/frontend/certs/nginx-selfsigned.crt" \
  -config "$PROJECT_DIR/frontend/certs/openssl.cnf"

echo "Certificates generated in frontend/certs/"
echo ""
echo "To verify the setup, please follow these steps to trust the certificate on your Mac:"
echo "1. Open Keychain Access (Command + Space, type 'Keychain Access')"
echo "2. Drag 'frontend/certs/nginx-selfsigned.crt' into the 'System' keychain"
echo "3. Double-click the certificate (named 'localhost')"
echo "4. Expand 'Trust' section"
echo "5. Change 'When using this certificate' to 'Always Trust'"
echo "6. Close the window and enter your password when prompted"
echo "7. Restart your browser"

