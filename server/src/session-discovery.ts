/**
 * Session Discovery Module
 * Scans for JSONL session files, discovers subagents, and extracts metadata
 *
 * State detection logic:
 * - Active: debug log modified <10s ago
 * - Waiting: idle_prompt marker in debug log OR (assistant message with no tool_use AND turn_duration entry)
 * - Idle: default state (not active, not waiting, not completed)
 * - Completed: session has SessionEnd marker in debug log or summary entry in JSONL
 */

import { readFile, readdir, stat, access } from 'fs/promises';
import { readFileSync, readdirSync } from 'fs';
import { join, basename, dirname } from 'path';
import type { Session, SessionState, AnyNode, SubagentNode, SkillNode, MessageNode, ToolNode, ToolUseInfo, UserPromptNode, ClearMarkerNode, HookInfo } from 'shared';
import { parseJSONL, extractMetadata, type ParsedEntry } from './jsonl-parser.js';

// State detection thresholds (in milliseconds)
const ACTIVE_THRESHOLD_MS = 10000;     // <10s = active

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
 * Extract human-readable text from a user message that may contain XML system tags.
 * Returns undefined if the message has no meaningful user text (skip to next entry).
 */
function extractReadablePrompt(content: string): string | undefined {
  // Text before the first XML tag is the user's actual typed input
  const beforeXml = content.split('<')[0].trim();
  if (beforeXml.length > 0) {
    // Take first line only
    return beforeXml.split('\n')[0].trim();
  }

  // Content starts with XML — try to extract slash command name
  const commandNameMatch = content.match(/<command-name>\s*([^<]+?)\s*<\/command-name>/);
  if (commandNameMatch) {
    return commandNameMatch[1].trim();
  }

  // Try command-message tag (older format)
  const commandMessageMatch = content.match(/<command-message>\s*([^<]+?)\s*<\/command-message>/);
  if (commandMessageMatch) {
    return '/' + commandMessageMatch[1].trim();
  }

  // No recognizable user text — skip this entry
  return undefined;
}

/**
 * Check if an extracted prompt is a skippable command (e.g., /clear).
 * Handles both raw text format (/clear) and XML-extracted format (clear).
 */
