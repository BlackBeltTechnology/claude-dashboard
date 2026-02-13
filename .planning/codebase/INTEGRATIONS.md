# External Integrations

**Analysis Date:** 2026-02-06

## APIs & External Services

**Claude AI Session Data:**
- Data source: Local file system (`~/.claude/projects/`)
- What it's used for: Parse and monitor Claude AI agent session transcripts
- Format: JSONL files (one JSON object per line)
- Implementation: `server/src/jsonl-parser.ts`, `server/src/api.ts`, `server/src/session-discovery.ts`

**Terminal Session Management (tmux):**
- Service: tmux window/pane management
- What it's used for: Inject prompts into active tmux sessions
- Implementation: `server/src/tmux.ts`
- Method: Shell commands executed via Node.js child_process

## Data Storage

**File System:**
- Primary storage: Local file system only
- Location: `~/.claude/` directory (environment variable `HOME` based)
- Structure:
  - `~/.claude/projects/[projectHash]/[sessionId].jsonl` - Session transcripts
  - `~/.claude/projects/[projectHash]/[sessionId]/subagents/` - Nested subagent sessions

**In-Memory State:**
- Server: SessionManager maintains in-memory session cache (`server/src/watcher.ts`)
- Client: Zustand store holds UI state (`client/src/store/sessionStore.ts`)

**Caching:**
- None detected - data read directly from filesystem or WebSocket stream

## Authentication & Identity

**Auth Provider:**
- Custom / None
- Implementation: Localhost-only restriction
  - Server only accepts WebSocket connections from `127.0.0.1` or `::1` (`server/src/websocket.ts` lines 53-95)
  - CORS configured for `http://localhost:5173` only (`server/src/index.ts` line 13)
  - REST API available on `http://127.0.0.1:3847` only

**Session Access:**
- Public key: Session ID (UUID) in URL/API
- No password required for localhost connections
- Desktop notifications require user permission (OS-level)

## Monitoring & Observability

**Error Tracking:**
- None detected
- Errors logged to console

**Logs:**
- Console logging only
- Logger output to stdout:
  - `[Server]` prefix - Server messages (`server/src/index.ts`)
  - `[WebSocket]` prefix - WebSocket events (`server/src/websocket.ts`)
  - `[SessionStore]` prefix - Client store messages (`client/src/store/sessionStore.ts`)

**Desktop Notifications:**
- Provider: node-notifier 10.0.1 (`server/src/notifications.ts`)
- Triggers: Session state changes
- Platforms: Cross-platform (Windows, macOS, Linux)
- User preference: Toggle desktop/browser notifications via API (`server/src/index.ts` lines 77-99)

## CI/CD & Deployment

**Hosting:**
- Local development environment
- Can be deployed to any Node.js host
- Requires file system access to `~/.claude/` directory

**CI Pipeline:**
- None detected
- Manual build commands via npm scripts:
  - `npm run build` - Build all packages
  - `npm run dev` - Run dev mode with Vite
  - `npm start` - Start production server

## Environment Configuration

**Required Environment Variables:**
- `HOME` - User home directory (standard in Unix-like systems)
  - Used to construct `~/.claude` path (`server/src/index.ts` line 10)
- `CLAUDE_DASHBOARD_PORT` - Server port (optional, defaults to 3847)

**Secrets Location:**
- No secrets management detected
- All configuration is environment-based or hardcoded
- Localhost-only design assumes secure local network

## Data Flows

**Session Discovery:**

1. Server startup triggers `SessionManager.start()` (`server/src/index.ts` line 108)
2. SessionManager scans `~/.claude/projects/` recursively (`server/src/session-discovery.ts`)
3. For each `.jsonl` file, parse transcript and extract metadata (`server/src/api.ts` parseSession)
4. File watcher (chokidar) monitors for changes (`server/src/watcher.ts`)

**WebSocket Broadcasting:**

1. Client connects via WebSocket to `ws://localhost:3847`
2. Server sends full state snapshot on connect (`server/src/websocket.ts` line 157)
3. SessionManager emits events on file changes:
   - `session-update` - Full session data updated
   - `subagent-update` - Nested session updated
   - `state-change` - Session state transitioned
4. WebSocketManager broadcasts to all connected clients

**REST API Endpoints:**

**GET /api/health**
- Returns: `{ status: 'ok', claudeDir: string }`
- Purpose: Server health check

**GET /api/sessions**
- Returns: `{ sessions: Session[] }`
- Purpose: All sessions snapshot (REST alternative to WebSocket)

**POST /api/sessions/refresh**
- Returns: `{ success: boolean, count: number }`
- Purpose: Force rescan of session directory

**GET /api/sessions/:id**
- Returns: Full `Session` object with nodes
- Purpose: Fetch detailed session transcript

**POST /api/sessions/:id/prompt**
- Body: `{ prompt: string, tmuxTarget?: string }`
- Returns: `{ success: boolean, message: string }`
- Purpose: Inject prompt into tmux session

**GET /api/ws/clients**
- Returns: `{ count: number }`
- Purpose: Active WebSocket client count

**GET /api/notifications/preferences**
- Returns: `{ desktop: boolean, browser: boolean }`
- Purpose: User notification settings

**PUT /api/notifications/preferences**
- Body: `{ desktop?: boolean, browser?: boolean }`
- Returns: Updated preferences object
- Purpose: Update notification settings

## Webhooks & Callbacks

**Incoming:**
- None detected

**Outgoing:**
- Desktop notifications (`server/src/notifications.ts`)
  - Triggered on session state changes
  - Notification shows session ID and new state
  - User can configure enabled/disabled

## File Watching

**Chokidar Configuration:**
- Watches: `~/.claude/projects/` recursively
- Events tracked:
  - `add` - New session file created
  - `change` - Session file updated
  - `unlink` - Session file deleted
- Debouncing: 300ms (default chokidar delay)

**Metadata Extraction from Transcripts:**
- Git branch: Extracted from `gitBranch` field in JSONL entries
- Tmux target: Extracted from progress entry data
- Timestamps: Parsed from ISO format in entries
- Session state: Determined from last entry type and content

---

*Integration audit: 2026-02-06*
