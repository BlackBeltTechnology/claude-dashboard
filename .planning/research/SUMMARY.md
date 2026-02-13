# Project Research Summary

**Project:** Claude Session Dashboard - Node Grouping & Session Identification
**Domain:** Real-time monitoring dashboard with graph visualization
**Researched:** 2026-02-06
**Confidence:** HIGH

## Executive Summary

This project extends an existing React-based monitoring dashboard (using @xyflow/react + Zustand) to add tool call grouping and human-readable session identification. Research confirms that the current architecture (client-side React + server-side JSONL parsing) is well-suited for these enhancements. The recommended approach is **client-side grouping** with **parent-child node hierarchies** in React Flow, leveraging existing Zustand state management and extending the current component structure.

The key architectural decision is to keep grouping logic in the client rather than server. This maintains server simplicity while enabling user-configurable grouping rules. The master-detail pattern (graph + side panel drill-down) is the industry standard for monitoring tools and should be implemented using Radix UI primitives (Dialog + Collapsible). Session identification should derive from working directory paths extracted from JSONL files, with collision detection for disambiguation.

Critical risks center on React Flow performance pitfalls: parent node ordering violations, Zustand selector performance traps, and expand/collapse state management complexity. These are well-documented with clear prevention strategies. The implementation path is straightforward with incremental phases that build on existing infrastructure without requiring architectural rewrites.

## Key Findings

### Recommended Stack

The current stack (@xyflow/react ^12.0.0, Zustand, dagre) already contains most required dependencies. Research recommends targeted additions rather than major changes.

**Core technologies to add:**
- **elkjs (^0.9.3)**: Advanced hierarchical layout algorithm — better than dagre for nested groups, async to prevent UI blocking
- **@radix-ui/react-dialog (^1.1.15)**: Industry-standard headless dialog primitives — foundation for side panel drill-down
- **@radix-ui/react-collapsible (^1.1.2)**: Accessible collapsible sections — essential for drill-down details within panel
- **Tailwind CSS (^3.4.x)**: 2025/2026 standard for React styling — works seamlessly with Radix primitives, better performance than existing approaches

**Important compatibility note:** Radix UI creators announced the library is not being actively maintained. Short-term risk is low (current versions stable), but medium-term migration to Base UI may be needed within 12-24 months. Use Radix now for proven patterns and fast implementation; monitor Base UI maturity for future migration.

**Existing stack is solid:** @xyflow/react 12.x has native support for parent-child grouping via the `parentId` attribute. Zustand is optimal for this use case (React Flow uses Zustand internally). No major stack changes required.

### Expected Features

Research reveals clear feature hierarchy based on monitoring dashboard patterns from Chrome DevTools, Grafana, and Sentry.

**Must have (table stakes):**
- Collapsible groups with counts (e.g., "Bash (12)") — universal pattern in all monitoring tools
- Human-readable session names — users can't recognize UUIDs, need recognizable identifiers
- Detail panel for drill-down — master-detail pattern is fundamental to observability UX
- Persistent expand/collapse state — prevents frustration when navigating between groups
- Visual grouping indicators — icons, badges, indentation distinguish grouped vs individual items

**Should have (competitive advantage):**
- Smart session name disambiguation with #N suffix — cleaner than showing full UUIDs when collisions occur
- Inline group summaries (e.g., "Bash (12): 10 succeeded, 2 failed") — at-a-glance health without drilling in
- Group preview on hover — faster scanning than Sentry/GitHub which require click
- Quick filter from group context menu — power user workflow enhancement

**Defer (v2+):**
- Temporal grouping indicators (delta tracking) — complex implementation, unclear value without user feedback
- Keyboard navigation for groups — power user feature, not essential for validation
- Group export/copy — utility feature, wait for user requests

**Critical anti-features to avoid:**
- Auto-expand all on load — kills performance with large sessions
- Inline expansion within graph — breaks layout, causes reflow chaos
- Nested grouping — over-complicates UI, harder to find items

### Architecture Approach

Client-side grouping with side panel drill-down pattern. Server remains simple (parse JSONL → broadcast), client handles view logic.

**Major components:**
1. **Grouping utility (utils/grouping.ts)** — Pure function that converts flat node arrays into grouped structures. Groups tool nodes by type while preserving hierarchy. Client-side enables user preferences without server changes.

2. **ToolGroupNode component** — Custom @xyflow/react node type for grouped tools. Renders with count badge, expand/collapse chevron, type icon. Uses React Flow's native `parentId` relationship for hierarchy.

3. **Side panel infrastructure** — Radix Dialog-based sliding panel. State managed in Zustand (panelState slice). Opens on node click, displays drill-down content with Collapsible sections for parameters/output/timing.

