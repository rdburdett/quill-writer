# Fixing Cursor Markdown File Opening Issues

## The Problem

Cursor sometimes fails to open markdown files with the error:
```
Assertion Failed: Argument is `undefined` or `null`.
```

This is a known Cursor issue with file path resolution, especially for newly created files.

## Quick Fixes

### Method 1: Use the Fix Script
```bash
./scripts/fix-markdown-files.sh VERCEL_SETUP.md
```

### Method 2: Reload Cursor Window
1. Press `Cmd+Shift+P`
2. Type "Reload Window"
3. Select "Developer: Reload Window"
4. Try opening the file again

### Method 3: Open via Command Palette
1. Press `Cmd+P`
2. Type the filename (e.g., `VERCEL_SETUP.md`)
3. Select it from the list

### Method 4: Open via Terminal
```bash
# If you have VS Code CLI
code VERCEL_SETUP.md

# Or use Cursor's CLI if available
cursor VERCEL_SETUP.md
```

### Method 5: Clear Extended Attributes
```bash
xattr -c VERCEL_SETUP.md
```

## Prevention

When creating new markdown files programmatically:

1. **Use the fix script after creation:**
   ```bash
   ./scripts/fix-markdown-files.sh new-file.md
   ```

2. **Ensure files end with a newline:**
   ```bash
   echo "" >> new-file.md
   ```

3. **Clear extended attributes:**
   ```bash
   xattr -c new-file.md
   ```

## Root Cause

This appears to be a Cursor-specific issue where:
- Newly created files may not be immediately indexed
- File path resolution can fail for certain file patterns
- Extended attributes on macOS can interfere with file opening

The file itself is valid - this is purely a Cursor UI/editor issue.

## Workaround for Future Files

Consider creating markdown files using:
```bash
# Create file with proper formatting
cat > new-file.md << 'EOF'
# Your content here
EOF

# Fix it immediately
./scripts/fix-markdown-files.sh new-file.md
```

