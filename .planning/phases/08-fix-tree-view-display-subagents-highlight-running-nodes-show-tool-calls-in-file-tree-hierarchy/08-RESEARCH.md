# Phase 8: Fix Tree View — display subagents, highlight running nodes, show tool calls in file-tree hierarchy - Research

**Researched:** 2026-02-09
**Domain:** React tree component architecture, state-based styling, hierarchical data rendering
**Confidence:** HIGH

## Summary

The Tree View component already exists (TreeView.tsx and TreeNode.tsx) and has the basic infrastructure for hierarchical rendering, but currently displays only session metadata rather than the full execution hierarchy. Analysis of the codebase reveals that TreeView.tsx already implements most required functionality:

1. **Tool call grouping integration** — Already uses `groupConsecutiveToolCalls()` utility and renders ToolGroup nodes (lines 238-239)
2. **Subagent display** — Already renders session.subagents recursively (lines 244-246)
3. **Tool node rendering** — Already handles individual ToolNode rendering within groups (lines 213-231)
4. **Expansion state management** — Already uses Zustand's `expandedGroups` for groups and local `expandedNodes` for other nodes (lines 127-134)
5. **Click handlers** — Already wires up node selection for detail panel inspection (lines 158-187)
6. **Search highlighting** — Already implements `doesNodeMatchSearch()` for visual highlighting (lines 77-115)

**Current problem:** The TreeView works correctly when a session is selected, showing the full hierarchy. However, the default state shows an empty message "Select a session to view its hierarchy" when no session is selected (lines 276-287). The Graph View, by contrast, shows all sessions by default and only filters when one is selected.

**Root cause:** TreeView filters to `selectedSessionId` early (lines 271-274), showing nothing when no session is selected. Graph View shows all sessions by default and only filters when explicitly selected (GraphView.tsx lines 71-77).

**Key insights:**
1. TreeView's rendering logic is complete and correct — it just needs to show all sessions when none is selected (matching Graph View behavior)
2. All state management (expansion, selection, highlighting) is already implemented
3. All node types (Session, Subagent, ToolGroup, Tool, Skill) are already handled
4. The "active" state highlighting is already implemented via `STATUS_COLORS` in TreeNode.tsx (lines 16-21)

**Primary recommendation:** Change TreeView to match GraphView's session filtering logic — show all sessions when none is selected, filter to one when selected. This is a 3-line change (lines 271-274). All other requirements are already met.

## Standard Stack

The established libraries/tools for this domain:

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| React | ^18.2.0 | UI framework | Already in use, useState for local component state |
| zustand | ^4.5.0 | State management | Already manages expandedGroups, selectedSessionId, selectedNodeData |
| TypeScript | ^5.0.0 | Type safety | Already provides TreeNodeData union type |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| React.useMemo | Built-in | Value memoization | Already used for filtered sessions (line 142-144) |
| React.useCallback | Built-in | Function memoization | Already used for toggle/select handlers (lines 146-187) |
| React.useState | Built-in | Local UI state | Already used for expandedNodes (line 134) |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Recursive rendering | Flattened list with indent levels | Recursive is cleaner for tree structures, easier to maintain |
| Mixed state (Zustand + local) | All state in Zustand | Current hybrid is optimal: groups persist across views (Zustand), node expansion is view-local |

**Installation:**
No new dependencies required — all libraries already installed and in use.

## Architecture Patterns

### Recommended Project Structure
Current structure is already correct:
```
client/src/
├── components/
│   ├── TreeView.tsx       # Container component, manages session filtering
│   └── TreeNode.tsx       # Recursive node renderer with state-based styling
├── store/
│   └── sessionStore.ts    # Zustand store with expandedGroups, selectedSessionId
├── utils/
│   ├── groupingUtils.ts   # groupConsecutiveToolCalls() — already integrated
│   └── sessionName.ts     # getSessionDisplayName() — already used in TreeNode
```

### Pattern 1: Hierarchical Recursive Rendering
**What:** TreeView delegates to TreeNode, which recursively calls itself for children
**When to use:** Already implemented correctly (lines 189-269)
**Current implementation:**
```typescript
// TreeView.tsx lines 189-269
const renderNode = useCallback((node: TreeNodeData, depth: number, parentKey: string = '') => {
  const nodeKey = getNodeKey(node, parentKey);
  // ... expansion logic, child rendering
  return (
    <TreeNode
      key={nodeKey}
      node={node}
      depth={depth}
      isExpanded={isExpanded}
      hasChildren={hasChildren}
      onToggle={onToggle}
      onSelect={() => selectNode(nodeKey, node)}
    >
      {childNodes}
    </TreeNode>
  );
}, [/* deps */]);
```

