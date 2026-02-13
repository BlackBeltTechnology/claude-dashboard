# Coding Conventions

**Analysis Date:** 2026-02-06

## Naming Patterns

**Files:**
- React components: PascalCase, suffix with `.tsx` (e.g., `NodeDetail.tsx`, `SessionList.tsx`)
- Utility files: camelCase with `.ts` extension (e.g., `graphLayout.ts`, `sessionStore.ts`)
- Custom hooks: camelCase prefixed with `use` (e.g., `useWebSocket.ts`, `useFaviconBadge.ts`)
- Class-based modules: PascalCase (e.g., `SessionManager`, `WebSocketManager`, `Debouncer`)
- Type definitions in shared module: TypeScript interfaces and types organized in `shared/src/index.ts`

**Functions:**
- Camel case for all function names: `handleWebSocketMessage`, `updateSession`, `setSelectedSession`
- Private methods on classes: prefixed with `_` not used, private methods marked with `private` keyword (e.g., `private handleUpgrade()`, `private async start()`)
- Helper functions: descriptive names starting with verbs or prefixes (e.g., `filterSession`, `nodeMatchesFilter`, `getNodeIcon`, `validatePromptRequest`)
- Callback/handler functions: prefix with verb (e.g., `handleConnection`, `handleRetry`, `sendError`, `broadcastStateChange`)

**Variables:**
- Camel case throughout: `selectedSessionId`, `viewMode`, `sessions`, `lastMessage`
- Constant values: UPPER_SNAKE_CASE when module-level (e.g., `DEBOUNCE_MS = 100`, `STATE_POLL_INTERVAL_MS = 2000`, `API_BASE = 'http://localhost:3847/api'`)
- Inline constants (like style objects): camelCase and assigned to `const` (e.g., `const styles = {...}`)
- Private class properties: camelCase with `private` keyword (e.g., `private wss: WebSocketServer`, `private clients: Set<WebSocket>`)

**Types:**
- Interfaces: PascalCase with suffix `Props` for component props, `State` for state shape, `Events` for event maps (e.g., `NodeDetailProps`, `ErrorBoundaryState`, `SessionManagerEvents`)
- Union types and exported types: PascalCase (e.g., `FilterType`, `ViewMode`, `NodeType`)
- Generic type parameters: single uppercase letters or descriptive names (e.g., `T`, `CustomNodeData`)
- Type guards/validation functions: camelCase starting with `is` or `validate` (e.g., `validatePromptRequest`)

## Code Style

**Formatting:**
- No explicit formatter configured (no `.prettierrc` or eslint config found in project root)
- Consistent indentation: 2 spaces observed throughout codebase
- Line length: code typically wraps around 100-110 characters
- Semicolons: always present at statement endings
- Trailing commas: used in multi-line objects and arrays (observed in `package.json`, tsconfig files)

**Linting:**
- TypeScript strict mode enabled in all `tsconfig.json` files
- Compiler options across projects:
  - `"strict": true` enforces strict type checking
  - `"esModuleInterop": true` allows default imports from CommonJS modules
  - `"skipLibCheck": true` skips type checking for declaration files
  - `"resolveJsonModule": true` allows importing JSON files
  - `"isolatedModules": true` (client) ensures each file can be safely transpiled
  - `"noEmit": true` (client) prevents TypeScript from emitting output

**Import Organization:**
Order observed in files (not enforced, but consistent):
1. Third-party packages (react, zustand, express, ws, etc.)
2. Type imports from third-party (often using `type` keyword to indicate compile-time only imports)
3. Local module imports (from shared, from `./*.js`)
4. Relative imports for utilities and components
5. Type imports from shared module

Example pattern from `server/src/index.ts`:
```typescript
import express from 'express';
import cors from 'cors';
import { createServer } from 'http';
import { WebSocketManager } from './websocket.js';
import { createApiRouter } from './api.js';
// ... more local imports
```

Example pattern from `client/src/store/sessionStore.ts`:
```typescript
import { create } from 'zustand';
import type { Session, WSMessage, ... } from 'shared';
// ... internal helper functions
export const useSessionStore = create<SessionStore>(...);
```

**Path Aliases:**
- TypeScript project references used instead of path aliases (e.g., `references: [{ "path": "../shared" }]`)
- Relative imports with `.js` extensions used in server files (ESM format): `import { x } from './websocket.js'`
- No absolute path aliases like `@/` observed

## Error Handling

