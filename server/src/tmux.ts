import { exec } from 'child_process';
import { promisify } from 'util';
import { readFile } from 'fs/promises';
import { join } from 'path';

const execAsync = promisify(exec);

const CLAUDE_DIR = process.env.HOME + '/.claude';
const SESSION_ENV_DIR = join(CLAUDE_DIR, 'session-env');

/**
 * Validates if a tmux target (session, window, or pane) exists
 * @param target - tmux target in format "session:window.pane" or partial
 * @returns true if target exists, false otherwise
 */
export async function validateTarget(target: string): Promise<boolean> {
  try {
    await execAsync(`tmux has-session -t ${escapeShellArg(target)}`);
    return true;
  } catch {
    return false;
  }
}

/**
 * Escapes special characters for safe use in tmux send-keys
 * Handles: quotes, backslashes, dollar signs, backticks, exclamation marks
 * @param text - raw text to escape
 * @returns escaped text safe for tmux send-keys
 */
function escapeTmuxText(text: string): string {
  // Escape backslashes first (must be before other escapes that add backslashes)
  let escaped = text.replace(/\\/g, '\\\\');
  // Escape double quotes
  escaped = escaped.replace(/"/g, '\\"');
  // Escape dollar signs (prevents variable expansion)
  escaped = escaped.replace(/\$/g, '\\$');
  // Escape backticks (prevents command substitution)
  escaped = escaped.replace(/`/g, '\\`');
  // Escape exclamation marks (history expansion in some shells)
  escaped = escaped.replace(/!/g, '\\!');
  return escaped;
}

/**
 * Escapes a string for safe use as a shell argument
 * @param arg - raw argument
 * @returns safely quoted argument
 */
function escapeShellArg(arg: string): string {
  // Use single quotes and escape any single quotes within
  return `'${arg.replace(/'/g, "'\\''")}'`;
}

/**
 * Sends keystrokes to a tmux target
 * @param target - tmux target (session:window.pane format)
 * @param text - text to send
 * @throws Error if tmux command fails
 */
export async function sendKeys(target: string, text: string): Promise<void> {
  const escapedText = escapeTmuxText(text);
  const escapedTarget = escapeShellArg(target);

  // Use tmux send-keys with the escaped text, followed by Enter
  const command = `tmux send-keys -t ${escapedTarget} "${escapedText}" Enter`;

  try {
    await execAsync(command);
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    throw new Error(`Failed to send keys to tmux target ${target}: ${errorMessage}`);
  }
}

/**
 * Parses tmux target from session environment file or debug logs
 * @param sessionId - Claude session UUID
 * @returns tmux target string or null if not found
 */
export async function parseTmuxTarget(sessionId: string): Promise<string | null> {
  // First, try to read from session-env file
  const envFile = join(SESSION_ENV_DIR, sessionId, 'env');
  try {
    const content = await readFile(envFile, 'utf-8');
    const match = content.match(/^CLAUDE_TMUX_TARGET=(.+)$/m);
    if (match) {
      return match[1].trim();
    }
  } catch {
    // File doesn't exist or can't be read, try alternate sources
  }

  // Try reading from a .tmux file in session-env directory
  const tmuxFile = join(SESSION_ENV_DIR, sessionId, '.tmux');
  try {
    const content = await readFile(tmuxFile, 'utf-8');
    return content.trim() || null;
  } catch {
    // File doesn't exist
  }

  // Try parsing from debug logs (projects/*/sessions/sessionId/debug.log)
  try {
    const projectsDir = join(CLAUDE_DIR, 'projects');
    const { stdout } = await execAsync(
      `grep -r "CLAUDE_TMUX_TARGET" ${escapeShellArg(projectsDir)} 2>/dev/null | grep ${escapeShellArg(sessionId)} | head -1`
    );
    if (stdout) {
      const match = stdout.match(/CLAUDE_TMUX_TARGET[=:]?\s*(.+)/);
      if (match) {
        return match[1].trim();
      }
    }
  } catch {
    // grep found nothing or error
  }

  return null;
}

/**
 * Injects a prompt into a Claude session via tmux
 * @param sessionId - Claude session UUID
 * @param prompt - text to inject
 * @param manualTarget - optional manual override for tmux target
 * @returns success status and message
 */
export async function injectPrompt(
  sessionId: string,
  prompt: string,
  manualTarget?: string
): Promise<{ success: boolean; message: string }> {
  // Determine tmux target
  const target = manualTarget || await parseTmuxTarget(sessionId);

  if (!target) {
    return {
      success: false,
      message: `No tmux target found for session ${sessionId}. Launch claude with claude-tmux wrapper or provide manual target.`
    };
  }

  // Validate target exists
  const targetValid = await validateTarget(target);
  if (!targetValid) {
    return {
      success: false,
      message: `Tmux target "${target}" does not exist or is not accessible.`
    };
  }

  // Send the prompt
  try {
    await sendKeys(target, prompt);
    return {
      success: true,
      message: `Prompt sent to tmux target "${target}"`
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    return {
      success: false,
      message: errorMessage
    };
  }
}

/**
 * Lists all available tmux sessions for debugging/selection
 * @returns array of session names or empty array if tmux not running
 */
export async function listTmuxSessions(): Promise<string[]> {
  try {
    const { stdout } = await execAsync('tmux list-sessions -F "#{session_name}" 2>/dev/null');
    return stdout.trim().split('\n').filter(Boolean);
  } catch {
    return [];
  }
}

/**
 * Lists all panes in a session with their indices
 * @param sessionName - tmux session name
 * @returns array of pane targets (session:window.pane format)
 */
export async function listSessionPanes(sessionName: string): Promise<string[]> {
  try {
    const { stdout } = await execAsync(
      `tmux list-panes -s -t ${escapeShellArg(sessionName)} -F "#{session_name}:#{window_index}.#{pane_index}" 2>/dev/null`
    );
    return stdout.trim().split('\n').filter(Boolean);
  } catch {
    return [];
  }
}

/**
 * Writes the tmux target to a session's env file for later retrieval
 * @param sessionId - Claude session UUID
 * @param target - tmux target string
 */
export async function saveTmuxTarget(sessionId: string, target: string): Promise<void> {
  const { mkdir, writeFile } = await import('fs/promises');
  const sessionDir = join(SESSION_ENV_DIR, sessionId);

  try {
    await mkdir(sessionDir, { recursive: true });
    await writeFile(join(sessionDir, '.tmux'), target, 'utf-8');
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    throw new Error(`Failed to save tmux target: ${errorMessage}`);
  }
}
