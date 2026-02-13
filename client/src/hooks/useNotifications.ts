import { useEffect, useRef, useCallback } from 'react';
import { useSessionStore } from '../store/sessionStore';
import { getSessionDisplayName } from '../utils/sessionName';
import type { WSMessage, StateChangePayload } from 'shared';

/**
 * Request Notification permission on first load.
 * Listen for 'state-change' WebSocket messages.
 * Show browser Notification when a session enters 'waiting' state.
 * Focus dashboard on notification click.
 */
export function useNotifications(lastMessage: WSMessage | null) {
  const permissionRef = useRef<NotificationPermission>('default');

  // Request permission on mount
  useEffect(() => {
    if (!('Notification' in window)) {
      console.warn('[Notifications] Browser does not support notifications');
      return;
    }

    if (Notification.permission === 'granted') {
      permissionRef.current = 'granted';
    } else if (Notification.permission !== 'denied') {
      Notification.requestPermission().then((perm) => {
        permissionRef.current = perm;
      });
    } else {
      permissionRef.current = 'denied';
    }
  }, []);

  const showNotification = useCallback(
    (title: string, body: string) => {
      // Check if notifications are enabled in settings
      const enabled = localStorage.getItem('claude-dashboard-browser-notifications') === 'true';
      if (!enabled) return;

      if (permissionRef.current !== 'granted') return;
      if (document.hasFocus()) return; // Don't notify if dashboard is focused

      try {
        const notification = new Notification(title, {
          body,
          icon: '/favicon.ico',
          tag: 'session-waiting', // Collapse duplicate notifications
        });

        notification.onclick = () => {
          window.focus();
          notification.close();
        };

        // Auto-close after 8 seconds
        setTimeout(() => notification.close(), 8000);
      } catch (err) {
        console.error('[Notifications] Failed to show notification:', err);
      }
    },
    []
  );

  // Listen for state-change messages
  useEffect(() => {
    if (!lastMessage) return;
    if (lastMessage.type !== 'state-change') return;

    const payload = lastMessage.payload as StateChangePayload;

    if (payload.newState === 'waiting') {
      const sessions = useSessionStore.getState().sessions;
      const session = sessions.find((s) => s.id === payload.sessionId);

      // Build notification title with folder path
      const folderPath = payload.cwd || session?.cwd || 'Unknown folder';
      const title = `Session Ready: ${folderPath}`;

      // Build notification body with last command
      const lastCommand = payload.lastUserPrompt || session?.lastUserPrompt || 'No command recorded';
      const body = `Last command: ${lastCommand.length > 60 ? lastCommand.slice(0, 60) + '...' : lastCommand}`;

      showNotification(title, body);
    }
  }, [lastMessage, showNotification]);
}
