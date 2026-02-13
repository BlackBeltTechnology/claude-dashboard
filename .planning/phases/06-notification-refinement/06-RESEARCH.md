# Phase 6: Notification Refinement - Research

**Researched:** 2026-02-09
**Domain:** Web Notifications API, browser notification patterns
**Confidence:** HIGH

## Summary

This phase simplifies the notification system by removing server-side desktop notifications (node-notifier) and relying exclusively on the Web Notifications API in the browser. The system currently has dual notification channels (server-side desktop via node-notifier and client-side browser via Web Notifications API), creating unnecessary complexity. The refactoring will:

1. Remove the server-side NotificationManager and node-notifier dependency
2. Enhance the client-side useNotifications hook to use working directory names (established in Phase 3)
3. Simplify the Settings UI by removing the desktop notification toggle
4. Update notification content to be more actionable and user-friendly

**Primary recommendation:** Remove server-side notifications entirely. The client-side Web Notifications API is sufficient, more maintainable, and provides better user control. Session naming logic from Phase 3 (`getSessionDisplayName`) should be reused for notification content.

## Standard Stack

The established approach for browser notifications:

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| Web Notifications API | Browser native | Display desktop notifications from web apps | Native browser API, no dependencies, works across all modern browsers, user-controlled permissions |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| localStorage | Browser native | Persist user notification preferences | Storing user's opt-in/opt-out choice across sessions |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Web Notifications API | node-notifier (server-side) | Server-side requires OS-level permissions, adds complexity, harder to debug, less user control. Only justified for headless/background scenarios |
| Web Notifications API | Service Worker Push API | Push API is for server-initiated notifications when browser is closed. Overkill for dashboard that requires active browser session |

**Installation:**
```bash
# No installation needed - Web Notifications API is browser native
# Remove node-notifier from server:
cd server && npm uninstall node-notifier
```

## Architecture Patterns

### Recommended Project Structure
```
client/src/
├── hooks/
│   └── useNotifications.ts    # Simplified browser-only notification hook
├── utils/
│   └── sessionName.ts          # Reuse getSessionDisplayName from Phase 3
└── components/
    └── Settings.tsx            # Remove desktop notification toggle

server/src/
├── notifications.ts            # DELETE - no longer needed
└── index.ts                    # Remove NotificationManager wiring
```

### Pattern 1: Permission Request on User Action
**What:** Request notification permission in response to explicit user action, not on page load
**When to use:** Always - browsers enforce this for security

**Example:**
```typescript
// Source: https://developer.mozilla.org/en-US/docs/Web/API/Notifications_API/Using_the_Notifications_API

function requestNotificationPermission() {
  if (!('Notification' in window)) {
    console.warn('[Notifications] Browser does not support notifications');
    return;
  }

  // Request permission only on user gesture (button click)
  if (Notification.permission === 'default') {
    Notification.requestPermission().then((permission) => {
      if (permission === 'granted') {
        console.log('[Notifications] Permission granted');
      }
    });
  }
}

// Attach to button click, NOT page load
button.addEventListener('click', requestNotificationPermission);
```

### Pattern 2: Tag-Based Notification Deduplication
**What:** Use the `tag` option to replace previous notifications instead of stacking them
**When to use:** When multiple events of the same type can occur (e.g., multiple sessions entering 'waiting' state)

**Example:**
```typescript
// Source: https://developer.mozilla.org/en-US/docs/Web/API/Notification/tag

// Without tag: User gets flooded with notifications
new Notification('Session 1 waiting');
new Notification('Session 2 waiting');
new Notification('Session 3 waiting');
// Result: 3 notification pop-ups

// With tag: Only latest notification shows
new Notification('Session 1 waiting', { tag: 'session-waiting' });
new Notification('Session 2 waiting', { tag: 'session-waiting' });
new Notification('Session 3 waiting', { tag: 'session-waiting' });
// Result: Only 1 notification showing "Session 3 waiting"
```

### Pattern 3: Focus Window on Click
**What:** When user clicks notification, focus the browser window/tab showing the dashboard
**When to use:** Always - helps user navigate to the relevant context

**Example:**
```typescript
// Source: https://developer.mozilla.org/en-US/docs/Web/API/Notification

const notification = new Notification(title, { body, icon, tag });

notification.onclick = () => {
  window.focus();           // Focus browser window
  notification.close();     // Close notification
};
```

### Pattern 4: Respect Document Focus (Don't Spam Active Users)
**What:** Don't show notifications when the dashboard is already in focus
**When to use:** Always - avoids annoying users who are actively using the app

