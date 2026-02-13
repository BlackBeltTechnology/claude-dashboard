---
phase: quick-35
plan: 01
type: execute
wave: 1
depends_on: []
files_modified:
  - server/src/session-discovery.ts
  - client/src/utils/graphLayout.ts
autonomous: true

must_haves:
  truths:
    - "Multiple Task tool calls in same assistant message are detected as parallel spawns"
    - "Parallel Task subagents display as forked branches in graph view"
    - "Timestamp-based detection still works for backward compatibility"
  artifacts:
    - path: "server/src/session-discovery.ts"
      provides: "Parallel Task detection in buildNodes function"
      min_lines: 700
    - path: "client/src/utils/graphLayout.ts"
      provides: "Enhanced detectParallelSubagentGroups function"
      min_lines: 200
  key_links:
    - from: "server/src/session-discovery.ts:buildNodes"
      to: "SubagentNode.parentId"
      via: "Sets parentId to shared assistant message UUID"
      pattern: "parentId: entry.uuid"
    - from: "client/src/utils/graphLayout.ts:detectParallelSubagentGroups"
      to: "Session.nodes"
      via: "Looks up SubagentNode by agentId to find parentId"
      pattern: "nodes.find.*subagent.*agentId"
---

<objective>
Fix parallel Task tool visualization to show multiple Task subagents spawned in the same assistant message as forked branches, not sequential chains.

Purpose: When Claude Code spawns 4 parallel Task subagents (e.g., gsd-project-researcher agents), they should be displayed as parallel forks in the graph view, making the concurrent execution pattern immediately visible.

Output: Updated parallel detection that uses both parentId grouping (for Task tools in same message) and timestamp proximity (for backward compatibility).
</objective>

<execution_context>
@/home/botond/.claude/get-shit-done/workflows/execute-plan.md
@/home/botond/.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@.planning/STATE.md

# Current parallel detection (timestamp-based only)
@server/src/session-discovery.ts
@client/src/utils/graphLayout.ts

# Type definitions
@shared/src/index.ts
</context>

<tasks>

<task type="auto">
  <name>Task 1: Add parentId-based parallel detection to complement timestamp detection</name>
  <files>
    client/src/utils/graphLayout.ts
  </files>
  <action>
Enhance the `detectParallelSubagentGroups` function to detect parallel Task subagents using TWO methods:

**Method 1 (NEW): ParentId Grouping**
- Accept `allNodes: AnyNode[]` parameter (from session.nodes)
- For each subagent in the list, find its corresponding SubagentNode by matching session.id to SubagentNode.agentId
- Group subagents that have SubagentNodes with the same parentId (assistant message UUID)
- If 2+ subagents share the same parentId, they are parallel spawns

**Method 2 (EXISTING): Timestamp Proximity**
- Keep existing timestamp-based detection (10-second window) for backward compatibility
- This handles cases where Task tools are in separate messages but spawned quickly

**Implementation:**
```typescript
function detectParallelSubagentGroups(
  subagents: Session[],
  allNodes: AnyNode[] = []  // Add parameter
): Map<string, string[]> {
  const parallelGroups = new Map<string, string[]>();
  const assigned = new Set<string>();

  // Method 1: Group by shared parentId (same assistant message)
  const parentIdGroups = new Map<string, string[]>();
  for (const subagent of subagents) {
    // Find the SubagentNode for this subagent session
    const subagentNode = allNodes.find(
      n => n.type === 'subagent' && n.agentId === subagent.id
    ) as SubagentNode | undefined;

    if (subagentNode?.parentId) {
      if (!parentIdGroups.has(subagentNode.parentId)) {
        parentIdGroups.set(subagentNode.parentId, []);
      }
      parentIdGroups.get(subagentNode.parentId)!.push(subagent.id);
    }
  }

  // Add parentId groups with 2+ members as parallel groups
  for (const [parentId, group] of parentIdGroups.entries()) {
    if (group.length >= 2) {
      const groupKey = `parallel-parent-${parentId}`;
      parallelGroups.set(groupKey, group);
      group.forEach(id => assigned.add(id));
    }
  }

  // Method 2: Existing timestamp-based detection (for unassigned subagents)
  const sorted = [...subagents]
    .filter(s => !assigned.has(s.id))  // Only process unassigned
    .sort((a, b) => a.createdAt - b.createdAt);
  const PARALLEL_WINDOW_MS = 10_000;

  for (let i = 0; i < sorted.length; i++) {
    if (assigned.has(sorted[i].id)) continue;
    const group: string[] = [sorted[i].id];
    assigned.add(sorted[i].id);

    for (let j = i + 1; j < sorted.length; j++) {
      if (assigned.has(sorted[j].id)) continue;
      if (sorted[j].createdAt - sorted[i].createdAt <= PARALLEL_WINDOW_MS) {
        group.push(sorted[j].id);
        assigned.add(sorted[j].id);
      } else {
        break;
      }
    }

    if (group.length >= 2) {
      const groupKey = `parallel-${sorted[i].createdAt}`;
      parallelGroups.set(groupKey, group);
    }
  }

  return parallelGroups;
}
```

