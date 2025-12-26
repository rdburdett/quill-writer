# Quill Project Context Server

A REST API server for the Quill Writer project that provides centralized project context, decisions, roadmap, and controlled file/git operations. This is currently implemented as a REST API (not a true MCP server) but can be converted to the MCP protocol later if needed.

## Purpose

This Project Context Server provides:
- **Quill Context Capsule**: Long-term project context and architecture documentation
- **Decision Log**: Architectural and design decisions with rationale
- **Roadmap**: Atomic tasks and feature tracking
- **File System Access**: Read/write repo files with safety checks
- **Git Operations**: Branch management, commits, and diffs
- **Linear Integration**: Fetch issues and sync with project management

## Getting Started

1. Install dependencies:
```bash
cd quill-mcp-server
npm install
```

2. Configure the server:
   - Edit `config.json` to adjust safety settings and repo path
   - (Optional) Create `.env` file with `LINEAR_API_KEY` for Linear integration

3. Start the server:
```bash
npm start
```

The server will run on `http://localhost:5051`

## Configuration

### config.json

The server uses `config.json` for safety and repository settings:

```json
{
	"safety": {
		"mode": "ask_before_write",  // "read_only" | "ask_before_write" | "write_allowed"
		"protectedBranches": ["main", "master"],
		"protectedPaths": [".env*", ".git/*", "node_modules/*", ...]
	},
	"repo": {
		"root": "../"  // Relative path to repo root from server directory
	},
	"linear": {
		"enabled": false  // Set to true after configuring LINEAR_API_KEY
	}
}
```

### Environment Variables

Create a `.env` file in the `quill-mcp-server` directory:

```bash
LINEAR_API_KEY=your_linear_api_key_here
```

To get your Linear API key:
1. Go to https://linear.app/settings/api
2. Create a new API key
3. Copy it to your `.env` file
4. Set `"linear.enabled": true` in `config.json`

## API Endpoints

### Context Endpoints

#### `GET /context/quill`
Retrieve the Quill Context Capsule (markdown).

**Response:**
```json
{
	"context": "# Quill Writer Context Capsule\n\n..."
}
```

#### `GET /context/full`
Retrieve combined context (quill + decisions + roadmap + Linear issues if enabled).

**Response:**
```json
{
	"quill": "# Quill Writer Context Capsule\n\n...",
	"decisions": [...],
	"roadmap": [...],
	"linearIssues": [...]  // If Linear is enabled
}
```

### Decision Log Endpoints

#### `GET /decisions`
Retrieve all decision log entries.

**Response:**
```json
[
	{
		"id": "1234567890",
		"title": "Decision title",
		"rationale": "Why this decision was made",
		"timestamp": "2024-01-01T00:00:00.000Z"
	}
]
```

#### `POST /decisions`
Add a new decision entry.

**Request Body:**
```json
{
	"title": "Decision title",
	"rationale": "Why this decision was made"
}
```

**Response:**
```json
{
	"added": {
		"id": "1234567890",
		"title": "Decision title",
		"rationale": "Why this decision was made",
		"timestamp": "2024-01-01T00:00:00.000Z"
	}
}
```

### Roadmap Endpoints

#### `GET /roadmap/next`
Get the next uncompleted task.

**Response:**
```json
{
	"id": "browser-001",
	"task": "Implement file browser collapsible behavior",
	"done": false
}
```

#### `POST /roadmap/done`
Mark a task as completed.

**Request Body:**
```json
{
	"id": "browser-001"
}
```

**Response:**
```json
{
	"updated": {
		"id": "browser-001",
		"task": "Implement file browser collapsible behavior",
		"done": true
	}
}
```

### File System Endpoints

#### `GET /files/list`
List files in the repository.

**Query Parameters:**
- `path` (optional): Subdirectory path to list

**Example:**
```
GET /files/list?path=components
```

**Response:**
```json
{
	"files": [
		"components/editor-view.tsx",
		"components/novel-editor.tsx",
		...
	],
	"count": 15
}
```

#### `GET /files/read`
Read file content by path.

**Query Parameters:**
- `path` (required): File path relative to repo root

**Example:**
```
GET /files/read?path=components/editor-view.tsx
```

**Response:**
```json
{
	"path": "components/editor-view.tsx",
	"content": "import React from 'react';\n..."
}
```

#### `POST /files/write`
Write file content (with safety checks).

