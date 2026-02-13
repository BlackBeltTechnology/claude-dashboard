# Codebase Concerns

**Analysis Date:** 2026-02-06

## Test Coverage Gaps

**Lack of automated test suite:**
- What's not tested: No unit tests, integration tests, or end-to-end tests found
- Files: `server/src/**/*.ts`, `client/src/**/*.tsx`, `shared/src/**/*.ts`
- Risk: Core functionality like session discovery, JSONL parsing, state detection, and WebSocket message handling are untested. Regressions in file watching, state transitions, or prompt injection could go undetected
- Priority: High
- Recommendation: Add vitest/jest test suite for critical paths (session discovery, state detection, JSONL parsing, WebSocket message handling)

## Type Safety Issues

**Unsafe type assertions in browser hook:**
- Issue: Using `any` type coercion to work around recursive type constraints
- Files: `client/src/hooks/useFaviconBadge.ts` (lines 131, 137)
- Impact: Type safety is lost for recursive session/subagent counting. Could allow incorrect prop types to pass without detection
- Fix approach: Define proper recursive type for session hierarchy instead of using `any` casts

## Shell Command Injection Risk

**Tmux target parameter validation insufficient:**
- Risk: Shell commands constructed from tmux target strings without comprehensive validation
- Files: `server/src/tmux.ts` (lines 18, 63, 107, 190)
- Current mitigation: Uses `escapeShellArg()` for wrapping, but validation only checks if target exists via `tmux has-session`
- Impact: Malformed tmux targets could potentially bypass escaping if they contain unexpected characters
- Recommendation: Add strict regex validation for tmux target format (session:window.pane) before using in any command

**Grep command execution in debug log parsing:**
- Risk: Using `grep -r` with user-supplied session ID in shell command
- Files: `server/src/tmux.ts` (lines 106-107)
- Current mitigation: `escapeShellArg()` wrapping on sessionId
- Issue: Recursive grep on entire projects directory with no limit could be slow or hang on large codebases
- Recommendation: Add timeout to execAsync call and implement filesystem-based search instead of grep

## Error Handling Blind Spots

**Silent failures in file watching:**
- Issue: Errors in pollStates() and processFileChange() caught with empty catch blocks
- Files: `server/src/watcher.ts` (lines 386, 424, 429)
- Impact: State polling failures, missing subagent updates, or unreadable files silently fail - clients won't know state is stale
- Fix approach: Log all errors with context (file path, operation type), track failed sessions for retry

**Unhandled parse failures in JSONL:**
- Issue: Malformed JSON lines are silently skipped, no tracking of parse failures
- Files: `server/src/jsonl-parser.ts` (lines 75-79), `server/src/session-discovery.ts` (parseJSONL in api.ts)
- Impact: Silent data loss - if session file gets corrupted, entries are dropped without warning. Clients see incomplete session history
- Recommendation: Track parse failure count per session, emit warning events if >10% of lines fail parsing

**Missing error propagation in watcher initialization:**
- Issue: Some critical setup errors may not propagate properly during SessionManager.start()
- Files: `server/src/watcher.ts` (lines 103-152)
- Impact: If initial discovery fails, manager may report success while actually being uninitialized
- Fix approach: Add explicit initialization state checking and better error context

## Resource Management Issues

**No cleanup for abandoned debounced callbacks:**
- Issue: Debouncer stores callbacks in Map, cleared only on stop(). If SessionManager.stop() isn't called, timers may leak
- Files: `server/src/watcher.ts` (lines 39-73)
- Impact: Memory leak in long-running processes if server crashes or is forcibly killed
- Fix approach: Set maximum callback lifetime or implement periodic cleanup

**State polling without circuit breaker:**
- Issue: State polling continues for all sessions regardless of repeated failures
- Files: `server/src/watcher.ts` (lines 145-149, 367-432)
- Impact: High CPU/disk usage if JSONL files are repeatedly unreadable or inaccessible
- Recommendation: Skip polling for sessions that fail >3 times consecutively, re-enable after recovery

