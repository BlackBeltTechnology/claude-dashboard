# Phase 2: Group Drill-Down - Research

**Researched:** 2026-02-06
**Domain:** React side panel UI pattern with master-detail interaction
**Confidence:** HIGH

## Summary

Phase 2 requires implementing a side panel that opens when a user clicks a tool-group node in the graph view. The panel displays a list of individual tool calls within the group (master view), and clicking an individual call shows its command/content detail (detail view). The panel must be dismissible via close button or clicking outside.

The research focused on four key areas: React side panel patterns, click-outside detection, @xyflow/react node click handling, and master-detail UI patterns. The existing codebase already has established patterns for node detail rendering (NodeDetail.tsx), inline styles (not TailwindCSS as initially assumed), and Zustand state management. The standard approach uses Zustand state for panel open/close, useRef + useEffect for click-outside detection, onNodeClick handler in ReactFlow, and conditional rendering with fixed positioning for the panel overlay.

**Primary recommendation:** Use Zustand state to track selected group (null = closed), render fixed-position side panel conditionally, implement useClickOutside custom hook for dismissal, and leverage existing NodeDetail.tsx patterns for rendering individual tool calls.

## Standard Stack

The established libraries/tools for this domain:

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| React | 18.2.0 | UI framework | Already in project, standard for component patterns |
| @xyflow/react | 12.0.0 | Graph visualization | Already integrated, provides onNodeClick handler |
| Zustand | 4.5.0 | State management | Already in project, perfect for modal/drawer state |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| React hooks (useRef, useEffect, useCallback) | Built-in | Click-outside detection, event cleanup | Standard pattern for dismissal |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Zustand state | Component useState | State wouldn't persist if parent re-renders, harder to access from multiple places |
| Custom hook | Inline useEffect | Less reusable, clutters component code |
| Fixed positioning | React Portal | Portal adds complexity, fixed positioning sufficient for this use case |

**Installation:**
No new dependencies required - all patterns use existing libraries.

## Architecture Patterns

### Recommended Project Structure
```
client/src/
├── components/
│   ├── GraphView.tsx           # Add onNodeClick handler for tool-group nodes
│   ├── GroupDrillDownPanel.tsx # NEW: Side panel component
│   ├── NodeDetail.tsx          # Reuse for individual tool call rendering
├── store/
│   └── sessionStore.ts         # Add selectedGroupId state
├── hooks/
│   └── useClickOutside.ts      # NEW: Reusable click-outside hook
```

### Pattern 1: Zustand State for Panel Open/Close
**What:** Add `selectedGroupId: string | null` to Zustand store. Null means closed, non-null means open with that group selected.

**When to use:** For any modal/drawer that needs to be controlled from multiple locations or persist across re-renders.

**Example:**
```typescript
// In sessionStore.ts
interface SessionStore {
  // ... existing state
  selectedGroupId: string | null;
  setSelectedGroupId: (groupId: string | null) => void;
}

// In store creation
selectedGroupId: null,
setSelectedGroupId: (groupId) => set({ selectedGroupId: groupId }),
```