**Request Body:**
```json
{
	"path": "components/new-file.tsx",
	"content": "export const NewFile = () => {\n  return <div>Hello</div>;\n};"
}
```

**Safety Rules:**
- Cannot write to protected paths (`.env*`, `.git/*`, `node_modules/*`, etc.)
- Cannot write directly to protected branches (`main`, `master`)
- All write operations are logged

**Response:**
```json
{
	"success": true,
	"path": "components/new-file.tsx"
}
```

#### `POST /files/diff`
Propose a diff without writing (preview changes).

**Request Body:**
```json
{
	"path": "components/editor-view.tsx",
	"content": "// modified content..."
}
```

**Response:**
```json
{
	"path": "components/editor-view.tsx",
	"oldContent": "// original content...",
	"newContent": "// modified content...",
	"hasChanges": true
}
```

### Git Endpoints

#### `GET /git/branch`
Get current branch and list all branches.

**Response:**
```json
{
	"current": "feature/new-feature",
	"branches": ["main", "feature/new-feature", "develop"],
	"all": ["main", "feature/new-feature", "develop", "origin/main", ...]
}
```

#### `POST /git/branch`
Create or switch branches.

**Request Body:**
```json
{
	"name": "feature/new-feature",
	"create": true  // true to create, false to switch
}
```

**Safety Rules:**
- Cannot create or switch to protected branches (`main`, `master`)

**Response:**
```json
{
	"success": true,
	"current": "feature/new-feature"
}
```

#### `GET /git/status`
Get git status.

**Response:**
```json
{
	"current": "feature/new-feature",
	"tracking": "origin/feature/new-feature",
	"ahead": 2,
	"behind": 0,
	"files": [
		{
			"path": "components/new-file.tsx",
			"index": "M",
			"working_dir": "M"
		}
	]
}
```

#### `GET /git/diff`
Get git diff.

**Query Parameters:**
- `path` (optional): Specific file path to diff

**Example:**
```
GET /git/diff?path=components/editor-view.tsx
```

**Response:**
```json
{
	"diff": "diff --git a/components/editor-view.tsx\n..."
}
```

#### `POST /git/commit`
Create a commit (with safety checks).

**Request Body:**
```json
{
	"message": "Add new feature",
	"files": ["components/new-file.tsx"]  // Optional: specific files, or omit to commit all
}
```

**Safety Rules:**
- Cannot commit directly to protected branches (`main`, `master`)
- All commits are logged

**Response:**
```json
{
	"success": true,
	"commit": "abc123def456..."
}
```

### Linear Integration Endpoints

**Note:** Linear integration requires `LINEAR_API_KEY` in `.env` and `"linear.enabled": true` in `config.json`.

#### `GET /linear/issues`
Fetch active Linear issues.

**Query Parameters:**
- `state` (optional): Filter by state name (e.g., "In Progress", "Backlog")

**Example:**
```
GET /linear/issues?state=In Progress
```

**Response:**
```json
{
	"issues": [
		{
			"id": "abc123",
			"identifier": "QUILL-12",
			"title": "File Browser – Collapsible Tree",
			"description": "Implement expandable folders...",
			"state": { "name": "In Progress" },
			"labels": { "nodes": [{ "name": "UI" }, { "name": "file-browser" }] },
			"assignee": { "name": "John Doe", "email": "john@example.com" },
			"createdAt": "2024-01-01T00:00:00.000Z",
			"updatedAt": "2024-01-02T00:00:00.000Z"
		}
	],
	"count": 1
}
```

#### `GET /linear/next`
Get the next unblocked Linear issue.

**Response:**
```json
{
	"id": "abc123",
	"identifier": "QUILL-12",
	"title": "File Browser – Collapsible Tree",
	"description": "Implement expandable folders...",
	"state": { "name": "In Progress" },
	"labels": { "nodes": [{ "name": "UI" }] },
	"assignee": { "name": "John Doe", "email": "john@example.com" },
	"createdAt": "2024-01-01T00:00:00.000Z",
	"updatedAt": "2024-01-02T00:00:00.000Z"
}
```

#### `GET /linear/issue/:id`
Get specific Linear issue details.

**Example:**
```
GET /linear/issue/abc123
```

