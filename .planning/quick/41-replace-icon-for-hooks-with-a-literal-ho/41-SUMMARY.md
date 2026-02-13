# Quick Task 41: Replace icon for hooks with a literal hook

## Summary
Replaced the gear emoji (⚙️) with a literal hook emoji (🪝) in all hook badge displays across 8 component files.

## Changes

| File | Change |
|------|--------|
| `client/src/components/GroupDrillDownPanel.tsx` | `⚙️` → `🪝` in tool hook badge |
| `client/src/components/nodes/UserPromptNode.tsx` | `⚙️` → `🪝` in hook badge |
| `client/src/components/nodes/ResponseNode.tsx` | `⚙️` → `🪝` in hook badge |
| `client/src/components/nodes/ToolGroupNode.tsx` | `⚙️` → `🪝` in hook badge |
| `client/src/components/nodes/ToolNode.tsx` | `⚙️` → `🪝` in hook badge |
| `client/src/components/nodes/SubagentNode.tsx` | `⚙️` → `🪝` in hook badge |
| `client/src/components/nodes/RequestNode.tsx` | `⚙️` → `🪝` in hook badge |
| `client/src/components/nodes/SkillNode.tsx` | `⚙️` → `🪝` in hook badge |

## Verification
- Build passes (`npm run build` successful)
- All 8 hook badge locations updated consistently
