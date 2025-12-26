#!/bin/bash

# Install auto-start hook for Quill Project Context Server
# This adds a hook to your shell profile to auto-start the server

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
SERVER_DIR="$(dirname "$SCRIPT_DIR")"
PROJECT_ROOT="$(dirname "$SERVER_DIR")"
AUTO_START_SCRIPT="$SERVER_DIR/scripts/auto-start.sh"

# Detect shell
if [ -n "$ZSH_VERSION" ]; then
	SHELL_PROFILE="$HOME/.zshrc"
	SHELL_NAME="zsh"
elif [ -n "$BASH_VERSION" ]; then
	SHELL_PROFILE="$HOME/.bashrc"
	SHELL_NAME="bash"
else
	echo "Unsupported shell. Please manually add to your shell profile:"
	echo "  source $AUTO_START_SCRIPT"
	exit 1
fi

# Check if already installed
if grep -q "quill-context-server.*auto-start" "$SHELL_PROFILE" 2>/dev/null; then
	echo "Auto-start hook already installed in $SHELL_PROFILE"
	exit 0
fi

# Add hook to shell profile
echo "" >> "$SHELL_PROFILE"
echo "# Quill Project Context Server auto-start" >> "$SHELL_PROFILE"
echo "source $AUTO_START_SCRIPT" >> "$SHELL_PROFILE"

echo "✓ Auto-start hook installed in $SHELL_PROFILE"
echo ""
echo "The server will now auto-start when you open a terminal in the quill-writer project."
echo ""
echo "To uninstall, remove these lines from $SHELL_PROFILE:"
echo "  # Quill Project Context Server auto-start"
echo "  source $AUTO_START_SCRIPT"

