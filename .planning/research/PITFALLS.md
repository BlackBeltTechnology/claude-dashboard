# Pitfalls Research

**Domain:** @xyflow/react graph visualization with node grouping and session identification
**Researched:** 2026-02-06
**Confidence:** HIGH

## Critical Pitfalls

### Pitfall 1: Parent Node Ordering Violation

**What goes wrong:**
When parent group nodes appear AFTER their children in the nodes array, React Flow fails to process the parent-child relationships correctly. The children may not render, render incorrectly, or lose their relative positioning.

**Why it happens:**
React Flow processes nodes sequentially. When it encounters a child with a `parentId`, the parent must already exist in the internal state. Developers often add nodes in chronological order (tool calls as they occur) without considering hierarchy requirements.

**How to avoid:**
- Sort nodes array to ensure all parent nodes appear before children
- When dynamically adding grouped nodes, insert parent first, then children
- Use a topological sort if hierarchy is complex

**Warning signs:**
- Child nodes appear at absolute (0,0) instead of relative to parent
- Child nodes don't move when parent is dragged
- Console warnings about missing parent nodes
- Grouped nodes render as individual nodes

**Phase to address:**
Phase 1 (Node Grouping Implementation) - Build sorting logic into the graph conversion function before creating React Flow nodes.

---

### Pitfall 2: Zustand Selector Performance Trap

**What goes wrong:**
Directly accessing the `nodes` array from React Flow's internal store causes every component to re-render on ANY node change, even unrelated ones. When displaying hundreds of "Bash" tool nodes, each drag operation triggers a cascade of re-renders across all node components.

**Why it happens:**
Zustand's default shallow comparison detects that the nodes array reference changed, even if only one node's position updated. Components subscribing to `nodes` re-render on every update. This is particularly severe with frequent updates (drag operations, state changes).

**How to avoid:**
- Never directly access `nodes` array in components
- Store derived data (grouped node counts, selected IDs) in separate store fields
- Use selectors that return only the specific data needed
- Apply `useShallow` hook or `createWithEqualityFn` with shallow comparison

**Warning signs:**
- Laggy drag performance with 50+ nodes
- Console shows frequent re-renders during drag
- CPU spikes during graph interactions
- Profiler shows unnecessary component updates

**Phase to address:**
Phase 1 (Node Grouping Implementation) - Design separate store fields for grouped node metadata before implementing grouping logic.

---

### Pitfall 3: Group Node Edge Rendering Conflict

**What goes wrong:**
Edges connected to nodes with parents render ABOVE regular nodes, creating visual z-index conflicts. When a tool call inside a group connects to a tool outside, the edge may obscure unrelated nodes or create confusing visual layering.

**Why it happens:**
React Flow's rendering strategy treats parent-child edges specially for visual hierarchy. Standard edges render below nodes; parent-child edges render above. This creates unexpected layering when mixing grouped and ungrouped nodes.

**How to avoid:**
- Avoid connecting grouped nodes to ungrouped nodes in the same graph
- Use CSS z-index overrides on custom edge components if mixing is necessary
- Keep all tool calls of the same session in the same group
- Consider edge routing libraries (react-flow-smart-edge) for complex layouts

**Warning signs:**
- Edges appear above unrelated nodes
- Visual confusion about which edges connect to which nodes
- Edge hover/interaction issues due to z-index conflicts
- Edge labels obscured by nodes

**Phase to address:**
Phase 1 (Node Grouping Implementation) - Define clear grouping boundaries (group by session, not by tool type) to prevent cross-boundary edges.

---

### Pitfall 4: Nodes Array Immutability Violation

**What goes wrong:**
Mutating the nodes array in place (`.push()`, `.splice()`, direct property assignment) doesn't trigger React Flow updates. The graph appears frozen despite state changes. This is particularly dangerous when adding grouped nodes dynamically.

**Why it happens:**
React Flow relies on reference equality to detect changes. Mutating the existing array keeps the same reference, so React doesn't detect the update. With Zustand, this also bypasses the store's change detection.

**How to avoid:**
- Always create new arrays with spread operator or `.map()`
- Use React Flow's `applyNodeChanges()` utility
- Use Zustand's `set()` with immutable updates
- Enable ESLint rules for immutability

**Warning signs:**
- Graph doesn't update after state change
- Console shows state updated but UI doesn't reflect it
- Need to manually trigger re-renders
- Stale node data in UI

**Phase to address:**
Phase 1 (Node Grouping Implementation) - Establish immutable update patterns in the graph conversion and grouping logic from the start.

---

### Pitfall 5: Session Name Collision with Working Directory

