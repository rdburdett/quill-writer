# ChatGPT Integration Guide

This guide explains how to connect ChatGPT to your Quill Writer codebase and MCP/Linear information.

## Overview

ChatGPT doesn't natively support MCP servers like Cursor does. To connect ChatGPT to your local MCP server, you have three main options:

1. **Custom GPT with API Actions** (Recommended) - Create a Custom GPT that calls your MCP server
2. **Temporary Public Access** - Expose your server via ngrok for ChatGPT to access
3. **Manual Context Sharing** - Copy context from MCP server into ChatGPT conversations

## Option 1: Custom GPT with API Actions (Recommended)

This creates a ChatGPT Custom GPT that can call your MCP server endpoints.

### Step 1: Expose Your MCP Server

Your server runs on `localhost:5051`, which ChatGPT can't access directly. You need to expose it:

#### Using ngrok (Temporary, Secure)

1. **Install ngrok:**
   ```bash
   # macOS
   brew install ngrok
   
   # Or download from https://ngrok.com/download
   ```

2. **Start your MCP server:**
   ```bash
   cd quill-mcp-server
   npm start
   ```

3. **Expose it via ngrok:**
   ```bash
   ngrok http 5051
   ```

4. **Copy the HTTPS URL** (e.g., `https://abc123.ngrok.io`)

#### Using Cloudflare Tunnel (Free, Persistent)

```bash
# Install cloudflared
brew install cloudflared

# Create tunnel
cloudflared tunnel --url http://localhost:5051
```

### Step 2: Create OpenAPI Schema

Create an OpenAPI schema file that describes your MCP server endpoints:

See `openapi-schema.json` in this directory for the complete schema.

### Step 3: Create Custom GPT

1. Go to https://chat.openai.com/gpts
2. Click "Create" → "Create a GPT"
3. Configure your GPT:

**Name:** Quill Writer Assistant

**Description:**
```
A specialized assistant for the Quill Writer project. Can access project context, Linear issues, file system, and git operations through the MCP server.
```

**Instructions:**
```
You are a specialized assistant for the Quill Writer project. You have access to the project's MCP server which provides:

1. Project Context: Architecture decisions, roadmap, and technical context
2. Linear Integration: Access to active issues and task management
3. File System: Read/write access to repository files (with safety checks)
4. Git Operations: Branch management, commits, and diffs

Before making any changes:
- Always load full context first: GET /context/full
- Check the next Linear issue: GET /linear/next
- Review decisions and roadmap
- Create a branch before writing files
- Use POST /files/diff to preview changes

Safety rules:
- Never commit directly to main/master branches
- Protected paths (.env, .git, node_modules) cannot be modified
- All write operations are logged

When the user asks about the project, start by loading context from the MCP server.
```

**Knowledge:** (Optional) Upload key files like `quill_context.md`

**Actions:** Click "Create new action"

**Authentication:** None (or API key if you add auth)

**Schema:** Paste the OpenAPI schema from `openapi-schema.json`

**Save** your Custom GPT

### Step 4: Test the Integration

In your Custom GPT, try:
- "What's the next Linear issue?"
- "Load the project context"
- "What files are in the components directory?"

## Option 2: Temporary Public Access (Quick Testing)

For quick testing without setting up a Custom GPT:

1. **Expose server via ngrok:**
   ```bash
   ngrok http 5051
   ```

2. **Copy the ngrok URL** (e.g., `https://abc123.ngrok.io`)

3. **In ChatGPT, use Code Interpreter or paste:**
   ```
   Please fetch project context from: https://abc123.ngrok.io/context/full
   ```

4. **Or use ChatGPT's web browsing** (if enabled) to access the endpoints

**⚠️ Security Warning:** Only use this temporarily. Close ngrok when done.

## Option 3: Manual Context Sharing

For one-off conversations:

1. **Start your MCP server:**
   ```bash
   cd quill-mcp-server
   npm start
   ```

2. **Fetch context:**
   ```bash
   curl http://localhost:5051/context/full > context.json
   ```

3. **Copy the context** and paste it into ChatGPT

4. **Or use ChatGPT's file upload** to upload `context.json`

## Recommended Workflow

### For Regular Use (Custom GPT)

1. Start MCP server: `cd quill-mcp-server && npm start`
2. Expose via ngrok: `ngrok http 5051` (keep running)
3. Use your Custom GPT in ChatGPT
4. The GPT will automatically call MCP endpoints

### For Quick Questions (Manual)

1. Start MCP server
2. Run: `curl http://localhost:5051/context/full | pbcopy`
3. Paste into ChatGPT

## Security Considerations

### For ngrok/Public Exposure:

1. **Add authentication** to your MCP server (see `server.js` for auth middleware)
2. **Use ngrok's IP restrictions** if possible
3. **Rotate URLs** regularly
4. **Monitor access logs** in ngrok dashboard
5. **Set safety mode to "read_only"** in `config.json` when exposing publicly

### Recommended: Add API Key Auth

Add this to your MCP server before exposing:

```javascript
// Add to server.js
const API_KEY = process.env.MCP_API_KEY || 'your-secret-key';

app.use((req, res, next) => {
  if (req.path.startsWith('/context/')) {
    // Public endpoints - no auth needed
    return next();
  }
  
  const providedKey = req.headers['x-api-key'];
  if (providedKey !== API_KEY) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  next();
});
```

Then set `MCP_API_KEY` in your `.env` and include it in Custom GPT actions.

## Troubleshooting

### "Connection refused" errors
- Make sure MCP server is running: `npm start`
- Check ngrok is running and URL is correct
- Verify firewall isn't blocking port 5051

### Custom GPT can't access endpoints
- Check OpenAPI schema is valid
- Verify ngrok URL is HTTPS (not HTTP)
- Test endpoints manually: `curl https://your-ngrok-url.ngrok.io/context/full`

### Linear issues not showing
- Verify `LINEAR_API_KEY` is set in `.env`
- Check `"linear.enabled": true` in `config.json`
- Test Linear endpoint: `curl http://localhost:5051/linear/next`

## Next Steps

1. Set up ngrok or Cloudflare tunnel
2. Create OpenAPI schema (see `openapi-schema.json`)
3. Create Custom GPT with API actions
4. Test the integration
5. Add authentication for production use