**No memory bounds on session storage:**
- Issue: SessionManager.sessions Map grows unbounded, all subagents stored in memory
- Files: `server/src/watcher.ts` (lines 81, 438-440)
- Impact: On systems with many projects/sessions, memory usage could grow without limit. Old sessions never evicted
- Recommendation: Implement LRU cache with configurable max sessions or automatic eviction of sessions older than N hours

## Performance Bottlenecks

**Inefficient filesystem discovery on startup:**
- Issue: `discoverTodaysSessions()` scans all project directories, reads all JSONL files, parses them fully
- Files: `server/src/session-discovery.ts` (lines 105-180)
- Problem: With >100 projects or >1000 sessions/day, startup time becomes noticeable. No parallelization
- Impact: Dashboard takes >5-10 seconds to show initial data on busy systems
- Improvement path: Parallelize project/session discovery with Promise.all(), read file stats before full parse, implement session index caching

**Naive glob search for tmux targets:**
- Issue: `grep -r "CLAUDE_TMUX_TARGET"` across entire projects directory on every prompt inject
- Files: `server/src/tmux.ts` (lines 106-114)
- Impact: Slow prompt injection (~1-5s), blocking on busy systems
- Improvement path: Cache tmux targets per session in memory, use session-env files as primary source

**Graph layout calculation without bounds:**
- Issue: Dagre layout runs on full session node graph with no depth limit
- Files: `client/src/utils/graphLayout.ts` (lines 49-140)
- Impact: With deeply nested subagents, layout calculation becomes slow. No visualization culling
- Recommendation: Limit graph depth to 5 levels, implement virtual scrolling or level-based expansion

## Security Considerations

**WebSocket lacks message size limits:**
- Risk: No check on incoming WebSocket message size
- Files: `server/src/websocket.ts` (lines 130-145)
- Current mitigation: Express body parser has default limits, but raw WS messages are not size-checked
- Impact: Malicious client could send enormous messages, causing memory bloat or server hang
- Recommendation: Add `maxPayload` option to WebSocketServer and validate message size in handleMessage()

**CORS configured for single origin only (hardcoded):**
- Risk: CORS origin is hardcoded to `http://localhost:5173`
- Files: `server/src/index.ts` (line 13)
- Impact: Breaks in non-standard setups (different port, HTTPS, remote development). Users might disable CORS security
- Recommendation: Make CORS origin configurable via environment variable with sensible default

**No rate limiting on API endpoints:**
- Risk: No rate limiting on prompt injection or session queries
- Files: `server/src/api.ts` (lines 331-395)
- Current mitigation: localhost-only WebSocket access, but REST API has no restriction
- Impact: Could be abused to spam prompts or cause prompt injection DoS
- Recommendation: Add rate limiting middleware per session or IP

**LocalStorage not protected against XSS:**
- Risk: View mode preference stored in localStorage without content security policy
- Files: `client/src/store/sessionStore.ts` (lines 16-24), `client/src/hooks/useFaviconBadge.ts` (lines 117-127)
- Impact: If XSS is possible, attacker could modify stored preferences or favicon data
- Recommendation: Validate localStorage values strictly (enum check for view mode)

## Fragile Areas

**Session state detection heuristics:**
- Files: `server/src/session-discovery.ts` (lines 219-245)
- Why fragile: State detection relies on debug log mtime and JSONL entry types. False positives likely (e.g., active->idle transition takes 60s)
- Edge cases: Concurrent writes, clock skew, very fast interactions
- Safe modification: Add extensive tests for all state transitions, add logging for state changes, consider polling interval tuning
- Test coverage: None - no unit tests for determineSessionState()

**Subagent discovery from file structure:**
- Files: `server/src/watcher.ts` (lines 263-343)
- Why fragile: Assumes `sessionId/subagents/agent-{agentId}.jsonl` naming convention. If Claude changes layout, breaks silently
- Risk: Renamed or relocated subagent files are orphaned
- Safe modification: Add validation that subagent JSONL files exist before updating session, add logging
- Test coverage: None

