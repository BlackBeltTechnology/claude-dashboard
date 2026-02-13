# Testing Patterns

**Analysis Date:** 2026-02-06

## Test Framework

**Status:** Not configured

**Current State:**
- No test framework installed (Jest, Vitest, or other testing libraries not found in package.json files)
- No test files present in the codebase (no `.test.ts`, `.test.tsx`, `.spec.ts`, or `.spec.tsx` files)
- No test configuration files found (no `jest.config.*`, `vitest.config.*`, or test-related config)
- TypeScript configured but only for build/development, not for testing

**What this means:**
- Implement unit tests by first choosing and configuring a test framework
- Tests need to be established as part of quality improvements
- CI/CD pipeline should include test execution once tests are added

## Suggested Test Framework

**Recommended:** Vitest or Jest

**For Client (React):**
- Vitest for unit tests (fast, Vite-integrated)
- React Testing Library for component tests
- Alternatively: Jest with Babel configuration

**For Server (Node.js/Express):**
- Vitest or Jest for unit tests
- Node-native testing might be used (Node 18+ built-in testing)

**Installation pattern (example for Vitest + React Testing Library):**
```json
{
  "devDependencies": {
    "vitest": "^latest",
    "@vitest/ui": "^latest",
    "@testing-library/react": "^latest",
    "@testing-library/jest-dom": "^latest"
  }
}
```

## Test File Organization

**Location (when tests are added):**
- Co-located: Place `.test.ts` / `.test.tsx` files alongside source files
- Example structure:
  ```
  client/src/
  ├── components/
  │   ├── NodeDetail.tsx
  │   ├── NodeDetail.test.tsx
  │   ├── Layout.tsx
  │   ├── Layout.test.tsx
  │   └── ...
  ├── store/
  │   ├── sessionStore.ts
  │   ├── sessionStore.test.ts
  │   └── ...
  ├── hooks/
  │   ├── useWebSocket.ts
  │   ├── useWebSocket.test.ts
  │   └── ...
  ├── utils/
  │   ├── graphLayout.ts
  │   ├── graphLayout.test.ts
  │   └── ...
  ```

- Server structure:
  ```
  server/src/
  ├── index.ts
  ├── index.test.ts
  ├── websocket.ts
  ├── websocket.test.ts
  ├── jsonl-parser.ts
  ├── jsonl-parser.test.ts
  └── ...
  ```

**Naming:**
- Suffix with `.test.ts` or `.test.tsx` (not `.spec.ts`)
- File name matches source file (e.g., `NodeDetail.tsx` → `NodeDetail.test.tsx`)

## Test Structure

**No existing test files to analyze, but recommended patterns based on codebase:**

### Unit Test Structure

```typescript
// Example: sessionStore.test.ts
import { describe, it, expect, beforeEach } from 'vitest';
import { useSessionStore } from './sessionStore';

describe('sessionStore', () => {
  beforeEach(() => {
    // Reset store state before each test
  });

  describe('filterSession', () => {
    it('should return session when filter is all and no search term', () => {
      // Test implementation
    });

    it('should filter nodes by type', () => {
      // Test implementation
    });

    it('should recursively filter subagents', () => {
      // Test implementation
    });
  });

  describe('setFilter', () => {
    it('should update filter state', () => {
      // Test implementation
    });
  });
});
```

### Component Test Structure (React Testing Library)

```typescript
// Example: NodeDetail.test.tsx
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { NodeDetail } from './NodeDetail';
import type { TreeNodeData } from './TreeNode';

describe('NodeDetail', () => {
  describe('when no node selected', () => {
    it('should render empty state message', () => {
      render(<NodeDetail node={null} />);
      expect(screen.getByText('Select a node to view details')).toBeInTheDocument();
    });
  });

  describe('when node is selected', () => {
    it('should render node title', () => {
      const node: TreeNodeData = { /* ... */ };
      render(<NodeDetail node={node} />);
      expect(screen.getByText(/Node/)).toBeInTheDocument();
    });
  });
});
```

### Hook Test Structure (React Hooks Testing Library)