**Patterns:**
- Try-catch blocks used for synchronous operations and JSON parsing:
  ```typescript
  try {
    const stored = localStorage.getItem('claude-dashboard-view-mode');
    if (stored === 'tree' || stored === 'graph') return stored;
  } catch {
    // localStorage unavailable
  }
  return 'tree';
  ```

- Explicit error logging with context prefixes:
  ```typescript
  console.error('[Server] Failed to start:', error);
  console.error('[WebSocket] Error from ${clientAddress}:', error.message);
  console.warn('[SessionStore] Unknown message type:', type);
  ```

- Silent catch blocks for graceful degradation (localStorage, fetch failures):
  ```typescript
  try {
    localStorage.setItem('claude-dashboard-view-mode', viewMode);
  } catch {
    // localStorage unavailable - ignore
  }
  ```

- Async error handling with try-catch in top-level functions:
  ```typescript
  async function start() {
    try {
      await sessionManager.start();
      server.listen(PORT, '127.0.0.1', () => { ... });
    } catch (error) {
      console.error('[Server] Failed to start:', error);
      process.exit(1);
    }
  }
  ```

- API error response helper function:
  ```typescript
  function sendError(res: Response, status: number, error: string, message: string): void {
    const apiError: ApiError = { error, message };
    res.status(status).json(apiError);
  }
  ```

- React Error Boundary for component-level error catching (see `ErrorBoundary.tsx`)

**What to do on error:**
- Server-side: log error with context, return appropriate HTTP status code, maintain process state
- Client-side: log to console, catch silently for non-critical failures (storage, fetch timeouts), show Error Boundary for render errors
- Network errors: retry with exponential backoff (WebSocket reconnection strategy observed in `useWebSocket.ts`)

## Logging

**Framework:** `console` object directly (no logging library)

**Patterns:**
- Prefix logs with component/module name in square brackets: `[Server]`, `[WebSocket]`, `[SessionStore]`, `[ErrorBoundary]`
- Error logging: `console.error()` with message and optional error object
- Warning logging: `console.warn()` for unexpected but non-critical conditions
- Info/debug logging: `console.log()` for startup messages and state changes
- Example:
  ```typescript
  console.log(`[WebSocket] Client connected from ${clientAddress}`);
  console.error('[Server] SessionManager error:', error);
  ```

## Comments

**When to Comment:**
- JSDoc-style comments for public functions and classes documenting purpose, parameters, and return values
- Inline comments explaining non-obvious logic or workarounds
- Section comments (single line with descriptive text) breaking up logical code blocks
- Comments above complex conditional logic

**JSDoc/TSDoc:**
- Used on class methods and exported functions in server modules
- Format: `/** Description... */` style with proper formatting
- Example from `websocket.ts`:
  ```typescript
  /**
   * WebSocketManager handles WebSocket connections for the Claude Session Dashboard.
   *
   * Features:
   * - Localhost-only restriction
   * - Broadcasts state updates to all connected clients
   * - Sends full state snapshot on client connect
   */
  export class WebSocketManager { ... }
  ```

- Not consistently used in React components or utility functions (less formal)
- Parameter documentation sometimes included: `@param` and `@returns` not observed but present in comments

## Function Design

**Size:**
- Functions typically 10-50 lines for utility functions
- Component functions 20-100 lines depending on complexity
- Event handlers and callbacks: 5-20 lines
- No exceptionally long functions observed; decomposition used when needed

**Parameters:**
- Descriptive parameter names matching their types
- Type annotations always present in TypeScript files
- Callback/handler functions: `(data: Type) => void` or `(data: Type) => ReturnType` pattern
- Object parameters for functions with multiple related arguments (e.g., `{desktop?: boolean, browser?: boolean}`)

**Return Values:**
- Functions return typed values or void
- Optional returns indicated with `| null` or `| undefined`
- Generic return types used for reusable utilities (e.g., `GraphData` interface with `nodes` and `edges` arrays)
- No implicit returns; explicit `return` statements throughout

## Module Design

**Exports:**
- Named exports preferred for utilities and functions: `export function useWebSocket() {}`
- Default export for React components: `export default App`
- Class exports: `export class SessionManager extends EventEmitter { }`
- Type exports: `export type FilterType = 'all' | 'session' | ...`
- Mixed approach: shared module uses named type exports, client uses default for App component

**Barrel Files:**
- Minimal barrel file usage observed
- `client/src/components/nodes/index.ts` exports node component types
- Shared module (`shared/src/index.ts`) exports all types as named exports
- Pattern: collect and re-export from single entry point for type clarity

---

*Convention analysis: 2026-02-06*