**JSONL parsing with lenient error handling:**
- Files: `server/src/jsonl-parser.ts` (lines 75-130)
- Why fragile: Silently skips malformed lines, no corruption detection. If file becomes partially corrupted, loss is silent
- Risk: Session history becomes incomplete without user knowing
- Safe modification: Add parse error counter and emit warning events if >threshold, add file integrity checks
- Test coverage: None

## Missing Critical Features

**No session pruning/archival:**
- Problem: Sessions accumulate indefinitely in memory
- Blocks: Can't efficiently manage many years of session data, memory usage unbounded
- Workaround: Manual process.exit() to restart server
- Recommendation: Add session TTL (e.g., keep only last 7 days), implement archival to disk

**No persistence for session cache:**
- Problem: On server restart, all sessions must be rediscovered from scratch
- Impact: Startup time proportional to number of sessions
- Recommendation: Implement session index file or SQLite cache for quick startup

**No offline mode:**
- Problem: WebSocket disconnect shows "Disconnected" but clients can't view cached sessions
- Impact: Dashboard becomes unusable if server is down
- Recommendation: Implement service worker to cache snapshots, serve stale data when offline

## Dependencies at Risk

**Deprecated node-notifier module:**
- Risk: `node-notifier` is not actively maintained, may have security issues
- Files: `server/src/notifications.ts` (line 14)
- Impact: Desktop notifications may fail on new Linux/macOS versions
- Migration plan: Consider using native notification APIs or dbus-based alternatives

**Chokidar file watching:**
- Risk: Chokidar has open issues with rapid file changes on some systems (EMFILE)
- Files: `server/src/watcher.ts` (lines 121-129)
- Current mitigation: `awaitWriteFinish` with stabilityThreshold
- Impact: May miss rapid session updates
- Mitigation: Consider adding fallback polling if file watcher fails

**WebSocket library without active maintenance:**
- Risk: `ws` 8.16.0 is relatively stable but no guarantee of security updates
- Files: `server/src/websocket.ts` (line 1)
- Recommendation: Monitor security advisories, be prepared to upgrade

## Scaling Limits

**In-memory session storage:**
- Current capacity: Tested with ~10 sessions comfortably. Untested with >100
- Limit: Memory limit ~1GB typical Node.js process. Each session ~50KB with 1000 nodes. Allows ~20,000 sessions
- Scaling path: Implement session pagination/streaming, move old sessions to disk cache, implement LRU eviction

**File watcher depth limitation:**
- Current capacity: `depth: 4` allows 4 levels of nesting
- Limit: Chokidar may slow with >1000 files watched
- Scaling path: Implement selective watching (only watch modified projects), add file count limits

**JSONL file parsing:**
- Current capacity: Files ~10MB parse in <1s
- Limit: Files >100MB will cause UI blocking
- Scaling path: Implement streaming JSONL parser, only load last N entries instead of full file

**WebSocket broadcast overhead:**
- Current capacity: <100 concurrent clients broadcast in <100ms
- Limit: With >1000 clients, serialization/transmission becomes bottleneck
- Scaling path: Implement message compression, client-side subscriptions to specific sessions

## Inconsistencies & Surprises

**State detection differs between api.ts and session-discovery.ts:**
- Issue: Two separate implementations of state detection logic
- Files: `server/src/api.ts` (lines 52-83) vs `server/src/session-discovery.ts` (lines 220-245)
- Impact: Session state in REST API may differ from WebSocket stream
- Fix: Consolidate to single implementation

**WebSocket ping/pong sends error message instead of pong:**
- Issue: Ping handler responds with error type instead of proper pong
- Files: `server/src/websocket.ts` (lines 138-141)
- Impact: Client ping health checks fail
- Fix: Implement proper ping/pong frame handling

**Default notification preferences set in two places:**
- Issue: Duplicate definitions of notification preferences
- Files: `server/src/notifications.ts` (lines 31-34) and `client/src/components/Settings.tsx` (unclear)
- Risk: Sync issues between client and server defaults
- Fix: Define once in shared types, document

---

*Concerns audit: 2026-02-06*
