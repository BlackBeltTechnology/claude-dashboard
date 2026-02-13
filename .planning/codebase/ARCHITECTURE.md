# Architecture

**Analysis Date:** 2026-02-06

## Pattern Overview

**Overall:** Monorepo full-stack application using client-server architecture with real-time WebSocket communication.

**Key Characteristics:**
- Monorepo with three workspaces: `server`, `client`, `shared`
- Real-time bidirectional communication via WebSocket for session state updates
- Event-driven architecture on server side with file system watching
- State management via Zustand on client side
- Two visualization modes: tree view and graph view
- Tree hierarchy: Session → Messages → Tools/Skills/Subagents

## Layers

**Shared Types Layer (`shared/`):**
- Purpose: Single source of truth for all type definitions and interfaces
- Location: `shared/src/index.ts`
- Contains: TypeScript interfaces for Session, AnyNode variants, WebSocket message types, API types
- Depends on: None (zero dependencies)
- Used by: Both server and client modules

**Server Backend Layer (`server/src/`):**
- Purpose: Express HTTP server + WebSocket server + file system monitoring
- Location: `server/src/`
- Contains: Express routes, WebSocket handlers, file watchers, session discovery
- Depends on: Express, ws, chokidar, node-notifier, shared types
- Used by: Client-side HTTP/WebSocket calls, system file events

**Client Frontend Layer (`client/src/`):**
- Purpose: React UI with multiple visualization modes and state management
- Location: `client/src/`
- Contains: React components, Zustand store, custom hooks, utilities
- Depends on: React, Zustand, @xyflow/react, dagre, shared types
- Used by: End users via browser

## Data Flow

**Initial Connection Flow:**

1. Client connects to WebSocket at `ws://localhost:3847`
2. WebSocketManager validates connection is from localhost (127.0.0.1 or ::1)
3. Server sends `snapshot` message with all current sessions
4. Client's Zustand store processes snapshot, populating initial state
5. Client renders SessionList and selected session detail

**Session Update Flow:**

1. SessionManager watches `~/.claude/projects/*/` for JSONL file changes
2. Chokidar detects file modification, triggers debounced handler (100ms)
3. Handler parses JSONL file via `session-discovery.ts`
4. SessionManager emits `session-update` event with complete Session object
5. WebSocketManager broadcasts update to all connected clients
6. Client's `useWebSocket` hook captures message, calls `handleWebSocketMessage`
7. Zustand store processes message, updates sessions array and derived selectors
8. React re-renders affected components

**State Change Detection:**

1. SessionManager compares new state (determined by debug log mtime) with previous state
2. If state differs, emits `state-change` event with oldState, newState, sessionId, agentId
3. NotificationManager listens to state-change events
4. If newState is 'waiting', sends desktop notification (with duplicate suppression)
5. WebSocketManager broadcasts state-change to clients
6. Client updates session state in Zustand, re-renders badges and favicon

**State Management:**

- Server: SessionManager maintains in-memory Map of sessionId → Session objects
- Client: Zustand store holds sessions array, selectedSessionId, viewMode, filter, searchTerm
- Synchronization: WebSocket pushes changes from server to client (one-way)
- No client-to-server state updates (read-only dashboard)

## Key Abstractions

**SessionManager (Event-driven Manager):**
- Purpose: Orchestrates file watching, discovery, state polling
- Examples: `server/src/watcher.ts`
- Pattern: EventEmitter that emits session-update, subagent-update, state-change events
- Key methods: start(), refresh(), getSessions()

**WebSocketManager (Broadcast Hub):**
- Purpose: Manages WebSocket connections and broadcasts state updates
- Examples: `server/src/websocket.ts`
- Pattern: Maintains Set of connected WebSocket clients, sends messages to all
- Security: Localhost-only validation on upgrade handler
- Key methods: broadcastSessionUpdate(), broadcastStateChange(), getClientCount()

