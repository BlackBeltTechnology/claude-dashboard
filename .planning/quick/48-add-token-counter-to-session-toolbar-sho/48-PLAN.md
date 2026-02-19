---
quick_task: 48
description: Add token counter to session toolbar showing total tokens used
---

# Plan

## Task 1: Add token counter display to session toolbar

**Files:** `client/src/components/Toolbar.tsx`
**Action:**
- Add a `formatTokenCount` helper (same logic as SessionNode)
- In the session view toolbar, after the session title, display the token count from `selectedSession.tokenUsage`
- Style: subtle, small text matching toolbar aesthetic (like the session count in directory view)
- Show breakdown on hover (title tooltip): input, output, cache read, cache creation
**Verify:** Build succeeds, token counter visible in session toolbar
**Done:** Token counter displayed in session top bar