4. **Session naming parser (server-side)** — Extracts `cwd` from JSONL first entry, derives human-readable name from directory path (last 2 segments). Includes collision detection with numeric disambiguation.

**Key pattern decisions:**
- **Client-side grouping** over server-side: Enables flexible grouping rules, keeps server simple, grouping is fast (linear scan)
- **Parent-child nodes** over custom rendering: Uses React Flow native hierarchy, proven pattern with good performance
- **Zustand panel state** over component local state: Enables triggering panel from multiple views, survives mode switches

### Critical Pitfalls

Research identified 6 critical pitfalls with specific prevention strategies for each implementation phase.

1. **Parent Node Ordering Violation** — Parent group nodes MUST appear before children in nodes array, or React Flow fails to process relationships. Build topological sorting into graph conversion function from the start (Phase 1).

2. **Zustand Selector Performance Trap** — Direct access to nodes array causes every component to re-render on any node change. Design separate store fields for grouped node metadata before implementing grouping logic (Phase 1).

3. **Group Node Edge Rendering Conflict** — Edges to parent-child nodes render with special z-index, causing visual conflicts. Define clear grouping boundaries (group by session, not globally by type) to prevent cross-boundary edges (Phase 1).

4. **Nodes Array Immutability Violation** — Mutating nodes array in place doesn't trigger React Flow updates. Establish immutable update patterns in grouping logic from start; use spread operators and `.map()`, never `.push()` or direct assignment (Phase 1).

5. **Session Name Collision** — Multiple projects in subdirectories (e.g., `app/client` and `app/server`) both resolve to "app". Implement collision detection with numeric suffixes before rolling out directory-based names (Phase 3).

6. **Expand/Collapse State Management Complexity** — Layout algorithms assume all nodes visible; hiding nodes requires maintaining full data model while toggling visibility. Design visibility state management before implementing drill-down UI; use node `hidden` property instead of removing from array (Phase 2).

