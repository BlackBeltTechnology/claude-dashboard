---
status: diagnosed
trigger: "Clicking subagent box to expand also opens detail panel with subagent metadata. Expand should ONLY expand, not open panel. Subagent metadata details should be in request/response internal cards, not a separate panel."
created: 2026-02-12T00:00:00Z
updated: 2026-02-12T00:00:00Z
---

## Current Focus

hypothesis: CONFIRMED - Two independent mechanisms both fire on subagent-box click
test: Code trace through click event propagation
expecting: Both toggleSubagentBox AND setSelectedNodeData called on same click
next_action: Document root cause and fix direction

## Symptoms

expected: Clicking a subagent box should ONLY toggle expand/collapse state. No detail panel should open.
actual: Clicking a subagent box both expands it AND opens the detail panel showing subagent metadata (agentType, agentName, agentColor, agentId, prompt, summary).
errors: No runtime errors - this is a UX/logic bug.
reproduction: Click any collapsed subagent-box node in the graph view. Observe that (1) the box expands AND (2) the right-side detail panel opens showing subagent metadata.
started: Since Phase 17 Plan 02 wired click handlers.

## Eliminated

(none - root cause found on first hypothesis)

## Evidence

- timestamp: 2026-02-12T00:01:00Z
  checked: GraphView.tsx onNodeClick handler (lines 392-495)
  found: |
    Lines 454-471 contain a dedicated `subagent-box` case in onNodeClick that explicitly
    calls `setSelectedNodeData(detailData)` with a fabricated subagent detail object
    containing agentId, agentType, agentName, agentColor, prompt, summary.
    Comment on line 455 says "Box click is handled by onToggleExpand callback injected
    in enrichedNodes" and then line 456 says "But also show the subagent detail in the panel".
    This was intentional but is now recognized as wrong behavior.
  implication: The onNodeClick handler for subagent-box is the PRIMARY cause of the unwanted panel opening.

- timestamp: 2026-02-12T00:02:00Z
  checked: GraphView.tsx enrichedNodes (lines 133-223)
  found: |
    Lines 141-143 inject `onToggleExpand` callback into subagent-box node data:
      onToggleExpand: () => { toggleSubagentBox(selectedSessionId || '', boxData.agentId); }
    Lines 144-179 inject `onInternalNodeClick` callback for expanded internal cards.
    The onToggleExpand callback ONLY calls toggleSubagentBox - it does NOT open the detail panel.
  implication: The expand logic itself is clean. The problem is that ReactFlow's onNodeClick fires AFTER the component's own onClick, so BOTH fire on the same click.

- timestamp: 2026-02-12T00:03:00Z
  checked: SubagentBoxNode.tsx click handlers (lines 187-195)
  found: |
    Line 187-190: `handleBoxClick` calls `data.onToggleExpand?.()` - this is the expand toggle.
    Line 192-195: `handleInternalNodeClick` calls `e.stopPropagation()` then `data.onInternalNodeClick?.(nodeId)`.
    The handleBoxClick does NOT call stopPropagation, so the click event bubbles up to ReactFlow.
    ReactFlow then fires its own `onNodeClick` handler (from GraphView line 512).
  implication: |
    Event flow on subagent-box click:
    1. SubagentBoxNode div onClick fires -> handleBoxClick -> data.onToggleExpand() -> toggleSubagentBox (expand/collapse)
    2. Event bubbles to ReactFlow container
    3. ReactFlow fires onNodeClick -> GraphView case 'subagent-box' -> setSelectedNodeData (opens panel)
    Result: BOTH expand AND panel open happen on every click.

- timestamp: 2026-02-12T00:04:00Z
  checked: NodeDetail.tsx renderSubagentContent (lines 665-741)
  found: |
    The subagent detail panel renders:
    - Request section (prompt) - line 668-670
    - Response section (summary) - line 672-674
    - Agent Info section (lines 676-725) containing:
      - Agent Type (line 679)
      - Agent Name (line 683-686)
      - Agent Color with visual swatch AND hex value (lines 689-705)
      - Model (lines 707-711)
      - Agent ID (lines 714-715)
      - Node ID (lines 717-718)
      - Timestamp (lines 720-723)
    - Description section (lines 727-732)
    - Source File Path section (lines 734-739)
  implication: |
    Even if the panel were meant to open, the content is problematic:
    1. agentColor is shown as raw data (hex swatch + hex string) - this is internal visual metadata, not user-useful info
    2. agentId, nodeId are internal IDs, not meaningful to users
    3. Request/Response ARE useful but should be in the expanded box's internal cards, not in a separate panel
    4. sourceFilePath is useful metadata but should be contextual to the agent, not shown as a standalone panel section