**Source:** [Medium - Effortless Modal Management in React with Zustand](https://medium.com/@selvakumar_P/effortless-modal-management-in-react-with-zustand-2e99dc876a82)

### Pattern 2: Click-Outside Detection with useRef + useEffect
**What:** Create a custom `useClickOutside` hook that takes a ref and callback. When a click occurs outside the ref'd element, invoke the callback.

**When to use:** Any component that should close when clicking outside (modals, dropdowns, popovers, side panels).

**Example:**
```typescript
// Source: CoreUI, LogRocket, Material UI
function useClickOutside(ref: RefObject<HTMLElement>, handler: () => void) {
  useEffect(() => {
    const listener = (event: MouseEvent) => {
      // If click is inside the ref'd element, do nothing
      if (!ref.current || ref.current.contains(event.target as Node)) {
        return;
      }
      handler();
    };

    document.addEventListener('mousedown', listener);
    return () => {
      document.removeEventListener('mousedown', listener);
    };
  }, [ref, handler]);
}
```

**Source:** [CoreUI - How to Detect a Click Outside of a React Component](https://coreui.io/blog/how-to-detect-a-click-outside-of-a-react-component/), [LogRocket - Detect click outside React component](https://blog.logrocket.com/detect-click-outside-react-component-how-to/)

### Pattern 3: React Flow onNodeClick Handler
**What:** Use the `onNodeClick` prop on `<ReactFlow>` component. Handler receives `(event, node)`. Must be defined with `useCallback` to avoid infinite re-render loops.

**When to use:** Any interaction that requires responding to node clicks in the graph.

**Example:**
```typescript
// Source: React Flow official docs
const onNodeClick = useCallback((event: React.MouseEvent, node: Node) => {
  if (node.type === 'tool-group') {
    setSelectedGroupId(node.id);
  }
}, [setSelectedGroupId]);

return (
  <ReactFlow
    nodes={nodes}
    edges={edges}
    onNodeClick={onNodeClick}
    // ... other props
  />
);
```

**Source:** [React Flow API Reference](https://reactflow.dev/api-reference/react-flow)

### Pattern 4: Master-Detail List View
**What:** A two-level UI where clicking an item in the master list shows details in the detail pane. In this case: list of tool calls (master) → individual call details (detail).

**When to use:** Displaying hierarchical data where users need to drill into specific items.

**Example:**
```typescript
// Master list
<div className="tool-calls-list">
  {group.nodes.map((toolNode) => (
    <div
      key={toolNode.id}
      onClick={() => setSelectedToolId(toolNode.id)}
      className="tool-call-item"
    >
      {toolNode.toolName} - {timestamp}
    </div>
  ))}
</div>

// Detail view (conditional)
{selectedToolId && (
  <NodeDetail node={selectedTool} />
)}
```

**Source:** [Sean Connolly - React master/detail pattern](https://seanconnolly.dev/react-master-detail-pattern), [MUI X - Master-detail row panels](https://mui.com/x/react-data-grid/master-detail/)

### Pattern 5: Fixed Positioning Side Panel
**What:** Use `position: fixed` with `right: 0` and full height. Layer with high z-index. Optionally add backdrop overlay.

**When to use:** Side panels, drawers that overlay content without shifting layout.

**Example:**
```typescript
const styles = {
  overlay: {
    position: 'fixed' as const,
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    zIndex: 9998,
  },
  panel: {
    position: 'fixed' as const,
    top: 0,
    right: 0,
    bottom: 0,
    width: '400px',
    backgroundColor: '#16213e',
    zIndex: 9999,
    boxShadow: '-4px 0 12px rgba(0, 0, 0, 0.3)',
    overflowY: 'auto' as const,
  },
};
```

**Source:** [Material Tailwind - Drawer](https://www.material-tailwind.com/docs/react/drawer), [Flowbite - Drawer](https://flowbite.com/docs/components/drawer/)

### Pattern 6: Escape Key Handling
**What:** Add a `useEffect` that listens for `keydown` events and closes the panel when Escape is pressed.

**When to use:** Any dismissible overlay (modals, drawers, popovers).

**Example:**
```typescript
// Source: Medium guide to closing modals
useEffect(() => {
  if (!isOpen) return;

  const handleEscape = (event: KeyboardEvent) => {
    if (event.key === 'Escape') {
      onClose();
    }
  };

  document.addEventListener('keydown', handleEscape);
  return () => {
    document.removeEventListener('keydown', handleEscape);
  };
}, [isOpen, onClose]);
```

**Source:** [Medium - Beginner's Guide to Closing a Modal in React](https://medium.com/@priyaeswaran/beginners-guide-to-closing-a-modal-in-react-on-outside-click-and-escape-keypress-9812b1d48b84)

### Anti-Patterns to Avoid
- **Not using useCallback for onNodeClick:** Causes infinite re-render loops in React Flow
- **Component-local useState for panel:** State lost on re-render, can't be accessed from other components
- **Forgetting cleanup in useEffect:** Memory leaks from event listeners
- **Inline event handlers without dependencies:** Stale closures, won't see updated state
- **TailwindCSS classes:** This project uses inline styles consistently, switching to Tailwind would be inconsistent

## Don't Hand-Roll

Problems that look simple but have existing solutions:

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Click-outside detection | Custom click tracking logic | useClickOutside hook pattern | Handles edge cases (nested refs, cleanup, touch events), well-tested |
| Panel animation | Custom CSS transitions | Optional: CSS transitions on mount/unmount | Simple slide-in can use CSS `transition` property, complex animations can use existing patterns |
| Node detail rendering | New component for tool calls | Reuse existing NodeDetail.tsx | Already handles all node types including ToolNode, has consistent styling |
| Z-index management | Random z-index values | Documented z-index scale | Prevents stacking conflicts, use 9998 for overlay, 9999 for panel |

**Key insight:** React side panel patterns are well-established. The main complexity is coordinating multiple concerns (click-outside, escape key, state management) - use proven patterns for each rather than inventing custom solutions.

## Common Pitfalls

### Pitfall 1: Not Wrapping Event Handlers with useCallback
**What goes wrong:** React Flow enters infinite re-render loop when onNodeClick is redefined on every render.

**Why it happens:** React Flow uses the handler as a dependency, and if it changes every render, it triggers re-computation of nodes/edges, which triggers another render.

**How to avoid:** Always wrap onNodeClick, onNodeDoubleClick, and similar handlers with `useCallback`. Include all dependencies in the dependency array.

**Warning signs:** Browser becomes unresponsive, React DevTools shows constant re-renders.

**Source:** [React Flow Documentation - Event Handlers](https://reactflow.dev/api-reference/react-flow)

### Pitfall 2: Click-Outside Firing Immediately on Open
**What goes wrong:** Panel opens and immediately closes because the click that opened it is detected as "outside."

**Why it happens:** Event listener is added synchronously, and the same click event that opened the panel bubbles up to the document listener.

**How to avoid:** Use `mousedown` instead of `click`, or add a small delay before attaching the listener (e.g., via setTimeout 0), or check event.target against the trigger element.

**Warning signs:** Panel flashes open and closed instantly.

**Source:** [LogRocket - Detect click outside React component](https://blog.logrocket.com/detect-click-outside-react-component-how-to/)

### Pitfall 3: Forgetting to Remove Event Listeners
**What goes wrong:** Event listeners accumulate on every mount, causing memory leaks and multiple handler invocations.

**Why it happens:** useEffect without cleanup function leaves listeners attached.

**How to avoid:** Always return a cleanup function from useEffect that removes listeners.

**Warning signs:** Panel closes multiple times, performance degrades over time.

**Source:** [Medium - React Click Outside Modal](https://www.dhiwise.com/post/the-ultimate-guide-to-react-click-outside-modal-to-close)

### Pitfall 4: Stale Closures in Event Handlers
**What goes wrong:** Event handler references old state values, doesn't see updates.

**Why it happens:** Event listener captures state at mount time, doesn't update when state changes.

**How to avoid:** Include all referenced state/props in useEffect dependency array, or use functional updates for setState.

**Warning signs:** Handler uses old values, doesn't respond to state changes.

**Source:** [React Hooks Documentation - useEffect](https://react.dev/reference/react/useEffect)

### Pitfall 5: Z-Index Conflicts
**What goes wrong:** Panel appears behind other elements (like React Flow controls, mini-map).

**Why it happens:** React Flow elements have their own z-index values. Default z-index scale may conflict.

**How to avoid:** Use high z-index values (9998 for overlay, 9999 for panel). Document the z-index scale in comments.

**Warning signs:** Panel is partially obscured by graph controls.

**Source:** [Tailwind CSS z-index documentation](https://tailwindcss.com/docs/z-index)

## Code Examples

Verified patterns from official sources:

### useClickOutside Hook
```typescript
// Source: CoreUI, LogRocket
// https://coreui.io/blog/how-to-detect-a-click-outside-of-a-react-component/
import { useEffect, RefObject } from 'react';

export function useClickOutside(
  ref: RefObject<HTMLElement>,
  handler: () => void
): void {
  useEffect(() => {
    const listener = (event: MouseEvent) => {
      // If the ref element doesn't exist or the click is inside, do nothing
      if (!ref.current || ref.current.contains(event.target as Node)) {
        return;
      }
      handler();
    };

    document.addEventListener('mousedown', listener);
    return () => {
      document.removeEventListener('mousedown', listener);
    };
  }, [ref, handler]);
}
```

### Side Panel Component Structure
```typescript
// Adapted from existing project patterns + Material Tailwind
import React, { useRef, useCallback } from 'react';
import { useClickOutside } from '../hooks/useClickOutside';
import { useSessionStore } from '../store/sessionStore';
import { NodeDetail } from './NodeDetail';

export function GroupDrillDownPanel() {
  const selectedGroupId = useSessionStore((state) => state.selectedGroupId);
  const setSelectedGroupId = useSessionStore((state) => state.setSelectedGroupId);
  const sessions = useSessionStore((state) => state.sessions);

  const panelRef = useRef<HTMLDivElement>(null);

  // Close on click-outside
  useClickOutside(panelRef, () => {
    if (selectedGroupId) {
      setSelectedGroupId(null);
    }
  });

  // Close on Escape key
  useEffect(() => {
    if (!selectedGroupId) return;

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setSelectedGroupId(null);
      }
    };

    document.addEventListener('keydown', handleEscape);
    return () => {
      document.removeEventListener('keydown', handleEscape);
    };
  }, [selectedGroupId, setSelectedGroupId]);

  if (!selectedGroupId) return null;

  // Find the group in sessions data
  // ... (implementation details)

  return (
    <>
      {/* Backdrop overlay */}
      <div style={styles.overlay} />

      {/* Side panel */}
      <div ref={panelRef} style={styles.panel}>
        <div style={styles.header}>
          <h2>Tool Group: {groupName}</h2>
          <button onClick={() => setSelectedGroupId(null)}>✕</button>
        </div>

        {/* Master: List of tool calls */}
        <div style={styles.list}>
          {toolNodes.map((node) => (
            <div
              key={node.id}
              onClick={() => setSelectedToolId(node.id)}
              style={styles.listItem}
            >
              {node.toolName} - {timestamp}
            </div>
          ))}
        </div>

        {/* Detail: Individual call details */}
        {selectedToolId && (
          <NodeDetail node={selectedTool} />
        )}
      </div>
    </>
  );
}

const styles = {
  overlay: {
    position: 'fixed' as const,
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    zIndex: 9998,
  },
  panel: {
    position: 'fixed' as const,
    top: 0,
    right: 0,
    bottom: 0,
    width: '400px',
    backgroundColor: '#16213e',
    zIndex: 9999,
    boxShadow: '-4px 0 12px rgba(0, 0, 0, 0.3)',
    overflowY: 'auto' as const,
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '16px',
    borderBottom: '1px solid #0f3460',
  },
  list: {
    padding: '16px',
  },
  listItem: {
    padding: '12px',
    marginBottom: '8px',
    backgroundColor: '#1a1a2e',
    borderRadius: '6px',
    cursor: 'pointer',
  },
};
```

### React Flow Node Click Integration
```typescript
// In GraphView.tsx
// Source: React Flow official API docs
import { useCallback } from 'react';
import { useSessionStore } from '../store/sessionStore';

export function GraphView() {
  const setSelectedGroupId = useSessionStore((state) => state.setSelectedGroupId);

  // MUST use useCallback to avoid infinite re-render
  const onNodeClick = useCallback((event: React.MouseEvent, node: Node) => {
    if (node.type === 'tool-group') {
      setSelectedGroupId(node.id);
    }
  }, [setSelectedGroupId]);

  return (
    <ReactFlow
      nodes={nodes}
      edges={edges}
      onNodeClick={onNodeClick}
      // ... other props
    />
  );
}
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| React class components with componentDidMount | Functional components with useEffect | React 16.8 (2019) | Simpler cleanup, better code reuse |
| Separate modal libraries | Built-in patterns with hooks | 2020-2021 | Less bundle size, more control |
| Complex animation libraries | CSS transitions + simple hooks | Ongoing | Better performance, simpler code |
| Context API for modal state | Zustand for lightweight state | 2021+ | Less boilerplate, better DX |

**Deprecated/outdated:**
- React class components for new code - Use functional components + hooks
- componentWillUnmount for cleanup - Use useEffect return function
- Separate click-outside libraries - Custom hook is 10 lines and sufficient

## Open Questions

1. **Animation preference**
   - What we know: CSS transitions are simplest (add `transition: transform 0.3s` to panel style), Framer Motion is more powerful but adds dependency
   - What's unclear: Does the user want slide-in animation, or is instant appearance acceptable?
   - Recommendation: Start with no animation (instant appearance), add CSS transition if user requests it. Avoid adding Framer Motion unless complex animations are needed.

2. **Panel width responsiveness**
   - What we know: Fixed 400px width is common pattern for side panels
   - What's unclear: Should panel be responsive on smaller screens (mobile/tablet)?
   - Recommendation: Start with fixed 400px. The dashboard is primarily for desktop use (monitoring development environment). Add responsiveness only if requested.

3. **Backdrop click vs. only panel**
   - What we know: Click-outside should close the panel per requirements
   - What's unclear: Should clicking the backdrop overlay close the panel, or only clicking outside the panel itself?
   - Recommendation: Backdrop click should close (most intuitive UX pattern). The overlay serves as a close target.

## Sources

### Primary (HIGH confidence)
- React Flow official docs (https://reactflow.dev/api-reference/react-flow) - onNodeClick handler API
- CoreUI blog (https://coreui.io/blog/how-to-detect-a-click-outside-of-a-react-component/) - Click-outside pattern
- LogRocket blog (https://blog.logrocket.com/detect-click-outside-react-component-how-to/) - Click-outside detection
- Medium by Shanmuga priya (https://medium.com/@priyaeswaran/beginners-guide-to-closing-a-modal-in-react-on-outside-click-and-escape-keypress-9812b1d48b84) - Escape key handling
- Project codebase (/home/botond/claude-session-dashboard) - Existing patterns, shared types, Zustand store structure

### Secondary (MEDIUM confidence)
- Medium by Selva Kumar (https://medium.com/@selvakumar_P/effortless-modal-management-in-react-with-zustand-2e99dc876a82) - Zustand modal patterns
- Material Tailwind drawer docs (https://www.material-tailwind.com/docs/react/drawer) - Drawer implementation patterns
- Sean Connolly blog (https://seanconnolly.dev/react-master-detail-pattern) - Master-detail pattern
- MUI X Data Grid docs (https://mui.com/x/react-data-grid/master-detail/) - Master-detail row panels

### Tertiary (LOW confidence)
- None - all patterns verified with official documentation or established project patterns

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - All libraries already in project (React 18, @xyflow/react 12, Zustand 4.5)
- Architecture: HIGH - Patterns verified with official docs and existing codebase patterns
- Pitfalls: HIGH - Common issues documented in official React Flow docs and community articles

**Research date:** 2026-02-06
**Valid until:** 30 days (React patterns are stable, @xyflow/react 12 is current)
