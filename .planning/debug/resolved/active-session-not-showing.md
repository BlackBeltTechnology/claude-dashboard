---
status: resolved
trigger: "The currently running Claude Code session in the claude-session-dashboard directory is not showing up in the dashboard's directory overview. It should appear as an active session node but is completely missing."
created: 2026-02-12T00:00:00Z
updated: 2026-02-12T00:00:00Z
---

## Current Focus

hypothesis: The session state detection logic is incorrectly marking the active session as "completed" instead of "active"
test: Check debug log mtime and isSessionClosed logic to see why it thinks session is completed
expecting: Either debug log is stale, or SessionEnd marker is incorrectly present
next_action: Check debug log mtime and look for SessionEnd marker in debug log

## Symptoms

expected: The current active Claude Code session (working in /home/botond/claude-session-dashboard) should appear as an active session node in the dashboard's directory overview graph
actual: The session is not showing up at all in the directory overview
errors: None reported
reproduction: Open the dashboard, look at the directory overview - this session is missing while it's actively running
started: User noticed it now while working on the project. The session discovery and activity detection systems were recently built/modified (phases 16-18).

## Eliminated

## Evidence

- timestamp: 2026-02-12T12:27:00Z
  checked: Current session debug log and JSONL file location
  found: Current session ID is 87b1b4da-ead2-4c0f-ab3a-28d0caf27896, located at ~/.claude/projects/-home-botond-claude-session-dashboard/87b1b4da-ead2-4c0f-ab3a-28d0caf27896.jsonl, debug log actively updating
  implication: The session file exists in the correct location, so discovery should find it

- timestamp: 2026-02-12T12:28:00Z
  checked: API endpoint http://localhost:3847/api/sessions
  found: Session IS present in API response but with state="completed" instead of "active"
  implication: The problem is not with discovery but with state detection - the session is being incorrectly marked as completed

- timestamp: 2026-02-12T12:30:00Z
  checked: Debug log content and timestamps
  found: SessionEnd marker exists at line 6269 (11:27:06), but JSONL was modified at 11:38 (after SessionEnd), debug log mtime is 12:27:06 (81 seconds ago)
  implication: Session was closed and reopened, but isSessionClosed only checks IF SessionEnd exists, not whether session was reopened after it

- timestamp: 2026-02-12T12:31:00Z
  checked: determineSessionState function in session-discovery.ts (lines 468-499)
  found: At line 482, it checks sessionClosed first and immediately returns 'completed' if true, without considering if session was reopened
  implication: The state detection logic is flawed - it doesn't handle session reopening after a SessionEnd marker

## Resolution

root_cause: The isSessionClosed function was matching ANY SessionEnd hook event, including "SessionEnd with query: clear" (from /clear commands), not just "SessionEnd with query: prompt_input_exit" (actual session closure). This caused active sessions that had used /clear to be incorrectly marked as "completed".
fix: Modified isSessionClosed and getSessionEndTimestamp to only match "SessionEnd with query: prompt_input_exit", which is the actual session exit marker. Also added logic to check if JSONL has activity after SessionEnd timestamp for handling reopened sessions.
verification:
  - Current session (9c142089-3520-423f-974e-600c78f8db86) now correctly shows state="active" in API response
  - Tested multiple times after server restart - consistently works
  - Sessions that used /clear command are no longer incorrectly marked as "completed"
  - Sessions that were genuinely closed (with prompt_input_exit) still correctly show as "completed"
files_changed:
  - server/src/session-discovery.ts
