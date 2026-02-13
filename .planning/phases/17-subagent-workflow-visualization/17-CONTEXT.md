# Phase 17: Subagent Workflow Visualization - Context

**Gathered:** 2026-02-12
**Status:** Ready for planning

<domain>
## Phase Boundary

Subagent nodes become expandable container boxes on the main horizontal timeline. Each box contains the subagent's full workflow: request node (entry), tool call nodes, and response node (exit). Parallel subagents stack vertically at the same horizontal position. Boxes can be collapsed/expanded. Remove the current tool call summary from subagent nodes.

</domain>

<decisions>
## Implementation Decisions

### Layout & Position
- Subagent boxes stay inline on the main horizontal timeline (NOT forked branches)
- Each box is a colored container with the agent type name and tool count in the header
- Colors assigned by agent type (all Explore agents one color, all Bash agents another, etc.)
- Inside the box: nodes flow left-to-right (horizontal), matching the main timeline direction
- Request node is the entry point, response node is the exit point
- Main timeline edges connect TO the box container, not to nodes inside it
- Parallel subagents stack vertically (top-to-bottom) at the same X position
- Parallel boxes sized to their own content (not equal width)
- No visual container borders beyond the colored background — edges only between internal nodes
- Edge styles between box and main timeline: same style as main edges (no dashed/colored distinction)

### Node Content
- Request node: label only ("Request") — full prompt text in detail panel on click
- Response node: label only ("Response") — full agent response in detail panel on click
- Tool call nodes: use the exact same ToolNode component as the main timeline — same style, same click behavior, same detail panel
- Remove the tool call summary list from current subagent nodes entirely
- Each node inside the box has its own metadata accessible via the detail panel
- Box header shows: agent type name + tool count (e.g., "Explore (5 tools)")

### Collapse/Expand Behavior
- Collapsed by default when opening a session
- Click anywhere on box to toggle expand/collapse
- When expanded: clicking a tool node inside opens its metadata (node click takes priority over box collapse)
- Only clicking box background/header area collapses an expanded box
- Snap instantly on expand/collapse (no animation)
- Expand all / collapse all buttons in toolbar
- Viewport stays in place on expand (no auto-scroll/fit)
- Expand/collapse state persists per session across navigation

### Collapsed State Display
- Shows agent type + tool count (e.g., "Explore (5 tools)")
- Shows the last node as live progress indicator — user can see current activity without expanding
  - Active subagent: shows last tool being used (e.g., "Reading src/App.tsx")
  - Completed subagent: shows final tool or response

### Claude's Discretion
- Whether subagent branches reconnect (merge back) to the main timeline or just end
- Last-node display format on collapsed boxes (text summary vs mini node preview)
- Exact color palette for agent types

</decisions>

<specifics>
## Specific Ideas

- No nested subagents in Claude Code — no need to handle recursive forking
- The collapsed state with last-node display serves as a live progress tracker for active subagents
- This replaces the current subagent start/stop node pairs and tool call summary approach entirely

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 17-subagent-workflow-visualization*
*Context gathered: 2026-02-12*