**Update call sites:**
Find all calls to `detectParallelSubagentGroups(session.subagents)` and update to `detectParallelSubagentGroups(session.subagents, session.nodes)`.
  </action>
  <verify>
Build completes without errors:
```bash
cd /home/botond/claude-session-dashboard && npm run build
```

No TypeScript errors in graphLayout.ts.
  </verify>
  <done>
- detectParallelSubagentGroups function accepts allNodes parameter
- Function implements parentId grouping as primary detection method
- Function falls back to timestamp detection for unassigned subagents
- All call sites updated to pass session.nodes
- Build succeeds
  </done>
</task>

<task type="auto">
  <name>Task 2: Verify parallel detection works with real Task tool data</name>
  <files>
    client/src/utils/graphLayout.ts
  </files>
  <action>
Test the updated parallel detection logic:

1. Add console logging in `detectParallelSubagentGroups` to show detection results:
```typescript
console.log('[Parallel Detection]', {
  totalSubagents: subagents.length,
  parentIdGroupsFound: Array.from(parentIdGroups.entries())
    .filter(([_, group]) => group.length >= 2)
    .length,
  timestampGroupsFound: /* count */,
  finalParallelGroups: parallelGroups.size
});
```

2. Start the dashboard and observe console output when viewing sessions with multiple subagents

3. Verify that parallel Task spawns are correctly grouped

4. Check graph view to confirm forked branch visualization appears for parallel subagents

5. After verification, remove or comment out the debug logging (keep minimal logging if helpful)
  </action>
  <verify>
Manual verification:
- Start server: `cd /home/botond/claude-session-dashboard && npm run dev`
- Open dashboard in browser (http://localhost:3000)
- Navigate to a session with multiple subagents
- Check browser console for parallel detection logs
- Verify parallel subagents show forked branches in graph (not sequential chain)
  </verify>
  <done>
- Console logs show parallel detection working
- Sessions with parallel Task spawns display as forked branches
- No regression in sequential subagent display
- Debug logging removed or minimized
  </done>
</task>

</tasks>

<verification>
## Success Criteria

1. **Multiple Task tools in same message detected as parallel:**
   - detectParallelSubagentGroups groups subagents by shared parentId
   - Groups with 2+ members are marked as parallel

2. **Parallel subagents display as forks:**
   - Graph layout shows parallel branches for grouped subagents
   - Visual structure matches actual execution pattern

3. **Backward compatibility maintained:**
   - Timestamp-based detection still works
   - Existing sessions without parentId grouping still visualize correctly
   - No breaking changes to existing functionality

## Manual Testing

Test with session containing parallel Task spawns:
- Open session in graph view
- Verify forked branch structure
- Click individual subagent nodes
- Confirm metadata displays correctly
</verification>

<success_criteria>
Parallel Task tool visualization works correctly when:
- Multiple Task subagents spawned in same assistant message display as parallel forks
- Timestamp-based detection continues to work for backward compatibility
- No visual regressions in sequential subagent display
- Build completes without errors
</success_criteria>

<output>
After completion, create `.planning/quick/35-fix-task-tool-parallel-forking-show-para/35-SUMMARY.md`
</output>
