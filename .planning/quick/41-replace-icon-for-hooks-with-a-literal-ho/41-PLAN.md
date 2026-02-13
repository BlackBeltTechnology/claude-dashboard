# Quick Task 41: Replace icon for hooks with a literal hook

## Task
Replace the gear emoji (⚙️) used for hook badges with a literal hook emoji (🪝) across all node components and panels.

## Tasks

### Task 1: Replace hook icon emoji in all components
**Files:** 8 locations across 8 files
- `client/src/components/GroupDrillDownPanel.tsx` - line 320
- `client/src/components/nodes/UserPromptNode.tsx` - line 130
- `client/src/components/nodes/ResponseNode.tsx` - line 119
- `client/src/components/nodes/ToolGroupNode.tsx` - line 75
- `client/src/components/nodes/ToolNode.tsx` - line 174
- `client/src/components/nodes/SubagentNode.tsx` - line 281
- `client/src/components/nodes/RequestNode.tsx` - line 119
- `client/src/components/nodes/SkillNode.tsx` - line 129

**Action:** Replace `⚙️` with `🪝` in each hook badge span.

## Verification
- `npm run build` passes
- All hook badges show 🪝 instead of ⚙️
