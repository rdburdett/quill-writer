#!/bin/bash

# Script to fix markdown files that Cursor has trouble opening
# This clears extended attributes and ensures proper file encoding

set -e

if [ -z "$1" ]; then
	echo "Usage: $0 <markdown-file>"
	echo "Example: $0 VERCEL_SETUP.md"
	exit 1
fi

FILE="$1"

if [ ! -f "$FILE" ]; then
	echo "Error: File $FILE not found"
	exit 1
fi

echo "Fixing $FILE..."

# Clear extended attributes
xattr -c "$FILE" 2>/dev/null || true

# Ensure file ends with newline
if [ -n "$(tail -c 1 "$FILE")" ]; then
	echo "" >> "$FILE"
fi

# Recreate file to ensure clean encoding
TEMP_FILE="${FILE}.tmp"
cat "$FILE" > "$TEMP_FILE"
mv "$TEMP_FILE" "$FILE"

echo "✓ Fixed $FILE"
echo "Try opening it in Cursor now. If it still fails:"
echo "  1. Close and reopen Cursor"
echo "  2. Use Cmd+P and type the filename"
echo "  3. Or open via terminal: code $FILE"

