/**
 * JSONL Parser for Claude session files
 * Handles malformed lines gracefully by skipping bad entries
 */

import type { ToolUseInfo } from 'shared';

// Raw JSONL entry types from Claude's log format
export interface RawJSONLEntry {
  uuid: string;
  parentUuid: string | null;
  type: 'user' | 'assistant' | 'progress' | 'file-history-snapshot' | 'result' | 'summary';
  timestamp: string;
  sessionId?: string;
  agentId?: string;
  isSidechain?: boolean;
  message?: RawMessage;
  data?: RawProgressData;
  summary?: string;
  cwd?: string;
  gitBranch?: string;
  toolUseResult?: string;
  sourceToolAssistantUUID?: string;
}

export interface RawMessage {
  role: 'user' | 'assistant';
  content: string | RawContentBlock[];
  model?: string;
}

export interface RawContentBlock {
  type: 'text' | 'tool_use' | 'tool_result' | 'thinking';
  text?: string;
  thinking?: string;
  id?: string;
  name?: string;
  input?: Record<string, unknown>;
  content?: string;
  tool_use_id?: string;
  is_error?: boolean;
}

export interface RawProgressData {
  type: string;
  hookEvent?: string;
  hookName?: string;
  command?: string;
}

// Parsed entry with normalized fields
export interface ParsedEntry {
  uuid: string;
  parentUuid: string | null;
  type: 'user' | 'assistant' | 'progress' | 'file-history-snapshot' | 'result' | 'summary';
  timestamp: number;
  sessionId?: string;
  agentId?: string;
  isSidechain: boolean;
  role?: 'user' | 'assistant';
  content?: string;
  toolUses?: ToolUseInfo[];
  toolResult?: {
    toolUseId: string;
    content: string;
    isError: boolean;
  };
  gitBranch?: string;
  summary?: string;
}

/**
 * Parse a single JSONL line, returning null for malformed entries
 */
export function parseLine(line: string): ParsedEntry | null {
  const trimmed = line.trim();
  if (!trimmed) {
    return null;
  }

  try {
    const raw: RawJSONLEntry = JSON.parse(trimmed);

    // Skip entries without required fields
    if (!raw.uuid || !raw.type) {
      return null;
    }

    const parsed: ParsedEntry = {
      uuid: raw.uuid,
      parentUuid: raw.parentUuid,
      type: raw.type,
      timestamp: new Date(raw.timestamp).getTime(),
      sessionId: raw.sessionId,
      agentId: raw.agentId,
      isSidechain: raw.isSidechain ?? false,
      gitBranch: raw.gitBranch,
    };

    // Parse message content
    if (raw.message) {
      parsed.role = raw.message.role;

      if (typeof raw.message.content === 'string') {
        parsed.content = raw.message.content;
      } else if (Array.isArray(raw.message.content)) {
        // Extract text content
        const textBlocks = raw.message.content.filter(
          (block): block is RawContentBlock & { type: 'text'; text: string } =>
            block.type === 'text' && typeof block.text === 'string'
        );
        if (textBlocks.length > 0) {
          parsed.content = textBlocks.map((b) => b.text).join('\n');
        }

        // Extract tool uses
        const toolUseBlocks = raw.message.content.filter(
          (block): block is RawContentBlock & { type: 'tool_use'; id: string; name: string; input: Record<string, unknown> } =>
            block.type === 'tool_use' && typeof block.id === 'string' && typeof block.name === 'string'
        );
        if (toolUseBlocks.length > 0) {
          parsed.toolUses = toolUseBlocks.map((block) => ({
            id: block.id,
            name: block.name,
            input: block.input ?? {},
          }));
        }

        // Extract tool results
        const toolResultBlocks = raw.message.content.filter(
          (block): block is RawContentBlock & { type: 'tool_result'; tool_use_id: string; content: string } =>
            block.type === 'tool_result' && typeof block.tool_use_id === 'string'
        );
        if (toolResultBlocks.length > 0) {
          const resultBlock = toolResultBlocks[0];
          parsed.toolResult = {
            toolUseId: resultBlock.tool_use_id,
            content: typeof resultBlock.content === 'string' ? resultBlock.content : JSON.stringify(resultBlock.content),
            isError: resultBlock.is_error ?? false,
          };
        }
      }
    }

    // Handle tool result from top-level field
    if (raw.toolUseResult !== undefined && raw.sourceToolAssistantUUID) {
      parsed.toolResult = {
        toolUseId: raw.sourceToolAssistantUUID,
        content: raw.toolUseResult,
        isError: raw.toolUseResult.startsWith('Error:'),
      };
    }

    // Handle summary entries
    if (raw.summary) {
      parsed.summary = raw.summary;
    }

    return parsed;
  } catch {
    // Malformed JSON - skip this line
    return null;
  }
}

/**
 * Parse multiple lines of JSONL content
 * Skips malformed lines and returns all valid entries
 */
export function parseJSONL(content: string): ParsedEntry[] {
  const lines = content.split('\n');
  const entries: ParsedEntry[] = [];

  for (const line of lines) {
    const parsed = parseLine(line);
    if (parsed) {
      entries.push(parsed);
    }
  }

  return entries;
}

/**
 * Parse JSONL from a file buffer (handles streaming reads)
 */
export function parseJSONLBuffer(buffer: Buffer): ParsedEntry[] {
  return parseJSONL(buffer.toString('utf-8'));
}

/**
 * Extract session metadata from parsed entries
 */
export interface SessionMetadata {
  sessionId: string;
  firstTimestamp: number;
  lastTimestamp: number;
  gitBranch?: string;
  summary?: string;
  messageCount: number;
  hasSubagents: boolean;
}

export function extractMetadata(entries: ParsedEntry[], sessionId: string): SessionMetadata {
  let firstTimestamp = Infinity;
  let lastTimestamp = 0;
  let gitBranch: string | undefined;
  let summary: string | undefined;
  let messageCount = 0;
  let hasSubagents = false;

  for (const entry of entries) {
    if (entry.timestamp < firstTimestamp) {
      firstTimestamp = entry.timestamp;
    }
    if (entry.timestamp > lastTimestamp) {
      lastTimestamp = entry.timestamp;
    }

    if (entry.gitBranch && !gitBranch) {
      gitBranch = entry.gitBranch;
    }

    if (entry.summary && !summary) {
      summary = entry.summary;
    }

    if (entry.type === 'user' || entry.type === 'assistant') {
      messageCount++;
    }

    // Check for Task tool use (subagent creation)
    if (entry.toolUses) {
      for (const tool of entry.toolUses) {
        if (tool.name === 'Task') {
          hasSubagents = true;
        }
      }
    }
  }

  return {
    sessionId,
    firstTimestamp: firstTimestamp === Infinity ? Date.now() : firstTimestamp,
    lastTimestamp: lastTimestamp || Date.now(),
    gitBranch,
    summary,
    messageCount,
    hasSubagents,
  };
}