function isSkippableCommand(prompt: string): boolean {
  const normalized = prompt.toLowerCase().trim();
  return (
    normalized === 'clear' ||
    normalized === '/clear' ||
    normalized.startsWith('/clear ') ||
    normalized.startsWith('clear ')
  );
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
 * Extract agent name from a markdown filename (e.g., 'gsd-planner.md' -> 'gsd-planner')
 */
function extractAgentNameFromPath(filename: string): string {
  return basename(filename, '.md');
}

/**
 * Agent color mapping for named colors to hex values
 */
const AGENT_COLOR_MAP: Record<string, string> = {
  cyan: '#06b6d4',
  green: '#22c55e',
  orange: '#f97316',
  yellow: '#eab308',
  blue: '#3b82f6',
  purple: '#8b5cf6',
  red: '#ef4444',
  pink: '#ec4899',
};

/**
 * Agent info containing name and color
 */
interface AgentInfo {
  name: string;
  color?: string;
}

/**
 * Load agent names and colors from ~/.claude/agents/*.md files
 * Returns a Map mapping agent filenames to their info from YAML frontmatter
 */
let agentNamesCache: Map<string, AgentInfo> | null = null;

async function loadAgentNames(): Promise<Map<string, AgentInfo>> {
  if (agentNamesCache) {
    return agentNamesCache;
  }

  const agentNames = new Map<string, AgentInfo>();
  const agentsDir = join(process.env.HOME || '/home/botond', '.claude', 'agents');

  try {
    const entries = await readdir(agentsDir, { withFileTypes: true });
    for (const entry of entries) {
      if (entry.isFile() && entry.name.endsWith('.md')) {
        try {
          const filePath = join(agentsDir, entry.name);
          const content = await readFile(filePath, 'utf-8');

          // Parse YAML frontmatter
          const frontmatterMatch = content.match(/^---\s*\n([\s\S]*?)\n---\s*\n/);
          if (frontmatterMatch) {
            const yamlContent = frontmatterMatch[1];
            const nameMatch = yamlContent.match(/^name:\s*(.+?)\s*$/m);
            const colorMatch = yamlContent.match(/^color:\s*(.+?)\s*$/m);

            if (nameMatch) {
              const agentName = nameMatch[1].trim();
              let agentColor: string | undefined;

              if (colorMatch) {
                const colorValue = colorMatch[1].trim().toLowerCase();
                // Resolve named color to hex, or use as-is if already hex
                agentColor = AGENT_COLOR_MAP[colorValue] || colorValue;
              }

              agentNames.set(extractAgentNameFromPath(entry.name), {
                name: agentName,
                color: agentColor,
              });
            }
          }
        } catch {
          // Skip files that can't be read
        }
      }
    }
  } catch {
    // Agents directory may not exist
  }

  agentNamesCache = agentNames;
  return agentNames;
}

/**
 * Synchronous version of loadAgentNames for use in synchronous contexts
 */
function loadAgentNamesSync(): Map<string, AgentInfo> {
  if (agentNamesCache) {
    return agentNamesCache;
  }

  const agentNames = new Map<string, AgentInfo>();
  const agentsDir = join(process.env.HOME || '/home/botond', '.claude', 'agents');

  try {
    const entries = readdirSync(agentsDir, { withFileTypes: true });
    for (const entry of entries) {
      if (entry.isFile() && entry.name.endsWith('.md')) {
        try {
          const filePath = join(agentsDir, entry.name);
          const content = readFileSync(filePath, 'utf-8');

          // Parse YAML frontmatter
          const frontmatterMatch = content.match(/^---\s*\n([\s\S]*?)\n---\s*\n/);
          if (frontmatterMatch) {
            const yamlContent = frontmatterMatch[1];
            const nameMatch = yamlContent.match(/^name:\s*(.+?)\s*$/m);
            const colorMatch = yamlContent.match(/^color:\s*(.+?)\s*$/m);

            if (nameMatch) {
              const agentName = nameMatch[1].trim();
              let agentColor: string | undefined;

              if (colorMatch) {
                const colorValue = colorMatch[1].trim().toLowerCase();
                // Resolve named color to hex, or use as-is if already hex
                agentColor = AGENT_COLOR_MAP[colorValue] || colorValue;
              }

              const key = extractAgentNameFromPath(entry.name);
              agentNames.set(key, {
                name: agentName,
                color: agentColor,
              });
            }
          }
        } catch {
          // Skip files that can't be read
        }
      }
    }
  } catch {
    // Agents directory may not exist
  }

  agentNamesCache = agentNames;
  return agentNames;
}

// Initialize the cache at module load time
loadAgentNamesSync();

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
 * Check if a session has been closed by looking for the SessionEnd hook event
 * in the debug log file. When a user exits Claude Code, the debug log records:
 *   "Getting matching hook commands for SessionEnd with query: prompt_input_exit"
 * This is the only reliable indicator that confirms a session was closed.
 *
 * @param claudeDir - Base Claude directory (~/.claude)
 * @param sessionId - Session UUID
 * @returns true if the session is confirmed closed
 */
export async function isSessionClosed(claudeDir: string, sessionId: string): Promise<boolean> {
  const debugLogPath = join(claudeDir, 'debug', `${sessionId}.txt`);
  try {
    const content = await readFile(debugLogPath, 'utf-8');
    // Only match SessionEnd with query: prompt_input_exit (not "clear" or other queries)
    return content.includes('Getting matching hook commands for SessionEnd with query: prompt_input_exit');
  } catch {
    // No debug log — can't confirm closed, treat as unknown
    return false;
  }
}

/**
 * Get the timestamp of the SessionEnd marker from the debug log.
 * Returns null if no SessionEnd marker exists or if the timestamp can't be parsed.
 *
 * @param claudeDir - Base Claude directory (~/.claude)
 * @param sessionId - Session UUID
 * @returns Timestamp in ms of the SessionEnd marker, or null
 */
export async function getSessionEndTimestamp(claudeDir: string, sessionId: string): Promise<number | null> {
  const debugLogPath = join(claudeDir, 'debug', `${sessionId}.txt`);
  try {
    const content = await readFile(debugLogPath, 'utf-8');
    // Find the SessionEnd line with prompt_input_exit and extract its timestamp
    const sessionEndMatch = content.match(/(\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z).*Getting matching hook commands for SessionEnd with query: prompt_input_exit/);
    if (sessionEndMatch) {
      return new Date(sessionEndMatch[1]).getTime();
    }
    return null;
  } catch {
    return null;
  }
}

/**
 * Read the full debug log content for a session.
 * Returns null if the file cannot be read.
 */
export async function readDebugLogContent(claudeDir: string, sessionId: string): Promise<string | null> {
  const debugLogPath = join(claudeDir, 'debug', `${sessionId}.txt`);
  try {
    return await readFile(debugLogPath, 'utf-8');
  } catch {
    return null;
  }
}

/**
 * Check if the debug log contains the idle_prompt marker.
 * This indicates the session is waiting for user input.
 */
export async function hasIdlePromptMarker(claudeDir: string, sessionId: string): Promise<boolean> {
  const debugLogPath = join(claudeDir, 'debug', `${sessionId}.txt`);
  try {
    // Read the last 2000 bytes to find idle_prompt marker efficiently
    const content = await readFile(debugLogPath, 'utf-8');
    return content.includes('idle_prompt');
  } catch {
    // No debug log — can't determine
    return false;
  }
}

/**
 * Check if the session is waiting for user input.
 * Only uses the idle_prompt marker from the debug log — no JSONL heuristics.
 */
function isAssistantWaitingForUser(hasIdlePrompt?: boolean): boolean {
  return !!hasIdlePrompt;
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
 * Determine session state based on debug log mtime, JSONL content, and closed status.
 *
 * State priority:
 * 1. Completed - session closed (SessionEnd in debug log) AND no activity after SessionEnd, or has summary entry
 * 2. Active - debug log modified <10s ago
 * 3. Waiting - assistant message with no tool_use, debug log stale >10s
 *
 * @param entries - Parsed JSONL entries
 * @param debugLogMtime - Debug log modification time (ms), or null if no debug log
 * @param fallbackLastActivity - Fallback timestamp from JSONL if no debug log
 * @param sessionClosed - Whether the debug log confirms the session was closed
 * @param sessionEndTimestamp - Timestamp when SessionEnd marker was written (ms), or null
 */
export function determineSessionState(
  entries: ParsedEntry[],
  debugLogMtime: number | null,
  fallbackLastActivity?: number,
  sessionClosed?: boolean,
  hasIdlePrompt?: boolean,
  sessionEndTimestamp?: number | null
): SessionState {
  const now = Date.now();

  // Use debug log mtime if available, otherwise fallback to JSONL timestamp
  const lastActivity = debugLogMtime ?? fallbackLastActivity ?? now;
  const timeSinceActivity = now - lastActivity;

  // 1. Completed: session closed (SessionEnd in debug log) or has summary entry
  // BUT: If JSONL has activity AFTER SessionEnd timestamp, session was reopened
  if (sessionClosed) {
    // If we have a SessionEnd timestamp and JSONL activity after it, session was reopened
    if (sessionEndTimestamp && fallbackLastActivity && fallbackLastActivity > sessionEndTimestamp) {
      // Session was reopened, continue with normal state detection
    } else {
      // Session is genuinely closed
      return 'completed';
    }
  }

  if (hasCompletionIndicator(entries)) {
    return 'completed';
  }

  // 2. Active: debug log modified <10s ago
  if (timeSinceActivity < ACTIVE_THRESHOLD_MS) {
    return 'active';
  }

  // 3. Waiting: only when idle_prompt marker exists in debug log
  // But if the debug log is very stale (>1 hour), the session was likely killed/crashed
  // without a proper SessionEnd — treat as idle instead of perpetually "waiting"
  const STALE_WAITING_MS = 60 * 60 * 1000; // 1 hour
  if (isAssistantWaitingForUser(hasIdlePrompt) && timeSinceActivity < STALE_WAITING_MS) {
    return 'waiting';
  }

  // 4. Idle (default): not active, not waiting, not completed
  return 'idle';
}

/**
 * Build hierarchy nodes from parsed entries
 */
export function buildNodes(entries: ParsedEntry[]): AnyNode[] {
  const nodes: AnyNode[] = [];
  const processedUuids = new Set<string>();
  let clearCount = 0;

  // Build tool result lookup map
  const toolResults = new Map<string, ParsedEntry['toolResult']>();
  for (const entry of entries) {
    if (entry.toolResult) {
      toolResults.set(entry.toolResult.toolUseId, entry.toolResult);
    }
  }

  // Build hook progress lookup map (toolUseId -> HookInfo[])
  const hooksByToolId = new Map<string, HookInfo[]>();
  for (const entry of entries) {
    if (entry.hookProgress) {
      const hook: HookInfo = {
        event: entry.hookProgress.event,
        hookName: entry.hookProgress.hookName,
        command: entry.hookProgress.command,
        timestamp: entry.hookProgress.timestamp,
      };
      const existing = hooksByToolId.get(entry.hookProgress.toolUseId) || [];
      existing.push(hook);
      hooksByToolId.set(entry.hookProgress.toolUseId, existing);
    }
  }

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

      // Create UserPromptNode or ClearMarkerNode from user message
      if (entry.content) {
        const extracted = extractReadablePrompt(entry.content);

        if (extracted) {
          // Check if this is a /clear command
          if (isSkippableCommand(extracted)) {
            const clearNode: ClearMarkerNode = {
              id: `clear-${entry.uuid}`,
              type: 'clear-marker',
              parentId: entry.parentUuid,
              state,
              timestamp: entry.timestamp,
              clearIndex: clearCount++,
            };
            nodes.push(clearNode);
          } else {
            // Create UserPromptNode for regular user messages
            const commandNameMatch = entry.content.match(/<command-name>\s*([^<]+?)\s*<\/command-name>/);
            const hasXml = entry.content.includes('<');

            const userPromptNode: UserPromptNode = {
              id: `prompt-${entry.uuid}`,
              type: 'user-prompt',
              parentId: entry.parentUuid,
              state,
              timestamp: entry.timestamp,
              promptText: extracted,
              commandName: commandNameMatch ? commandNameMatch[1].trim() : undefined,
              commandMetadata: hasXml ? entry.content.slice(0, 500) : undefined,
              isCommand: !!commandNameMatch,
              hooks: hooksByToolId.get(entry.uuid),
            };
            nodes.push(userPromptNode);
          }
        }
      }
    } else if (entry.role === 'assistant') {
      // Check for tool uses that spawn subagents or skills
      if (entry.toolUses && entry.toolUses.length > 0) {
        for (const tool of entry.toolUses) {
          if (tool.name === 'Task') {
            // This is a subagent invocation
            const agentType = (tool.input.subagent_type as string) || 'unknown';
            const agentInfoMap = loadAgentNamesSync();
            const agentInfo = agentInfoMap.get(agentType);
            const agentName = agentInfo?.name;
            const agentColor = agentInfo?.color;

            const subagentNode: SubagentNode = {
              id: tool.id,
              type: 'subagent',
              parentId: entry.uuid,
              state,
              timestamp: entry.timestamp,
              agentId: tool.id.slice(-7), // Use last 7 chars as agent ID approximation
              agentType,
              agentName,
              agentColor,
              description: (tool.input.description as string) || undefined,
              // NEW metadata
              prompt: (tool.input.prompt as string) || undefined,
              model: (tool.input.model as string) || undefined,
              sourceFilePath: agentType !== 'unknown'
                ? `~/.claude/agents/${agentType}.md`
                : undefined,
              messageId: entry.messageId,
              hooks: hooksByToolId.get(tool.id),
            };
            nodes.push(subagentNode);
          } else if (tool.name === 'Skill') {
            // This is a skill invocation
            const skillInput = tool.input;
            const skillName = (skillInput.skill as string) || 'unknown';
            const toolResult = toolResults.get(tool.id);
            const skillNode: SkillNode = {
              id: tool.id,
              type: 'skill',
              parentId: entry.uuid,
              state,
              timestamp: entry.timestamp,
              skillName,
              sourceFilePath: `~/.claude/skills/${skillName}/SKILL.md`,
              commandName: toolResult?.commandName,
              success: toolResult?.success,
              prompt: skillInput.prompt as string | undefined,
              result: toolResult?.content,
              hooks: hooksByToolId.get(tool.id),
            };
            nodes.push(skillNode);
          } else if (tool.name === 'TaskOutput') {
            // TaskOutput just collects results from already-displayed subagent boxes - skip it
            continue;
          } else {
            // Regular tool call
            const toolResult = toolResults.get(tool.id);
            const toolNode: ToolNode = {
              id: tool.id,
              type: 'tool',
              parentId: entry.uuid,
              state,
              timestamp: entry.timestamp,
              toolName: tool.name,
              input: tool.input,
              output: toolResult?.content,
              hooks: hooksByToolId.get(tool.id),
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
 * @param filePath - Path to the JSONL session file
 * @param indexEntry - Optional session index entry for metadata enrichment
 * @param claudeDir - Optional Claude base dir (~/.claude) for debug log checks
 */
export async function parseSessionFile(filePath: string, indexEntry?: SessionIndexEntry, claudeDir?: string): Promise<Session | null> {
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

    // Extract first user prompt (excluding /clear)
    // User messages in JSONL may contain XML system tags (e.g. <command-message>, <system-reminder>)
    // We extract the human-readable text by:
    // 1. Text before any XML tag = actual user input
    // 2. <command-name> tag content = slash command name
    // 3. Skip entries that are purely system-injected XML
    // 4. Skip /clear commands regardless of encoding (raw text or XML-wrapped)
    let firstUserPrompt: string | undefined;
    for (const entry of entries) {
      if (entry.type === 'user' && entry.role === 'user' && entry.content) {
        const content = entry.content.trim();
        const extracted = extractReadablePrompt(content);
        if (extracted && !isSkippableCommand(extracted)) {
          firstUserPrompt = extracted;
          break;
        }
      }
    }

    // Extract last user prompt (most recent non-/clear user message)
    let lastUserPrompt: string | undefined;
    for (let i = entries.length - 1; i >= 0; i--) {
      const entry = entries[i];
      if (entry.type === 'user' && entry.role === 'user' && entry.content) {
        const extracted = extractReadablePrompt(entry.content.trim());
        if (extracted && !isSkippableCommand(extracted)) {
          lastUserPrompt = extracted;
          break;
        }
      }
    }

    // Check if first user message is a /clear command
    let hasClearPrefix = false;
    for (const entry of entries) {
      if (entry.type === 'user' && entry.role === 'user' && entry.content) {
        const extracted = extractReadablePrompt(entry.content.trim());
        if (extracted) {
          hasClearPrefix = isSkippableCommand(extracted);
          break;
        }
      }
    }

    // If there's a real user command after /clear, the session has meaningful content
    // and shouldn't be marked as a clear-prefix-only session
    if (hasClearPrefix && firstUserPrompt) {
      hasClearPrefix = false;
    }

    // Build nodes
    const nodes = buildNodes(entries);

    // Determine state with debug log checks if claudeDir provided
    let debugMtime: number | null = null;
    let closed = false;
    let idlePrompt = false;
    let sessionEndTimestamp: number | null = null;
    if (claudeDir) {
      debugMtime = await getDebugLogMtime(claudeDir, sessionId);
      closed = await isSessionClosed(claudeDir, sessionId);
      idlePrompt = await hasIdlePromptMarker(claudeDir, sessionId);
      sessionEndTimestamp = await getSessionEndTimestamp(claudeDir, sessionId);
    }
    const state = determineSessionState(entries, debugMtime, metadata.lastTimestamp, closed, idlePrompt, sessionEndTimestamp);

    // Build session object
    const session: Session = {
      id: sessionId,
      projectHash,
      state,
      summary: indexEntry?.summary || metadata.summary,
      gitBranch: indexEntry?.gitBranch || metadata.gitBranch,
      cwd: indexEntry?.projectPath || metadata.cwd,
      firstUserPrompt,
      lastUserPrompt,
      hasClearPrefix,
      createdAt: indexEntry?.created ? new Date(indexEntry.created).getTime() : metadata.firstTimestamp,
      lastActivity: metadata.lastTimestamp,
      tokenUsage: metadata.tokenUsage,
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
        cwd: session.cwd,
        createdAt: metadata.firstTimestamp,
        lastActivity: metadata.lastTimestamp,
        tokenUsage: metadata.tokenUsage,
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

  // Backfill correct agentId from discovered subagents into SubagentNode objects
  // Match by timestamp proximity (within 10s), tracking already-matched nodes
  // to avoid assigning multiple subagents to the same SubagentNode
  const matchedNodeIds = new Set<string>();
  for (const subagent of session.subagents) {
    const subagentNode = session.nodes.find(
      (n) => n.type === 'subagent' && !matchedNodeIds.has(n.id) && Math.abs(n.timestamp - subagent.createdAt) < 10000
    );
    if (subagentNode && subagentNode.type === 'subagent') {
      subagentNode.agentId = subagent.id;
      matchedNodeIds.add(subagentNode.id);
    }
  }
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

      const session = await parseSessionFile(filePath, indexEntry, claudeDir);
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
