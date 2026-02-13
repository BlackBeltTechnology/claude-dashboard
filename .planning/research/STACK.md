# Stack Research

**Domain:** Real-time agent session monitoring dashboard with graph visualization
**Researched:** 2026-02-06
**Confidence:** HIGH

## Recommended Stack

### Core Technologies for Node Grouping

| Technology | Version | Purpose | Why Recommended |
|------------|---------|---------|-----------------|
| @xyflow/react | ^12.10.0 | Graph visualization with node grouping | Native support for parent-child node relationships, group node type, and hierarchical structures. React Flow 12 includes performance improvements for larger flows. Already in use at ^12.0.0. |
| dagre | ^0.8.5 | Hierarchical graph layout algorithm | Industry-standard directed graph layout for tree-like structures. Works well with @xyflow/react for automatic positioning of grouped nodes. Already in use. |
| elkjs | ^0.9.3 | Advanced graph layout with grouping support | Most configurable layout option for complex hierarchies. Better than dagre for nested groups. Async algorithm prevents UI blocking. |
| d3-hierarchy | ^3.1.2 | Tree layout for strict hierarchical structures | Optimal for tool call groups organized by type. Provides layouts specifically for trees with single root nodes. Lightweight compared to elk. |

### Core Technologies for Side Panel

| Technology | Version | Purpose | Why Recommended |
|------------|---------|---------|-----------------|
| @radix-ui/react-dialog | ^1.1.15 | Headless dialog/sheet primitives | Industry standard for accessible overlays. Manages focus, keyboard navigation, and ARIA attributes. Foundation for custom side panels. |
| @radix-ui/react-collapsible | ^1.1.2 | Collapsible sections within panel | Native animation support for expanding/collapsing details within drill-down UI. Accessible by default. |
| Tailwind CSS | ^3.4.x | Utility-first styling | 2025/2026 industry standard for React applications. Better performance and smaller bundle sizes than Bootstrap. Works seamlessly with Radix primitives. |
| clsx | ^2.1.0 | Conditional className utility | Standard companion to Tailwind for dynamic class composition. Minimal overhead. |

### Supporting Libraries

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| zustand | ^4.5.0 | Global state management | Already in use. Perfect for @xyflow/react (React Flow uses Zustand internally). Manages node visibility, selection state, and side panel open/close state. |
| React.memo | Built-in | Performance optimization | Wrap custom node components to prevent unnecessary re-renders when dragging/expanding groups. Critical for performance with 100+ nodes. |
| useCallback | Built-in | Memoize event handlers | Prevent recreation of node click handlers and expand/collapse functions. Essential for smooth interactions. |
| immer | ^10.1.1 | Immutable state updates | Optional but recommended for complex Zustand updates when toggling node visibility in groups. Prevents bugs from mutation. |

### Development Tools

| Tool | Purpose | Notes |
|------|---------|-------|
| @xyflow/react DevTools | Debug node/edge state | Available in React Flow Pro (optional). Useful for debugging group hierarchies. |
| React DevTools Profiler | Identify re-render issues | Essential for optimizing custom node performance with many nodes. |
| Vite | Build tool | Already in use. Fast HMR for iterative UI development. |

## Installation

```bash
# Core grouping & layout (to be added)
npm install -w client elkjs@^0.9.3 d3-hierarchy@^3.1.2

# Side panel primitives (to be added)
npm install -w client @radix-ui/react-dialog@^1.1.15 @radix-ui/react-collapsible@^1.1.2 clsx@^2.1.0

# Tailwind CSS (to be added)
npm install -D -w client tailwindcss@^3.4.1 postcss@^8.4.35 autoprefixer@^10.4.19

# Optional but recommended
npm install -w client immer@^10.1.1

# Already installed (verify versions)
# @xyflow/react@^12.0.0 ✓
# zustand@^4.5.0 ✓
# dagre@^0.8.5 ✓
```

## Implementation Patterns

### Node Grouping in @xyflow/react 12.x

**Pattern 1: Parent-Child Relationships**

```typescript
// Define group node
const groupNode = {
  id: 'bash-group',
  type: 'group', // Special type with no handles
  position: { x: 0, y: 0 },
  data: { label: 'Bash Tools', collapsed: false },
  style: { width: 300, height: 400 }
}

// Define child nodes with parentId
const childNodes = [
  {
    id: 'bash-1',
    parentId: 'bash-group', // Renamed from parentNode in v12
    extent: 'parent', // Constrain to parent bounds
    position: { x: 10, y: 40 }, // Relative to parent
    data: { label: 'git status' }
  }
]

// CRITICAL: Parent must appear before children in array
const nodes = [groupNode, ...childNodes]
```