**What goes wrong:**
Multiple projects in subdirectories of the same parent directory (e.g., `/projects/app/client` and `/projects/app/server`) both resolve to "app" as the session name, making sessions indistinguishable. Users can't tell which session belongs to which directory.

**Why it happens:**
Using only the immediate parent directory name as the session identifier ignores the full path context. Multiple directories with the same name are common in monorepos and nested project structures.

**How to avoid:**
- Use full path with home directory replaced by `~` (e.g., `~/projects/app/client`)
- Include additional disambiguating info (git branch, last directory segment)
- Hash full path and show first N characters + last directory name
- Allow user-defined session aliases
- For identical names, append numerical suffix (app-1, app-2)

**Warning signs:**
- Multiple sessions with identical names
- User confusion about which session is which
- Clicking wrong session due to name ambiguity
- Need to check tmux target or git branch to differentiate

**Phase to address:**
Phase 3 (Session Naming Replacement) - Implement collision detection and resolution strategy before rolling out directory-based names.

---

### Pitfall 6: Expand/Collapse State Management Complexity

**What goes wrong:**
When implementing expand/collapse for grouped nodes, the full graph structure must remain in memory while only toggling visibility. Without careful state management, toggling causes expensive layout recalculations, filters break, and edge connections to hidden nodes create visual artifacts.

**Why it happens:**
Layout algorithms (dagre) assume all nodes are visible. Hiding nodes requires recalculating positions for visible nodes while maintaining the data structure of hidden ones. Edges connecting to hidden nodes need special handling (hide, redirect, or show as stubs).

**How to avoid:**
- Maintain two separate states: full data model + visible nodes
- Use node `hidden` property instead of removing from array
- Recalculate layout only for the visible subset
- Handle edges to hidden nodes explicitly (hide them or show condensed state)
- Cache expanded/collapsed state per group

**Warning signs:**
- Layout shifts when expanding/collapsing groups
- Edges pointing to nowhere after collapse
- Performance degradation on expand/collapse
- Lost edge connections after toggle operations
- Filter results change unexpectedly

**Phase to address:**
Phase 2 (Side Panel Drill-Down) - Design the visibility state management before implementing the drill-down UI.

---

## Technical Debt Patterns

Shortcuts that seem reasonable but create long-term problems.

| Shortcut | Immediate Benefit | Long-term Cost | When Acceptable |
|----------|-------------------|----------------|-----------------|
| Group by tool type globally across sessions | Easy to understand counts | Loses session context; edges cross session boundaries | Never - breaks fundamental hierarchy |
| Store group expansion state in React component | Quick implementation | Resets on parent re-render; can't persist across navigation | MVP only; must refactor before persistence |
| Count nodes by filtering full array on every render | Simple code | O(n) on every render; performance degrades with scale | MVP with <50 nodes; refactor by Phase 1 completion |
| Use tool name directly as group label | No translation needed | Breaks if tool names change; no custom grouping | Acceptable for internal tools; must abstract for extensibility |
| Display raw directory path as session name | No parsing logic needed | Leaks system paths; long names break UI | Development only; never in production |
| Filter grouped nodes in components | Localized logic | Duplicated filtering; inconsistent results; performance issues | Never - centralize in store |

## Integration Gotchas

Common mistakes when connecting to external services.

| Integration | Common Mistake | Correct Approach |
|-------------|----------------|------------------|
| dagre layout library | Calling `dagre.layout()` on every state change | Cache layout results; recalculate only when nodes/edges change (not positions) |
| React Flow instance | Accessing `getNodes()` in components | Use Zustand selectors; never call instance methods in render |
| Zustand store updates | Calling `set()` multiple times in succession | Batch updates in single `set()` call; use functional updates for derived changes |
| Custom node components | Defining node components inside parent component | Define outside or memoize with `React.memo` to prevent recreation |
| WebSocket session updates | Replacing entire nodes array on update | Apply incremental updates using `applyNodeChanges()` |

## Performance Traps

Patterns that work at small scale but fail as usage grows.

| Trap | Symptoms | Prevention | When It Breaks |
|------|----------|------------|----------------|
| Calling `.filter()` on nodes array in render | Initial render fast; gradual slowdown | Store filtered/grouped data in Zustand; compute once | >100 nodes; noticeable at 50+ |
| Creating new nodeTypes object every render | Constant re-rendering of all nodes | Define outside component or memoize with `useMemo` | Immediately; worsens with node count |
| Inline edge style objects | Jank during drag operations | Define static styles outside; use CSS classes | >50 edges; severe at 200+ |
| Running layout algorithm on position changes | Smooth initially; becomes laggy | Trigger layout only on structure changes (add/remove nodes) | >20 nodes; unusable at 100+ |
| Directly accessing store in custom nodes | Nodes lag behind state | Use node `data` props; pass state down from parent | >30 custom nodes |
| Grouping nodes by sequential scan | Works for small graphs | Use O(1) lookup with Map/Set; pre-index by tool type | >200 nodes; slow at 500+ |