```typescript
// Example: useWebSocket.test.ts
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { useWebSocket } from './useWebSocket';

describe('useWebSocket', () => {
  beforeEach(() => {
    // Setup WebSocket mock
  });

  afterEach(() => {
    // Cleanup
  });

  it('should establish connection on mount', async () => {
    const { result } = renderHook(() => useWebSocket());

    await waitFor(() => {
      expect(result.current.connected).toBe(true);
    });
  });

  it('should reconnect with exponential backoff on disconnect', async () => {
    // Test reconnection logic
  });
});
```

## Patterns Based on Codebase

**Key areas that need tests:**

1. **Store logic** (`sessionStore.ts`):
   - Filter and search functions: `nodeMatchesFilter()`, `nodeMatchesSearch()`, `filterSession()`
   - State mutation actions: `setFilter()`, `setSearchTerm()`, `updateSession()`, `updateSubagent()`
   - WebSocket message handling: `handleWebSocketMessage()` with different message types

2. **JSONL Parser** (`jsonl-parser.ts`):
   - Parsing single lines: `parseLine()`
   - Parsing multiple lines: `parseJSONL()`
   - Extracting metadata: `extractMetadata()`
   - Error handling for malformed JSON

3. **Server API** (`api.ts`):
   - Request validation: `validatePromptRequest()`
   - JSONL file parsing: `parseJSONL()`
   - Session state determination: `determineSessionState()`
   - Error responses: `sendError()`

4. **Graph Layout** (`graphLayout.ts`):
   - Session to graph conversion: `convertSessionToGraph()`
   - Layout application: `applyDagreLayout()`
   - Node positioning logic

5. **WebSocket Manager** (`websocket.ts`):
   - Connection validation
   - Localhost restriction enforcement
   - Client connection management
   - Message broadcasting

6. **React Components:**
   - Error Boundary error catching and recovery
   - Component rendering with different node types
   - Style application based on state

## Mocking

**Frameworks to use:**
- Vitest's built-in mocking: `vi.mock()`, `vi.spyOn()`
- React Testing Library for DOM mocking
- Manual mocks for WebSocket, localStorage, fetch

**Mock patterns (example for useWebSocket):**

```typescript
// Mock WebSocket class
class MockWebSocket {
  readyState = WebSocket.OPEN;
  onopen: ((this: WebSocket, ev: Event) => void) | null = null;
  onmessage: ((this: WebSocket, ev: MessageEvent) => void) | null = null;
  onclose: ((this: WebSocket, ev: CloseEvent) => void) | null = null;
  onerror: ((this: WebSocket, ev: Event) => void) | null = null;

  constructor(url: string) {
    // Simulate connection
    setTimeout(() => this.onopen?.(new Event('open')), 0);
  }

  send(data: string) {
    // Mock send behavior
  }

  close() {
    // Mock close behavior
  }
}

global.WebSocket = MockWebSocket as any;
```

**Mock patterns (localStorage):**

```typescript
const localStorageMock = {
  getItem: vi.fn((key: string) => null),
  setItem: vi.fn(),
  removeItem: vi.fn(),
  clear: vi.fn(),
};

Object.defineProperty(window, 'localStorage', {
  value: localStorageMock,
});
```

**What to Mock:**
- External APIs (WebSocket, fetch calls)
- Browser APIs (localStorage, sessionStorage, window.location)
- File system operations (in Node.js tests)
- Third-party libraries (if testing integration logic)
- Zustand store (use `renderHook` with proper setup)

**What NOT to Mock:**
- Core utility functions that you're testing
- React hooks (use `renderHook` from testing library instead)
- TypeScript types and interfaces
- Pure function logic (test actual output, not internal calls)

## Fixtures and Factories

**Test data (to be created):**

Create `__fixtures__` or `__mocks__` directory at same level as source files:

```typescript
// client/src/store/__fixtures__/sessionData.ts
import type { Session, AnyNode } from 'shared';

export const createMockSession = (overrides?: Partial<Session>): Session => ({
  id: 'session-1',
  projectHash: 'abc123',
  state: 'active',
  createdAt: Date.now(),
  lastActivity: Date.now(),
  nodes: [],
  subagents: [],
  ...overrides,
});

export const createMockNode = (type: 'message' | 'tool' | 'skill' | 'subagent',
  overrides?: Partial<AnyNode>): AnyNode => {
  const base = {
    id: 'node-1',
    type,
    parentId: null,
    state: 'completed',
    timestamp: Date.now(),
  };

  if (type === 'message') {
    return { ...base, type: 'message', role: 'user', content: 'test' };
  }
  // ... handle other types
};
```

**Location:**
- `client/src/__fixtures__/` for React test data
- `server/src/__fixtures__/` for backend test data
- Or create alongside test files: `sessionStore.fixtures.ts`

## Coverage

**Requirements:** None currently enforced

**When tests are added:**
- Configure coverage reporting in test config
- Example Vitest coverage config:
  ```typescript
  // vitest.config.ts
  export default defineConfig({
    test: {
      coverage: {
        provider: 'v8',
        reporter: ['text', 'json', 'html'],
        include: ['src/**/*.{ts,tsx}'],
        exclude: ['src/**/*.test.{ts,tsx}', 'src/**/__fixtures__/**'],
      },
    },
  });
  ```

**View Coverage:**
```bash
npm run test -- --coverage
```

## Test Types

**Unit Tests:**
- Scope: Individual functions, pure utilities, store logic
- Approach: Test input/output, not implementation details
- Example: Test `filterSession()` with various filter types and search terms
- Files to prioritize:
  - `jsonl-parser.ts` - Pure parsing logic
  - `graphLayout.ts` - Pure layout calculations
  - `sessionStore.ts` - State management logic

**Integration Tests:**
- Scope: Multi-component interactions, API endpoints
- Approach: Test how components/modules work together
- Example: Test WebSocket message → store update → component re-render flow
- Files to prioritize:
  - Full store update flows with multiple action calls
  - API endpoints with database/file operations
  - WebSocket message handling with state mutations

**E2E Tests:**
- Status: Not currently used
- When needed: Use Playwright or Cypress for full app workflows
- Example scenarios:
  - User connects, views session, filters nodes
  - WebSocket connects, receives update, UI updates

## Common Patterns

**Async Testing:**

```typescript
// Using async/await
it('should fetch and update sessions', async () => {
  const { result } = renderHook(() => useSessionStore());

  await act(async () => {
    result.current.setSessions([{ id: '1', /* ... */ }]);
  });

  await waitFor(() => {
    expect(result.current.sessions).toHaveLength(1);
  });
});

// Using done callback
it('should reconnect on disconnect', (done) => {
  // Test async behavior
  setTimeout(() => {
    expect(/* something */).toBe(true);
    done();
  }, 100);
});
```

**Error Testing:**

```typescript
// Test error handling
it('should handle JSON parse errors gracefully', () => {
  const invalidJSON = 'not valid json';
  const result = parseLine(invalidJSON);

  expect(result).toBeNull();
});

// Test error callbacks
it('should emit error event on parse failure', () => {
  const errorHandler = vi.fn();
  sessionManager.on('error', errorHandler);

  // Trigger error condition
  sessionManager.refresh();

  expect(errorHandler).toHaveBeenCalled();
});

// Test try-catch blocks
it('should catch and log fetch errors', async () => {
  vi.spyOn(global, 'fetch').mockRejectedValueOnce(new Error('Network error'));

  await useWebSocket().connect();

  expect(console.error).toHaveBeenCalledWith(expect.stringContaining('Network error'));
});
```

## Run Commands (When Tests Are Added)

```bash
# Run all tests
npm run test

# Watch mode (re-run on file changes)
npm run test -- --watch

# Coverage report
npm run test -- --coverage

# Specific test file
npm run test sessionStore.test.ts

# Tests matching pattern
npm run test -- --grep "filterSession"

# UI mode (Vitest only)
npm run test -- --ui
```

---

*Testing analysis: 2026-02-06*

**Note:** This project currently has no tests. The patterns and recommendations here are based on the codebase structure and conventions. Implementing a test framework and writing tests should be a priority for quality assurance.