**Pattern 2: Expand/Collapse via Hidden Attribute**

```typescript
// In Zustand store
interface FlowState {
  nodes: Node[]
  collapsedGroups: Set<string>
  toggleGroup: (groupId: string) => void
}

const useFlowStore = create<FlowState>((set) => ({
  nodes: [],
  collapsedGroups: new Set(),
  toggleGroup: (groupId) => set((state) => {
    const newCollapsed = new Set(state.collapsedGroups)
    if (newCollapsed.has(groupId)) {
      newCollapsed.delete(groupId)
    } else {
      newCollapsed.add(groupId)
    }

    // Toggle hidden attribute on children
    const updatedNodes = state.nodes.map((node) => {
      if (node.parentId === groupId) {
        return { ...node, hidden: newCollapsed.has(groupId) }
      }
      return node
    })

    return { nodes: updatedNodes, collapsedGroups: newCollapsed }
  })
}))
```

**Pattern 3: Custom Group Node Component**

```typescript
import { memo } from 'react'
import { NodeProps } from '@xyflow/react'

const GroupNode = memo(({ id, data }: NodeProps) => {
  const toggleGroup = useFlowStore((state) => state.toggleGroup)

  return (
    <div className="group-node">
      <button onClick={() => toggleGroup(id)}>
        {data.collapsed ? '▶' : '▼'} {data.label}
      </button>
    </div>
  )
})

// Register custom node type
const nodeTypes = { group: GroupNode }
```

### Side Panel Drill-Down Pattern

**Pattern: Sheet/Drawer with Radix Dialog**

```typescript
import * as Dialog from '@radix-ui/react-dialog'
import * as Collapsible from '@radix-ui/react-collapsible'
import { useFlowStore } from './store'

function DrillDownPanel() {
  const selectedNode = useFlowStore((state) => state.selectedNode)
  const isOpen = selectedNode !== null

  return (
    <Dialog.Root open={isOpen} onOpenChange={(open) => !open && clearSelection()}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 bg-black/50" />
        <Dialog.Content className="fixed right-0 top-0 h-full w-96 bg-white shadow-xl">
          <Dialog.Title className="text-xl font-bold p-4">
            Tool Details
          </Dialog.Title>

          {/* Drill-down sections */}
          <Collapsible.Root>
            <Collapsible.Trigger className="flex items-center justify-between w-full p-4">
              Input Parameters
            </Collapsible.Trigger>
            <Collapsible.Content>
              {/* Parameter details */}
            </Collapsible.Content>
          </Collapsible.Root>

          <Dialog.Close className="absolute top-4 right-4">×</Dialog.Close>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  )
}
```

## Alternatives Considered

| Recommended | Alternative | When to Use Alternative |
|-------------|-------------|-------------------------|
| @xyflow/react | react-flow-renderer | Never. Old package name, deprecated. Must use @xyflow/react. |
| elkjs | d3-hierarchy | When graph is strictly hierarchical (tree with single root). d3-hierarchy is lighter but less flexible. |
| Radix UI Dialog | Headless UI Dialog | When using Tailwind UI. Headless UI is Tailwind Labs' official headless library. API is similar. |
| Radix UI | shadcn/ui | When you want pre-styled components. shadcn/ui provides copy-paste components built on Radix + Tailwind. See note below. |
| Custom side panel | React Flow Pro Sidebar | If you have React Flow Pro subscription ($300+/year). Pro includes pre-built sidebar component. |
| Zustand | Redux Toolkit | For very large apps with complex async logic. Overkill for dashboard state. Zustand is simpler and lighter (1KB gzipped). |
| immer | Manual immutability | Skip immer if state updates are simple. Only use for complex nested updates in Zustand. |

## What NOT to Use

| Avoid | Why | Use Instead |
|-------|-----|-------------|
| react-flow-renderer | Old package name, not maintained since 2022 | @xyflow/react (v12+) |
| Bootstrap + React Bootstrap | Outdated pattern for 2025/2026. Larger bundle, less flexible than Tailwind. | Tailwind CSS + Radix UI |
| Redux without Redux Toolkit | Too much boilerplate for dashboard state. Redux is React Flow uses Zustand internally. | Zustand (already in stack) |
| Material-UI (MUI) Dialog | Heavy (300KB+). Opinionated styling conflicts with custom design. | Radix UI Dialog (headless, 10KB) |
| CSS-in-JS (styled-components, emotion) | Performance overhead. Tailwind's utility-first approach is 2025 standard. | Tailwind CSS |
| useEffect for derived state | Anti-pattern. Causes unnecessary renders when computing collapsed state. | Calculate derived state directly in render or use selectors. |
| Prop drilling for panel state | Becomes unmaintainable with nested drill-down sections. | Zustand store for panel open/selected node state. |