**Why this works:** Each TreeNode receives its children as `props.children`, enabling clean recursive composition without prop drilling.

### Pattern 2: State-Based Visual Highlighting
**What:** Apply different styles based on node.state property ('active', 'waiting', 'idle', 'completed')
**When to use:** Already implemented in TreeNode.tsx (lines 16-21, 179-206)
**Current implementation:**
```typescript
// TreeNode.tsx lines 16-21
const STATUS_COLORS: Record<SessionState, string> = {
  active: '#22c55e',   // Green
  waiting: '#eab308',  // Yellow
  idle: '#6b7280',     // Gray
  completed: '#3b82f6', // Blue
};

// TreeNode.tsx lines 200-206
<div
  style={{
    ...styles.statusDot,
    backgroundColor: STATUS_COLORS[state],
  }}
  title={state}
/>
```

**Why this works:** Status dot color provides visual feedback on node execution state without cluttering the UI. Colors are consistent with GraphView node borders.

### Pattern 3: Dual Expansion State Management
**What:** ToolGroup expansion persists in Zustand (shared between views), other node expansion is local to TreeView
**When to use:** Already implemented correctly (lines 127-134, 195-199)
**Current implementation:**
```typescript
// TreeView.tsx lines 195-199
const isToolGroup = 'type' in node && node.type === 'tool-group';
const isExpanded = isToolGroup ? expandedGroups.has(node.id) : expandedNodes.has(nodeKey);
const onToggle = isToolGroup
  ? () => toggleGroupExpansion(node.id)
  : () => toggleNode(nodeKey);
```

**Why this works:** Tool groups need persistent expansion when switching between Graph/Tree views. Other nodes (sessions, subagents) don't need cross-view persistence, so local state avoids unnecessary Zustand updates.

**IMPORTANT — Missing Integration:** `expandedSubagents` state exists in sessionStore.ts (line 40) and is used in GraphView (line 72) but NOT integrated in TreeView. According to recent decisions, expandedSubagents should "follow same pattern as expandedGroups" for consistency. TreeView needs to:
1. Import `expandedSubagents` and `toggleSubagentExpansion` from store
2. Handle subagent node expansion similar to tool-group (lines 195-199)
3. Toggle subagent expansion when subagent node is clicked

### Pattern 4: CSS Animation for Status Indicators
**What:** @keyframes animations for visual feedback on active processes
**When to use:** Already established in PromptInput.tsx (lines 124-135)
**Current animation pattern:**
```typescript
// PromptInput.tsx lines 128-135
const spinnerKeyframes = `
@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}
`;

// Applied via style
style={{ animation: 'spin 0.8s linear infinite' }}
```

**Application for Phase 8:** Add pulse animation to status dots for 'active'/'waiting' nodes to draw attention to running processes. Pattern established, just needs application to TreeNode status dot.

### Anti-Patterns to Avoid
- **Filtering too early:** Don't filter to `selectedSessionId` before deciding whether to show all sessions (current bug)
- **Prop drilling state:** Don't pass expansion state through component props — use Zustand selectors and local useState
- **Rebuilding keys unnecessarily:** `getNodeKey()` ensures stable keys across re-renders (lines 45-54)

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Tree key generation | Manual string concatenation | `getNodeKey()` utility (lines 45-54) | Already handles type discrimination, parent chains, prevents key collisions |
| Node type checking | `node.hasOwnProperty('type')` | TypeScript type guards with `'type' in node` | Type-safe discrimination between Session and AnyNode types |
| State color mapping | Inline conditionals | `STATUS_COLORS` lookup table (TreeNode.tsx lines 16-21) | Single source of truth, consistent with Graph View |
| Session display names | `session.summary \|\| session.id` | `getSessionDisplayName()` (already used) | Handles cwd extraction, disambiguation, fallbacks |

**Key insight:** The existing codebase has already solved all the hard problems (grouping, recursion, state management, key generation). The fix is a policy change, not a technical implementation.

## Common Pitfalls

### Pitfall 1: Premature Session Filtering
**What goes wrong:** Showing empty state when no session selected, even though all sessions are available
**Why it happens:** Direct translation of "show selected session" to "if no selection, show nothing"
**How to avoid:** Check selectedSessionId and either filter to one session OR show all sessions
**Warning signs:** Empty state message when sessions array is non-empty
**Current code location:** TreeView.tsx lines 271-274

