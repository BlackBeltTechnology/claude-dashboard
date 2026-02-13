---
phase: 02-group-drill-down
plan: 01
subsystem: state-management
tags: [zustand, hooks, state, ui-foundation]
one_liner: "Zustand group selection state and click-outside hook for drill-down panel foundation"

requires:
  - 01-02: "ToolGroup display structure and state management"

provides:
  - selectedGroupId state in sessionStore for tracking active drill-down
  - useClickOutside hook for dismissing overlay panels
  - useSelectedGroupId convenience selector

affects:
  - 02-02: "GroupDrillDownPanel will consume selectedGroupId and useClickOutside"
  - 02-03: "Graph integration will use setSelectedGroupId on group node clicks"

tech-stack:
  added: []
  patterns:
    - "Zustand state extension pattern"
    - "React custom hook with event listener cleanup"

key-files:
  created:
    - client/src/hooks/useClickOutside.ts
  modified:
    - client/src/store/sessionStore.ts

decisions:
  - selectedGroupId stores ToolGroup.id (tool-group-${toolName}-${firstNodeId}), not React Flow node ID
  - useClickOutside uses mousedown event to prevent open-close race condition
  - Hook follows named export convention matching existing codebase patterns

metrics:
  duration: 1min
  completed: 2026-02-06
---

# Phase 2 Plan 01: Group Drill-Down State Foundation Summary

**One-liner:** Zustand group selection state and click-outside hook for drill-down panel foundation

## What Was Built

Extended the Zustand session store with state management for group drill-down panel open/close, and created a reusable click-outside hook for dismissing overlay UI elements.

**Key additions:**

1. **selectedGroupId state** - Tracks which tool group is currently selected for drill-down viewing (null when panel closed)
2. **setSelectedGroupId action** - Setter for opening/closing the drill-down panel
3. **useSelectedGroupId selector** - Convenience hook for components to read selected group
4. **useClickOutside hook** - Reusable hook for detecting clicks outside an element with proper event listener cleanup

## Technical Implementation

### Zustand Store Extension

Added to `SessionStore` interface:
```typescript
// Group drill-down state
selectedGroupId: string | null;
setSelectedGroupId: (groupId: string | null) => void;
```

Initial state:
```typescript
selectedGroupId: null,
```

Action implementation:
```typescript
setSelectedGroupId: (groupId) => set({ selectedGroupId: groupId }),
```

Convenience selector:
```typescript
export const useSelectedGroupId = () =>
  useSessionStore((state) => state.selectedGroupId);
```

### Click-Outside Hook

Created `client/src/hooks/useClickOutside.ts` with:
- Type-safe RefObject parameter (`RefObject<HTMLElement | null>`)
- mousedown event listener (not click) to prevent race conditions
- Proper cleanup function to prevent memory leaks
- Checks if click target is outside the referenced element

## Decisions Made

**1. Store ToolGroup.id format, not React Flow node ID**
- Rationale: ToolGroup.id (`tool-group-${toolName}-${firstNodeId}`) is stable and can be used to look up the actual ToolGroup data via groupingUtils
- React Flow node IDs are prefixed with session ID and are more specific to the graph view
- Impact: Panel logic will need to lookup ToolGroups from session data using the stored ID

**2. Use mousedown event in useClickOutside**
- Rationale: Prevents the open-close race condition where the click that opens a panel immediately triggers the outside-click handler
- Alternative considered: click event with stopPropagation - rejected due to complexity
- Impact: Hook must be used with mousedown-based open triggers for consistency
- Reference: Documented pitfall from RESEARCH.md

**3. Named exports for consistency**
- Rationale: Matches existing codebase patterns (useIsGroupExpanded, useSessionStore)
- Alternative considered: default exports - rejected to maintain consistency
- Impact: Imports must use `import { useClickOutside }` syntax

## Files Changed

**Created:**
- `client/src/hooks/useClickOutside.ts` - Reusable click-outside detection hook (27 lines)

**Modified:**
- `client/src/store/sessionStore.ts` - Added selectedGroupId state, setter, and selector (4 additions)

## Next Phase Readiness

**Ready for Plan 02-02:** GroupDrillDownPanel component can now:
- Read selectedGroupId to determine if panel should be open
- Use setSelectedGroupId(null) to close the panel
- Apply useClickOutside hook to dismiss panel on outside clicks

**Integration requirements for Plan 02-03:**
- Graph view will call setSelectedGroupId(groupId) when user clicks a tool-group node
- Tree view will call setSelectedGroupId(groupId) when user clicks a group header

## Deviations from Plan

None - plan executed exactly as written.

## Testing Notes

TypeScript compilation verified:
- No type errors in extended store
- useClickOutside hook properly typed with RefObject<HTMLElement | null>
- All exports accessible with correct types

Manual verification needed in Plan 02-02:
- Confirm selectedGroupId state updates trigger panel open/close
- Verify useClickOutside correctly dismisses panel without interfering with internal clicks
- Test mousedown vs click timing to confirm race condition is prevented

## Verification Completed

- [x] TypeScript compilation passes (`npx tsc --noEmit`)
- [x] `client/src/hooks/useClickOutside.ts` exists and exports `useClickOutside`
- [x] `client/src/store/sessionStore.ts` contains `selectedGroupId` state
- [x] `client/src/store/sessionStore.ts` contains `setSelectedGroupId` action
- [x] `useSelectedGroupId` convenience selector exported
- [x] No regressions to existing store behavior (all previous fields intact)
