import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useSessionStore } from '../store/sessionStore';

const styles = {
  overlay: {
    position: 'fixed' as const,
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    zIndex: 1000,
    display: 'flex',
    justifyContent: 'flex-end',
  },
  panel: {
    width: '360px',
    height: '100%',
    backgroundColor: '#16213e',
    borderLeft: '1px solid #0f3460',
    display: 'flex',
    flexDirection: 'column' as const,
    overflow: 'hidden',
  },
  header: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '16px 20px',
    borderBottom: '1px solid #0f3460',
  },
  headerTitle: {
    fontSize: '16px',
    fontWeight: 600,
    color: '#eee',
  },
  closeButton: {
    padding: '4px 8px',
    fontSize: '18px',
    background: 'none',
    border: 'none',
    color: '#888',
    cursor: 'pointer',
    borderRadius: '4px',
    lineHeight: 1,
    transition: 'color 0.15s',
  },
  content: {
    flex: 1,
    overflowY: 'auto' as const,
    padding: '20px',
  },
  section: {
    marginBottom: '24px',
  },
  sectionTitle: {
    fontSize: '11px',
    fontWeight: 600,
    textTransform: 'uppercase' as const,
    color: '#888',
    letterSpacing: '0.5px',
    marginBottom: '12px',
  },
  settingRow: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '10px 0',
    borderBottom: '1px solid rgba(15, 52, 96, 0.5)',
  },
  settingLabel: {
    fontSize: '14px',
    color: '#eee',
  },
  settingDescription: {
    fontSize: '12px',
    color: '#666',
    marginTop: '2px',
  },
  toggle: {
    position: 'relative' as const,
    width: '44px',
    height: '24px',
    borderRadius: '12px',
    cursor: 'pointer',
    transition: 'background-color 0.2s',
    border: 'none',
    padding: 0,
    flexShrink: 0,
  },
  toggleKnob: {
    position: 'absolute' as const,
    top: '2px',
    width: '20px',
    height: '20px',
    borderRadius: '50%',
    backgroundColor: '#fff',
    transition: 'left 0.2s',
  },
  statusRow: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '10px 0',
    borderBottom: '1px solid rgba(15, 52, 96, 0.5)',
  },
  statusLabel: {
    fontSize: '14px',
    color: '#eee',
  },
  statusValue: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    fontSize: '13px',
  },
  statusDot: {
    width: '8px',
    height: '8px',
    borderRadius: '50%',
    flexShrink: 0,
  },
  tmuxBadge: {
    display: 'inline-block',
    padding: '2px 8px',
    borderRadius: '4px',
    fontSize: '12px',
    fontWeight: 500,
  },
};

interface ToggleSwitchProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  disabled?: boolean;
}

function ToggleSwitch({ checked, onChange, disabled }: ToggleSwitchProps) {
  return (
    <button
      style={{
        ...styles.toggle,
        backgroundColor: checked ? '#22c55e' : '#374151',
        opacity: disabled ? 0.5 : 1,
        cursor: disabled ? 'not-allowed' : 'pointer',
      }}
      onClick={() => !disabled && onChange(!checked)}
      role="switch"
      aria-checked={checked}
    >
      <div
        style={{
          ...styles.toggleKnob,
          left: checked ? '22px' : '2px',
        }}
      />
    </button>
  );
}

interface SettingsProps {
  isOpen: boolean;
  onClose: () => void;
  connected: boolean;
  tmuxAvailable: boolean;
}