## State Management Pitfalls

Domain-specific state synchronization issues.

### Pitfall: Session Update Race Condition

**What goes wrong:**
When multiple WebSocket messages arrive rapidly (session update + state change + node addition), applying them in sequence can overwrite each other. The final state doesn't reflect all updates.

**Prevention:**
- Use functional updates in Zustand: `set((state) => ({ ... }))`
- Apply node changes with `applyNodeChanges()` for atomic updates
- Queue updates and batch process if latency is high

**Phase to address:**
Phase 2 (Side Panel Drill-Down) - Stress test with rapid updates before adding drill-down complexity.

---

### Pitfall: Filter Applied Before Grouping

**What goes wrong:**
If filtering happens before grouping logic, groups may have inconsistent counts. A filter removing 5 "Bash" nodes from the raw array but the group shows "10 Bash calls" creates user confusion.

**Prevention:**
- Always group first, then filter
- Store both raw and grouped data in store
- Apply filters to the grouped structure, not raw nodes

**Phase to address:**
Phase 1 (Node Grouping Implementation) - Establish filter → group order in the data flow design.

---

### Pitfall: Stale Node Data After Group Toggle

**What goes wrong:**
When toggling group expansion, the drill-down side panel shows stale data from the previous state. The panel displays old tool call details for a node that's now hidden.

**Prevention:**
- Clear side panel state when toggling groups
- Subscribe panel to specific node IDs, not node objects
- Validate selected node is still visible before rendering panel

**Phase to address:**
Phase 2 (Side Panel Drill-Down) - Synchronize panel state with group visibility state.

---

## UX Pitfalls

Common user experience mistakes in this domain.

| Pitfall | User Impact | Better Approach |
|---------|-------------|-----------------|
| Showing "Bash (127)" without preview | Can't tell what commands ran | Show most recent command or command signature in tooltip |
| Session name truncation without full path tooltip | Can't identify session by partial name | Show full path on hover; use ellipsis mid-path, not end |
| Grouping all tool types globally | Loses session context; can't filter by session | Group by session first, then by tool type within session |
| No visual indicator for collapsed groups | Users don't know nodes are hidden | Show expand icon, badge count, or distinct border style |
| Animated edges on all nodes during drag | Distracting; CPU intensive | Animate only active state nodes; static edges for others |
| Identical visual style for grouped vs ungrouped | Can't distinguish at a glance | Use different border style, background, or icon for groups |
| No indication of drill-down availability | Users miss feature; click randomly | Hover state on groups; clear "View details" affordance |
| Session names update in place without transition | Jarring; users lose context | Fade or slide transition when name changes |

## "Looks Done But Isn't" Checklist

Things that appear complete but are missing critical pieces.

- [ ] **Node Grouping:** Group nodes render but don't have expand/collapse - verify interactive controls exist
- [ ] **Session Naming:** Names updated but collisions not handled - verify collision detection and disambiguation logic
- [ ] **Side Panel:** Panel shows data but doesn't sync with graph selection - verify bidirectional selection sync
- [ ] **Performance:** Graph renders but lags with >50 nodes - verify memoization, selector optimization implemented
- [ ] **Edge Routing:** Edges render but cross through nodes - verify edge routing library integrated or manual routing logic
- [ ] **Filter + Group:** Both features work independently but conflict together - verify filter order and group state preservation
- [ ] **WebSocket Updates:** Initial load works but live updates break grouping - verify incremental update handling for grouped nodes
- [ ] **Expand/Collapse State:** Toggles work but state lost on refresh - verify persistence to localStorage or URL state
- [ ] **Long Session Names:** Short names render but long paths break layout - verify text truncation, ellipsis, and tooltips
- [ ] **Empty Groups:** Non-empty groups work but zero-count groups cause errors - verify empty state handling in group nodes

## Recovery Strategies

When pitfalls occur despite prevention, how to recover.

| Pitfall | Recovery Cost | Recovery Steps |
|---------|---------------|----------------|
| Parent node ordering violation | LOW | Add sorting step before rendering; won't affect data model |
| Zustand selector performance trap | MEDIUM | Refactor store to add derived fields; update components to use new selectors |
| Group node edge rendering conflict | MEDIUM | Refactor grouping strategy to avoid cross-boundary edges; may require edge filtering |
| Nodes array immutability violation | LOW | Search/replace mutation with immutable patterns; add ESLint rule to prevent recurrence |
| Session name collision | MEDIUM | Implement collision detection + disambiguation; may require backend changes for persistence |
| Expand/collapse state management | HIGH | Requires architectural refactor; separate data model from visibility state; affects multiple components |
| Filter before grouping | MEDIUM | Reorder operations in data flow; update store to group first; test filter interactions |
| Stale side panel data | LOW | Add useEffect to clear/sync panel state; subscribe to correct dependencies |
| Layout recalculation on drag | MEDIUM | Add memoization and change detection; only recalc on structural changes |
| Custom node re-creation | LOW | Hoist definitions outside component; wrap with React.memo; immediate fix |

