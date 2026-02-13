# Codebase Structure

**Analysis Date:** 2026-02-06

## Directory Layout

```
claude-session-dashboard/
├── bin/                    # Executable scripts
├── server/                 # Express backend server workspace
│   ├── src/
│   │   ├── index.ts        # Server entry point
│   │   ├── api.ts          # Express router for REST endpoints
│   │   ├── watcher.ts      # SessionManager with file system watching
│   │   ├── websocket.ts    # WebSocketManager for real-time broadcasts
│   │   ├── notifications.ts # NotificationManager for state change alerts
│   │   ├── session-discovery.ts # Session and subagent discovery logic
│   │   ├── jsonl-parser.ts # JSONL file parsing and metadata extraction
│   │   └── tmux.ts         # Tmux integration for prompt injection
│   ├── package.json
│   ├── tsconfig.json
│   └── dist/               # Compiled JavaScript (generated)
├── client/                 # React frontend workspace
│   ├── src/
│   │   ├── main.tsx        # React entry point
│   │   ├── App.tsx         # Root component with layout and state
│   │   ├── index.css       # Global styles
│   │   ├── components/     # Reusable React components
│   │   │   ├── Layout.tsx          # Main page layout (header, sidebar, content)
│   │   │   ├── SessionList.tsx     # Sidebar: list of sessions
│   │   │   ├── FilterBar.tsx       # Sidebar: filter and search controls
│   │   │   ├── TreeView.tsx        # Main: tree visualization of session hierarchy
│   │   │   ├── TreeNode.tsx        # Tree node component (recursive)
│   │   │   ├── GraphView.tsx       # Main: graph visualization using @xyflow
│   │   │   ├── ViewToggle.tsx      # Header: switch between tree and graph views
│   │   │   ├── NodeDetail.tsx      # Main: detailed view of selected node
│   │   │   ├── Settings.tsx        # Modal: notification preferences and settings
│   │   │   ├── PromptInput.tsx     # Component: send prompt to session via tmux
│   │   │   ├── TmuxStatus.tsx      # Component: show tmux availability status
│   │   │   ├── ErrorBoundary.tsx   # Component: catch React rendering errors
│   │   │   └── nodes/              # Typed node components
│   │   │       ├── SessionNode.tsx
│   │   │       ├── MessageNode.tsx
│   │   │       ├── ToolNode.tsx
│   │   │       ├── SkillNode.tsx
│   │   │       ├── SubagentNode.tsx
│   │   │       └── index.ts
│   │   ├── store/          # State management
│   │   │   └── sessionStore.ts # Zustand store (sessions, selectedSessionId, viewMode, filter, search)
│   │   ├── hooks/          # Custom React hooks
│   │   │   ├── useWebSocket.ts        # WebSocket connection with auto-reconnect
│   │   │   ├── useNotifications.ts    # Browser notification integration
│   │   │   ├── useFaviconBadge.ts     # Favicon badge (waiting session count)
│   │   │   └── usePromptSend.ts       # Send prompt to session
│   │   └── utils/          # Utility functions
│   │       └── graphLayout.ts # Layout algorithm for graph visualization (dagre)
│   ├── package.json
│   ├── vite.config.ts      # Vite build configuration
│   ├── tsconfig.json
│   ├── index.html          # HTML entry point
│   └── dist/               # Built frontend (generated)
├── shared/                 # Shared types workspace
│   ├── src/
│   │   └── index.ts        # TypeScript interfaces for Session, Node types, WebSocket messages
│   ├── package.json
│   ├── tsconfig.json
│   └── dist/               # Compiled types (generated)
├── .planning/              # GSD planning artifacts
│   └── codebase/           # Generated architecture/analysis documents
├── package.json            # Root workspace manifest
├── package-lock.json       # Dependency lock file
└── tsconfig.json           # Root TypeScript configuration
```

## Directory Purposes

**bin/:**
- Purpose: Executable scripts and entry points
- Contains: Shell scripts for setup/deployment
- Files: Manual inspection needed

**server/:**
- Purpose: Backend Express server with real-time session monitoring
- Contains: File watchers, REST/WebSocket endpoints, session discovery logic
- Key files: `src/index.ts` (entry), `src/watcher.ts` (SessionManager)

**client/:**
- Purpose: React SPA with multiple visualization modes
- Contains: UI components, state management, custom hooks
- Key files: `src/main.tsx` (entry), `src/App.tsx` (root), `src/store/sessionStore.ts` (state)

**shared/:**
- Purpose: Monorepo shared dependency
- Contains: Zero-dependency TypeScript interfaces
- Key files: `src/index.ts` (all type definitions)

