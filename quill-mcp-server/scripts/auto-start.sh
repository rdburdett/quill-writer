#!/bin/bash

# Auto-start script for Quill Project Context Server
# Add this to your shell profile (.zshrc or .bashrc):
#   source /path/to/quill-writer/quill-mcp-server/scripts/auto-start.sh

# Only auto-start if we're in the quill-writer project directory
if [[ "$PWD" == *"quill-writer"* ]] || [[ -d "quill-mcp-server" ]]; then
	# Find the server directory
	if [ -d "quill-mcp-server" ]; then
		SERVER_DIR="$PWD/quill-mcp-server"
	elif [ -d "../quill-mcp-server" ]; then
		SERVER_DIR="$PWD/../quill-mcp-server"
	else
		# Try to find it from common locations
		SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
		SERVER_DIR="$(dirname "$SCRIPT_DIR")"
	fi

	# Check if server is already running
	if ! lsof -Pi :5051 -sTCP:LISTEN -t >/dev/null 2>&1; then
		cd "$SERVER_DIR" || return
		echo "🚀 Auto-starting Quill Project Context Server..."
		node server.js > /tmp/quill-context-server.log 2>&1 &
		echo $! > /tmp/quill-context-server.pid
		sleep 1
		if lsof -Pi :5051 -sTCP:LISTEN -t >/dev/null 2>&1; then
			echo "✓ Server started on http://localhost:5051"
		else
			echo "⚠ Failed to start server (check logs: cat /tmp/quill-context-server.log)"
		fi
	fi
fi

