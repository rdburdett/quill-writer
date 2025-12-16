# Quill MCP Server

A simple, local MCP (Model Context Protocol) server for the Quill Writer project. This server provides a centralized source of knowledge that can be queried by AI agents and tools.

## Purpose

This MCP server stores:
- **Quill Context Capsule**: Long-term project context and architecture documentation
- **Decision Log**: Architectural and design decisions with rationale
- **Roadmap**: Atomic tasks and feature tracking

## Getting Started

1. Install dependencies:
```bash
cd quill-mcp-server
npm install
```

2. Start the server:
```bash
npm start
```

The server will run on `http://localhost:5051`

## API Endpoints

### Context
- `GET /context/quill` - Retrieve the Quill Context Capsule (markdown)

### Decisions
- `GET /decisions` - Retrieve all decision log entries
- `POST /decisions` - Add a new decision entry
  ```json
  {
    "title": "Decision title",
    "rationale": "Why this decision was made"
  }
  ```

### Roadmap
- `GET /roadmap/next` - Get the next uncompleted task
- `POST /roadmap/done` - Mark a task as completed
  ```json
  {
    "id": "task-id"
  }
  ```

## Data Storage

All data is stored in JSON files in the `data/` directory:
- `quill_context.md` - Project context (markdown)
- `decisions.json` - Decision log (JSON array)
- `roadmap.json` - Task roadmap (JSON array)

## Usage with AI Agents

Agents can query this server to:
1. Load project context before making changes
2. Review past decisions to maintain consistency
3. Check what tasks are next in the roadmap
4. Log new decisions as they're made

Example Cursor `.cursorrules` integration:
```
Before writing any code, call GET http://localhost:5051/context/quill to load project context.
```







