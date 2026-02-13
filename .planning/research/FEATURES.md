# Feature Research: Grouping & Session Identification in Monitoring Dashboards

**Domain:** Real-time monitoring dashboards for agent sessions
**Researched:** 2026-02-06
**Confidence:** HIGH

## Feature Landscape

### Table Stakes (Users Expect These)

Features users assume exist. Missing these = product feels incomplete.

| Feature | Why Expected | Complexity | Notes |
|---------|--------------|------------|-------|
| **Collapsible groups with counts** | Standard in all monitoring tools (GitHub Actions logs, Chrome DevTools, Sentry) — users need to see "Bash (12)" not 12 rows | MEDIUM | Requires aggregation logic + UI state management for expand/collapse |
| **Expand/Collapse All controls** | Prevents frustration when dealing with many groups — expected in tree views (PatternFly, Carbon Design, Primer) | LOW | Simple state toggle, but must preserve individual item states when collapsing parents |
| **Human-readable session names** | UUIDs are debugging artifacts, not identifiers — users recognize "my-project" not "a3f2b1c8" | LOW | Extract working directory basename from `cwd` field |
| **Detail panel for drill-down** | Master-detail pattern is standard in observability (Chrome DevTools tabs, Grafana drill-downs) — clicking grouped item opens details without losing context | MEDIUM | Side panel component with lazy-loaded content |
| **Persistent expand/collapse state** | Infuriating when re-expanding nodes you already opened — tree view UX fundamental | MEDIUM | Store expanded node IDs in UI state (Zustand) |
| **Type-based filtering** | Like Chrome DevTools resource type buttons — "show only Bash calls" | LOW | Already exists in codebase for node types, extend to tool types |
| **Visual grouping indicators** | Icons, indentation, count badges distinguish grouped vs individual items | LOW | CSS + conditional rendering |

### Differentiators (Competitive Advantage)

Features that set the product apart. Not required, but valuable.

| Feature | Value Proposition | Complexity | Notes |
|---------|-------------------|------------|-------|
| **Smart session naming with disambiguation** | "my-project #2" auto-increments when multiple sessions share same directory — cleaner than "my-project (a3f2b1c8)" | MEDIUM | Track seen names, append counter on collision |
| **Group preview on hover** | Tooltip shows first N items in group without expanding — faster scanning than Sentry/GitHub which require click | LOW | Tooltip component with truncated list |
| **Temporal grouping indicators** | Show "Bash (5, +3 since last check)" for new items in existing group — awareness without re-scanning | HIGH | Requires delta tracking between updates |
| **Inline group summaries** | "Bash (12): 10 succeeded, 2 failed" — at-a-glance health without drilling in | MEDIUM | Aggregate tool call outcomes, extend node data model |
| **Keyboard navigation for groups** | Arrow keys to navigate, Enter to expand, Space to select — power user efficiency | MEDIUM | Event handlers + focus management |
| **Quick filter from group** | Right-click "Bash (12)" → "Show only Bash calls" — contextual filtering | LOW | Wire existing filter system to context menu |
| **Group export/copy** | Copy all commands in "Bash (12)" to clipboard — workflow utility | LOW | Clipboard API with formatted text |

### Anti-Features (Commonly Requested, Often Problematic)

Features that seem good but create problems.

| Feature | Why Requested | Why Problematic | Alternative |
|---------|---------------|-----------------|-------------|
| **Auto-expand all on load** | "I want to see everything" | Kills performance with large sessions, defeats purpose of grouping | Expand on demand + "Expand All" button |
| **Inline expansion of group items** | "Why add a side panel?" | Breaks tree/graph layout, causes reflow chaos, hard to scan vertically | Side panel preserves layout + shows more detail (tabs for command/output/timing) |
| **Group by parent message instead of type** | "Logically related to same message" | Creates many tiny groups (most messages spawn 1-3 tools), doesn't reduce noise | Group by type globally, use parent filter if needed |
| **Nested grouping** | "Group by type, then by parent" | Over-complicates UI, harder to find items (now 2+ levels deep) | Single-level grouping by type, filter to narrow |
| **Real-time group animations** | "Smooth transitions look pro" | Distracting when groups constantly update (new tool calls streaming in) | Static groups, update counts without animation |
| **Session naming with custom labels** | "Let me name sessions" | Requires storage, editing UI, conflicts with auto-naming | Derive from `cwd`, users already name their project directories |

## Feature Dependencies

