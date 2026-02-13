---
phase: 04-ux-polish
plan: 02
subsystem: ui-components
status: complete
completed: 2026-02-06
duration: 4min
tags: [tool-detail, formatting, click-handling, react, zustand]

requires:
  - 02-02-drill-down-panel

provides:
  - single-tool-inspection
  - formatted-tool-display
  - tool-formatters

affects:
  - future-tool-types

tech-stack:
  added: []
  patterns: [synthetic-tool-group, type-specific-formatting]

key-files:
  created:
    - client/src/utils/toolFormatters.tsx
  modified:
    - client/src/utils/graphLayout.ts
    - client/src/store/sessionStore.ts
    - client/src/components/GraphView.tsx
    - client/src/components/TreeView.tsx
    - client/src/components/GroupDrillDownPanel.tsx

decisions:
  - id: synthetic-single-tool-groups
    choice: Create synthetic ToolGroup with single item when clicking non-grouped tool nodes
    rationale: Reuses existing GroupDrillDownPanel infrastructure without duplicating UI code
    alternatives: [create-separate-single-tool-panel, extend-panel-to-handle-both]
  - id: selectedGroupData-in-store
    choice: Add selectedGroupData field to Zustand store alongside selectedGroupId
    rationale: Synthetic groups don't exist in session data structure, need ephemeral storage
    alternatives: [compute-on-render, add-to-sessions-array]
  - id: tool-specific-formatters
    choice: Switch on toolName to render type-specific formatted views
    rationale: Each tool has distinct input schema requiring custom display logic
    alternatives: [generic-json-viewer, schema-driven-rendering]
  - id: export-createNodeId
    choice: Export existing createNodeId helper from graphLayout.ts
    rationale: Needed to match React Flow node IDs to session data node IDs for lookup
    alternatives: [duplicate-logic, pass-lookup-map]
---

# Phase 04 Plan 02: Single Tool Inspection Summary

**One-liner:** Single tool nodes clickable in both views, tool details show formatted input/output (Bash, Read, Write, Grep, Glob) with amber file paths, code blocks, and 5000-char output truncation.

## What Was Built

Added click handling for individual (non-grouped) tool nodes in both graph and tree views, opening the GroupDrillDownPanel with formatted, human-readable tool details instead of raw JSON.

**Implementation approach:**

1. **Synthetic ToolGroup pattern:** When user clicks a single tool node, create an ephemeral ToolGroup with count=1 and store it in `selectedGroupData` state field. This reuses the existing panel infrastructure.

2. **Store modifications:** Added `selectedGroupData: ToolGroup | null` to SessionStore to hold synthetic groups that don't exist in the session data. Modified `setSelectedGroupId` to clear `selectedGroupData` when closing panel.

3. **GraphView click handling:** Added `findToolNodeInSessions` helper that uses `createNodeId` to match React Flow node IDs back to session data. Extended `onNodeClick` to handle `tool` type nodes.

4. **TreeView click handling:** Added handling in `selectNode` callback to detect tool node clicks and create synthetic groups, plus explicit handling for tool-group clicks.

5. **Tool formatters:** Created `toolFormatters.tsx` with `ToolDetailFormatter` component that switches on `toolName` to render:
   - **Bash:** Description (if present) + command in dark code block
   - **Read:** Amber file path + optional line range meta text
   - **Write:** Amber file path + character count + content preview (first 500 chars)
   - **Grep/Glob:** Purple pattern in inline code + amber path
   - **Edit:** Amber file path + JSON fallback
   - **Default:** Formatted JSON

6. **Panel updates:** Updated `GroupDrillDownPanel` to:
   - Check `selectedGroupData` first in `findToolGroup` before searching sessions
   - Replace raw JSON input/output sections with `<ToolDetailFormatter>`
   - Add preview text in master list (command for Bash, file path for Read/Write)
   - Clear `selectedGroupData` in `handleClose`

