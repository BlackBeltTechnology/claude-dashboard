import React, { useState, useEffect, useCallback } from 'react';
import type { Session } from 'shared';
import { usePromptSend } from '../hooks/usePromptSend';
import { TmuxStatus } from './TmuxStatus';

const styles = {
  container: {
    padding: '16px',
    borderTop: '1px solid #0f3460',
    backgroundColor: '#0f0f1a',
  },
  disabled: {
    opacity: 0.5,
  },
  disabledMessage: {
    textAlign: 'center' as const,
    padding: '12px',
    color: '#888',
    fontSize: '13px',
    backgroundColor: 'rgba(255, 255, 255, 0.02)',
    borderRadius: '6px',
    marginTop: '12px',
  },
  inputSection: {
    marginTop: '12px',
  },
  textareaWrapper: {
    position: 'relative' as const,
  },
  textarea: {
    width: '100%',
    minHeight: '80px',
    maxHeight: '200px',
    padding: '12px',
    fontSize: '14px',
    fontFamily: 'inherit',
    backgroundColor: '#1a1a2e',
    border: '1px solid #0f3460',
    borderRadius: '6px',
    color: '#eee',
    resize: 'vertical' as const,
    outline: 'none',
    transition: 'border-color 0.15s',
    boxSizing: 'border-box' as const,
  },
  textareaFocused: {
    borderColor: '#e94560',
  },
  textareaDisabled: {
    backgroundColor: '#0f0f1a',
    cursor: 'not-allowed',
  },
  footer: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: '12px',
  },
  hint: {
    fontSize: '11px',
    color: '#666',
  },
  buttonGroup: {
    display: 'flex',
    gap: '8px',
  },
  sendButton: {
    padding: '8px 16px',
    fontSize: '13px',
    fontWeight: 500,
    backgroundColor: '#e94560',
    border: 'none',
    borderRadius: '4px',
    color: '#fff',
    cursor: 'pointer',
    transition: 'background-color 0.15s, opacity 0.15s',
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
  },
  sendButtonDisabled: {
    opacity: 0.5,
    cursor: 'not-allowed',
  },
  sendButtonLoading: {
    backgroundColor: '#b33a4e',
  },
  feedback: {
    padding: '10px 12px',
    borderRadius: '4px',
    fontSize: '13px',
    marginTop: '12px',
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
  },
  feedbackSuccess: {
    backgroundColor: 'rgba(34, 197, 94, 0.1)',
    border: '1px solid rgba(34, 197, 94, 0.3)',
    color: '#22c55e',
  },
  feedbackError: {
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    border: '1px solid rgba(239, 68, 68, 0.3)',
    color: '#ef4444',
  },
  dismissButton: {
    marginLeft: 'auto',
    padding: '2px 6px',
    fontSize: '11px',
    background: 'none',
    border: '1px solid currentColor',
    borderRadius: '3px',
    color: 'inherit',
    cursor: 'pointer',
    opacity: 0.7,
  },
  spinner: {
    width: '14px',
    height: '14px',
    border: '2px solid transparent',
    borderTopColor: '#fff',
    borderRadius: '50%',
    animation: 'spin 0.8s linear infinite',
  },
};

// Add keyframes for spinner animation
const spinnerKeyframes = `
@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}
`;

interface PromptInputProps {
  session: Session;
}

export function PromptInput({ session }: PromptInputProps) {
  const [prompt, setPrompt] = useState('');
  const [isFocused, setIsFocused] = useState(false);
  const [tmuxOverride, setTmuxOverride] = useState<string | undefined>();

  const { sendPrompt, isLoading, error, success, clearStatus } = usePromptSend();

  const effectiveTarget = tmuxOverride || session.tmuxTarget;
  const canSend = session.state === 'waiting' && Boolean(effectiveTarget);
  const isActive = session.state === 'active';

  // Auto-clear success message after 3 seconds
  useEffect(() => {
    if (success) {
      const timer = setTimeout(clearStatus, 3000);
      return () => clearTimeout(timer);
    }
  }, [success, clearStatus]);

  const handleSend = useCallback(async () => {
    if (!canSend || !prompt.trim() || isLoading) return;

    const sent = await sendPrompt(session.id, prompt.trim(), tmuxOverride);
    if (sent) {
      setPrompt('');
    }
  }, [canSend, prompt, isLoading, sendPrompt, session.id, tmuxOverride]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    // Cmd/Ctrl + Enter to send
    if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
      e.preventDefault();
      handleSend();
    }
  };

  // Inject spinner keyframes
  useEffect(() => {
    const styleId = 'prompt-input-spinner-style';
    if (!document.getElementById(styleId)) {
      const styleEl = document.createElement('style');
      styleEl.id = styleId;
      styleEl.textContent = spinnerKeyframes;
      document.head.appendChild(styleEl);
    }
  }, []);

  return (
    <div style={styles.container}>
      <TmuxStatus
        tmuxTarget={session.tmuxTarget}
        overrideTarget={tmuxOverride}
        onOverrideChange={setTmuxOverride}
      />

      {isActive && (
        <div style={styles.disabledMessage}>
          Session is currently processing. Wait for it to finish before sending a prompt.
        </div>
      )}

      {!isActive && !effectiveTarget && (
        <div style={styles.disabledMessage}>
          No tmux target available. Set a manual target above to enable prompt injection.
        </div>
      )}

      {(!isActive || effectiveTarget) && (
        <div style={{ ...styles.inputSection, ...((!canSend || isLoading) ? styles.disabled : {}) }}>
          <div style={styles.textareaWrapper}>
            <textarea
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              onKeyDown={handleKeyDown}
              onFocus={() => setIsFocused(true)}
              onBlur={() => setIsFocused(false)}
              placeholder={canSend ? 'Enter your prompt...' : 'Waiting for session...'}
              disabled={!canSend || isLoading}
              style={{
                ...styles.textarea,
                ...(isFocused ? styles.textareaFocused : {}),
                ...((!canSend || isLoading) ? styles.textareaDisabled : {}),
              }}
            />
          </div>

          <div style={styles.footer}>
            <span style={styles.hint}>
              {canSend ? 'Ctrl+Enter to send' : ''}
            </span>
            <div style={styles.buttonGroup}>
              <button
                onClick={handleSend}
                disabled={!canSend || !prompt.trim() || isLoading}
                style={{
                  ...styles.sendButton,
                  ...((!canSend || !prompt.trim() || isLoading) ? styles.sendButtonDisabled : {}),
                  ...(isLoading ? styles.sendButtonLoading : {}),
                }}
              >
                {isLoading && <div style={styles.spinner} />}
                {isLoading ? 'Sending...' : 'Send Prompt'}
              </button>
            </div>
          </div>

          {(success || error) && (
            <div
              style={{
                ...styles.feedback,
                ...(success ? styles.feedbackSuccess : styles.feedbackError),
              }}
            >
              <span>{success || error}</span>
              <button
                style={styles.dismissButton}
                onClick={clearStatus}
              >
                Dismiss
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
