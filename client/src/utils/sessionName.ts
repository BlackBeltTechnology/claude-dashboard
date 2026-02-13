import type { Session } from 'shared';

/**
 * Get session title from first user prompt
 * Falls back to directory-based display name if no prompt available
 */
export function getSessionTitle(session: Session): string {
  // If we have a first user prompt, use it (truncated to 60 chars)
  if (session.firstUserPrompt && session.firstUserPrompt.length > 0) {
    if (session.firstUserPrompt.length > 60) {
      return session.firstUserPrompt.slice(0, 60) + '...';
    }
    return session.firstUserPrompt;
  }

  // Fall back to directory-based display name
  return getSessionDisplayName(session);
}

/**
 * Get display name for a single session
 * Extracts working directory name from cwd path, or falls back to summary/UUID
 */
export function getSessionDisplayName(session: Session): string {
  // Try to extract directory name from cwd
  if (session.cwd) {
    const segments = session.cwd.split('/').filter(s => s.length > 0);
    if (segments.length > 0) {
      return segments[segments.length - 1];
    }
  }

  // Fallback to summary if available
  if (session.summary) {
    return session.summary;
  }

  // Final fallback: truncated UUID
  return session.id.slice(0, 8) + '...';
}

/**
 * Get disambiguated display names for all sessions
 * When multiple sessions share the same directory name, append #1, #2, etc.
 */
export function getSessionDisplayNames(sessions: Session[]): Map<string, string> {
  const displayNames = new Map<string, string>();

  // First pass: compute base names and count occurrences
  const baseNames = new Map<string, string>();
  const nameCounts = new Map<string, Session[]>();

  for (const session of sessions) {
    const baseName = getSessionDisplayName(session);
    baseNames.set(session.id, baseName);

    if (!nameCounts.has(baseName)) {
      nameCounts.set(baseName, []);
    }
    nameCounts.get(baseName)!.push(session);
  }

  // Second pass: add disambiguation suffixes for duplicates
  for (const [baseName, sessionsWithName] of nameCounts) {
    if (sessionsWithName.length === 1) {
      // No disambiguation needed
      displayNames.set(sessionsWithName[0].id, baseName);
    } else {
      // Sort by createdAt (earliest first) and add #1, #2, etc.
      const sorted = [...sessionsWithName].sort((a, b) => a.createdAt - b.createdAt);
      sorted.forEach((session, index) => {
        displayNames.set(session.id, `${baseName} #${index + 1}`);
      });
    }
  }

  return displayNames;
}
