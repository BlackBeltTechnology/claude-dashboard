import React, { useState } from 'react';

const styles = {
  container: {
    padding: '12px 16px',
    borderRadius: '6px',
    fontSize: '13px',
  },
  connected: {
    backgroundColor: 'rgba(34, 197, 94, 0.1)',
    border: '1px solid rgba(34, 197, 94, 0.3)',
  },
  disconnected: {
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    border: '1px solid rgba(239, 68, 68, 0.3)',
  },
  header: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
  },
  statusDot: {
    width: '8px',
    height: '8px',
    borderRadius: '50%',
    flexShrink: 0,
  },
  statusText: {
    fontWeight: 500,
  },
  targetText: {
    marginTop: '4px',
    fontSize: '12px',
    color: '#888',
    fontFamily: 'monospace',
  },
  overrideSection: {
    marginTop: '8px',
    paddingTop: '8px',
    borderTop: '1px solid rgba(255, 255, 255, 0.1)',
  },
  overrideToggle: {
    fontSize: '11px',
    color: '#888',
    cursor: 'pointer',
    background: 'none',
    border: 'none',
    padding: 0,
    textDecoration: 'underline',
  },
  overrideInput: {
    display: 'flex',
    gap: '8px',
    marginTop: '8px',
  },
  input: {
    flex: 1,
    padding: '6px 10px',
    fontSize: '12px',
    fontFamily: 'monospace',
    backgroundColor: '#1a1a2e',
    border: '1px solid #0f3460',
    borderRadius: '4px',
    color: '#eee',
    outline: 'none',
  },
  applyButton: {
    padding: '6px 12px',
    fontSize: '12px',
    backgroundColor: '#0f3460',
    border: '1px solid #16213e',
    borderRadius: '4px',
    color: '#eee',
    cursor: 'pointer',
    transition: 'background-color 0.15s',
  },
  clearButton: {
    padding: '6px 8px',
    fontSize: '12px',
    backgroundColor: 'transparent',
    border: '1px solid #374151',
    borderRadius: '4px',
    color: '#888',
    cursor: 'pointer',
    transition: 'background-color 0.15s',
  },
};

interface TmuxStatusProps {
  tmuxTarget: string | undefined;
  overrideTarget: string | undefined;
  onOverrideChange: (target: string | undefined) => void;
}

export function TmuxStatus({ tmuxTarget, overrideTarget, onOverrideChange }: TmuxStatusProps) {
  const [showOverride, setShowOverride] = useState(false);
  const [inputValue, setInputValue] = useState(overrideTarget || '');

  const effectiveTarget = overrideTarget || tmuxTarget;
  const isConnected = Boolean(effectiveTarget);
  const isOverridden = Boolean(overrideTarget);

  const handleApply = () => {
    const trimmed = inputValue.trim();
    onOverrideChange(trimmed || undefined);
    if (!trimmed) {
      setShowOverride(false);
    }
  };

  const handleClear = () => {
    setInputValue('');
    onOverrideChange(undefined);
    setShowOverride(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleApply();
    } else if (e.key === 'Escape') {
      setInputValue(overrideTarget || '');
      setShowOverride(false);
    }
  };

  return (
    <div style={{ ...styles.container, ...(isConnected ? styles.connected : styles.disconnected) }}>
      <div style={styles.header}>
        <div
          style={{
            ...styles.statusDot,
            backgroundColor: isConnected ? '#22c55e' : '#ef4444',
          }}
        />
        <span style={{ ...styles.statusText, color: isConnected ? '#22c55e' : '#ef4444' }}>
          {isConnected ? 'Connected to tmux' : 'Not in tmux'}
        </span>
        {isOverridden && (
          <span style={{ fontSize: '11px', color: '#888' }}>(manual override)</span>
        )}
      </div>

      {isConnected && (
        <div style={styles.targetText}>
          Target: {effectiveTarget}
        </div>
      )}

      {!isConnected && !showOverride && (
        <div style={{ ...styles.targetText, color: '#ef4444' }}>
          Prompt injection unavailable
        </div>
      )}

      <div style={styles.overrideSection}>
        {!showOverride ? (
          <button
            style={styles.overrideToggle}
            onClick={() => setShowOverride(true)}
          >
            {isConnected ? 'Change tmux target' : 'Set tmux target manually'}
          </button>
        ) : (
          <div style={styles.overrideInput}>
            <input
              type="text"
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="session:window.pane"
              style={styles.input}
              autoFocus
            />
            <button
              style={styles.applyButton}
              onClick={handleApply}
            >
              Apply
            </button>
            {isOverridden && (
              <button
                style={styles.clearButton}
                onClick={handleClear}
              >
                Clear
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