## Stack Patterns by Variant

**If node groups are always expanded/collapsed as one unit:**
- Use `hidden` attribute on child nodes
- Store collapsed state in Zustand as `Set<string>` of group IDs
- Simple toggle function, no per-node logic

**If individual nodes within groups can be hidden:**
- Use `hidden` attribute on individual nodes
- Store visibility as `Map<nodeId, boolean>` in Zustand
- More complex, but needed for advanced filtering

**If groups need auto-layout on expand/collapse:**
- Use elkjs with `elk.algorithm: 'layered'`
- Re-run layout calculation on group toggle
- Use `useLayoutedElements` hook (async to prevent blocking)

**If side panel shows real-time updates:**
- Use WebSocket data from backend (already have ws in server package.json)
- Store in Zustand, React Flow nodes subscribe to relevant slices
- Panel displays live data via Zustand selectors

**If you want pre-styled components (faster development):**
- Add shadcn/ui on top of Radix UI + Tailwind
- Copy-paste components instead of installing package
- Fully customizable since you own the code
- **WARNING:** See compatibility note below about Radix maintenance

## Version Compatibility

| Package A | Compatible With | Notes |
|-----------|-----------------|-------|
| @xyflow/react@^12.10.0 | React 18.2+ | Requires React 18 for concurrent features. Already have React 18.2.0. |
| @xyflow/react@^12.x | Zustand 4.x | React Flow 12 uses Zustand 4 internally. Already have Zustand 4.5.0 - perfect compatibility. |
| @radix-ui/*@1.x | React 18+ | All Radix primitives require React 18+. Compatible with current stack. |
| Tailwind CSS 3.4.x | PostCSS 8.4+ | Requires PostCSS plugin. Add to Vite config. |
| elkjs@0.9.x | @xyflow/react@12.x | Tested combination. Elk layout examples in React Flow docs use these versions. |
| dagre@0.8.5 | @xyflow/react@12.x | Already in use. Stable, no updates since 2019 but still widely used. |

## Important Compatibility Notes

### Radix UI Maintenance Status (CRITICAL)

**Issue:** Radix UI creators announced the library is not being actively maintained. This creates long-term risk for projects heavily dependent on Radix primitives.

**Impact on This Project:**
- SHORT-TERM (0-12 months): No impact. Current Radix versions (1.1.x) are stable and production-ready.
- MEDIUM-TERM (12-24 months): May face compatibility issues with React 19+ or security vulnerabilities.
- LONG-TERM (24+ months): Migration to alternative headless library may be required.

**Migration Path:**
1. **Base UI**: shadcn/ui now supports Base UI as alternative to Radix (January 2026). More actively maintained by MUI team.
2. **React Aria**: Adobe's comprehensive accessibility hooks. More complex API but well-maintained.
3. **Ariakit**: Flexible, composable primitives. Smaller community than Radix.

**Recommendation for This Project:**
- Use Radix for initial implementation (fastest path, proven patterns)
- Monitor Base UI maturity over next 6-12 months
- Budget for migration to Base UI if Radix shows signs of abandonment
- If starting fresh in 12+ months, consider Base UI first

**Why Not Base UI Now:**
- API still maturing (render props vs asChild prop)
- Fewer community resources and examples
- Radix has better documentation for side panel patterns today

### shadcn/ui Compatibility

**Status:** shadcn/ui now supports BOTH Radix UI and Base UI as of January 2026.

**What This Means:**
- Can use shadcn/ui with Radix today
- Migration path to Base UI exists via shadcn when ready
- February 2026: shadcn released unified `radix-ui` package (single dependency instead of many `@radix-ui/react-*` packages)

**If Using shadcn/ui:**
```bash
# Install shadcn CLI and choose Radix as primitive library
npx shadcn@latest init

# Add sheet component (side panel)
npx shadcn@latest add sheet

# Add collapsible for drill-down sections
npx shadcn@latest add collapsible
```

## Performance Considerations

### Node Grouping Performance

**Optimization 1: Only Render Visible Nodes**
```typescript
// In ReactFlow component
<ReactFlow
  nodes={nodes}
  edges={edges}
  onlyRenderVisibleElements={true} // Lazy render based on viewport
/>
```

**Optimization 2: Memoize Custom Nodes**
```typescript
// Prevent re-renders when parent re-renders
export const GroupNode = memo(({ id, data }: NodeProps) => {
  // Component implementation
})
```

**Optimization 3: Memoize Callbacks**
```typescript
// In Zustand store or component
const toggleGroup = useCallback((groupId: string) => {
  // Toggle logic
}, []) // Empty deps if using Zustand actions
```

**Performance Targets:**
- 60fps when dragging nodes (smooth at 16.67ms per frame)
- <100ms to expand/collapse groups
- <200ms to open side panel with full details

**Known Issues:**
- React Flow v12 custom nodes can cause frame drops when dragging background with 80+ nodes
- Mitigation: Use `onlyRenderVisibleElements`, memoize nodes, minimize re-renders in custom node components

## Sources

### @xyflow/react Documentation & Features
- [Expand and Collapse Example](https://reactflow.dev/examples/layout/expand-collapse) - Official expand/collapse pattern - HIGH confidence
- [Sub Flows Guide](https://reactflow.dev/learn/layouting/sub-flows) - Parent-child grouping patterns - HIGH confidence
- [Parent Child Relation Example](https://reactflow.dev/examples/grouping/parent-child-relation) - Group node type documentation - HIGH confidence
- [React Flow State Management Guide](https://reactflow.dev/learn/advanced-use/state-management) - Official Zustand integration patterns - HIGH confidence
- [React Flow Performance Guide](https://reactflow.dev/learn/advanced-use/performance) - Optimization strategies - HIGH confidence
- [@xyflow/react 12 release discussion](https://github.com/xyflow/xyflow/discussions/3764) - Version 12 features and changes - MEDIUM confidence
- [NPM @xyflow/react](https://www.npmjs.com/package/@xyflow/react) - Current version 12.10.0 verified - HIGH confidence

### Layout Algorithms
- [React Flow Layouting Overview](https://reactflow.dev/learn/layouting/layouting) - Comparison of dagre, elk, d3-hierarchy - HIGH confidence
- [Elkjs Tree Example](https://reactflow.dev/examples/layout/elkjs) - Elk layout configuration - HIGH confidence
- [Dagre Tree Example](https://reactflow.dev/examples/layout/dagre) - Dagre implementation patterns - HIGH confidence

### Radix UI & Side Panels
- [Radix UI Dialog Documentation](https://www.radix-ui.com/primitives/docs/components/dialog) - Official Dialog primitive docs - HIGH confidence
- [shadcn/ui Sheet Component](https://ui.shadcn.com/docs/components/sheet) - Side panel implementation pattern - HIGH confidence
- [shadcn/ui Collapsible](https://ui.shadcn.com/docs/components/collapsible) - Drill-down sections pattern - HIGH confidence
- [February 2026 Changelog - Unified Radix Package](https://ui.shadcn.com/docs/changelog/2026-02-radix-ui) - New unified radix-ui package - HIGH confidence
- [January 2026 Changelog - Base UI Support](https://ui.shadcn.com/docs/changelog/2026-01-base-ui) - shadcn/ui now supports Base UI - HIGH confidence

### State Management & Architecture
- [Zustand GitHub](https://github.com/pmndrs/zustand) - Official Zustand repository - HIGH confidence
- [State Management Trends in React 2025](https://makersden.io/blog/react-state-management-in-2025) - Zustand recommended for dashboards - MEDIUM confidence
- [React State Management in 2025](https://www.developerway.com/posts/react-state-management-2025) - Anti-patterns and best practices - MEDIUM confidence
- [React Performance Optimization 2025](https://dev.to/frontendtoolstech/react-performance-optimization-best-practices-for-2025-2g6b) - Memo and useCallback patterns - MEDIUM confidence

### Compatibility & Migration
- [Is Your Shadcn UI Project at Risk? Radix's Future](https://dev.to/mashuktamim/is-your-shadcn-ui-project-at-risk-a-deep-dive-into-radixs-future-45ei) - Radix maintenance concerns - MEDIUM confidence
- [shadcn Base UI Migration Discussion](https://github.com/shadcn-ui/ui/discussions/6248) - Community discussion on Radix vs Base UI - MEDIUM confidence
- [Base UI vs Radix UI Comparison](https://tailkits.com/blog/base-ui-vs-shadcn-ui-vs-radix-ui-comparison/) - Feature and API comparison - MEDIUM confidence

### Design System Trends
- [15 Best React UI Libraries for 2026](https://www.builder.io/blog/react-component-libraries-2026) - Tailwind + headless UI trend - MEDIUM confidence
- [ShadCN UI vs Radix UI vs Tailwind UI 2025](https://javascript.plainenglish.io/shadcn-ui-vs-radix-ui-vs-tailwind-ui-which-should-you-choose-in-2025-b8b4cadeaa25) - Stack recommendations - MEDIUM confidence

---
*Stack research for: Real-time agent session monitoring dashboard*
*Researched: 2026-02-06*
*Confidence: HIGH (all core recommendations verified with official documentation)*