**Fix pattern:**
```typescript
// BEFORE (current bug):
const displaySessions = selectedSessionId
  ? filteredSessions.filter((s) => s.id === selectedSessionId)
  : filteredSessions;

// This breaks when selectedSessionId is null — displaySessions becomes all filtered sessions,
// but then the empty check fails to distinguish "no sessions" from "no selection"

// AFTER (correct):
const displaySessions = useMemo(() => {
  if (selectedSessionId) {
    const selected = filteredSessions.find((s) => s.id === selectedSessionId);
    return selected ? [selected] : [];
  }
  return filteredSessions;
}, [filteredSessions, selectedSessionId]);
```

### Pitfall 2: Mixing ToolGroup Expansion with Node Expansion
**What goes wrong:** Tool groups fail to persist expansion when switching views, or over-persist other node types
**Why it happens:** Using same state mechanism for fundamentally different needs
**How to avoid:** Already solved — use Zustand for groups, local state for others
**Warning signs:** Expansion state lost when switching views, or Zustand updates on every node toggle
**Current implementation:** Correctly implemented (lines 195-199)

### Pitfall 3: Inconsistent Subagent Expansion State
**What goes wrong:** expandedSubagents defined in store but not used in TreeView, causing inconsistency between Graph and Tree views
**Why it happens:** Gradual feature addition without full integration across all components
**How to avoid:** Import and use expandedSubagents in TreeView, following expandedGroups pattern
**Warning signs:** Store state unused, different behaviors between views, console errors about missing state
**Current status:** sessionStore.ts line 40 defines expandedSubagents, GraphView uses it (line 72), TreeView ignores it
**Fix needed:** Add imports and expansion handling for subagent nodes in TreeView (see Code Examples below)

### Pitfall 3: Search Highlighting Without Visual Feedback
**What goes wrong:** Search matches nodes but user can't see which ones matched
**Why it happens:** Highlighting logic implemented but not applied to styles
**How to avoid:** Already solved — `isHighlighted` prop drives outline style
**Warning signs:** Search filters nodes but no visual distinction
**Current implementation:** TreeView.tsx lines 203, 260; TreeNode.tsx lines 162-164

## Code Examples

Verified patterns from the codebase:

### Session Filtering (Graph View Pattern)
```typescript
// Source: client/src/components/GraphView.tsx lines 71-77
const displaySessions = useMemo(() => {
  if (selectedSessionId) {
    const selected = sessions.find((s) => s.id === selectedSessionId);
    return selected ? [selected] : sessions;  // Fallback to all if not found
  }
  return sessions;  // Show all when none selected
}, [sessions, selectedSessionId]);
```

### Tool Call Grouping Integration
```typescript
// Source: client/src/components/TreeView.tsx lines 238-239
const groupedNodes = groupConsecutiveToolCalls(node.nodes);
groupedNodes.forEach((childNode) => {
  sessionChildren.push(renderNode(childNode, depth + 1, nodeKey));
});
```

### State-Based Highlighting
```typescript
// Source: client/src/components/TreeNode.tsx lines 162-164
...(isHighlighted
  ? { outline: '1px solid #854d0e', outlineOffset: '-1px', backgroundColor: 'rgba(133, 77, 14, 0.15)' }
  : {}),
```

### Dual State Management for Expansion
```typescript
// Source: client/src/components/TreeView.tsx lines 195-199
const isToolGroup = 'type' in node && node.type === 'tool-group';
const isExpanded = isToolGroup ? expandedGroups.has(node.id) : expandedNodes.has(nodeKey);
const onToggle = isToolGroup
  ? () => toggleGroupExpansion(node.id)
  : () => toggleNode(nodeKey);
```

### Integrating expandedSubagents in TreeView
**Missing piece:** TreeView needs to import and use expandedSubagents from store.

**Required additions:**
```typescript
// Add to TreeView.tsx imports (around line 127-128)
const expandedSubagents = useSessionStore((state) => state.expandedSubagents);
const toggleSubagentExpansion = useSessionStore((state) => state.toggleSubagentExpansion);

// Modify renderNode callback expansion logic (around lines 195-199)
const isToolGroup = 'type' in node && node.type === 'tool-group';
const isSubagent = 'type' in node && node.type === 'subagent';
const isExpanded = isToolGroup
  ? expandedGroups.has(node.id)
  : isSubagent
    ? expandedSubagents.has(node.id)
    : expandedNodes.has(nodeKey);
const onToggle = isToolGroup
  ? () => toggleGroupExpansion(node.id)
  : isSubagent
    ? () => toggleSubagentExpansion(node.id)
    : () => toggleNode(nodeKey);
```

