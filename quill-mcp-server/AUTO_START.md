# Auto-Start Setup

The Project Context Server can automatically start when you open a terminal in the quill-writer project.

## Quick Install

Run this command from the `quill-mcp-server` directory:

```bash
./scripts/install-auto-start.sh
```

This will add a hook to your shell profile (`.zshrc` or `.bashrc`) that automatically starts the server when you open a terminal in the project.

## Manual Install

If you prefer to add it manually, add this line to your `~/.zshrc` or `~/.bashrc`:

```bash
source /path/to/quill-writer/quill-mcp-server/scripts/auto-start.sh
```

Replace `/path/to/quill-writer` with the actual path to your project.

## How It Works

- The auto-start script checks if you're in the quill-writer project directory
- If the server isn't already running on port 5051, it starts it in the background
- Server logs are saved to `/tmp/quill-context-server.log`
- The server PID is saved to `/tmp/quill-context-server.pid`

## Uninstall

Remove these lines from your shell profile (`~/.zshrc` or `~/.bashrc`):

```bash
# Quill Project Context Server auto-start
source /path/to/quill-writer/quill-mcp-server/scripts/auto-start.sh
```

## Manual Control

Even with auto-start enabled, you can still manually control the server:

```bash
cd quill-mcp-server
npm run status   # Check if running
npm run stop     # Stop the server
npm run background # Start manually
```

