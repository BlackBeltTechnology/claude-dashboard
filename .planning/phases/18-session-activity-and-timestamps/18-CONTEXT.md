# Phase 18: Session Activity and Timestamps - Context

**Gathered:** 2026-02-12
**Status:** Ready for planning

<domain>
## Phase Boundary

Rework session state detection to be work-based (not timer heuristics), add relative timestamps to session nodes, and sort sessions by state priority then last activity time in the directory overview.

</domain>

<decisions>
## Implementation Decisions

### Active Detection Signals
- Only signal for "actively working" is debug log mtime — if `~/.claude/debug/{sessionId}.txt` was modified within the last 10 seconds, session is active
- Active threshold: 10 seconds (relaxed from current 5s for smoother UX, less flickering during brief pauses)
- No lock files or PID files exist — pure file observation
- Remove the current default fallback to 'active' for idle sessions — idle sessions should NOT default to active

### Session States (4 states)
- **Active (green):** Debug log modified <10s ago — session is actively processing
- **Waiting for input (amber):** Session needs user input. Detected via `idle_prompt` notification in debug log OR last assistant message has no `tool_use` blocks + `turn_duration` system entry in JSONL
- **Idle (gray):** Not active, not waiting, not closed — session is paused/unknown. This is the new default for sessions that don't match active/waiting/closed criteria
- **Closed (blue):** SessionEnd marker in debug log OR summary entry in JSONL — user explicitly exited

### Session Ordering
- Sort by state priority first: Active → Waiting → Idle → Closed
- Within each state group, sort by last activity time (most recent first)
- Applied in the directory overview graph layout

### Timestamp Display
- Show relative time on session nodes (e.g., "2m ago", "1h ago")
- Live ticking: timestamps update every ~30s in the UI even without new data from server
- No absolute time shown on the node (could add tooltip later)

### Claude's Discretion
- Exact timestamp placement on the session node (near status dot, below last command, etc.)
- Formatting of relative time strings (abbreviations, precision)
- Timer interval for live ticking (suggestion: 30s)
- How to handle very old timestamps (e.g., "3d ago" vs "3 days ago")

</decisions>

<specifics>
## Specific Ideas

- The `idle_prompt` notification marker in debug logs is a reliable signal for "waiting for user input" — use it alongside the JSONL tool_use check
- Current `isAssistantWaitingForUser()` function already checks for no tool_use blocks — extend it with debug log idle_prompt detection
- The `lastActivity` field already exists on Session interface — use it for sorting and timestamp display

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 18-session-activity-and-timestamps*
*Context gathered: 2026-02-12*
