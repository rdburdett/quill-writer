#!/bin/bash

# Start the Project Context Server in development mode (runs in foreground)
# This is useful for development - you'll see logs and can Ctrl+C to stop

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
SERVER_DIR="$(dirname "$SCRIPT_DIR")"

cd "$SERVER_DIR"

echo "Starting Quill Project Context Server (dev mode)..."
echo "Server will run on http://localhost:5051"
echo "Press Ctrl+C to stop"
echo ""

node server.js

