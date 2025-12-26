#!/bin/bash

# Check if the Project Context Server is running

if lsof -Pi :5051 -sTCP:LISTEN -t >/dev/null ; then
	echo "✓ Project Context Server is running on http://localhost:5051"
	
	# Try to get PID
	if [ -f /tmp/quill-context-server.pid ]; then
		PID=$(cat /tmp/quill-context-server.pid)
		echo "  PID: $PID"
	fi
	
	# Test if server responds
	if curl -s http://localhost:5051/context/quill > /dev/null 2>&1; then
		echo "  Status: ✓ Responding to requests"
	else
		echo "  Status: ⚠ Running but not responding"
	fi
else
	echo "✗ Project Context Server is not running"
	echo "  Start with: ./scripts/start-background.sh"
fi

