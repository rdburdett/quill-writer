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
echo "Starting MCP server..."
cd "$SERVER_DIR"
npm start &
SERVER_PID=$!

# Wait for server to start
sleep 2

# Check if server started successfully
if ! kill -0 $SERVER_PID 2>/dev/null; then
	echo "Error: Failed to start MCP server"
	exit 1
fi

echo "MCP server started (PID: $SERVER_PID)"
echo ""
echo "Starting ngrok tunnel..."
echo ""

# Start ngrok
ngrok http 5051

# Cleanup on exit
trap "kill $SERVER_PID 2>/dev/null; exit" INT TERM