export function Settings({ isOpen, onClose, connected, tmuxAvailable }: SettingsProps) {
  const sessions = useSessionStore((state) => state.sessions);

  const [browserNotifications, setBrowserNotifications] = useState(() => {
    try {
      return localStorage.getItem('claude-dashboard-browser-notifications') === 'true';
    } catch {
      return false;
    }
  });

  const panelRef = useRef<HTMLDivElement>(null);

  // Handle browser notification toggle
  const handleBrowserNotificationChange = useCallback((checked: boolean) => {
    if (checked && 'Notification' in window && Notification.permission !== 'granted') {
      Notification.requestPermission().then((permission) => {
        if (permission === 'granted') {
          setBrowserNotifications(true);
          try {
            localStorage.setItem('claude-dashboard-browser-notifications', 'true');
          } catch {
            // localStorage unavailable
          }
        }
      });
    } else {
      setBrowserNotifications(checked);
      try {
        localStorage.setItem('claude-dashboard-browser-notifications', String(checked));
      } catch {
        // localStorage unavailable
      }
    }
  }, []);

  // Close on Escape key
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  // Close when clicking outside the panel
  const handleOverlayClick = useCallback(
    (e: React.MouseEvent) => {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        onClose();
      }
    },
    [onClose]
  );

  if (!isOpen) return null;

  const activeSessions = sessions.filter((s) => s.state === 'active').length;
  const waitingSessions = sessions.filter((s) => s.state === 'waiting').length;

  return (
    <div style={styles.overlay} onClick={handleOverlayClick}>
      <div style={styles.panel} ref={panelRef}>
        <div style={styles.header}>
          <span style={styles.headerTitle}>Settings</span>
          <button
            style={styles.closeButton}
            onClick={onClose}
            onMouseEnter={(e) => {
              (e.target as HTMLButtonElement).style.color = '#eee';
            }}
            onMouseLeave={(e) => {
              (e.target as HTMLButtonElement).style.color = '#888';
            }}
            title="Close settings"
          >
            x
          </button>
        </div>

        <div style={styles.content}>
          {/* Status Section */}
          <div style={styles.section}>
            <div style={styles.sectionTitle}>Status</div>

            <div style={styles.statusRow}>
              <span style={styles.statusLabel}>Server Connection</span>
              <div style={styles.statusValue}>
                <div
                  style={{
                    ...styles.statusDot,
                    backgroundColor: connected ? '#22c55e' : '#ef4444',
                  }}
                />
                <span style={{ color: connected ? '#22c55e' : '#ef4444' }}>
                  {connected ? 'Connected' : 'Disconnected'}
                </span>
              </div>
            </div>

            <div style={styles.statusRow}>
              <span style={styles.statusLabel}>Tmux</span>
              <span
                style={{
                  ...styles.tmuxBadge,
                  backgroundColor: tmuxAvailable ? 'rgba(34, 197, 94, 0.15)' : 'rgba(239, 68, 68, 0.15)',
                  color: tmuxAvailable ? '#22c55e' : '#ef4444',
                }}
              >
                {tmuxAvailable ? 'Available' : 'Unavailable'}
              </span>
            </div>

            <div style={styles.statusRow}>
              <span style={styles.statusLabel}>Active Sessions</span>
              <span style={{ fontSize: '14px', color: '#eee' }}>
                {activeSessions}
              </span>
            </div>

            <div style={styles.statusRow}>
              <span style={styles.statusLabel}>Waiting Sessions</span>
              <span style={{ fontSize: '14px', color: '#eee' }}>
                {waitingSessions}
              </span>
            </div>

            <div style={styles.statusRow}>
              <span style={styles.statusLabel}>Total Sessions</span>
              <span style={{ fontSize: '14px', color: '#eee' }}>
                {sessions.length}
              </span>
            </div>
          </div>

          {/* Notifications Section */}
          <div style={styles.section}>
            <div style={styles.sectionTitle}>Notifications</div>

            <div style={styles.settingRow}>
              <div>
                <div style={styles.settingLabel}>Browser Notifications</div>
                <div style={styles.settingDescription}>
                  Notify when a session is waiting for input
                </div>
                {typeof Notification !== 'undefined' && Notification.permission === 'denied' && (
                  <div style={{ marginTop: '8px', fontSize: '12px', color: '#888' }}>
                    Notifications blocked. Enable in browser settings.
                  </div>
                )}
              </div>
              <ToggleSwitch
                checked={browserNotifications}
                onChange={handleBrowserNotificationChange}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
