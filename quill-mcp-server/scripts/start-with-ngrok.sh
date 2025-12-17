#!/bin/bash

# Script to start MCP server and expose it via ngrok for ChatGPT access

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
SERVER_DIR="$(dirname "$SCRIPT_DIR")"

echo "Starting Quill MCP Server with ngrok..."

# Check if ngrok is installed
if ! command -v ngrok &> /dev/null; then
	echo "Error: ngrok is not installed."
	echo "Install it with: brew install ngrok"
	echo "Or download from: https://ngrok.com/download"
	exit 1
fi

# Check if MCP server is already running
if lsof -Pi :5051 -sTCP:LISTEN -t >/dev/null ; then
	echo "Warning: Port 5051 is already in use."
	echo "Please stop the existing server first."
	exit 1
fi

# Start MCP server in background
# Run node directly to capture the actual server process PID (not npm's PID)
echo "Starting MCP server..."
cd "$SERVER_DIR"
node server.js &
SERVER_PID=$!

# Wait for server to start
sleep 2

# Check if server started successfully
if ! kill -0 $SERVER_PID 2>/dev/null; then
	echo "Error: Failed to start MCP server"
	exit 1
fi

# Verify server is actually listening on port 5051
if ! lsof -Pi :5051 -sTCP:LISTEN -t >/dev/null ; then
	echo "Error: Server started but not listening on port 5051"
	kill $SERVER_PID 2>/dev/null || true
	exit 1
fi

echo "MCP server started (PID: $SERVER_PID)"
echo ""
echo "Starting ngrok tunnel..."
echo ""

# Set up cleanup trap BEFORE starting ngrok (so it catches interrupts)
# Preserve exit status to properly report ngrok errors
cleanup() {
	local exit_code=$?  # Capture exit status before cleanup operations
	echo ""
	echo "Cleaning up..."
	kill $SERVER_PID 2>/dev/null || true
	exit $exit_code  # Preserve original exit status
}
trap cleanup INT TERM EXIT

# Start ngrok (runs in foreground, blocking until interrupted)
ngrok http 5051