## Pitfall-to-Phase Mapping

How roadmap phases should address these pitfalls.

| Pitfall | Prevention Phase | Verification |
|---------|------------------|--------------|
| Parent node ordering violation | Phase 1 | Unit test: children always follow parents in array |
| Zustand selector performance trap | Phase 1 | Profiler: no re-renders on unrelated node changes |
| Group node edge rendering conflict | Phase 1 | Visual test: no edges obscuring nodes |
| Nodes array immutability violation | Phase 1 | ESLint: no direct mutations; integration test |
| Expand/collapse state management | Phase 2 | Stress test: toggle groups rapidly without breaks |
| Stale side panel data | Phase 2 | Integration test: panel syncs with group visibility |
| Filter before grouping | Phase 1 | Unit test: group counts match filtered results |
| Session name collision | Phase 3 | Integration test: multiple sessions with same dir name |
| Layout recalculation on drag | Phase 1 | Performance test: drag latency <50ms with 100 nodes |
| Custom node re-creation | Phase 1 | Profiler: node components don't remount on parent render |

## Sources

**React Flow Official Documentation:**
- [Common Errors](https://reactflow.dev/learn/troubleshooting/common-errors) - Parent extent constraints, node ordering, handle ID mismatches
- [Performance Guide](https://reactflow.dev/learn/advanced-use/performance) - Unnecessary re-renders, direct node access antipattern, memoization strategies
- [Sub Flows Documentation](https://reactflow.dev/learn/layouting/sub-flows) - Parent-child positioning, extent configuration, edge rendering behavior
- [Expand and Collapse Example](https://reactflow.dev/examples/layout/expand-collapse) - Visibility management, layout recalculation gotchas

**Performance Optimization:**
- [Medium: Ultimate guide to optimize React Flow project performance](https://medium.com/@lukasz.jazwa_32493/the-ultimate-guide-to-optimize-react-flow-project-performance-42f4297b2b7b) - Node array mutations, selector performance, memoization patterns
- [GitHub Discussion #4975](https://github.com/xyflow/xyflow/discussions/4975) - Large dataset rendering issues
- [GitHub Issue #4711](https://github.com/xyflow/xyflow/issues/4711) - Custom node performance issues

**State Management:**
- [React Flow: State Management Documentation](https://reactflow.dev/learn/advanced-use/state-management) - Zustand integration patterns
- [Synergy Codes: State management in React Flow](https://www.synergycodes.com/blog/state-management-in-react-flow) - Store organization, selector patterns
- [GitHub Discussion #960](https://github.com/xyflow/xyflow/discussions/960) - Controlled vs semi-controlled elements
- [React State Management 2025](https://www.developerway.com/posts/react-state-management-2025) - Context vs Zustand for panel state

**Session Management:**
- [OWASP Session Management Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Session_Management_Cheat_Sheet.html) - Session naming security considerations
- [Atlassian: Best Practices in Naming and Organizing Dashboards](https://community.atlassian.com/forums/App-Central-articles/Best-Practices-in-Naming-and-Organizing-Dashboards/ba-p/3059992) - Hierarchical naming conventions
- [GitHub Issue #6697](https://github.com/anomalyco/opencode/issues/6697) - Session switching and working directory context bugs

**Graph Layout:**
- [yFiles Layout Algorithms for React Flow](https://www.yworks.com/pages/yfiles-layout-algorithms-for-react-flow) - Layout algorithm optimization for large graphs
- [Medium: Building Complex Graph Diagrams](https://dtoyoda10.medium.com/building-complex-graph-diagrams-with-react-flow-elk-js-and-dagre-js-8832f6a461c5) - Layout performance with hierarchical structures

**Project Code Analysis:**
- `/home/botond/claude-session-dashboard/client/src/store/sessionStore.ts` - Current Zustand implementation, filter logic
- `/home/botond/claude-session-dashboard/client/src/utils/graphLayout.ts` - dagre integration, node conversion, current structure
- `/home/botond/claude-session-dashboard/shared/src/index.ts` - Type definitions for sessions, nodes, hierarchy

---
*Pitfalls research for: @xyflow/react node grouping and session identification*
*Researched: 2026-02-06*
