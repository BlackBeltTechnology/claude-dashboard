# Phase 3: Session Identification - Context

**Gathered:** 2026-02-06
**Status:** Ready for planning

<domain>
## Phase Boundary

Replace UUID-based session labels with human-readable names derived from working directory paths. Applies to the session sidebar list and session nodes in graph/tree views. Disambiguate when multiple sessions share the same directory name. No new navigation capabilities or session management features.

</domain>

<decisions>
## Implementation Decisions

### Sidebar presentation
- Sessions ordered by most recent activity first (last active at top)
- Selected session uses highlight only (background color change) — no activity dots or extra indicators
- Secondary info below session name: timestamp only (e.g., "2 min ago" or "Jan 15")
- UUID hidden completely — users never see it, it's internal only

### Graph/tree labeling
- Keep current node styling — just swap UUID text for directory name, no new icons or colors
- Parent sessions show directory name, subagent/child sessions show their agent type (e.g., "Explore", "Bash")
- This creates a clear hierarchy: parent = what project, child = what kind of agent

### Claude's Discretion
- Full name vs truncated with ellipsis on graph/tree nodes — based on available space
- Whether to show full working directory path in tooltip on hover for graph nodes
- Display format details (how directory name is extracted and presented)
- Disambiguation style (#1, #2 suffix or other approach when names collide)

</decisions>

<specifics>
## Specific Ideas

No specific requirements — open to standard approaches

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 03-session-identification*
*Context gathered: 2026-02-06*