**Additional patterns to avoid:**
- Grouping globally across sessions (loses context, breaks hierarchy)
- Storing expansion state in component (resets on re-render, can't persist)
- Filtering before grouping (inconsistent counts, confusing UX)
- Calling layout algorithm on every position change (severe performance degradation)

## Implications for Roadmap

Based on research, suggested phase structure with clear dependencies:

### Phase 1: Client-Side Grouping Foundation
**Rationale:** Establishes core grouping logic and ToolGroupNode rendering without breaking existing features. Must come first because subsequent phases depend on working group structures.

**Delivers:**
- Grouped tool nodes visible in graph with counts (e.g., "Bash (12)")
- Parent-child hierarchy in React Flow
- Persistent expand/collapse state in Zustand

**Addresses:**
- Collapsible groups with counts (table stakes)
- Visual grouping indicators (table stakes)
- Persistent expand/collapse state (table stakes)

**Avoids:**
- Parent node ordering violations (topological sort in graph conversion)
- Zustand selector performance traps (separate store fields for metadata)
- Immutability violations (immutable update patterns from start)
- Filter-before-grouping bugs (establish correct data flow order)

**Technical approach:**
- Implement `groupToolCalls()` pure function with unit tests
- Create ToolGroupNode custom component with React.memo
- Add `collapsedGroups: Set<string>` to Zustand store
- Update graphLayout.ts to handle grouped nodes in dagre layout
- Ensure parent nodes always sorted before children

**Research flag:** Standard patterns — React Flow grouping is well-documented with official examples. Skip phase-specific research.

---

### Phase 2: Side Panel Drill-Down
**Rationale:** Enables detail inspection of grouped nodes. Depends on Phase 1 (needs working groups to drill into). Independent of session naming so can proceed in parallel with Phase 3.

**Delivers:**
- Sliding side panel with Radix Dialog
- Tool group drill-down showing all calls in group
- Collapsible sections for parameters/output/timing
- Click-to-open from graph, keyboard close (Escape)

**Uses:**
- @radix-ui/react-dialog for panel primitives
- @radix-ui/react-collapsible for detail sections
- Tailwind CSS for utility styling

**Implements:**
- Side panel infrastructure (SidePanel.tsx container)
- Panel state slice in Zustand (panelState)
- ToolGroupPanel drill-down component
- Node click handler wiring (GraphView → openPanel)

**Avoids:**
- Expand/collapse state complexity (separate visibility from data model, use `hidden` property)
- Stale panel data (clear panel state on group toggle, validate node still visible)
- Component local state trap (use Zustand so TreeView can also trigger panel)

**Technical approach:**
- Add Radix UI dependencies via npm
- Configure Tailwind CSS in Vite
- Create panelState slice: `{ isOpen, panelType, panelData }`
- Wire onNodeClick in GraphView to call openPanel
- Implement SidePanel with conditional rendering based on panelType

**Research flag:** Standard patterns — Master-detail is well-established in monitoring tools. Radix UI has clear documentation. Skip phase-specific research.

---

### Phase 3: Session Naming from Working Directory
**Rationale:** Independent enhancement on server side. Can be done in parallel with Phase 2 or after. Improves UX without affecting grouping/panel features.

**Delivers:**
- Human-readable session names extracted from working directory
- Collision detection with #N disambiguation
- Full path tooltips on hover
- workingDirectory field in Session type

**Addresses:**
- Human-readable session names (table stakes)
- Smart disambiguation (competitive advantage)

**Avoids:**
- Session name collisions (implement detection + numeric suffix strategy)

**Technical approach:**
- Update Session type to include `workingDirectory?: string`
- Modify parseSessionFile() to extract `cwd` from first JSONL entry
- Derive name from last 2 path segments
- Track seen names per project, append #N on collision
- Display full path in tooltip on client side

**Research flag:** Standard patterns — Path parsing and collision detection are straightforward. Skip phase-specific research.

---

### Phase 4: Enhanced Group Features (v1.x)
**Rationale:** Polish and competitive features. Build after core functionality validated. These enhance existing groups rather than changing fundamentals.

**Delivers:**
- Inline group summaries with success/failure counts
- Group preview on hover (tooltip)
- Quick filter from context menu
- Type-based filtering enhancements

**Addresses:**
- Inline group summaries (competitive advantage)
- Group preview on hover (competitive advantage)
- Quick filter from group (competitive advantage)

**Technical approach:**
- Extend ToolGroup type to include outcome aggregation
- Add tooltip component for hover previews
- Wire context menu to existing filter system
- Aggregate tool call states in grouping logic

**Research flag:** Standard patterns — These are UX enhancements on proven patterns. Skip phase-specific research.

---

### Phase Ordering Rationale

**Why this order:**
1. **Phase 1 first:** Grouping logic is foundation for all other features. Side panel needs groups to exist. Must address critical React Flow pitfalls (parent ordering, immutability) before building on top.

2. **Phase 2 before 3:** Side panel delivers more user value than session naming (enables inspecting grouped data, core workflow). Session naming is cosmetic by comparison.

3. **Phase 2 and 3 can parallelize:** No dependencies between panel implementation and session naming. Can split development if resources allow.

4. **Phase 4 last:** These are enhancements, not core features. Only valuable once groups + drill-down are working and validated with users.

**Grouping rationale based on architecture:**
- Phase 1 is pure client-side (utils + components)
- Phase 2 is client UI (Radix + Zustand integration)
- Phase 3 is pure server-side (JSONL parsing)
- Phase 4 is client polish (extends Phase 1 + 2)

This separation enables parallel work and clear component boundaries.

**How this avoids pitfalls:**
- Phase 1 addresses all React Flow-specific pitfalls before complexity increases
- Phase 2 designs visibility state correctly from start (prevents costly refactor)
- Phase 3 handles collisions early (before users encounter confusion)
- Progressive approach allows validation at each step

### Research Flags

**Phases with standard patterns (skip phase-specific research):**
- **Phase 1:** React Flow grouping extensively documented with official examples. Parent-child patterns, expand/collapse, custom nodes all have working code samples.
- **Phase 2:** Master-detail pattern universal in monitoring tools. Radix UI has comprehensive docs and shadcn/ui examples.
- **Phase 3:** Path parsing and string manipulation are straightforward. No novel patterns.
- **Phase 4:** Builds on proven patterns from Phases 1 and 2.

**No phases require deeper research.** All four phases use well-documented technologies and established UX patterns. The project-level research (STACK, FEATURES, ARCHITECTURE, PITFALLS) provides sufficient context for implementation.

**Validation approach:**
- Phase 1: Unit test grouping logic, visual test node hierarchy
- Phase 2: Integration test panel sync with graph selection
- Phase 3: Integration test collision detection with multiple same-name sessions
- Phase 4: User testing for UX polish features

## Confidence Assessment

| Area | Confidence | Notes |
|------|------------|-------|
| Stack | HIGH | All core technologies (@xyflow/react, Zustand) verified with official docs at current versions. Radix UI is stable despite maintenance concerns. Alternatives identified (Base UI) for long-term migration. |
| Features | HIGH | Master-detail pattern, collapsible groups, session naming are universal in monitoring tools. Clear distinction between table stakes and competitive features based on competitor analysis (Chrome DevTools, Grafana, Sentry). |
| Architecture | HIGH | Client-side grouping decision backed by clear trade-off analysis. Parent-child pattern is native to React Flow with proven performance. Zustand integration patterns documented in React Flow state management guide. |
| Pitfalls | HIGH | All 6 critical pitfalls sourced from React Flow official troubleshooting, performance docs, and GitHub issues. Each has specific prevention strategy and phase mapping. Recovery costs assessed. |

**Overall confidence:** HIGH

The project builds on proven technologies with excellent documentation. All recommended patterns have working examples in React Flow documentation and established monitoring tools. No novel research required — this is a straightforward application of well-known patterns to existing codebase.

### Gaps to Address

**Radix UI maintenance uncertainty:**
- **Gap:** Radix UI not actively maintained; long-term viability unclear
- **Mitigation:** Use Radix now (fastest path, stable), monitor Base UI maturity over next 6-12 months, budget for migration if needed
- **Timeline:** Re-evaluate in Q3 2026; migration window is 12-24 months out
- **Impact:** LOW — Current Radix versions work fine with React 18+; migration to Base UI is well-documented via shadcn

**Performance thresholds not validated:**
- **Gap:** Research provides performance targets (60fps drag, <100ms expand) but current codebase performance at scale unknown
- **Validation:** Phase 1 must include stress testing with 100+ nodes before proceeding to Phase 2
- **Approach:** Generate synthetic session data with many tool calls, measure with React DevTools Profiler
- **Impact:** MEDIUM — May need additional memoization or virtualization if performance inadequate

**Group by time window vs group by type:**
- **Gap:** Research focuses on grouping by tool type, but temporal grouping (parallel tool calls within time window) may be more valuable
- **Exploration:** Phase 1 implementation should support both strategies via configurable grouping function
- **Decision point:** Test both approaches in Phase 1, choose based on actual session patterns from real JSONL files
- **Impact:** LOW — Grouping function is pluggable; can change strategy without architectural changes

**Session name collision frequency:**
- **Gap:** Unclear how often users have multiple sessions in same directory
- **Data collection:** Log collision rate during Phase 3 rollout
- **Alternative:** If collisions rare (<5%), may not need disambiguation UI complexity
- **Impact:** LOW — Disambiguation is easy to add if needed

## Sources

### Primary (HIGH confidence)
- [React Flow Official Documentation](https://reactflow.dev/) — Node grouping patterns, performance optimization, state management
- [React Flow Expand/Collapse Example](https://reactflow.dev/examples/layout/expand-collapse) — Official pattern for expand/collapse with visibility
- [React Flow Sub Flows Guide](https://reactflow.dev/learn/layouting/sub-flows) — Parent-child grouping documentation
- [React Flow Performance Guide](https://reactflow.dev/learn/advanced-use/performance) — Selector optimization, memoization strategies
- [Radix UI Dialog Docs](https://www.radix-ui.com/primitives/docs/components/dialog) — Side panel implementation primitives
- [shadcn/ui Sheet Component](https://ui.shadcn.com/docs/components/sheet) — Side panel pattern with Radix + Tailwind
- [Zustand GitHub](https://github.com/pmndrs/zustand) — State management patterns
- [Chrome DevTools Network Reference](https://developer.chrome.com/docs/devtools/network/reference) — Master-detail pattern in production tool
- [Grafana Dashboard Best Practices](https://grafana.com/docs/grafana/latest/dashboards/build-dashboards/best-practices/) — Progressive disclosure, drill-down patterns
- [PatternFly Tree View Guidelines](https://www.patternfly.org/components/tree-view/design-guidelines/) — Collapsible groups, persistent state

### Secondary (MEDIUM confidence)
- [Medium: React Flow Performance Optimization](https://medium.com/@lukasz.jazwa_32493/the-ultimate-guide-to-optimize-react-flow-project-performance-42f4297b2b7b) — Mutation anti-patterns
- [Synergy Codes: State Management in React Flow](https://www.synergycodes.com/blog/state-management-in-react-flow) — Zustand integration patterns
- [Dev.to: Is Radix UI at Risk?](https://dev.to/mashuktamim/is-your-shadcn-ui-project-at-risk-a-deep-dive-into-radixs-future-45ei) — Radix maintenance concerns
- [GitHub shadcn/ui Base UI Discussion](https://github.com/shadcn-ui/ui/discussions/6248) — Migration path to Base UI
- [React State Management 2025](https://www.developerway.com/posts/react-state-management-2025) — Zustand vs alternatives
- [Dashboard Design Patterns](https://dashboarddesignpatterns.github.io/patterns.html) — Monitoring dashboard UX patterns
- [Sentry Issue Grouping Docs](https://docs.sentry.io/concepts/data-management/event-grouping/) — Grouping patterns in production monitoring tool

### Tertiary (LOW confidence)
- Community blog posts on React Flow performance (needs validation in actual implementation)
- GitHub issues on specific edge cases (may be version-specific, test before relying on)

---
*Research completed: 2026-02-06*
*Ready for roadmap: yes*
