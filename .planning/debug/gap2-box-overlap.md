---
status: diagnosed
trigger: "Expanded subagent box overlaps with neighboring main graph nodes; dagre doesn't allocate enough space"
created: 2026-02-12T00:00:00Z
updated: 2026-02-12T00:00:00Z
---

## Current Focus

hypothesis: Dagre layout dimensions for expanded subagent-box nodes are significantly smaller than the actual rendered size of the SubagentBoxNode React component, causing visual overlap with neighboring nodes.
test: Compare dagre dimensions vs actual rendered dimensions
expecting: Mismatch between dagre allocation and rendered output
next_action: Document findings (diagnosis only, no fix)

## Symptoms

expected: When a subagent box is expanded, neighboring nodes should reposition to make room for the larger box, with no visual overlap.
actual: The expanded box visually overlaps with main graph nodes behind/around it. The dagre layout does not allocate sufficient space.
errors: No runtime errors -- purely a visual layout problem.
reproduction: Open session graph, click on any subagent-box node to expand it. Observe overlap with adjacent timeline nodes.
started: Introduced in Phase 17 Plan 01 (dynamic dagre dimensions).

## Eliminated

(none -- first investigation)

## Evidence

- timestamp: 2026-02-12T00:01:00Z
  checked: graphLayout.ts applyDagreLayout (lines 795-875) -- dagre dimension calculation for expanded subagent-box
  found: |
    Expanded box dagre dimensions (lines 822-828):
      width = Math.max(280, nodeCount * 160)
      height = 120
    Collapsed box dagre dimensions (line 829):
      width = 220, height = 70
  implication: Dagre allocates width based on internalNodes count and a fixed height of 120px for expanded boxes.

- timestamp: 2026-02-12T00:02:00Z
  checked: SubagentBoxNode.tsx -- actual rendered structure of expanded box
  found: |
    The expanded view renders:
    1. Header row (~30px): agent color circle + title + collapse arrow
    2. Internal nodes container (styles.internalNodesContainer): a horizontal flex row of cards
       - Each card has minWidth: 130px, padding 8px 10px, gap 8px between cards
       - Container has overflowX: auto (scrollbar appears if too wide)
    3. Box has padding: 10px 14px, borderLeft: 3px solid
    4. No explicit width or height set on the expanded box div (styles.boxExpanded has no width/height)
  implication: The expanded box width is determined by CSS flex layout of its children, NOT constrained by any explicit width. It will be as wide as its content requires.

- timestamp: 2026-02-12T00:03:00Z
  checked: Mismatch analysis between dagre dimensions and actual rendered size
  found: |
    ROOT CAUSE IDENTIFIED -- TWO SEPARATE ISSUES:

    ISSUE 1: HEIGHT IS GROSSLY UNDERESTIMATED
    Dagre allocates height = 120px for expanded boxes.
    Actual rendered height is approximately:
      - Box padding top: 10px
      - Header row: ~24px (12px font + line-height + flex alignment)
      - Header margin-bottom: 6px
      - Internal nodes container margin-top: 8px
      - Internal node card height: ~50px (8px padding top + label line + gap + input line + 8px padding bottom)
      - Container padding-bottom: 4px
      - Box padding bottom: 10px
    Total: ~112px minimum for a simple case
    BUT this assumes single-line content. With longer labels or input summaries, cards can grow taller.
    Additionally, when overflowX triggers a scrollbar, the scrollbar adds ~12-17px height.
    Realistic rendered height: 120-140px+

    The 120px dagre height is borderline at best, and will undercount when scrollbars appear
    or when content wraps.

    ISSUE 2: WIDTH FORMULA DOESN'T MATCH RENDERED WIDTH
    Dagre formula: Math.max(280, nodeCount * 160)
    Actual rendered width per internal card: minWidth 130px + 8px gap = ~138px per card
    Plus box padding: 14px left + 14px right + 3px border-left = 31px
    So actual width = 31 + nodeCount * 138 - 8 (no gap after last)
    For nodeCount=3: dagre=480px, actual=31+3*138-8=437px -- dagre is WIDER (OK)
    For nodeCount=5: dagre=800px, actual=31+5*138-8=713px -- dagre is wider (OK)

    However, the actual card minWidth is 130px but content can make cards wider.
    The container has overflowX:auto which LIMITS rendered width to container width.

    So width is actually NOT the main problem -- the overflowX:auto on the container
    prevents the rendered box from growing wider than its content.

    THE REAL ROOT CAUSE: The expanded box component has NO explicit width or height set.
    React Flow positions nodes by their dagre-computed position, but the ACTUAL DOM element
    size is determined by CSS, not by dagre. Dagre thinks the node is 480x120, but the
    DOM renders it at whatever size CSS determines.

    Since styles.boxExpanded has NO width/height constraints, the rendered size is
    governed entirely by content flow. The DOM element could be wider or narrower than
    what dagre allocated, and dagre's spacing of NEIGHBORING nodes is based on its
    (potentially wrong) dimension estimate.

  implication: The core problem is a decoupling between dagre's dimension model and the actual rendered DOM dimensions.

