import { Router, Request, Response, NextFunction } from 'express';
import { promises as fs } from 'fs';
import path from 'path';
import type {
  Session,
  MessageNode,
  ToolNode,
  SubagentNode,
  SkillNode,
  AnyNode,
  SessionState,
  PromptRequest,
  PromptResponse,
  ApiError,
  ToolUseInfo,
} from 'shared';
import { injectPrompt } from './tmux.js';

const CLAUDE_DIR = process.env.HOME + '/.claude';
const PROJECTS_DIR = path.join(CLAUDE_DIR, 'projects');

// Helper to create ApiError responses
function sendError(res: Response, status: number, error: string, message: string): void {
  const apiError: ApiError = { error, message };
  res.status(status).json(apiError);
}

// Validate request body has required fields
function validatePromptRequest(body: unknown): body is PromptRequest {
  if (!body || typeof body !== 'object') return false;
  const obj = body as Record<string, unknown>;
  return typeof obj.prompt === 'string' && obj.prompt.length > 0;
}

// Parse a JSONL file into an array of objects
async function parseJSONL(filePath: string): Promise<unknown[]> {
  try {
    const content = await fs.readFile(filePath, 'utf-8');
    const lines = content.trim().split('\n').filter(line => line.length > 0);
    return lines.map(line => {
      try {
        return JSON.parse(line);
      } catch {
        return null;
      }
    }).filter(Boolean);
  } catch {
    return [];
  }
}

// Determine session state from transcript entries
function determineSessionState(entries: unknown[]): SessionState {
  if (entries.length === 0) return 'waiting';

  const lastEntry = entries[entries.length - 1] as Record<string, unknown>;
  const type = lastEntry?.type;

  // If last entry is from assistant with tool_use, likely active
  if (type === 'assistant') {
    const message = lastEntry.message as Record<string, unknown> | undefined;
    const content = message?.content;
    if (Array.isArray(content)) {
      const hasToolUse = content.some((c: unknown) =>
        typeof c === 'object' && c !== null && (c as Record<string, unknown>).type === 'tool_use'
      );
      if (hasToolUse) return 'active';
    }
    return 'waiting'; // Assistant responded, waiting for user
  }

  // If last entry is user message, assistant is active/processing
  if (type === 'user') {
    return 'active';
  }

  // Progress indicates active processing
  if (type === 'progress') {
    return 'active';
  }

  return 'waiting';
}

// Extract summary from session entries (first user message)
function extractSummary(entries: unknown[]): string | undefined {
  for (const entry of entries) {
    const e = entry as Record<string, unknown>;
    if (e.type === 'user') {
      const message = e.message as Record<string, unknown> | undefined;
      const content = message?.content;
      if (typeof content === 'string') {
        // Truncate long messages
        return content.length > 100 ? content.slice(0, 100) + '...' : content;
      }
    }
  }
  return undefined;
}

