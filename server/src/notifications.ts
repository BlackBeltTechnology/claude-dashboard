/**
 * Notification Manager Module
 * Sends desktop notifications when sessions transition to 'waiting' state.
 * Includes duplicate suppression and user-configurable preferences.
 */

import { createRequire } from 'module';
import type { SessionState } from 'shared';
import type { NotificationPreferences } from 'shared';
import type { SessionManager } from './watcher.js';

// node-notifier is a CJS module; use createRequire for ESM compatibility
const require = createRequire(import.meta.url);
const notifier = require('node-notifier') as {
  notify: (options: { title: string; message: string; sound?: boolean }) => void;
};

/**
 * NotificationManager - Sends desktop notifications on session state changes.
 *
 * Features:
 * - Desktop notifications when a session enters 'waiting' state
 * - Duplicate suppression: only one notification per session while it remains waiting
 * - User-configurable preferences (desktop + browser toggles)
 */
export class NotificationManager {
  /** Sessions that already have an active 'waiting' notification sent */
  private notifiedSessions: Set<string> = new Set();

  /** User preferences for notification channels */
  private preferences: NotificationPreferences = {
    desktop: true,
    browser: true,
  };

  /** Reference to the session manager for event wiring */
  private sessionManager: SessionManager | null = null;

  /** Bound handler reference for cleanup */
  private boundHandler: ((sessionId: string, agentId: string | undefined, previousState: SessionState, newState: SessionState) => void) | null = null;

  /**
   * Wire up to a SessionManager's state-change events.
   */
  attach(sessionManager: SessionManager): void {
    this.sessionManager = sessionManager;
    this.boundHandler = this.handleStateChange.bind(this);
    this.sessionManager.on('state-change', this.boundHandler);
    console.log('[NotificationManager] Attached to SessionManager');
  }

  /**
   * Detach from the SessionManager and clean up.
   */
  detach(): void {
    if (this.sessionManager && this.boundHandler) {
      this.sessionManager.removeListener('state-change', this.boundHandler);
      this.sessionManager = null;
      this.boundHandler = null;
    }
    this.notifiedSessions.clear();
    console.log('[NotificationManager] Detached');
  }

  /**
   * Handle state-change events from SessionManager.
   * Sends a desktop notification when a session transitions to 'waiting',
   * with duplicate suppression so repeated 'waiting' events for the same
   * session don't fire multiple notifications.
   */
  private handleStateChange(
    sessionId: string,
    agentId: string | undefined,
    _previousState: SessionState,
    newState: SessionState,
  ): void {
    const key = agentId ? `${sessionId}:${agentId}` : sessionId;

    if (newState === 'waiting') {
      // Duplicate suppression: skip if we already notified for this key
      if (this.notifiedSessions.has(key)) {
        return;
      }

      this.notifiedSessions.add(key);

      if (this.preferences.desktop) {
        const label = agentId ? `Agent ${agentId} in session ${sessionId}` : `Session ${sessionId}`;
        try {
          notifier.notify({
            title: 'Claude waiting',
            message: `${label} is waiting for input`,
            sound: true,
          });
          console.log(`[NotificationManager] Desktop notification sent for ${key}`);
        } catch (error) {
          console.error(`[NotificationManager] Failed to send desktop notification:`, error);
        }
      }
    } else {
      // Session left 'waiting' state -- clear from tracking
      if (this.notifiedSessions.has(key)) {
        this.notifiedSessions.delete(key);
        console.log(`[NotificationManager] Cleared notification tracking for ${key}`);
      }
    }
  }

  /**
   * Get current notification preferences.
   */
  getPreferences(): NotificationPreferences {
    return { ...this.preferences };
  }

  /**
   * Update notification preferences.
   */
  setPreferences(prefs: Partial<NotificationPreferences>): NotificationPreferences {
    if (typeof prefs.desktop === 'boolean') {
      this.preferences.desktop = prefs.desktop;
    }
    if (typeof prefs.browser === 'boolean') {
      this.preferences.browser = prefs.browser;
    }
    console.log(`[NotificationManager] Preferences updated: desktop=${this.preferences.desktop}, browser=${this.preferences.browser}`);
    return { ...this.preferences };
  }

  /**
   * Enable desktop notifications.
   */
  enableDesktop(): void {
    this.preferences.desktop = true;
  }

  /**
   * Disable desktop notifications.
   */
  disableDesktop(): void {
    this.preferences.desktop = false;
  }

  /**
   * Enable browser notifications.
   */
  enableBrowser(): void {
    this.preferences.browser = true;
  }

  /**
   * Disable browser notifications.
   */
  disableBrowser(): void {
    this.preferences.browser = false;
  }
}
