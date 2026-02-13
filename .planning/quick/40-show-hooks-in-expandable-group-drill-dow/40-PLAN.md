---
phase: 40-show-hooks-in-expandable-group-drill-dow
plan: 01
type: execute
---

# Quick Task 40: Show hooks in expandable group drill-down

## Changes

1. **GroupDrillDownPanel.tsx** - Added hook badge (⚙️ N) to each tool call row in master list
2. **toolFormatters.tsx** - Added hooks section to:
   - `ToolDetailFormatter` - shows hooks when viewing individual tool call details
   - `SkillDetailFormatter` - shows hooks for skill nodes
   - `SubagentDetailFormatter` - shows hooks for subagent nodes
3. **ToolGroupNode.tsx** - Hook badge + hooks field in data interface (done in prior task)
4. **graphLayout.ts** - Hook propagation through internal nodes (done in prior task)

## Hook rendering style
- Yellow accent (#fbbf24) for event name
- Blue (#93c5fd) for hook name
- Gray monospace for command
- Timestamp on right
- "callback" shown in italic