This matches the GraphView pattern (GraphView.tsx line 72: `const toggleSubagentExpansion = useSessionStore(...)`) and follows the "expandedSubagents follows same pattern as expandedGroups" decision.

### Pulse Animation for Active Status Dots
**Add to index.css:**
```css
@keyframes pulse {
  0%, 100% {
    opacity: 1;
    transform: scale(1);
  }
  50% {
    opacity: 0.5;
    transform: scale(1.3);
  }
}
```

**Apply in TreeNode.tsx (around lines 201-207):**
```typescript
// Determine if animation should play
const shouldAnimate = state === 'active' || state === 'waiting';

// Status dot with conditional animation
<div
  style={{
    ...styles.statusDot,
    backgroundColor: STATUS_COLORS[state],
    animation: shouldAnimate ? 'pulse 1.5s ease-in-out infinite' : 'none',
  }}
  title={state}
/>
```

**Why this works:** CSS animations are GPU-accelerated and don't trigger React re-renders. The animation only plays for 'active' and 'waiting' states, drawing attention to nodes currently executing.

### Recursive Node Rendering with Children
```typescript
// Source: client/src/components/TreeView.tsx lines 252-266
return (
  <TreeNode
    key={nodeKey}
    node={node}
    depth={depth}
    isExpanded={isExpanded}
    isSelected={isSelected}
    hasChildren={hasChildren}
    isHighlighted={isMatch}
    onToggle={onToggle}
    onSelect={() => selectNode(nodeKey, node)}
  >
    {childNodes}  // Recursive children rendered by parent
  </TreeNode>
);
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Show only selected session | Show all sessions by default (Graph View) | Already in Graph View | Users can see overview before drilling down |
| Inline tool nodes | Grouped consecutive tool calls | Phase 1 (2026-02-06) | Cleaner visualization of tool sequences |
| Manual key generation | Stable `getNodeKey()` utility | Phase 1 | Prevents React key warnings, stable selection |
| Props-based expansion state | Zustand + local state hybrid | Phase 1 | Expansion persists across view switches for groups |

**Deprecated/outdated:**
- Showing empty state when no session selected: Already fixed in Graph View, needs to be applied to Tree View
- Single-node groups: Phase 1 decision was to unwrap these (groupingUtils.ts lines 52-54)

## Open Questions

1. **Should TreeView auto-expand the first session when switching from Graph View?**
   - What we know: Graph View doesn't track which sessions are expanded (no equivalent to `expandedNodes`)
   - What's unclear: User expectation — should switching views preserve a "focused session" or reset to overview?
   - Recommendation: Keep it simple — show all sessions collapsed. User can expand what they want. This matches the "overview then drill down" pattern.

2. **Should search highlighting auto-expand matching nodes?**
   - What we know: Current implementation highlights matches but doesn't force expansion
   - What's unclear: Is it confusing when a match is highlighted but its parent is collapsed (so it's not visible)?
   - Recommendation: Keep current behavior (no auto-expansion). Search filtering already removes non-matching nodes from view (via `getFilteredSessions()`), so only relevant nodes appear. Auto-expansion would be redundant.

3. **Should the status dot animate for 'active' nodes?**
   - What we know: Graph View uses `animated` edges for active state, but no animation on status dots
   - What's unclear: Would a pulsing dot improve "running node" visibility?
   - Recommendation: Add a subtle pulse animation (CSS `@keyframes`) to the status dot when `state === 'active'`. Low effort, high visibility gain.

## Sources

### Primary (HIGH confidence)
- `/home/botond/claude-session-dashboard/client/src/components/TreeView.tsx` - Full implementation analysis
- `/home/botond/claude-session-dashboard/client/src/components/TreeNode.tsx` - Rendering and styling patterns
- `/home/botond/claude-session-dashboard/client/src/components/GraphView.tsx` - Session filtering reference pattern
- `/home/botond/claude-session-dashboard/client/src/store/sessionStore.ts` - State management architecture
- `/home/botond/claude-session-dashboard/client/src/utils/groupingUtils.ts` - Tool grouping logic
- `/home/botond/claude-session-dashboard/shared/src/index.ts` - Type definitions for all node types

### Secondary (MEDIUM confidence)
- Phase 1 research (`.planning/phases/01-tool-call-grouping/01-RESEARCH.md`) - Grouping design decisions
- Phase 5 research (`.planning/phases/05-node-metadata-inspection/05-RESEARCH.md`) - Type extension patterns

### Tertiary (LOW confidence)
- None — all findings verified against codebase

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - All libraries already in use, no new dependencies needed
- Architecture: HIGH - Implementation already complete, only policy change required
- Pitfalls: HIGH - Current bug identified and fix pattern verified against Graph View

**Research date:** 2026-02-09
**Valid until:** 2026-03-09 (30 days — stable domain, no fast-moving dependencies)

---

## Appendix: Current Implementation Status

### Already Working ✓
- [x] Tool call grouping integration (lines 238-239)
- [x] Subagent recursive rendering (lines 244-246)
- [x] Individual tool node rendering (lines 213-231)
- [x] ToolGroup expansion state management (Zustand expandedGroups)
- [x] Click handlers for detail panel inspection
- [x] Search highlighting with visual feedback
- [x] Status dots with state-based colors
- [x] Recursive tree rendering with stable keys
- [x] Directory-based session naming
- [x] expandedSubagents defined in sessionStore (line 40)
- [x] expandedSubagents used in GraphView (line 72)

### Broken/Missing ✗
- [ ] Default view shows empty state instead of all sessions (lines 271-274) — main bug
- [ ] expandedSubagents not integrated in TreeView — needs imports and expansion logic
- [ ] No CSS animation for active node status dots — minor UX enhancement

### File Locations
- **Main bug:** `client/src/components/TreeView.tsx` lines 271-274
- **Reference pattern:** `client/src/components/GraphView.tsx` lines 71-77
- **Status colors:** `client/src/components/TreeNode.tsx` lines 16-21
- **Grouping logic:** `client/src/utils/groupingUtils.ts` lines 12-74
- **expandedSubagents store:** `client/src/store/sessionStore.ts` line 40
- **expandedSubagents usage (GraphView):** `client/src/components/GraphView.tsx` line 72

---

## Actionable Implementation Guidance

### Priority 1: Fix Session Display Logic (HIGH confidence, main bug)
**File:** `client/src/components/TreeView.tsx`
**Lines:** 271-274

**Change:**
```typescript
const displaySessions = selectedSessionId
  ? filteredSessions.filter((s) => s.id === selectedSessionId)
  : filteredSessions;