**Session Discovery (JSONL Parser + Metadata Extractor):**
- Purpose: Scans project directories, parses session JSONL files, builds hierarchy
- Examples: `server/src/session-discovery.ts`, `server/src/jsonl-parser.ts`
- Pattern: Pure functions for parsing, discovering, extracting state
- Key functions: discoverTodaysSessions(), parseSessionFile(), discoverSubagents()

**Zustand Store (Client State Container):**
- Purpose: Single source of truth for UI state
- Examples: `client/src/store/sessionStore.ts`
- Pattern: Zustand hook-based store with selectors and actions
- Key state: sessions[], selectedSessionId, viewMode ('tree'|'graph'), filter, searchTerm
- Key actions: setSelectedSession(), handleWebSocketMessage(), setFilter()

**NotificationManager (Observer Pattern):**
- Purpose: Listens to state changes and sends notifications
- Examples: `server/src/notifications.ts`
- Pattern: Observer attached to SessionManager, with duplicate suppression
- Features: Desktop + browser notification toggles, duplicate detection via Set

## Entry Points

**Server Entry Point:**
- Location: `server/src/index.ts`
- Triggers: `npm run dev -w server` or `npm run start -w server`
- Responsibilities:
  1. Initialize Express app with CORS and JSON parsing
  2. Create SessionManager and start file watching
  3. Create NotificationManager and wire to SessionManager
  4. Create WebSocketManager and attach sessions provider
  5. Wire SessionManager events to WebSocket broadcasts
  6. Mount Express routes (/api/sessions, /api/health, etc.)
  7. Start HTTP server on port 3847

**Client Entry Point:**
- Location: `client/src/main.tsx` → `client/src/App.tsx`
- Triggers: `npm run dev -w client`
- Responsibilities:
  1. Initialize WebSocket connection via useWebSocket hook
  2. Set up Zustand store with message handler
  3. Initialize browser and favicon notifications
  4. Check tmux availability via health endpoint
  5. Render Layout with sidebar and main view
  6. Route between tree and graph visualization modes

**API Endpoints:**
- `GET /api/health` - Server status and Claude directory check
- `GET /api/sessions` - Fetch all current sessions (REST fallback)
- `POST /api/sessions/refresh` - Trigger SessionManager refresh
- `GET /api/notifications/preferences` - Fetch user notification settings
- `PUT /api/notifications/preferences` - Update notification settings
- `POST /api/sessions/:sessionId/nodes/:nodeId/prompt` - Inject prompt via tmux
- `GET /api/ws/clients` - Debug: count of connected WebSocket clients

## Error Handling

**Strategy:** Graceful degradation with console logging and error boundaries

**Patterns:**

**Server-side:**
- SessionManager emits 'error' events on file system errors (logged, doesn't crash)
- API endpoints return ApiError JSON with error code and message
- Graceful shutdown on SIGINT/SIGTERM (stops watchers, closes connections)

**Client-side:**
- useWebSocket hook catches JSON parsing errors, logs to console
- ErrorBoundary component wraps MainView and catches React rendering errors
- Missing sessions show "Select a session" message
- Network failures downgrade gracefully (shows disconnection status, auto-reconnects)
- Fallback to REST API if WebSocket unavailable

## Cross-Cutting Concerns

**Logging:**
- Console.log/error prefixed with [component] identifier (e.g., "[Server]", "[WebSocket]", "[SessionManager]")
- Warnings logged for security issues (non-localhost connections rejected)

**Validation:**
- TypeScript strict mode ensures type safety at compile-time
- PromptRequest validation in API endpoint (prompt must be non-empty string)
- WSMessage and payload types validated at parse-time in useWebSocket hook

**Authentication:**
- No user authentication (localhost-only)
- WebSocket connections reject non-127.0.0.1 and non-::1 addresses at socket level
- API endpoints accessible only from localhost (CORS allows http://localhost:5173)

---

*Architecture analysis: 2026-02-06*
