# Technology Stack

**Analysis Date:** 2026-02-06

## Languages

**Primary:**
- TypeScript 5.3.3 - All source code (server, client, shared)

**Runtime:**
- Node.js (ES2022 target) - Server runtime
- Browser (ES2022 target) - Client runtime

## Runtime

**Environment:**
- Node.js (version specified via tsconfig target ES2022)
- Modern browsers (React 18.2.0 compatible)

**Package Manager:**
- npm (workspace monorepo setup)
- Lockfile: `package-lock.json` (present)

## Frameworks

**Core:**
- Express 4.18.2 - HTTP server and REST API (`server/src/index.ts`)
- React 18.2.0 - UI framework with React DOM 18.2.0 (`client/src/main.tsx`)

**Visualization:**
- @xyflow/react 12.0.0 - Graph/node visualization and interaction (`client/src/components/GraphView.tsx`, `client/src/components/nodes/`)
- dagre 0.8.5 - Graph layout algorithm for node positioning (`client/src/utils/graphLayout.ts`)

**State Management:**
- Zustand 4.5.0 - Lightweight client-side state management (`client/src/store/sessionStore.ts`)

**Real-time:**
- ws 8.16.0 - WebSocket server and client implementation (`server/src/websocket.ts`, native browser WebSocket in client)

**Build/Dev:**
- Vite 5.0.12 - Frontend build tool and dev server (`client/vite.config.ts`)
- @vitejs/plugin-react 4.2.1 - React plugin for Vite
- tsx 4.7.0 - TypeScript executor for Node.js (`server/package.json` scripts)

**Tooling:**
- concurrently 8.2.2 - Run multiple npm scripts concurrently (root workspace) (`package.json` dev script)

## Key Dependencies

**Critical Server:**
- chokidar 3.5.3 - File system watcher for monitoring session files (`server/src/watcher.ts`)
- express 4.18.2 - HTTP/REST API framework
- ws 8.16.0 - WebSocket server implementation
- cors 2.8.5 - CORS middleware for Express (`server/src/index.ts`)

**Critical Client:**
- react 18.2.0 - UI library
- react-dom 18.2.0 - React DOM rendering
- zustand 4.5.0 - State management
- @xyflow/react 12.0.0 - Graph visualization

**Desktop Integration:**
- node-notifier 10.0.1 - Cross-platform desktop notifications (`server/src/notifications.ts`)

**Utilities:**
- fs/promises - Built-in Node.js filesystem API (async operations)
- child_process - Built-in Node.js for tmux interaction (`server/src/tmux.ts`)
- path - Built-in Node.js path utilities
- events - Built-in Node.js EventEmitter base class

## Configuration

**TypeScript Compilation:**

**Server** (`server/tsconfig.json`):
- Target: ES2022
- Module: ESNext
- Module Resolution: bundler
- Output: `dist/` directory
- Strict mode: enabled
- Source: `src/` directory

**Client** (`client/tsconfig.json`):
- Target: ES2022
- Module: ESNext
- Module Resolution: bundler
- JSX: react-jsx
- Strict mode: enabled
- No emit (Vite handles compilation)
- Source: `src/` directory

**Shared** (`shared/tsconfig.json`):
- Target: ES2022
- Module: ESNext
- Declaration: true (generates .d.ts files)
- Composite: true (for monorepo references)
- Output: `dist/` directory

**Vite Configuration** (`client/vite.config.ts`):
- React plugin enabled
- Dev server port: 5173
- API proxy: `/api` → `http://127.0.0.1:3847`

**Environment Variables:**
- `CLAUDE_DASHBOARD_PORT` - Server port (default: 3847)
- `HOME` - Used to construct Claude directory path (`~/.claude`)

## Build Artifacts

**Server:**
- TypeScript compiled to `server/dist/` (ES2022)
- Entry point: `server/dist/index.js`
- Run with: `node dist/index.js`

**Client:**
- Vite builds to `client/dist/`
- Entry point: `client/dist/index.html`
- Dev server: Vite dev server on port 5173

**Shared:**
- TypeScript compiled to `shared/dist/`
- Exports: `shared/dist/index.js` (CommonJS) and `shared/dist/index.d.ts` (types)

## Monorepo Setup

**Workspaces:**
- Root workspace coordinates three packages:
  - `server/` - Backend API and WebSocket server
  - `client/` - React frontend
  - `shared/` - Shared types and interfaces

**Cross-workspace References:**
- `server` depends on `shared` (TypeScript path reference in tsconfig.json)
- `client` depends on `shared` (TypeScript path reference in tsconfig.json)

## Platform Requirements

**Development:**
- Node.js with npm
- TypeScript 5.3.3
- Modern browser (for dev server access)
- tmux (for session injection feature) (`server/src/tmux.ts`)
- Desktop notification support (optional, gracefully degrades)

**Production:**
- Node.js runtime for server
- Browser for frontend access
- File system access to `~/.claude/` directory
- tmux (optional, for prompt injection)
- Desktop notification daemon (optional)

---

*Stack analysis: 2026-02-06*