// Parse transcript entries into hierarchy nodes
function parseTranscriptToNodes(entries: unknown[], sessionId: string): AnyNode[] {
  const nodes: AnyNode[] = [];
  let lastMessageId: string | null = null;

  for (const entry of entries) {
    const e = entry as Record<string, unknown>;
    const uuid = e.uuid as string | undefined;
    const timestamp = e.timestamp as string | undefined;
    const type = e.type as string | undefined;

    if (!uuid || !timestamp) continue;

    const ts = new Date(timestamp).getTime();

    if (type === 'user') {
      const message = e.message as Record<string, unknown> | undefined;
      const content = message?.content;
      const textContent = typeof content === 'string'
        ? content
        : Array.isArray(content)
          ? content.filter((c: unknown) => typeof c === 'object' && c !== null && (c as Record<string, unknown>).type === 'tool_result')
              .map((c: unknown) => (c as Record<string, unknown>).content || '')
              .join('\n') || '[tool result]'
          : '';

      const node: MessageNode = {
        id: uuid,
        type: 'message',
        parentId: sessionId,
        state: 'completed',
        timestamp: ts,
        role: 'user',
        content: textContent,
      };
      nodes.push(node);
      lastMessageId = uuid;
    } else if (type === 'assistant') {
      const message = e.message as Record<string, unknown> | undefined;
      const content = message?.content;

      let textContent = '';
      const toolUses: ToolUseInfo[] = [];

      if (Array.isArray(content)) {
        for (const item of content) {
          const c = item as Record<string, unknown>;
          if (c.type === 'text') {
            textContent += (c.text as string) || '';
          } else if (c.type === 'tool_use') {
            toolUses.push({
              id: (c.id as string) || '',
              name: (c.name as string) || '',
              input: (c.input as Record<string, unknown>) || {},
            });
          } else if (c.type === 'thinking') {
            // Skip thinking blocks in content
            continue;
          }
        }
      }

      // Only add assistant message if it has text content
      if (textContent.trim()) {
        const node: MessageNode = {
          id: uuid,
          type: 'message',
          parentId: sessionId,
          state: 'completed',
          timestamp: ts,
          role: 'assistant',
          content: textContent,
          toolUses: toolUses.length > 0 ? toolUses : undefined,
        };
        nodes.push(node);
        lastMessageId = uuid;
      }

      // Extract API message ID for parallel detection
      const messageId = (message?.id as string) || undefined;

      // Add tool nodes for each tool use
      for (const tu of toolUses) {
        // Check for special tool types
        if (tu.name === 'Task') {
          const subagentNode: SubagentNode = {
            id: tu.id,
            type: 'subagent',
            parentId: lastMessageId || sessionId,
            state: 'active',
            timestamp: ts,
            agentId: tu.id,
            agentType: (tu.input.subagent_type as string) || 'unknown',
            description: (tu.input.description as string) || (tu.input.prompt as string) || undefined,
            prompt: (tu.input.prompt as string) || undefined,
            model: (tu.input.model as string) || undefined,
            messageId,
          };
          nodes.push(subagentNode);
        } else if (tu.name.startsWith('mcp__') || tu.name === 'Bash' || tu.name === 'Read' || tu.name === 'Write' || tu.name === 'Edit' || tu.name === 'Glob' || tu.name === 'Grep') {
          const toolNode: ToolNode = {
            id: tu.id,
            type: 'tool',
            parentId: lastMessageId || sessionId,
            state: 'completed',
            timestamp: ts,
            toolName: tu.name,
            input: tu.input,
          };
          nodes.push(toolNode);
        } else {
          // Could be a skill or other tool
          const skillNode: SkillNode = {
            id: tu.id,
            type: 'skill',
            parentId: lastMessageId || sessionId,
            state: 'completed',
            timestamp: ts,
            skillName: tu.name,
            args: JSON.stringify(tu.input),
          };
          nodes.push(skillNode);
        }
      }
    }
  }

  return nodes;
}

// Parse a session directory to get session info with full nodes
async function parseSession(projectDir: string, sessionFile: string, includeNodes: boolean = false): Promise<Session | null> {
  const sessionId = path.basename(sessionFile, '.jsonl');
  const filePath = path.join(projectDir, sessionFile);

  try {
    const stats = await fs.stat(filePath);
    const entries = await parseJSONL(filePath);

    if (entries.length === 0) return null;

    // Extract metadata from entries
    let projectHash = path.basename(projectDir);
    let gitBranch: string | undefined;
    let tmuxTarget: string | undefined;

    for (const entry of entries) {
      const e = entry as Record<string, unknown>;
      if (e.gitBranch) gitBranch = e.gitBranch as string;
      // Look for tmux target in progress entries or session metadata
      if (e.type === 'progress') {
        const data = e.data as Record<string, unknown> | undefined;
        if (data?.tmuxTarget) tmuxTarget = data.tmuxTarget as string;
      }
      if (e.sessionId === sessionId) break;
    }

    const state = determineSessionState(entries);
    const summary = extractSummary(entries);
    const createdAt = new Date((entries[0] as Record<string, unknown>)?.timestamp as string || stats.birthtime).getTime();
    const lastActivity = stats.mtimeMs;

    // Parse subagents if they exist
    const subagents: Session[] = [];
    const subagentDir = path.join(projectDir, sessionId, 'subagents');
    try {
      const subagentFiles = await fs.readdir(subagentDir);
      for (const subFile of subagentFiles) {
        if (subFile.endsWith('.jsonl')) {
          const subSession = await parseSession(subagentDir, subFile, includeNodes);
          if (subSession) {
            subagents.push(subSession);
          }
        }
      }
    } catch {
      // No subagents directory
    }

    const session: Session = {
      id: sessionId,
      projectHash,
      state,
      summary,
      gitBranch: gitBranch || undefined,
      tmuxTarget,
      createdAt,
      lastActivity,
      nodes: includeNodes ? parseTranscriptToNodes(entries, sessionId) : [],
      subagents,
    };

    return session;
  } catch (err) {
    console.error(`Error parsing session ${sessionId}:`, err);
    return null;
  }
}