**.planning/codebase/:**
- Purpose: Generated documentation for architecture analysis
- Contains: ARCHITECTURE.md, STRUCTURE.md, CONVENTIONS.md, TESTING.md, CONCERNS.md
- Generated: Yes (by GSD mapping agents)
- Committed: Yes

## Key File Locations

**Entry Points:**
- `server/src/index.ts`: Server startup, Express app init, SessionManager start
- `client/src/main.tsx`: React root render
- `client/src/App.tsx`: Root component layout and orchestration

**Configuration:**
- `package.json`: Root workspace config with npm scripts
- `server/package.json`: Server dependencies (express, ws, chokidar)
- `client/package.json`: Client dependencies (react, zustand, @xyflow)
- `vite.config.ts`: Client build configuration
- `tsconfig.json`: Root and per-workspace TypeScript settings

**Core Logic:**
- `server/src/watcher.ts`: SessionManager - file watching, session discovery coordination
- `server/src/websocket.ts`: WebSocketManager - real-time client broadcasts
- `server/src/session-discovery.ts`: Session and subagent discovery, hierarchy building
- `server/src/api.ts`: REST endpoint handlers
- `server/src/notifications.ts`: Desktop/browser notification manager
- `client/src/store/sessionStore.ts`: Zustand store - single source of truth for UI state

**Testing:**
- Test files not detected; patterns to be established

## Naming Conventions

**Files:**
- PascalCase for React components: `SessionList.tsx`, `TreeView.tsx`
- camelCase for utilities and services: `sessionStore.ts`, `graphLayout.ts`, `useWebSocket.ts`
- camelCase for non-component modules: `watcher.ts`, `websocket.ts`, `notifications.ts`

**Directories:**
- lowercase for feature directories: `components/`, `hooks/`, `store/`, `utils/`
- sub-directory under components: `nodes/` contains typed node renderers

**Exports:**
- Classes exported as named exports: `export class SessionManager`
- Functions exported as named exports: `export function useWebSocket()`
- Types exported as named exports: `export type SessionState = 'active' | ...`
- Barrel files: `components/nodes/index.ts` exports all node components

**Identifiers:**
- Class names: PascalCase (SessionManager, WebSocketManager)
- Function names: camelCase (createApiRouter, broadcastSessionUpdate)
- Constants: UPPER_SNAKE_CASE (DEBOUNCE_MS, ACTIVE_THRESHOLD_MS, API_BASE)
- React hooks: camelCase starting with 'use' (useWebSocket, useNotifications)

## Where to Add New Code

**New Feature (e.g., new session statistic):**
- Backend logic: `server/src/session-discovery.ts` or new module in `server/src/`
- REST endpoint: Add route to `server/src/api.ts` (createApiRouter function)
- WebSocket broadcast: Add event emission in SessionManager, handler in WebSocketManager
- Frontend display: Add component in `client/src/components/`, wire to store
- Store update: Extend Zustand store in `client/src/store/sessionStore.ts`
- Shared types: Extend Session or AnyNode interface in `shared/src/index.ts`

**New Component/Module:**
- Reusable component: `client/src/components/ComponentName.tsx`
- Custom hook: `client/src/hooks/useFeatureName.ts`
- Utility: `client/src/utils/featureName.ts`
- Service class: `server/src/featureName.ts` (export as named export)

**Utilities:**
- Shared math/algorithms: `client/src/utils/` (graph layout, etc.)
- Pure functions for parsing: `server/src/` (session-discovery, jsonl-parser pattern)
- Type helpers: Keep in `shared/src/index.ts` or `shared/src/types.ts` if extracted

## Special Directories

**node_modules/:**
- Purpose: Package dependencies
- Generated: Yes (via npm install)
- Committed: No

**dist/ and build/:**
- Purpose: Compiled output
- Generated: Yes (via npm run build)
- Committed: No (in .gitignore)

**store/ (client):**
- Purpose: Zustand state container(s)
- Pattern: One file per store (sessionStore.ts)
- Client imports: `import { useSessionStore } from '../store/sessionStore'`
- Exports: Single default export of Zustand hook: `export const useSessionStore = create(...)`

**hooks/ (client):**
- Purpose: Custom React hooks
- Pattern: One file per hook, prefix with 'use'
- Server-dependent hooks: useWebSocket, useNotifications, usePromptSend
- UI-only hooks: useFaviconBadge
- Re-export: Consider barrel file if many hooks added

**components/nodes/ (client):**
- Purpose: Type-specific node renderers for tree/graph
- Files: SessionNode.tsx, MessageNode.tsx, ToolNode.tsx, SkillNode.tsx, SubagentNode.tsx
- Index: `components/nodes/index.ts` barrel exports all
- Pattern: Component receives typed node data, renders appropriately
- Consumer: TreeNode.tsx, GraphView.tsx

---

*Structure analysis: 2026-02-06*
