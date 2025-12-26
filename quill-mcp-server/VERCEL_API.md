# Using Vercel Deployment for Context API

Your Vercel deployment now includes API routes that serve your project context, making it easy to share with ChatGPT or other external tools.

## API Endpoints

Once deployed to Vercel, these endpoints will be available:

### Full Context
```
https://quill-writer.vercel.app/api/context/full
```
Returns: `{ quill, decisions, roadmap, linearIssues }`

### Quill Context Only
```
https://quill-writer.vercel.app/api/context/quill
```
Returns: `{ context: "# Quill Writer Context..." }`

### Decisions Only
```
https://quill-writer.vercel.app/api/context/decisions
```
Returns: `[{ id, title, rationale, timestamp }, ...]`

### Roadmap Only
```
https://quill-writer.vercel.app/api/context/roadmap
```
Returns: `{ version, lastUpdated, phases: [...] }`

## Usage with ChatGPT

### Option 1: Direct Link (Simplest)
Just share this link with ChatGPT:
```
https://quill-writer.vercel.app/api/context/full
```

ChatGPT can fetch the JSON directly and understand your project context.

### Option 2: Custom GPT with API Actions
1. Create a Custom GPT in ChatGPT
2. Add an API action that calls:
   - URL: `https://quill-writer.vercel.app/api/context/full`
   - Method: GET
3. The GPT will automatically fetch context when needed

### Option 3: Manual Copy-Paste
1. Visit: https://quill-writer.vercel.app/api/context/full
2. Copy the JSON response
3. Paste into ChatGPT

## Environment Variables

For Linear integration to work in Vercel:

1. Go to Vercel Dashboard → Your Project → Settings → Environment Variables
2. Add: `LINEAR_API_KEY` with your Linear API key
3. Redeploy (or it will auto-deploy on next push)

## Testing Locally

Test the API routes locally:
```bash
# Start Next.js dev server
npm run dev

# Then visit:
http://localhost:3000/api/context/full
```

## Notes

- These API routes are **read-only** (no file writes, git operations, etc.)
- They serve static data from `quill-mcp-server/data/` directory
- For full functionality (file operations, git, etc.), use the local Project Context Server on port 5051
- The Vercel API routes are perfect for sharing context with external tools like ChatGPT

