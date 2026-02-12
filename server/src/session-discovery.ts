/**
 * Session Discovery Module
 * Scans for JSONL session files, discovers subagents, and extracts metadata
 *
 * State detection logic:
 * - Active: debug log modified <5s ago
 * - Waiting: assistant message with no tool_use AND debug log stale >10s
 * - Idle: debug log not modified for >60s
 * - Completed: session has summary entry or no recent activity
 */

import { readFile, readdir, stat } from 'fs/promises';
import { join, basename, dirname } from 'path';
import type { Session, SessionState, AnyNode, SubagentNode, MessageNode, ToolNode, ToolUseInfo } from 'shared';
import { parseJSONL, extractMetadata, type ParsedEntry } from './jsonl-parser.js';

// State detection thresholds (in milliseconds)
const ACTIVE_THRESHOLD_MS = 5000;     // <5s = active
const WAITING_THRESHOLD_MS = 10000;   // >10s with assistant waiting = waiting
const IDLE_THRESHOLD_MS = 60000;      // >60s = idle

// Session index entry from sessions-index.json
interface SessionIndexEntry {
  sessionId: string;
  fullPath: string;
  fileMtime: number;
  firstPrompt?: string;
  summary?: string;
  messageCount?: number;
  created?: string;
  modified?: string;
  gitBranch?: string;
  projectPath?: string;
  isSidechain?: boolean;
}

interface SessionIndex {
  version: number;
  entries: SessionIndexEntry[];
}

/**
 * Get the start of today (midnight) as a timestamp
 */
function getStartOfToday(): number {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
}

/**
 * Check if a timestamp is from today
 */
function isFromToday(timestamp: number): boolean {
  return timestamp >= getStartOfToday();
}

/**
 * Discover all project directories under ~/.claude/projects/
 */
export async function discoverProjectDirs(claudeDir: string): Promise<string[]> {
  const projectsDir = join(claudeDir, 'projects');
  const projectDirs: string[] = [];

  try {
    const entries = await readdir(projectsDir, { withFileTypes: true });
    for (const entry of entries) {
      if (entry.isDirectory()) {
        projectDirs.push(join(projectsDir, entry.name));
      }
    }
  } catch {
    // Projects directory may not exist
  }

  return projectDirs;
}

/**
 * Find all JSONL files in a directory (non-recursive)
 */
export async function findJSONLFiles(dir: string): Promise<string[]> {
  const jsonlFiles: string[] = [];

  try {
    const entries = await readdir(dir, { withFileTypes: true });
    for (const entry of entries) {
      if (entry.isFile() && entry.name.endsWith('.jsonl')) {
        jsonlFiles.push(join(dir, entry.name));
      }
    }
  } catch {
    // Directory may not exist or be readable
  }

  return jsonlFiles;
}

/**
 * Find JSONL files modified today
 */
export async function findTodaysJSONLFiles(dir: string): Promise<string[]> {
  const allFiles = await findJSONLFiles(dir);
  const todayStart = getStartOfToday();
  const todayFiles: string[] = [];

  for (const file of allFiles) {
    try {
      const stats = await stat(file);
      if (stats.mtime.getTime() >= todayStart) {
        todayFiles.push(file);
      }
    } catch {
      // Skip files we can't stat
    }
  }

  return todayFiles;
}

/**
 * Load and parse sessions-index.json from a project directory
 */
export async function loadSessionIndex(projectDir: string): Promise<SessionIndex | null> {
  const indexPath = join(projectDir, 'sessions-index.json');

  try {
    const content = await readFile(indexPath, 'utf-8');
    return JSON.parse(content) as SessionIndex;
  } catch {
    // Index doesn't exist or is invalid
    return null;
  }
}

/**
 * Find subagent JSONL files for a session
 */
export async function findSubagentFiles(sessionDir: string): Promise<Map<string, string>> {
  const subagentsDir = join(sessionDir, 'subagents');
  const subagentMap = new Map<string, string>();

  try {
    const entries = await readdir(subagentsDir, { withFileTypes: true });
    for (const entry of entries) {
      if (entry.isFile() && entry.name.endsWith('.jsonl') && entry.name.startsWith('agent-')) {
        // Extract agent ID from filename: agent-a8818a4.jsonl -> a8818a4
        const agentId = entry.name.slice(6, -6); // Remove 'agent-' prefix and '.jsonl' suffix
        subagentMap.set(agentId, join(subagentsDir, entry.name));
      }
    }
  } catch {
    // Subagents directory may not exist
  }

  return subagentMap;
}

/**
 * Get debug log modification time for a session
 * @param claudeDir - Base Claude directory (~/.claude)
 * @param sessionId - Session UUID
 * @returns Modification time in ms, or null if debug log doesn't exist
 */
export async function getDebugLogMtime(claudeDir: string, sessionId: string): Promise<number | null> {
  const debugLogPath = join(claudeDir, 'debug', `${sessionId}.txt`);
  try {
    const stats = await stat(debugLogPath);
    return stats.mtime.getTime();
  } catch {
    // Debug log doesn't exist
    return null;
  }
}