```
[Human-readable session names]
    ↑ required for ↑
[Smart disambiguation (#1, #2)]


[Collapsible groups with counts]
    ↑ required for ↑
[Detail panel for drill-down]
    ↑ enhances ↑
[Group preview on hover]
    ↑ enhances ↑
[Inline group summaries]


[Persistent expand/collapse state]
    ↑ enhances ↑
[Expand/Collapse All controls]


[Type-based filtering]
    ↑ independent ↑
[Quick filter from group]
```

### Dependency Notes

- **Smart disambiguation requires human-readable names:** Can't disambiguate UUIDs meaningfully — need recognizable base name first
- **Detail panel requires collapsible groups:** No groups = no grouped items to drill into
- **Hover preview and summaries enhance groups:** Make groups more useful without drilling in
- **Expand/Collapse All enhances persistent state:** More valuable when combined (users can collapse all, then expand specific groups without losing context)
- **Quick filter enhances type-based filtering:** Contextual shortcut for existing filtering capability

## MVP Definition

### Launch With (v1 — Current Milestone)

Minimum viable product — what's needed to validate the concept.

- [x] **Human-readable session names from working directory** — Essential for session identification (users can't recognize UUIDs)
- [x] **Collapsible groups with counts by tool type** — Core feature reducing visual noise (e.g. "Bash (12)")
- [x] **Detail panel for inspecting individual tool calls** — Can't use grouped data without drill-down
- [x] **Persistent expand/collapse state** — Prevents frustration when navigating between groups
- [x] **Visual grouping indicators (icons, badges)** — Distinguishes grouped nodes from individual nodes

### Add After Validation (v1.x)

Features to add once core is working.

- [ ] **Smart session name disambiguation (#1, #2)** — Important when users have multiple sessions in same directory (common workflow)
- [ ] **Inline group summaries (success/failure counts)** — At-a-glance health indicator without drilling in
- [ ] **Group preview on hover** — Faster scanning, reduces clicks
- [ ] **Quick filter from group (context menu)** — Power user workflow enhancement

### Future Consideration (v2+)

Features to defer until product-market fit is established.

- [ ] **Temporal grouping indicators (delta since last check)** — Complex to implement, unclear value without user feedback
- [ ] **Keyboard navigation for groups** — Power user feature, not essential for initial validation
- [ ] **Group export/copy** — Utility feature, wait for user requests
- [ ] **Type-based filtering UI enhancement** — Works today, polish later

## Feature Prioritization Matrix

| Feature | User Value | Implementation Cost | Priority |
|---------|------------|---------------------|----------|
| Human-readable session names | HIGH | LOW | P1 |
| Collapsible groups with counts | HIGH | MEDIUM | P1 |
| Detail panel for drill-down | HIGH | MEDIUM | P1 |
| Persistent expand/collapse state | HIGH | MEDIUM | P1 |
| Visual grouping indicators | MEDIUM | LOW | P1 |
| Smart name disambiguation | MEDIUM | MEDIUM | P2 |
| Inline group summaries | MEDIUM | MEDIUM | P2 |
| Group preview on hover | LOW | LOW | P2 |
| Quick filter from group | LOW | LOW | P2 |
| Temporal grouping indicators | LOW | HIGH | P3 |
| Keyboard navigation | LOW | MEDIUM | P3 |
| Group export/copy | LOW | LOW | P3 |

**Priority key:**
- P1: Must have for launch (current milestone)
- P2: Should have, add when possible (v1.x)
- P3: Nice to have, future consideration (v2+)

## Competitor Feature Analysis

| Feature | Chrome DevTools | Grafana | Sentry | GitHub Actions | Our Approach |
|---------|-----------------|---------|--------|----------------|--------------|
| **Group/collapse UI** | Resource type tabs + inline frames | Collapsible rows | Issue grouping by fingerprint | Log groups with `::group::` | Group tool calls by type with expand/collapse |
| **Drill-down pattern** | Tabbed detail panel (Headers, Timing, etc.) | Links to dashboards + variables | Issue Details page | Click to expand, link to line | Side panel with tool call details (command, output, timing) |
| **Session identification** | N/A (page-based) | Dashboard names + folders | Issue ID + title | Workflow run name + ID | Working directory name with #N disambiguation |
| **Aggregation display** | Resource type buttons show counts | Panel titles, no counts | Issue title shows event count | Step name with duration | "Tool Type (count)" inline in tree/graph |
| **State persistence** | Preserved across page reload | URL parameters | Per-issue | Per-run (server-side) | Client-side Zustand store |
| **Filtering** | Multi-property AND filter | Template variables | Search + status filters | Search + log levels | Type filter + text search (existing) |

## Design Patterns from Research

### Master-Detail Pattern (REQUIRED)
**Source:** Chrome DevTools, Primer TreeView guidelines

The master-detail pattern is fundamental: tree view in main area, detail panel for selected item. This is table stakes in all monitoring tools.

**Implementation:** TreeView/Graph on left, side panel on right appears when grouped item is clicked.

### Progressive Disclosure (REQUIRED)
**Source:** Grafana best practices, observability dashboard patterns

Lead with high-level aggregates, drill down to specifics. "SLO → service → endpoint → pod" hierarchy.

**Implementation:** Collapsed groups by default, expand to see individual tool calls, click to see full details.

### Expandable Groups with Counts (REQUIRED)
**Source:** GitHub Actions logs, Chrome DevTools, Sentry issue grouping

Show aggregated count inline with collapsible expansion. Universal pattern in monitoring/logging tools.

**Implementation:** "Bash (12)" with expand/collapse chevron, count updates in real-time.

### Persistent State Management (REQUIRED)
**Source:** PatternFly, Carbon Design System tree view guidelines

Frustrating UX anti-pattern: losing expanded state when parent collapses. Must preserve nested expansion.

**Implementation:** Track expanded node IDs in Zustand, restore on re-render.

### Context-Aware Filtering (DIFFERENTIATOR)
**Source:** Chrome DevTools resource type buttons, Grafana template variables

Quick filters from current view context without disrupting workflow.

**Implementation:** Right-click group → "Show only [type]" applies filter immediately.

## Complexity Assessment

### Low Complexity (1-2 days)
- Human-readable session names (extract basename from `cwd`)
- Visual grouping indicators (CSS + icons)
- Group preview on hover (tooltip component)
- Quick filter from group (wire to existing filter)
- Group export/copy (clipboard API)

### Medium Complexity (3-5 days)
- Collapsible groups with counts (aggregation logic + UI state)
- Detail panel component (side panel with lazy loading)
- Persistent expand/collapse state (Zustand integration)
- Smart name disambiguation (collision detection + counter)
- Inline group summaries (outcome aggregation)
- Keyboard navigation (event handlers + focus management)

### High Complexity (1-2 weeks)
- Temporal grouping indicators (delta tracking across updates)

## Sources

**Observability Dashboards:**
- [Grafana dashboard best practices](https://grafana.com/docs/grafana/latest/dashboards/build-dashboards/best-practices/)
- [Observability dashboards design patterns](https://openobserve.ai/blog/observability-dashboards/)
- [Crafting actionable observability dashboards](https://chronosphere.io/learn/observability-dashboard-experience/)
- [Dashboard design patterns](https://dashboarddesignpatterns.github.io/patterns.html)
- [Table stakes of observability](https://observability-360.com/article/ViewArticle?id=new-table-stakes-of-observability)

**Tree View UX Patterns:**
- [PatternFly Tree View guidelines](https://www.patternfly.org/components/tree-view/design-guidelines/)
- [Carbon Design System Tree View](https://carbondesignsystem.com/components/tree-view/usage/)
- [Primer TreeView guidelines](https://primer.style/product/components/tree-view/guidelines/)
- [Interaction design for trees](https://medium.com/@hagan.rivers/interaction-design-for-trees-5e915b408ed2)

**Monitoring Tool Patterns:**
- [Chrome DevTools Network reference](https://developer.chrome.com/docs/devtools/network/reference)
- [Sentry issue grouping](https://docs.sentry.io/concepts/data-management/event-grouping/)
- [GitHub Actions workflow commands](https://docs.github.com/en/actions/reference/workflows-and-actions/workflow-commands)
- [Jaeger distributed tracing](https://www.jaegertracing.io/)
- [Datadog APM traces](https://docs.datadoghq.com/tracing/)

**Drill-Down Patterns:**
- [Chrome DevTools inspect network activity](https://developer.chrome.com/docs/devtools/network)
- [Sentry 3 ways to group similar issues](https://sentry.io/resources/grouping-similar-issues/)
- [GitHub Actions using workflow run logs](https://docs.github.com/actions/managing-workflow-runs/using-workflow-run-logs)

---
*Feature research for: Claude session monitoring dashboard*
*Researched: 2026-02-06*
