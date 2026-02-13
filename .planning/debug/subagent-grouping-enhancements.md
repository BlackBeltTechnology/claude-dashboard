---
status: resolved
trigger: "Investigate subagent box workflow visualization enhancements"
created: 2026-02-12T00:00:00.000Z
updated: 2026-02-12T11:20:00.000Z
resolution: Implemented model output grouping and fixed text truncation
---

## Investigation Summary

## Enhancement 1: Tool Grouping in Subagent Boxes

**Status:** ALREADY IMPLEMENTED

**Evidence:**
- `client/src/utils/graphLayout.ts` lines 603-618 (parallel subagents) and lines 823-838 (sequential subagents)
- The function `groupConsecutiveToolCalls` is imported from `groupingUtils.ts` (line 11)
- It's called on pseudoNodes created from tool timeline items
- The result is used to build internal nodes with grouped labels like "Bash (3)" (line 865)

**Code Location:**
```typescript
// graphLayout.ts line 603-618
const pseudoNodes: AnyNode[] = timelineItems
  .filter(item => item.itemType === 'tool')
  .map(item => { /* ... */ });
const groupedToolNodes = groupConsecutiveToolCalls(pseudoNodes);

// Then used at lines 639-651
if (groupedNode?.type === 'tool-group') {
  internalNodes.push({
    id: groupedNode.id,
    type: 'tool',
    label: `${groupedNode.toolName} (${groupedNode.count})`,  // Shows count!
    // ...
  });
}
```

**Recommendation:** No changes needed - this enhancement is complete.

---

## Enhancement 2: Model Response Grouping

**Status:** NOT IMPLEMENTED - Needs to be added

**Current Behavior:**
- Model outputs (assistant messages) are added individually as separate `type: 'model'` internal nodes
- Each assistant message becomes a separate card in the expanded subagent box
- No grouping of consecutive model responses

**Code Location:**
- `client/src/utils/graphLayout.ts` lines 622-633 (parallel) and 842-853 (sequential)
- Each model message creates a separate internal node entry

**Current Code:**
```typescript
// graphLayout.ts line 622-633
if (item.itemType === 'model') {
  const msgData = item.data as AnyNode & { content?: string; state: SessionState };
  internalNodes.push({
    id: item.data.id,
    type: 'model',
    label: 'Model Output',
    content: msgData.content?.slice(0, 200) || '',
    state: msgData.state,
    nodeData: item.data,
  });
}
```

**Recommended Approach:**
1. Create a new grouping function similar to `groupConsecutiveToolCalls` but for model responses
2. Group consecutive model output nodes (type='model') within a run
3. Show combined count like "Model Output (3)" when grouped
4. Store all grouped message nodeData for detail panel access

**Suggested Implementation:**
- Add `groupConsecutiveModelOutputs()` function in `client/src/utils/graphLayout.ts` (or create new file)
- Apply similar logic: collect consecutive model outputs, group when 2+, unwrap when single
- Update the internal node building loop to use grouped model outputs

---

## Enhancement 3: Model Response Text Shortening

**Status:** PARTIALLY IMPLEMENTED - Current implementation has a flaw

**Current Behavior:**
- Content IS truncated to 200 chars at source: `content: msgData.content?.slice(0, 200)`
- The truncated content is stored in the internal node's `content` field
- When clicked, this same truncated content is shown in NodeDetail (GraphView.tsx lines 151-162)

**The Problem:**
- The 200-char truncation happens at graphLayout.ts before storage
- Clicking the card doesn't reveal more content - it's already lost

**Code Location:**
- `client/src/utils/graphLayout.ts` line 630: `content: msgData.content?.slice(0, 200) || ''`
- `client/src/utils/graphLayout.ts` line 850: same truncation
- `client/src/components/GraphView.tsx` lines 151-162: shows truncated content on click

**Recommended Approach:**
1. **Option A (simpler):** Truncate only for display in the card (SubagentBoxNode), keep full content in `nodeData`
   - Change graphLayout.ts to store full content in nodeData
   - Change SubagentBoxNode.tsx to truncate for card display only

2. **Option B (full fix):** Store full content + add display truncation
   - Keep nodeData with full content
   - Add `displayContent` field with truncated version for card
   - Update SubagentBoxNode to use `displayContent` or truncate `content`

**Recommended Implementation (Option A):**
1. In `graphLayout.ts`: Remove the `.slice(0, 200)` - store full content
2. In `SubagentBoxNode.tsx`: Truncate on display:
   ```typescript
   // Line 342-346 - add truncation
   <div style={styles.internalNodeInput} title={node.content}>
     {node.content?.slice(0, 80) || ''}{node.content && node.content.length > 80 ? '...' : ''}
   </div>
   ```

**Note:** The title attribute already shows full content on hover, but clicking should show full in detail panel.

---

## Summary

| Enhancement | Status | Action Needed |
|-------------|--------|---------------|
| 1. Tool grouping | DONE | None - already implemented |
| 2. Model grouping | NOT DONE | Add grouping function |
| 3. Text shortening | PARTIAL | Fix to keep full content + truncate only for display |

## Files to Modify

1. **client/src/utils/graphLayout.ts**
   - Add model output grouping function
   - Remove `.slice(0, 200)` truncation (keep full content)

2. **client/src/components/nodes/SubagentBoxNode.tsx**
   - Add display truncation for model content in cards

3. **Optional: client/src/utils/groupingUtils.ts**
   - Could add model grouping function here for consistency