/**
 * Check if the last assistant message has no tool_use blocks
 * This indicates the assistant is waiting for user input
 */
function isAssistantWaitingForUser(entries: ParsedEntry[]): boolean {
  if (entries.length === 0) return false;

  const lastEntry = entries[entries.length - 1];

  // If last entry is an assistant message with no tool_use, it's waiting for user
  if (lastEntry.type === 'assistant' && lastEntry.role === 'assistant') {
    return !lastEntry.toolUses || lastEntry.toolUses.length === 0;
  }

  return false;
}

/**
 * Check if session has a completion indicator (summary entry)
 */
function hasCompletionIndicator(entries: ParsedEntry[]): boolean {
  // Check last few entries for summary
  const lastEntries = entries.slice(-5);
  return lastEntries.some(entry => entry.type === 'summary');
}

/**
 * Determine session state based on debug log mtime and JSONL content
 *
 * State priority:
 * 1. Completed - has summary entry
 * 2. Active - debug log modified <5s ago
 * 3. Waiting - assistant message with no tool_use, debug log stale >10s
 * 4. Idle - no activity >60s
 *
 * @param entries - Parsed JSONL entries
 * @param debugLogMtime - Debug log modification time (ms), or null if no debug log
 * @param fallbackLastActivity - Fallback timestamp from JSONL if no debug log
 */
export function determineSessionState(
  entries: ParsedEntry[],
  debugLogMtime: number | null,
  fallbackLastActivity?: number
): SessionState {
  const now = Date.now();

  // Use debug log mtime if available, otherwise fallback to JSONL timestamp
  const lastActivity = debugLogMtime ?? fallbackLastActivity ?? now;
  const timeSinceActivity = now - lastActivity;

  // 1. Check for completion indicators first
  if (hasCompletionIndicator(entries)) {
    return 'completed';
  }

  // 2. Active state: debug log modified <5s ago
  if (timeSinceActivity < ACTIVE_THRESHOLD_MS) {
    return 'active';
  }

  // 3. Waiting state: assistant message with no tool_use AND debug log stale >10s
  if (timeSinceActivity >= WAITING_THRESHOLD_MS && isAssistantWaitingForUser(entries)) {
    return 'waiting';
  }

  // 4. Idle state: no activity >60s
  if (timeSinceActivity >= IDLE_THRESHOLD_MS) {
    return 'idle';
  }

  // Default: if between 5-60s and not waiting for user, still consider active
  // (might be processing, running tools, etc.)
  return 'active';
}

/**
 * Legacy overload for backward compatibility - uses JSONL timestamp only
 * @deprecated Use the version with debugLogMtime parameter for accurate state detection
 */
export function determineSessionStateLegacy(entries: ParsedEntry[], lastActivity: number): SessionState {
  return determineSessionState(entries, null, lastActivity);
}

/**
 * Build hierarchy nodes from parsed entries
 */
export function buildNodes(entries: ParsedEntry[]): AnyNode[] {
  const nodes: AnyNode[] = [];
  const processedUuids = new Set<string>();

  for (const entry of entries) {
    // Skip duplicates (same uuid)
    if (processedUuids.has(entry.uuid)) {
      continue;
    }
    processedUuids.add(entry.uuid);

    // Skip non-message entries for hierarchy
    if (entry.type !== 'user' && entry.type !== 'assistant') {
      continue;
    }

    const state = determineSessionState([entry], null, entry.timestamp);

    if (entry.role === 'user') {
      const messageNode: MessageNode = {
        id: entry.uuid,
        type: 'message',
        parentId: entry.parentUuid,
        state,
        timestamp: entry.timestamp,
        role: 'user',
        content: entry.content || '',
        toolUses: entry.toolResult ? [{
          id: entry.toolResult.toolUseId,
          name: 'tool_result',
          input: { content: entry.toolResult.content, isError: entry.toolResult.isError },
        }] : undefined,
      };
      nodes.push(messageNode);
    } else if (entry.role === 'assistant') {
      // Check for tool uses that spawn subagents or skills
      if (entry.toolUses && entry.toolUses.length > 0) {
        for (const tool of entry.toolUses) {
          if (tool.name === 'Task') {
            // This is a subagent invocation
            const subagentNode: SubagentNode = {
              id: tool.id,
              type: 'subagent',
              parentId: entry.uuid,
              state,
              timestamp: entry.timestamp,
              agentId: tool.id.slice(-7), // Use last 7 chars as agent ID approximation
              agentType: (tool.input.subagent_type as string) || 'unknown',
              description: (tool.input.description as string) || undefined,
            };
            nodes.push(subagentNode);
          } else {
            // Regular tool call
            const toolNode: ToolNode = {
              id: tool.id,
              type: 'tool',
              parentId: entry.uuid,
              state,
              timestamp: entry.timestamp,
              toolName: tool.name,
              input: tool.input,
            };
            nodes.push(toolNode);
          }
        }
      }

      // Add the message node itself
      const messageNode: MessageNode = {
        id: entry.uuid,
        type: 'message',
        parentId: entry.parentUuid,
        state,
        timestamp: entry.timestamp,
        role: 'assistant',
        content: entry.content || '',
        toolUses: entry.toolUses,
      };
      nodes.push(messageNode);
    }
  }

  return nodes;
}

