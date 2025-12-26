#!/bin/bash

# Stop the Project Context Server if it's running

if [ -f /tmp/quill-context-server.pid ]; then
	PID=$(cat /tmp/quill-context-server.pid)
	if kill -0 $PID 2>/dev/null; then
		echo "Stopping Project Context Server (PID: $PID)..."
		kill $PID
		rm /tmp/quill-context-server.pid
		echo "✓ Server stopped"
	else
		echo "Server process not found (may have already stopped)"
		rm /tmp/quill-context-server.pid
	fi
else
	# Try to find and kill by port
	if lsof -Pi :5051 -sTCP:LISTEN -t >/dev/null ; then
		echo "Stopping Project Context Server on port 5051..."
		lsof -ti :5051 | xargs kill
		echo "✓ Server stopped"
	else
		echo "No Project Context Server running on port 5051"
	fi
fi