**Example:**
```typescript
// Source: Existing codebase pattern (useNotifications.ts line 35)

function showNotification(title: string, body: string) {
  if (document.hasFocus()) return; // Skip if dashboard is focused

  const notification = new Notification(title, {
    body,
    icon: '/favicon.ico',
    tag: 'session-waiting',
  });
}
```

### Pattern 5: Derive Human-Readable Names from Context
**What:** Show working directory names instead of UUIDs in notification content
**When to use:** Always - UUIDs are meaningless to users

**Example:**
```typescript
// Source: Phase 3 implementation (sessionName.ts)

import { getSessionDisplayName } from '../utils/sessionName';

// Before (Phase 5):
// "Session 8f3a2b1c-... is waiting for input"

// After (Phase 6):
const sessionName = getSessionDisplayName(session);
showNotification('Session Waiting', `${sessionName} is waiting for input`);
// "claude-session-dashboard is waiting for input"
```

### Anti-Patterns to Avoid

- **Requesting permission on page load:** Browsers block this, and it's poor UX. Users should explicitly opt-in.
- **Using setTimeout() for auto-close:** Removes notification from tray before user can interact. Let browser handle auto-dismiss (typically 4-8 seconds).
- **Ignoring permission state:** Once denied, you cannot request again programmatically. Must guide user to browser settings.
- **Generic notification text:** "Session waiting" is not actionable. Use specific names: "claude-session-dashboard is waiting"

## Don't Hand-Roll

Problems that look simple but have existing solutions:

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Session name display | Custom UUID truncation logic | `getSessionDisplayName` from Phase 3 | Already handles cwd extraction, fallback to summary, UUID truncation, and disambiguation (multiple sessions with same directory name) |
| Notification deduplication | Custom tracking with arrays/sets | `tag` option in Notification API | Browser-native, handles replacement automatically, prevents notification spam |
| Permission state management | Custom localStorage schema | `Notification.permission` static property | Browser maintains state, no need to persist manually |
| Cross-browser permission API | Polyfills or version detection | Promise-based `Notification.requestPermission()` | Modern browsers support promises; legacy callback still works for older browsers |

**Key insight:** The Web Notifications API is mature and handles most complexity. Don't reinvent permission management, deduplication, or auto-dismiss behavior.

## Common Pitfalls

### Pitfall 1: Permission Denied is Permanent
**What goes wrong:** Once user clicks "Block" on permission dialog, the app cannot request permission again programmatically
**Why it happens:** Browser security model prevents spammy permission requests
**How to avoid:**
- Only request permission in response to explicit user action (button click)
- Use a "soft prompt" (custom HTML/CSS) before showing native browser prompt
- If denied, provide clear instructions for manually enabling in browser settings
**Warning signs:**
- `Notification.permission === 'denied'` and request does nothing
- Permission dialog never appears on subsequent requests