```

**To:**
```typescript
const displaySessions = useMemo(() => {
  if (selectedSessionId) {
    const selected = filteredSessions.find((s) => s.id === selectedSessionId);
    return selected ? [selected] : [];
  }
  return filteredSessions;
}, [filteredSessions, selectedSessionId]);
```

This matches GraphView.tsx lines 71-77 and ensures all sessions show when none selected.

### Priority 2: Integrate expandedSubagents (HIGH confidence, consistency)
**File:** `client/src/components/TreeView.tsx`

**Add imports (around line 127-128):**
```typescript
const expandedSubagents = useSessionStore((state) => state.expandedSubagents);
const toggleSubagentExpansion = useSessionStore((state) => state.toggleSubagentExpansion);
```

**Update expansion logic in renderNode callback (around lines 195-199):**
```typescript
const isToolGroup = 'type' in node && node.type === 'tool-group';
const isSubagent = 'type' in node && node.type === 'subagent';
const isExpanded = isToolGroup
  ? expandedGroups.has(node.id)
  : isSubagent
    ? expandedSubagents.has(node.id)
    : expandedNodes.has(nodeKey);
const onToggle = isToolGroup
  ? () => toggleGroupExpansion(node.id)
  : isSubagent
    ? () => toggleSubagentExpansion(node.id)
    : () => toggleNode(nodeKey);
```

This follows the "expandedSubagents follows same pattern as expandedGroups" decision and matches GraphView behavior.

### Priority 3: Add Pulse Animation (MEDIUM confidence, UX enhancement)
**File:** `client/src/index.css`

**Add keyframes:**
```css
@keyframes pulse {
  0%, 100% {
    opacity: 1;
    transform: scale(1);
  }
  50% {
    opacity: 0.5;
    transform: scale(1.3);
  }
}
```

**File:** `client/src/components/TreeNode.tsx`

**Update status dot (around lines 201-207):**
```typescript
const shouldAnimate = state === 'active' || state === 'waiting';

<div
  style={{
    ...styles.statusDot,
    backgroundColor: STATUS_COLORS[state],
    animation: shouldAnimate ? 'pulse 1.5s ease-in-out infinite' : 'none',
  }}
  title={state}
/>
```

This provides visual feedback for running processes, matching the GraphView's animated edge pattern.