// Find a session by ID across all projects
async function findSessionById(sessionId: string): Promise<{ session: Session; projectPath: string } | null> {
  try {
    const projectDirs = await fs.readdir(PROJECTS_DIR);

    for (const projectDir of projectDirs) {
      const projectPath = path.join(PROJECTS_DIR, projectDir);
      const stats = await fs.stat(projectPath);

      if (!stats.isDirectory()) continue;

      const sessionFile = `${sessionId}.jsonl`;
      const filePath = path.join(projectPath, sessionFile);

      try {
        await fs.access(filePath);
        const session = await parseSession(projectPath, sessionFile, true);
        if (session) {
          return { session, projectPath };
        }
      } catch {
        // Session not in this project
        continue;
      }
    }
  } catch (err) {
    console.error('Error finding session:', err);
  }

  return null;
}

// Create the Express router
export function createApiRouter(): Router {
  const router = Router();

  // GET /api/sessions/:id - Return full parsed transcript for session
  router.get('/sessions/:id', async (req: Request, res: Response, _next: NextFunction) => {
    const { id } = req.params;

    if (!id || typeof id !== 'string') {
      sendError(res, 400, 'INVALID_REQUEST', 'Session ID is required');
      return;
    }

    try {
      const result = await findSessionById(id);

      if (!result) {
        sendError(res, 404, 'NOT_FOUND', `Session ${id} not found`);
        return;
      }

      res.json(result.session);
    } catch (err) {
      console.error('Error fetching session:', err);
      sendError(res, 500, 'INTERNAL_ERROR', 'Failed to fetch session');
    }
  });

  // POST /api/sessions/:id/prompt - Send prompt to session
  router.post('/sessions/:id/prompt', async (req: Request, res: Response, _next: NextFunction) => {
    const { id } = req.params;

    if (!id || typeof id !== 'string') {
      sendError(res, 400, 'INVALID_REQUEST', 'Session ID is required');
      return;
    }

    if (!validatePromptRequest(req.body)) {
      sendError(res, 400, 'INVALID_REQUEST', 'Request body must contain a non-empty "prompt" string');
      return;
    }

    const { prompt, tmuxTarget } = req.body as PromptRequest;

    try {
      // Verify session exists first
      const sessionResult = await findSessionById(id);
      if (!sessionResult) {
        sendError(res, 404, 'NOT_FOUND', `Session ${id} not found`);
        return;
      }

      // Use the tmux module to inject the prompt
      const result = await injectPrompt(id, prompt, tmuxTarget);

      const response: PromptResponse = {
        success: result.success,
        message: result.message,
      };

      if (result.success) {
        res.json(response);
      } else {
        res.status(400).json(response);
      }
    } catch (err) {
      console.error('Error sending prompt:', err);
      sendError(res, 500, 'INTERNAL_ERROR', 'Failed to send prompt');
    }
  });

  return router;
}

export default createApiRouter;