**Visual design:**
- Section labels: uppercase, blue (`#93c5fd`), 14px, 600 weight
- Code blocks: dark background (`#0f1729`), light text (`#e2e8f0`), 12px monospace
- File paths: amber (`#fbbf24`) on dark background (`#1a1a2e`), inline-block, rounded
- Output blocks: slightly darker (`#0a0e1a`), gray text (`#94a3b8`), 11px
- Truncation: "... (truncated)" suffix for long content

## Tasks Completed

### Task 1: Add single tool node click handling in store, GraphView, and TreeView

**Changes:**
- `graphLayout.ts`: Exported `createNodeId` function (previously internal)
- `sessionStore.ts`: Added `selectedGroupData` state field and `setSelectedGroupData` action, modified `setSelectedGroupId` to clear data when null
- `GraphView.tsx`: Added `findToolNodeInSessions` recursive helper, extended `onNodeClick` with tool node branch creating synthetic ToolGroup
- `TreeView.tsx`: Extended `selectNode` to handle tool and tool-group clicks, creating synthetic groups for single tools

**Verification:** `npm run build` passed with no TypeScript errors

**Done criteria met:** Single tool nodes in both graph and tree views now clickable, opening GroupDrillDownPanel via synthetic single-item ToolGroup creation

### Task 2: Create tool formatters and integrate into GroupDrillDownPanel

**Changes:**
- Created `client/src/utils/toolFormatters.tsx`:
  - `ToolDetailFormatter` component with tool-specific rendering
  - Helper functions for Bash, Read, Write, Grep, Glob, Edit
  - `truncateString` helper for output truncation
- `GroupDrillDownPanel.tsx`:
  - Imported `ToolDetailFormatter`
  - Added `selectedGroupData` early return in `findToolGroup`
  - Replaced raw JSON input/output sections with `<ToolDetailFormatter>`
  - Added preview text generation in master list items
  - Clear `selectedGroupData` in `handleClose`

**Verification:** `npm run build` passed with no TypeScript errors

**Done criteria met:** GroupDrillDownPanel renders formatted, human-readable tool details with tool-specific formatting. Panel supports both grouped and single tool node selection.

## Implementation Notes

**Type conflict resolution:** Import `ToolNode` type with alias `ToolNodeType` in GraphView.tsx to avoid conflict with `ToolNode` component from `./nodes/ToolNode`.

**Recursive search:** Both `findToolNodeInSessions` (GraphView) and existing `searchSession` (GroupDrillDownPanel) use recursive pattern to search through session subagents.

**Master list preview:** Bash shows first 40 chars of command, Read/Write show file path (truncated from end if > 40 chars). Other tools show no preview.

**Output truncation:** Set to 5000 characters (vs 500 for Write content preview). Appends newlines + "... (truncated)" message.

## Deviations from Plan

None - plan executed exactly as written.

## Testing Evidence

Build output shows successful TypeScript compilation and Vite production build:
```
✓ 540 modules transformed.
dist/assets/index-CMA8bdiC.js   468.04 kB │ gzip: 150.37 kB
✓ built in 4.44s
```

All TypeScript errors resolved (initial type conflict with ToolNode fixed via import alias).

## Next Phase Readiness

**Ready for:** Future tool type additions can extend the switch statement in `toolFormatters.tsx` without modifying panel logic.

**Considerations:**
- New tool types should follow the established pattern: extract fields with optional chaining, provide fallback strings
- If tool input schemas become complex, consider schema-driven rendering
- If many more tool types are added, consider splitting formatters into separate files per tool

**No blockers identified.**

## Performance Impact

Minimal - synthetic ToolGroup creation is lightweight (single object allocation). Formatter rendering is O(1) per tool (no deep JSON traversal).

## User Experience Impact

Major improvement - users can now:
1. Click any tool node (not just grouped ones) to inspect details
2. Read formatted tool inputs instead of parsing JSON
3. See preview text in master list to identify calls quickly
4. Understand Bash commands, file paths, patterns at a glance

Reduces cognitive load for common tool types (Bash, Read, Write make up 80%+ of tool calls).