- timestamp: 2026-02-12T00:05:00Z
  checked: GraphView.tsx enrichedNodes onInternalNodeClick (lines 144-179)
  found: |
    When clicking internal cards (request/response) in the expanded box, the handler:
    - For 'request' type (lines 149-163): Creates a detail object with agentId, agentType, agentName,
      agentColor, prompt, summary - same sparse metadata as the box click
    - For 'response' type (lines 164-178): Identical structure
    - For tool type (line 147-148): Uses nodeData directly from the internal node
    The request/response internal card clicks pass the SAME data as the box click itself,
    meaning they show identical metadata panels. There is no differentiation between
    "clicked the request card" vs "clicked the response card" - both show the same content.
  implication: |
    The onInternalNodeClick for request/response cards is broken in a second way:
    both construct identical detail objects regardless of which card was clicked.
    Request card should show the prompt content prominently.
    Response card should show the summary content prominently.

## Resolution

root_cause: |
  TWO SEPARATE ISSUES causing the reported bug:

  **Issue 1: Dual-fire on subagent-box click (event propagation)**
  File: `client/src/components/GraphView.tsx`, lines 454-471
  File: `client/src/components/nodes/SubagentBoxNode.tsx`, line 187-190

  When a subagent-box is clicked:
  1. SubagentBoxNode's `handleBoxClick` fires first (component-level onClick), calling `data.onToggleExpand()` which toggles expand state via store.
  2. The click event bubbles up to ReactFlow's container.
  3. ReactFlow fires `onNodeClick` on GraphView (line 512), which hits the `subagent-box` case (line 454).
  4. That case calls `setSelectedNodeData(detailData)`, opening the detail panel.

  Both happen on the SAME click. The SubagentBoxNode's `handleBoxClick` does NOT call `e.stopPropagation()`, unlike `handleInternalNodeClick` which does.

  **Issue 2: Subagent metadata panel shows raw internal data**
  File: `client/src/components/NodeDetail.tsx`, lines 665-741 (`renderSubagentContent`)

  The subagent detail panel shows:
  - `agentColor` as a visual swatch + hex string (line 689-705) - this is a visual indicator, not content
  - `agentId`, `nodeId` - internal identifiers with no user value
  - `sourceFilePath` - potentially useful but shown without context
  - Request/Response sections are present but should be the PRIMARY content, not secondary to metadata

  **Issue 3: Internal card clicks (request/response) produce identical detail data**
  File: `client/src/components/GraphView.tsx`, lines 149-178

  Both `request` and `response` internal card click handlers construct identical `detailData`
  objects with the same fields. There is no way for the detail panel to distinguish which
  card was clicked or to highlight the relevant content (prompt vs summary).

fix: (not applied - diagnosis only)
verification: (not applied - diagnosis only)
files_changed: []

## Suggested Fix Direction

1. **Stop subagent-box click from opening panel:**
   - Option A (preferred): Remove the `subagent-box` case entirely from `onNodeClick` in GraphView.tsx (lines 454-471). The expand/collapse is already handled by SubagentBoxNode's own `handleBoxClick`. No panel should open on box click.
   - Option B: Add `e.stopPropagation()` in SubagentBoxNode's `handleBoxClick` to prevent the event from reaching ReactFlow's onNodeClick. However, this might break ReactFlow's internal node selection behavior.

2. **Move metadata into internal cards:**
   - Request card click should open panel showing: prompt text as primary content, agentType/agentName as context header, sourceFilePath as secondary info.
   - Response card click should open panel showing: summary text as primary content, agent context as header.
   - Tool card clicks already work correctly (use nodeData directly).

3. **Clean up agentColor from panel content:**
   - In `renderSubagentContent` (NodeDetail.tsx), remove the agentColor display (lines 689-705). agentColor should only be used as a visual indicator (border colors, dot colors) in the graph nodes themselves, not displayed as informational content.
   - Consider also removing agentId and nodeId, or moving them into a collapsible "Debug Info" section.