- timestamp: 2026-02-12T00:04:00Z
  checked: GraphView.tsx -- whether dagre re-runs on expand/collapse
  found: |
    Lines 127-130 in GraphView.tsx:
    ```tsx
    const { nodes: layoutedNodes, edges: layoutedEdges } = useMemo(
      () => createLayoutedGraph(displaySessions, expandedGroups, expandedSubagents, expandedSubagentBoxes),
      [displaySessions, expandedGroups, expandedSubagents, expandedSubagentBoxes]
    );
    ```
    expandedSubagentBoxes IS in the useMemo dependency array.
    toggleSubagentBox updates the store's expandedSubagentBoxes map (lines 266-280 in sessionStore.ts).
    GraphView subscribes to expandedSubagentBoxes (line 109).

    So YES, dagre re-runs when a box is expanded/collapsed. The layout IS recalculated.
    The problem is not "dagre doesn't re-run" -- it's "dagre re-runs with WRONG dimensions."
  implication: The re-layout mechanism is correctly wired. The bug is purely in the dimension values passed to dagre.

- timestamp: 2026-02-12T00:05:00Z
  checked: Whether the SubagentBoxNode component constrains its own width to match dagre
  found: |
    Collapsed view (line 82): styles.boxCollapsed has explicit `width: '220px'` -- matches dagre's 220px.
    Expanded view (line 89-95): styles.boxExpanded has NO width property at all.

    The expanded box will grow to fit its content. With overflowX:auto on the internal container,
    the container itself won't overflow, but the box div still has no max-width.

    Critical: Even if the internal cards are contained by overflow, the box padding (14px * 2)
    plus header text width could make the box narrower OR wider than dagre expects.

    More importantly, there is NO height constraint on the expanded box. The actual
    rendered height depends entirely on content, and dagre has no way to know the true height.
  implication: The collapsed box correctly constrains itself to match dagre (width:220px). The expanded box does NOT constrain itself, creating a dagre-vs-DOM mismatch.

## Resolution

root_cause: |
  TWO COMPOUNDING ISSUES:

  1. **No explicit dimensions on expanded SubagentBoxNode component:**
     The collapsed box sets `width: '220px'` matching dagre's 220px allocation.
     The expanded box (`styles.boxExpanded` in SubagentBoxNode.tsx line 89-95) sets
     NO width and NO height. The DOM element renders at whatever size CSS flex layout
     determines, which can differ significantly from what dagre allocated.

     Dagre positions neighboring nodes based on its dimension estimate (e.g., 480x120),
     but the actual DOM box may render at a different size, causing visual overlap.

  2. **Height estimate is too small (120px fixed):**
     The dagre height for expanded boxes is hardcoded to 120px (graphLayout.ts line 827).
     The actual rendered height includes: header (~30px) + internal cards container (~60px)
     + padding (20px) + margins (14px) + potential scrollbar (~15px) = ~130-140px.
     When the rendered box is taller than dagre's 120px allocation, it visually overlaps
     with nodes positioned directly below it in the graph.

  **Why this causes overlap:** Dagre uses the dimensions to compute spacing between nodes.
  If dagre thinks a node is 120px tall but it renders at 140px, the next node below will
  be positioned too close (based on ranksep=80 + node heights), and the extra 20px of
  rendered height will overlap into the neighboring node's space.

  For width: since the expanded box has no explicit width, it auto-sizes. If auto-size
  exceeds dagre's `Math.max(280, nodeCount*160)` estimate, horizontal overlap occurs.
  If auto-size is smaller, there's wasted space but no overlap.

  **Files involved:**
  - `client/src/utils/graphLayout.ts` lines 820-831: dagre dimension calculation
  - `client/src/components/nodes/SubagentBoxNode.tsx` lines 89-95: expanded box styles (no width/height)

fix: (not applied -- diagnosis only)

verification: (not applicable)

files_changed: []

## Suggested Fix Directions

1. **Sync rendered dimensions to dagre dimensions (recommended):**
   Set explicit `width` and `height` on `styles.boxExpanded` that match the dagre formula:
   - width = `Math.max(280, nodeCount * 160)` px
   - height = computed value (needs to be larger than 120, likely 140-160px)
   The SubagentBoxNode component would need to read these from its data props or compute
   them from `internalNodes.length`.

2. **Measure-then-layout approach (more complex):**
   Render nodes off-screen first, measure actual DOM dimensions, then pass measured
   dimensions to dagre. This is more accurate but adds complexity and a render cycle.

3. **Increase dagre height estimate and add explicit CSS constraints:**
   Bump the dagre height from 120 to ~160px, and add `maxHeight` + `overflow:hidden`
   on the expanded box to ensure the DOM never exceeds dagre's allocation.
   Set explicit width on the expanded box to match the dagre formula.
