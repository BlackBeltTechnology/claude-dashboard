/**
 * File Watcher Module
 * Uses chokidar to watch Claude session directories with debouncing
 */

import chokidar, { type FSWatcher } from 'chokidar';
import { EventEmitter } from 'events';
import { basename, dirname, join } from 'path';
import type { Session, SessionState } from 'shared';
import {
  discoverTodaysSessions,
  parseSessionFile,
  discoverSubagents,
  findSessionFilePath,
  loadSessionIndex,
  determineSessionState,
  getDebugLogMtime,
  isSessionClosed,
  hasIdlePromptMarker,
  buildNodes,
} from './session-discovery.js';
import { parseJSONL, extractMetadata, type ParsedEntry } from './jsonl-parser.js';
import { readFile } from 'fs/promises';

// Debounce delay in milliseconds
const DEBOUNCE_MS = 100;

// State polling interval in milliseconds
const STATE_POLL_INTERVAL_MS = 2000;

// Keep recently edited sessions in active state briefly to prevent UI flicker
const STICKY_ACTIVE_MS = 60000;

// Events emitted by SessionManager
export interface SessionManagerEvents {
  'session-update': (sessionId: string, session: Session) => void;
  'subagent-update': (parentSessionId: string, agentId: string, subagent: Session) => void;
  'state-change': (sessionId: string, agentId: string | undefined, previousState: SessionState, newState: SessionState, cwd?: string, lastUserPrompt?: string) => void;
  'error': (error: Error) => void;
}

/**
 * Debounce helper that coalesces rapid file changes
 */
class Debouncer {
  private timers: Map<string, NodeJS.Timeout> = new Map();
  private callbacks: Map<string, () => void> = new Map();

  debounce(key: string, callback: () => void, delayMs: number): void {
    // Clear existing timer for this key
    const existingTimer = this.timers.get(key);
    if (existingTimer) {
      clearTimeout(existingTimer);
    }

    // Store the callback
    this.callbacks.set(key, callback);

    // Set new timer
    const timer = setTimeout(() => {
      const cb = this.callbacks.get(key);
      this.timers.delete(key);
      this.callbacks.delete(key);
      if (cb) {
        cb();
      }
    }, delayMs);

    this.timers.set(key, timer);
  }

  clear(): void {
    for (const timer of this.timers.values()) {
      clearTimeout(timer);
    }
    this.timers.clear();
    this.callbacks.clear();
  }
}

/**
 * SessionManager - Central manager for session discovery and watching
 */
export class SessionManager extends EventEmitter {
  private claudeDir: string;
  private watcher: FSWatcher | null = null;
  private sessions: Map<string, Session> = new Map();
  private debouncer: Debouncer = new Debouncer();
  private isInitialized: boolean = false;
  /**
   * Track previous states for sessions and subagents.
   * Key format: "{sessionId}" for sessions, "{sessionId}:{agentId}" for subagents.
   */
  private previousStates: Map<string, SessionState> = new Map();
  /**
   * Map session IDs to their JSONL file paths for polling.
   */
  private sessionJsonlPaths: Map<string, string> = new Map();
  /**
   * Cache of session IDs confirmed as closed (SessionEnd in debug log).
   * Once closed, a session stays closed — no need to re-read the debug log.
   */
  private closedSessions: Set<string> = new Set();
  /**
   * Cache of session IDs with idle_prompt marker in debug log.
   * Once idle_prompt is detected, it stays cached until the session closes.
   */
  private idlePromptSessions: Set<string> = new Set();
  /**
   * Sessions recently changed by JSONL edits should stay active briefly
   * to avoid rapid active->idle/waiting transitions causing UI glitches.
   */
  private stickyActiveUntil: Map<string, number> = new Map();
  private statePollingInterval: ReturnType<typeof setInterval> | null = null;

  constructor(claudeDir: string) {
    super();
    this.claudeDir = claudeDir;
  }

