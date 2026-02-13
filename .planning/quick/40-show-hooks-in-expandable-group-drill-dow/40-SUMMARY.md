# Quick Task 40 Summary

## Show hooks in expandable group drill-down for each tool call

### Files Modified
- `client/src/components/GroupDrillDownPanel.tsx` - Hook badge in master list rows
- `client/src/utils/toolFormatters.tsx` - Hook sections in ToolDetailFormatter, SkillDetailFormatter, SubagentDetailFormatter

### What Changed
Hooks are now visible in all expandable detail views:
- **Group master list**: Each tool call row shows ⚙️ N badge if hooks exist
- **Tool detail view**: Full hook details (event, name, command, timestamp) shown after output
- **Skill detail view**: Full hook details shown after success status
- **Subagent detail view**: Full hook details shown after model info

### Build
Passes with no errors.
