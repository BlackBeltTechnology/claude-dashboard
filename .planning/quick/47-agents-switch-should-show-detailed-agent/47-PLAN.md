---
quick_task: 47
description: Agents switch should show "Detailed Agents" label with green/grey dot indicator like Follow End
---

# Plan

## Task 1: Change Agents switch label to static text

**Files:** `client/src/components/Toolbar.tsx`
**Action:** Replace the conditional `'Agents: ON' / 'Agents: OFF'` text (line 482) with static `'Detailed Agents'` label, matching the Follow End pattern (line 509) which uses only the green/grey dot for state indication.
**Verify:** Build succeeds, label shows "Detailed Agents" with dot indicator.
**Done:** Static label, no on/off text.