  /**
   * Start watching for session changes
   */
  async start(): Promise<void> {
    if (this.isInitialized) {
      return;
    }

    // Initial discovery
    console.log('[SessionManager] Discovering today\'s sessions...');
    this.sessions = await discoverTodaysSessions(this.claudeDir);
    console.log(`[SessionManager] Found ${this.sessions.size} sessions from today`);

    // Set up file watcher
    const watchPaths = [
      join(this.claudeDir, 'debug'),
      join(this.claudeDir, 'projects'),
      join(this.claudeDir, 'todos'),
    ];

    console.log('[SessionManager] Setting up file watchers...');
    this.watcher = chokidar.watch(watchPaths, {
      persistent: true,
      ignoreInitial: true,
      depth: 4, // Watch into subagents directories
      awaitWriteFinish: {
        stabilityThreshold: 50,
        pollInterval: 10,
      },
    });

    // Handle file changes
    this.watcher.on('change', (path) => this.handleFileChange(path, 'change'));
    this.watcher.on('add', (path) => this.handleFileChange(path, 'add'));
    this.watcher.on('error', (error) => this.emit('error', error));

    // Initialize previous states from discovered sessions
    for (const [sessionId, session] of this.sessions) {
      this.previousStates.set(sessionId, session.state);
      for (const subagent of session.subagents) {
        this.previousStates.set(`${sessionId}:${subagent.id}`, subagent.state);
      }
    }

    // Start periodic state polling
    this.statePollingInterval = setInterval(() => {
      this.pollStates().catch((error) => {
        this.emit('error', error instanceof Error ? error : new Error(String(error)));
      });
    }, STATE_POLL_INTERVAL_MS);

    this.isInitialized = true;
    console.log('[SessionManager] File watchers and state polling started');
  }

  /**
   * Stop watching and clean up
   */
  async stop(): Promise<void> {
    if (this.statePollingInterval) {
      clearInterval(this.statePollingInterval);
      this.statePollingInterval = null;
    }
    if (this.watcher) {
      await this.watcher.close();
      this.watcher = null;
    }
    this.debouncer.clear();
    this.previousStates.clear();
    this.sessionJsonlPaths.clear();
    this.closedSessions.clear();
    this.idlePromptSessions.clear();
    this.stickyActiveUntil.clear();
    this.isInitialized = false;
    console.log('[SessionManager] Stopped');
  }

  /**
   * Handle file change events with debouncing
   */
  private handleFileChange(path: string, eventType: 'change' | 'add'): void {
    // Only process JSONL files
    if (!path.endsWith('.jsonl')) {
      return;
    }

    // Debounce rapid changes to the same file
    this.debouncer.debounce(path, () => {
      this.processFileChange(path, eventType).catch((error) => {
        this.emit('error', error instanceof Error ? error : new Error(String(error)));
      });
    }, DEBOUNCE_MS);
  }

  /**
   * Process a file change after debouncing
   */
  private async processFileChange(path: string, eventType: 'change' | 'add'): Promise<void> {
    const filename = basename(path, '.jsonl');
    const parentDir = dirname(path);

    // Check if this is a subagent file
    if (basename(parentDir) === 'subagents' && filename.startsWith('agent-')) {
      await this.processSubagentChange(path);
      return;
    }

    // Regular session file
    await this.processSessionChange(path, eventType);
  }

  /**
   * Process a session file change
   */
  private async processSessionChange(path: string, eventType: 'change' | 'add'): Promise<void> {
    const filename = basename(path, '.jsonl');
    const projectDir = dirname(path);

    // Load session index for metadata
    const sessionIndex = await loadSessionIndex(projectDir);
    const indexEntry = sessionIndex?.entries.find((e) => e.sessionId === filename);

    // Get previous state from dedicated map
    const previousState = this.previousStates.get(filename);

    // Parse updated session
    // parseSessionFile now checks debug log internally when claudeDir is provided
    const session = await parseSessionFile(path, indexEntry, this.claudeDir);
    if (!session) {
      return;
    }

    // Discover subagents
    await discoverSubagents(session, path);

    // Track JSONL path for polling
    this.sessionJsonlPaths.set(filename, path);

    // Mark this session as recently edited to stabilize active status in UI
    this.stickyActiveUntil.set(filename, Date.now() + STICKY_ACTIVE_MS);

    // Update cache
    this.sessions.set(filename, session);

    // Update previous state and emit state-change if changed
    this.updateStateAndEmit(filename, undefined, session.state, session);

    // Update subagent previous states
    for (const subagent of session.subagents) {
      this.updateStateAndEmit(filename, subagent.id, subagent.state, session);
    }

    // Emit session update
    this.emit('session-update', filename, session);

    console.log(`[SessionManager] Session ${eventType}: ${filename} (state: ${session.state})`);
  }