**Response:**
```json
{
	"id": "abc123",
	"identifier": "QUILL-12",
	"title": "File Browser – Collapsible Tree",
	"description": "Implement expandable folders...",
	"state": { "name": "In Progress" },
	"labels": { "nodes": [{ "name": "UI" }] },
	"assignee": { "name": "John Doe", "email": "john@example.com" },
	"createdAt": "2024-01-01T00:00:00.000Z",
	"updatedAt": "2024-01-02T00:00:00.000Z",
	"comments": {
		"nodes": [
			{
				"body": "Working on this now",
				"createdAt": "2024-01-02T00:00:00.000Z",
				"user": { "name": "John Doe" }
			}
		]
	}
}
```

## Safety Features

The MCP server includes several safety mechanisms:

1. **Path Validation**: All file paths are validated to prevent directory traversal attacks
2. **Protected Paths**: Sensitive files (`.env*`, `.git/*`, `node_modules/*`) cannot be written
3. **Branch Protection**: Cannot commit directly to `main` or `master` branches
4. **Write Logging**: All write operations are logged to `data/write_log.json`
5. **Configurable Modes**:
   - `read_only`: All writes are blocked
   - `ask_before_write`: Writes to protected branches are blocked
   - `write_allowed`: Writes allowed (still respects protected paths)

## Data Storage

All data is stored in JSON files in the `data/` directory:
- `quill_context.md` - Project context (markdown)
- `decisions.json` - Decision log (JSON array)
- `roadmap.json` - Task roadmap (JSON array)
- `write_log.json` - Write operation log (auto-generated)

## Usage with AI Agents

### Cursor Integration

Add to your `.cursorrules` file:

```
Before writing any code:
1. Call GET http://localhost:5051/context/full to load project context
2. Call GET http://localhost:5051/linear/next to get the next task (if Linear is enabled)
3. Review decisions and roadmap before making changes
4. Always create a branch before writing files
5. Use POST /files/diff to preview changes before writing
```

### ChatGPT Integration

**See [CHATGPT_SETUP.md](./CHATGPT_SETUP.md) for complete setup instructions.**

ChatGPT doesn't natively support MCP servers. To connect ChatGPT:

1. **Create a Custom GPT** with API actions (recommended)
2. **Expose server via ngrok** for ChatGPT to access
3. **Use manual context sharing** for one-off conversations

Quick start:
```bash
# Start server with ngrok
./scripts/start-with-ngrok.sh
```

Then create a Custom GPT using the OpenAPI schema in `openapi-schema.json`.

### Example Workflow

1. **Load Context:**
   ```bash
   curl http://localhost:5051/context/full
   ```

2. **Get Next Task:**
   ```bash
   curl http://localhost:5051/linear/next
   ```

3. **Create Branch:**
   ```bash
   curl -X POST http://localhost:5051/git/branch \
     -H "Content-Type: application/json" \
     -d '{"name": "feature/new-feature", "create": true}'
   ```

4. **Read File:**
   ```bash
   curl "http://localhost:5051/files/read?path=components/editor-view.tsx"
   ```

5. **Preview Changes:**
   ```bash
   curl -X POST http://localhost:5051/files/diff \
     -H "Content-Type: application/json" \
     -d '{"path": "components/editor-view.tsx", "content": "// modified..."}'
   ```

6. **Write File:**
   ```bash
   curl -X POST http://localhost:5051/files/write \
     -H "Content-Type: application/json" \
     -d '{"path": "components/new-file.tsx", "content": "export const NewFile = () => {};"}'
   ```

7. **Commit Changes:**
   ```bash
   curl -X POST http://localhost:5051/git/commit \
     -H "Content-Type: application/json" \
     -d '{"message": "Add new feature"}'
   ```

## Troubleshooting

### Server won't start
- Check that port 5051 is not in use
- Verify `config.json` exists and is valid JSON
- Ensure repo root path in config is correct

### File operations fail
- Check that the repo root path in `config.json` is correct
- Verify file paths are relative to repo root
- Check protected paths list in `config.json`

### Git operations fail
- Ensure the repo root contains a valid `.git` directory
- Check that you're not trying to operate on protected branches
- Verify git is installed and accessible

### Linear integration fails
- Verify `LINEAR_API_KEY` is set in `.env`
- Check that `"linear.enabled": true` in `config.json`
- Ensure your Linear API key has proper permissions
- Check Linear API status at https://status.linear.app

## Security Notes

- The MCP server runs locally and is not exposed to the internet
- API keys are stored in `.env` (gitignored)
- All write operations are logged
- Protected paths and branches prevent accidental changes
- Path validation prevents directory traversal attacks
