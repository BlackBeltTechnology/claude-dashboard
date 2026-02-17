# Phase 12: Navigation Refactor - Context

**Gathered:** 2026-02-11
**Status:** Ready for planning

<domain>
## Phase Boundary

Replace the left sidebar session list with directory graph as the primary navigation surface. Directory overview is the landing view, clicking a session enters its timeline graph. Tree view becomes a synchronized slide-in panel. Detail panel stays on the right for node metadata.

</domain>

<decisions>
## Implementation Decisions

### Main layout structure
- Three-panel model: tree panel (left slide-in) | graph (center) | detail panel (right)
- Left sidebar (SessionList component) removed entirely
- Directory overview is the landing/home view — no sidebar
- Session timeline graph is the drill-down view (entered by clicking a session)
- Tree panel slides in from the LEFT (not right), icon-heavy, minimal text per node
- Tree panel is collapsible back to the left
- Clicking a tree node jumps the graph to that node (tree ↔ graph sync)
- Detail panel stays on the right for node metadata inspection (same as current)

### Filter placement and behavior
- Filter controls placement: Claude's discretion (toolbar recommended)
- Session count visible in toolbar (total and filtered count)
- When filtering (e.g. active only), directories with no matching sessions are hidden entirely — not greyed out, not shown
- Search functionality removed from directory view

### Navigation flow
- Landing view: Directory overview graph (directories → sessions)
- Click session node → instant swap to session timeline graph (no animation)
- Back button in top toolbar to return to directory overview
- Top toolbar shows: ← Back | session name/title | tree toggle button | session switcher
- Session switcher: dropdown in toolbar scoped to sessions in the SAME directory — quick-switch without going back
- Tree panel only available in session timeline view (not in directory overview)
- Tree panel toggle: button in toolbar (not keyboard shortcut)
- Tree panel stays open after clicking a node — user navigates multiple nodes without re-opening

### Directory overview toolbar
- Minimal: filters + session count only
- No settings, no search, no view toggle

### Claude's Discretion
- Exact filter control style and placement
- Tree panel width and slide animation
- Toolbar styling and spacing
- Session switcher dropdown design
- Tree node icon selection and sizing

</decisions>

<specifics>
## Specific Ideas

- "The main view is directory and we have sessions in it which we can click. The sessions clicked bring us to the graph and we can see the graph showing the flow that happened."
- "The tree view then can be navigated from there as a slide window from left. It must have very little information on each node, mainly the icons tell us what happened in the tree and the tree is collapsible to the left."
- "When we click a timeline element it jumps to that node!"
- Session switcher only shows sessions from the current directory, not all sessions

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 12-navigation-refactor*
*Context gathered: 2026-02-11*