  /**
   * Process a subagent file change
   */
  private async processSubagentChange(path: string): Promise<void> {
    const filename = basename(path, '.jsonl');
    const agentId = filename.slice(6); // Remove 'agent-' prefix

    // Find parent session from directory structure
    // Path: .../projects/{projectHash}/{sessionId}/subagents/agent-{agentId}.jsonl
    const subagentsDir = dirname(path);
    const sessionDir = dirname(subagentsDir);
    const sessionId = basename(sessionDir);

    // Get parent session
    let parentSession = this.sessions.get(sessionId);
    if (!parentSession) {
      // Try to find and load the parent session
      const sessionPath = await findSessionFilePath(this.claudeDir, sessionId);
      if (sessionPath) {
        const session = await parseSessionFile(sessionPath, undefined, this.claudeDir);
        if (session) {
          this.sessions.set(sessionId, session);
          parentSession = session;
        }
      }
    }

    if (!parentSession) {
      console.log(`[SessionManager] Subagent change for unknown session: ${sessionId}`);
      return;
    }

    // Parse subagent file
    try {
      const content = await readFile(path, 'utf-8');
      const entries = parseJSONL(content);

      if (entries.length === 0) {
        return;
      }

      const metadata = extractMetadata(entries, agentId);
      const state = determineSessionState(entries, null, metadata.lastTimestamp);

      // Find existing subagent
      const existingIndex = parentSession.subagents.findIndex((s) => s.id === agentId);

      // Build subagent session
      const subagent: Session = {
        id: agentId,
        projectHash: parentSession.projectHash,
        state,
        summary: metadata.summary,
        gitBranch: parentSession.gitBranch,
        createdAt: metadata.firstTimestamp,
        lastActivity: metadata.lastTimestamp,
        tokenUsage: metadata.tokenUsage,
        nodes: buildNodes(entries),
        subagents: [],
      };

      // Update parent session's subagents
      if (existingIndex >= 0) {
        parentSession.subagents[existingIndex] = subagent;
      } else {
        parentSession.subagents.push(subagent);
        parentSession.subagents.sort((a, b) => a.createdAt - b.createdAt);
      }

      // Update parent's last activity
      if (metadata.lastTimestamp > parentSession.lastActivity) {
        parentSession.lastActivity = metadata.lastTimestamp;
      }

      // Subagent activity should also keep the parent session visibly active for a short grace period
      this.stickyActiveUntil.set(sessionId, Date.now() + STICKY_ACTIVE_MS);

      // Update state tracking and emit state-change if changed
      this.updateStateAndEmit(sessionId, agentId, state, parentSession);

      // Emit subagent update
      this.emit('subagent-update', sessionId, agentId, subagent);

      console.log(`[SessionManager] Subagent update: ${agentId} in session ${sessionId} (state: ${state})`);
    } catch (error) {
      console.error(`[SessionManager] Error processing subagent ${agentId}:`, error);
    }
  }

  /**
   * Update previous state map and emit 'state-change' event if state has changed.
   * @param sessionId - The session ID
   * @param agentId - The subagent ID, or undefined for the main session
   * @param newState - The newly determined state
   * @param session - The session object for extracting cwd and lastUserPrompt
   */
  private updateStateAndEmit(sessionId: string, agentId: string | undefined, newState: SessionState, session?: Session): void {
    const stateKey = agentId ? `${sessionId}:${agentId}` : sessionId;
    const previousState = this.previousStates.get(stateKey);

    this.previousStates.set(stateKey, newState);

    if (previousState !== undefined && previousState !== newState) {
      // Extract cwd and lastUserPrompt from session when available
      const cwd = session?.cwd;
      const lastUserPrompt = session?.lastUserPrompt;
      this.emit('state-change', sessionId, agentId, previousState, newState, cwd, lastUserPrompt);
    }
  }