**Source:** [Reset the denied permission for notifications - Pushpad](https://pushpad.xyz/blog/reset-the-denied-permission-for-notifications)

### Pitfall 2: Notification Spam Floods User
**What goes wrong:** Multiple rapid state changes create dozens of notification pop-ups
**Why it happens:** Not using `tag` option for deduplication, or creating unique tags per notification
**How to avoid:**
- Use consistent `tag` values for same notification type (e.g., `'session-waiting'`)
- Tag replaces previous notification instead of stacking
**Warning signs:**
- User complaints about notification spam
- Notification tray filled with duplicate messages

**Source:** [Using the Notifications API - MDN](https://developer.mozilla.org/en-US/docs/Web/API/Notifications_API/Using_the_Notifications_API)

### Pitfall 3: Showing Notifications When User is Active
**What goes wrong:** Dashboard shows notifications even when user is actively looking at it
**Why it happens:** Not checking `document.hasFocus()` before showing notification
**How to avoid:**
- Always check `document.hasFocus()` before creating notification
- Notifications should only alert user when they're NOT actively using the app
**Warning signs:**
- Notifications appearing while user is typing in the app
- Redundant notifications for events user can already see

### Pitfall 4: Non-Actionable Notification Content
**What goes wrong:** Notification says "Session 8f3a2b1c-4e5d-... is waiting" — user has no idea which project
**Why it happens:** Using raw session UUIDs instead of human-readable names
**How to avoid:**
- Use `getSessionDisplayName(session)` to extract working directory name
- Notification body should be: "claude-session-dashboard is waiting for input"
**Warning signs:**
- User confusion about which session triggered notification
- Users ignoring notifications because they're not meaningful

### Pitfall 5: Browser Compatibility Assumptions
**What goes wrong:** Code assumes all browsers support promise-based `requestPermission()`, breaks in older browsers
**Why it happens:** Modern APIs have legacy callback-based alternatives still in use
**How to avoid:**
- Use promise-based API (preferred), but it works in all modern browsers
- Test on Firefox, Chrome, Safari, Edge
**Warning signs:**
- TypeError: `requestPermission(...).then is not a function`
- Notifications work in Chrome but not Safari

**Source:** [Notification.requestPermission() - MDN](https://developer.mozilla.org/en-US/docs/Web/API/Notification/requestPermission_static)

### Pitfall 6: Server-Side Notification State Mismatch
**What goes wrong:** Server tracks notification preferences, but client has different permission state
**Why it happens:** Mixing server-side notification management with browser-controlled permissions
**How to avoid:**
- Remove server-side notification logic entirely for browser-based apps
- Let browser manage permission state via `Notification.permission`
- Store user's opt-in preference in localStorage (not server-side)
**Warning signs:**
- Settings say "enabled" but notifications don't show
- Notification preferences API returns different state than browser

## Code Examples

Verified patterns from official sources:

### Permission Request with Feature Detection
```typescript
// Source: https://developer.mozilla.org/en-US/docs/Web/API/Notifications_API/Using_the_Notifications_API

function setupNotifications() {
  // 1. Check browser support
  if (!('Notification' in window)) {
    console.warn('This browser does not support notifications');
    return;
  }

  // 2. Check current permission state
  if (Notification.permission === 'granted') {
    // Already granted - can show notifications
    return;
  }

  // 3. If permission is 'default', we can request
  if (Notification.permission === 'default') {
    Notification.requestPermission().then((permission) => {
      if (permission === 'granted') {
        console.log('Notification permission granted');
      }
    });
  }

  // 4. If permission is 'denied', cannot request again
  if (Notification.permission === 'denied') {
    console.warn('Notification permission denied - user must enable manually');
  }
}
```

### Complete Notification Hook (Browser-Only)
```typescript
// Source: Adapted from existing useNotifications.ts + Phase 3 sessionName.ts

import { useEffect, useRef, useCallback } from 'react';
import { useSessionStore } from '../store/sessionStore';
import { getSessionDisplayName } from '../utils/sessionName';
import type { WSMessage, StateChangePayload } from 'shared';

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

  const showNotification = useCallback((title: string, body: string) => {
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
  }, []);

  // Listen for state-change messages
  useEffect(() => {
    if (!lastMessage) return;
    if (lastMessage.type !== 'state-change') return;

    const payload = lastMessage.payload as StateChangePayload;

    if (payload.newState === 'waiting') {
      const sessions = useSessionStore.getState().sessions;
      const session = sessions.find((s) => s.id === payload.sessionId);

      if (!session) return;

      // Use working directory name from Phase 3
      const sessionName = getSessionDisplayName(session);

      showNotification(
        'Session Waiting',
        `${sessionName} is waiting for input`
      );
    }
  }, [lastMessage, showNotification]);
}
```

### Notification with Click Handler and Auto-Close
```typescript
// Source: https://developer.mozilla.org/en-US/docs/Web/API/Notification

function createNotification(title: string, body: string) {
  const notification = new Notification(title, {
    body,
    icon: '/favicon.ico',
    tag: 'session-waiting',
  });

  // Focus window when clicked
  notification.onclick = () => {
    window.focus();
    notification.close();
  };

  // Error handling
  notification.onerror = () => {
    console.error('[Notifications] Failed to display notification');
  };

  // Auto-close after 8 seconds
  setTimeout(() => notification.close(), 8000);
}
```

### Simplified Settings Component (Browser-Only)
```typescript
// Source: Adapted from existing Settings.tsx

// Remove desktop notification state and API calls
// Keep only browser notification toggle

const [browserNotifications, setBrowserNotifications] = useState(() => {
  try {
    return localStorage.getItem('claude-dashboard-browser-notifications') === 'true';
  } catch {
    return false;
  }
});

const handleBrowserNotificationChange = useCallback((checked: boolean) => {
  if (checked && 'Notification' in window && Notification.permission !== 'granted') {
    Notification.requestPermission().then((permission) => {
      if (permission === 'granted') {
        setBrowserNotifications(true);
        localStorage.setItem('claude-dashboard-browser-notifications', 'true');
      }
    });
  } else {
    setBrowserNotifications(checked);
    localStorage.setItem('claude-dashboard-browser-notifications', String(checked));
  }
}, []);
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Server-side notifications (node-notifier) | Web Notifications API (browser-only) | 2018-2020 | Web Notifications became standard; server-side only needed for headless/daemon scenarios |
| Callback-based `requestPermission(callback)` | Promise-based `requestPermission().then()` | 2017 | Promises are now standard; callback still works but deprecated |
| Manual permission state tracking | Browser-managed `Notification.permission` | Always standard | Browser handles state; no need for custom persistence |
| Multiple notification pop-ups | `tag` option for deduplication | Always supported | Tag-based replacement prevents notification spam |

**Deprecated/outdated:**
- **node-notifier for web apps:** Only justified for Node.js daemons or Electron apps without browser UI. For web dashboards, Web Notifications API is simpler and more user-friendly.
- **Callback-based requestPermission:** `Notification.requestPermission(function(perm) {})` is deprecated. Use promise-based API: `Notification.requestPermission().then(perm => {})`
- **NotificationPreferences type with desktop/browser flags:** After Phase 6, only browser notifications remain. Remove the `NotificationPreferences` type from shared types.

## Open Questions

Things that couldn't be fully resolved:

1. **Should we preserve notification preference across devices/browsers?**
   - What we know: Current implementation uses localStorage (browser-local only)
   - What's unclear: Whether users want notification preferences synced across devices
   - Recommendation: Keep localStorage approach for now. Phase 3 established local-first preferences for session naming. Sync can be added later if requested.

2. **Should notification content include subagent information?**
   - What we know: StateChangePayload includes optional `agentId` field
   - What's unclear: How to display "Subagent X in session Y is waiting" vs "Session Y is waiting"
   - Recommendation: For Phase 6, simplify to session-level notifications only. Subagent notifications can be added in a future phase if needed.

3. **Should we support notification actions (buttons)?**
   - What we know: Notification API supports `actions` array (experimental, not widely supported)
   - What's unclear: Whether "Send prompt" or "Focus session" actions would be useful
   - Recommendation: Skip actions for Phase 6. Focus on clarity and reliability first. Actions can be added later if user feedback requests them.

## Sources

### Primary (HIGH confidence)
- [Using the Notifications API - MDN](https://developer.mozilla.org/en-US/docs/Web/API/Notifications_API/Using_the_Notifications_API) - Complete API guide, permission flow, best practices
- [Notification API Reference - MDN](https://developer.mozilla.org/en-US/docs/Web/API/Notification) - Constructor options, properties, methods, event handlers
- [Notification.body property - MDN](https://developer.mozilla.org/en-US/docs/Web/API/Notification/body) - Body content specification
- [Notification.tag property - MDN](https://developer.mozilla.org/en-US/docs/Web/API/Notification/tag) - Deduplication mechanism
- [Notification.requestPermission() - MDN](https://developer.mozilla.org/en-US/docs/Web/API/Notification/requestPermission_static) - Permission request flow

### Secondary (MEDIUM confidence)
- [Web Notifications Best Practices - Usersnap](https://usersnap.com/blog/browser-notifications-best-practices/) - Permission timing, content guidelines, UX patterns (verified with MDN)
- [Reset denied permission - Pushpad](https://pushpad.xyz/blog/reset-the-denied-permission-for-notifications) - Permission denial recovery strategies (verified with MDN)
- [node-notifier npm](https://www.npmjs.com/package/node-notifier) - Desktop notification library being removed (verified with package.json)

### Tertiary (LOW confidence)
- [14 Push Notification Best Practices - Reteno](https://reteno.com/blog/push-notification-best-practices-ultimate-guide-for-2026) - Timing recommendations (not verified with official source, but consistent with UX principles)
- [7 Web Push Mistakes - PushPushGo](https://pushpushgo.com/en/blog/web-push-mistakes) - Content and timing pitfalls (not verified with official source)

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - Web Notifications API is standard, well-documented, no alternatives needed
- Architecture: HIGH - Patterns verified with MDN official documentation and existing codebase
- Pitfalls: HIGH - Permission denial, deduplication, focus checking all verified with official docs
- Session naming integration: HIGH - Phase 3 established `getSessionDisplayName` utility (verified with codebase)

**Research date:** 2026-02-09
**Valid until:** 2026-09-09 (6 months - Web Notifications API is stable, minimal change expected)
