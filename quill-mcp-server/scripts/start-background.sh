#!/bin/bash

# Start the Project Context Server in the background
# Useful for keeping it running while you code

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
SERVER_DIR="$(dirname "$SCRIPT_DIR")"

cd "$SERVER_DIR"

# Check if server is already running
if lsof -Pi :5051 -sTCP:LISTEN -t >/dev/null ; then
	echo "Project Context Server is already running on port 5051"
	echo "To stop it, run: ./scripts/stop.sh"
	exit 0
fi

echo "Starting Quill Project Context Server in background..."
echo "Server will run on http://localhost:5051"
echo ""

# Start server in background and save PID
node server.js > /tmp/quill-context-server.log 2>&1 &
SERVER_PID=$!

# Save PID to file for easy stopping
echo $SERVER_PID > /tmp/quill-context-server.pid

# Wait a moment to check if it started successfully
sleep 1

if kill -0 $SERVER_PID 2>/dev/null; then
	echo "✓ Project Context Server started (PID: $SERVER_PID)"
	echo "  Logs: tail -f /tmp/quill-context-server.log"
	echo "  Stop: ./scripts/stop.sh"
else
	echo "✗ Failed to start Project Context Server"
	echo "  Check logs: cat /tmp/quill-context-server.log"
	exit 1
fi