/**
 * Parse a single session file and build Session object
 */
export async function parseSessionFile(filePath: string, indexEntry?: SessionIndexEntry): Promise<Session | null> {
  try {
    const content = await readFile(filePath, 'utf-8');
    const entries = parseJSONL(content);

    if (entries.length === 0) {
      return null;
    }

    // Extract session ID from filename
    const filename = basename(filePath, '.jsonl');
    const sessionId = indexEntry?.sessionId || filename;

    // Extract metadata
    const metadata = extractMetadata(entries, sessionId);

    // Determine project hash from directory name
    const projectDir = dirname(filePath);
    const projectHash = basename(projectDir);

    // Build nodes
    const nodes = buildNodes(entries);

    // Determine state (use null for debugLogMtime; caller may override with actual debug log mtime)
    const state = determineSessionState(entries, null, metadata.lastTimestamp);

    // Build session object
    const session: Session = {
      id: sessionId,
      projectHash,
      state,
      summary: indexEntry?.summary || metadata.summary,
      gitBranch: indexEntry?.gitBranch || metadata.gitBranch,
      createdAt: indexEntry?.created ? new Date(indexEntry.created).getTime() : metadata.firstTimestamp,
      lastActivity: metadata.lastTimestamp,
      nodes,
      subagents: [], // Will be populated by discoverSubagents
    };

    return session;
  } catch {
    return null;
  }
}

/**
 * Discover and attach subagents to a session
 */
export async function discoverSubagents(session: Session, sessionJsonlPath: string): Promise<void> {
  // The session directory is same as jsonl file without extension
  const sessionDir = sessionJsonlPath.replace('.jsonl', '');
  const subagentFiles = await findSubagentFiles(sessionDir);

  for (const [agentId, filePath] of subagentFiles) {
    try {
      const content = await readFile(filePath, 'utf-8');
      const entries = parseJSONL(content);

      if (entries.length === 0) {
        continue;
      }

      const metadata = extractMetadata(entries, agentId);
      const nodes = buildNodes(entries);
      const state = determineSessionState(entries, null, metadata.lastTimestamp);

      // Extract subagent type from first entry if available
      let agentType = 'unknown';
      let description: string | undefined;
      if (entries.length > 0 && entries[0].type === 'user' && entries[0].content) {
        // Try to extract agent type from prompt
        const prompt = entries[0].content;
        if (prompt.includes('Explore')) agentType = 'Explore';
        else if (prompt.includes('CodeGen')) agentType = 'CodeGen';
        else if (prompt.includes('plan executor')) agentType = 'PlanExecutor';
        description = prompt.slice(0, 200);
      }

      const subagent: Session = {
        id: agentId,
        projectHash: session.projectHash,
        state,
        summary: metadata.summary,
        gitBranch: session.gitBranch,
        createdAt: metadata.firstTimestamp,
        lastActivity: metadata.lastTimestamp,
        nodes,
        subagents: [], // Nested subagents not currently supported
      };

      session.subagents.push(subagent);
    } catch {
      // Skip subagent files we can't read
    }
  }

  // Sort subagents by creation time
  session.subagents.sort((a, b) => a.createdAt - b.createdAt);
}

/**
 * Discover all sessions from today across all project directories
 */
export async function discoverTodaysSessions(claudeDir: string): Promise<Map<string, Session>> {
  const sessions = new Map<string, Session>();
  const projectDirs = await discoverProjectDirs(claudeDir);

  for (const projectDir of projectDirs) {
    // Load session index for metadata enrichment
    const sessionIndex = await loadSessionIndex(projectDir);
    const indexEntries = new Map<string, SessionIndexEntry>();
    if (sessionIndex) {
      for (const entry of sessionIndex.entries) {
        indexEntries.set(entry.sessionId, entry);
      }
    }

    // Find today's JSONL files
    const todayFiles = await findTodaysJSONLFiles(projectDir);

    for (const filePath of todayFiles) {
      const filename = basename(filePath, '.jsonl');
      const indexEntry = indexEntries.get(filename);

      const session = await parseSessionFile(filePath, indexEntry);
      if (session) {
        // Discover subagents
        await discoverSubagents(session, filePath);

        // Only include sessions from today
        if (isFromToday(session.lastActivity)) {
          sessions.set(session.id, session);
        }
      }
    }
  }

  return sessions;
}

/**
 * Get session file path from session ID
 * Searches across all project directories
 */
export async function findSessionFilePath(claudeDir: string, sessionId: string): Promise<string | null> {
  const projectDirs = await discoverProjectDirs(claudeDir);

  for (const projectDir of projectDirs) {
    const potentialPath = join(projectDir, `${sessionId}.jsonl`);
    try {
      await stat(potentialPath);
      return potentialPath;
    } catch {
      // File doesn't exist in this project
    }
  }

  return null;
}