  /**
   * Periodically poll debug log mtimes and recompute session/subagent states.
   * This catches state transitions that happen without JSONL file changes
   * (e.g., a session going from active to waiting due to inactivity).
   */
  private async pollStates(): Promise<void> {
    const now = Date.now();

    for (const [sessionId, session] of this.sessions) {
      try {
        // Get the debug log mtime for this session
        const debugMtime = await getDebugLogMtime(this.claudeDir, sessionId);

        // Re-read the JSONL file for the latest entries
        const jsonlPath = this.sessionJsonlPaths.get(sessionId);
        let entries: ParsedEntry[] = [];
        let lastTimestamp = session.lastActivity;

        if (jsonlPath) {
          try {
            const content = await readFile(jsonlPath, 'utf-8');
            entries = parseJSONL(content);
            if (entries.length > 0) {
              const metadata = extractMetadata(entries, sessionId);
              lastTimestamp = metadata.lastTimestamp;
            }
          } catch {
            // File may be temporarily unavailable during writes
          }
        }

        // Check if session was closed (use cache to avoid re-reading debug log)
        let closed = this.closedSessions.has(sessionId);
        if (!closed) {
          closed = await isSessionClosed(this.claudeDir, sessionId);
          if (closed) {
            this.closedSessions.add(sessionId);
          }
        }

        // Check for idle_prompt marker (use cache to avoid re-reading debug log)
        let idlePrompt = this.idlePromptSessions.has(sessionId);
        if (!idlePrompt && !closed) {
          idlePrompt = await hasIdlePromptMarker(this.claudeDir, sessionId);
          if (idlePrompt) {
            this.idlePromptSessions.add(sessionId);
          }
        }

        // Recompute session state using debug log mtime, closed status, and idle_prompt
        let newState = determineSessionState(entries, debugMtime, lastTimestamp, closed, idlePrompt);

        // Sticky-active override for recently edited sessions.
        // Do not override completed sessions.
        const keepActiveUntil = this.stickyActiveUntil.get(sessionId) ?? 0;
        if (keepActiveUntil > now && (newState === 'idle' || newState === 'waiting')) {
          newState = 'active';
        } else if (keepActiveUntil <= now && keepActiveUntil > 0) {
          this.stickyActiveUntil.delete(sessionId);
        }

        // Update session state in cache
        if (session.state !== newState) {
          session.state = newState;
          // Emit session-update so clients get the updated state
          this.emit('session-update', sessionId, session);
        }

        // Check for state change and emit event
        this.updateStateAndEmit(sessionId, undefined, newState, session);

        // Poll subagent states independently
        for (const subagent of session.subagents) {
          // Subagents don't have their own debug logs - use JSONL timestamp
          const subagentJsonlDir = jsonlPath?.replace('.jsonl', '');
          if (subagentJsonlDir) {
            const subagentPath = join(subagentJsonlDir, 'subagents', `agent-${subagent.id}.jsonl`);
            try {
              const subContent = await readFile(subagentPath, 'utf-8');
              const subEntries = parseJSONL(subContent);
              if (subEntries.length > 0) {
                const subMeta = extractMetadata(subEntries, subagent.id);
                const subState = determineSessionState(subEntries, null, subMeta.lastTimestamp);

                if (subagent.state !== subState) {
                  subagent.state = subState;
                  this.emit('subagent-update', sessionId, subagent.id, subagent);
                }

                this.updateStateAndEmit(sessionId, subagent.id, subState, session);
              }
            } catch {
              // Subagent file may not exist or be temporarily unavailable
            }
          }
        }
      } catch {
        // Skip sessions that error during polling
      }
    }
  }

  /**
   * Get all currently tracked sessions
   */
  getSessions(): Session[] {
    return Array.from(this.sessions.values());
  }

  /**
   * Get a specific session by ID
   */
  getSession(sessionId: string): Session | undefined {
    return this.sessions.get(sessionId);
  }

  /**
   * Force refresh of all sessions
   */
  async refresh(): Promise<void> {
    console.log('[SessionManager] Refreshing all sessions...');
    this.sessions = await discoverTodaysSessions(this.claudeDir);
    console.log(`[SessionManager] Refresh complete: ${this.sessions.size} sessions`);
  }

  /**
   * Get sessions grouped by state
   */
  getSessionsByState(): Record<SessionState, Session[]> {
    const grouped: Record<SessionState, Session[]> = {
      active: [],
      waiting: [],
      idle: [],
      completed: [],
    };

    for (const session of this.sessions.values()) {
      grouped[session.state].push(session);
    }

    return grouped;
  }
}

// Re-export event types for consumers
export type { Session, SessionState };
