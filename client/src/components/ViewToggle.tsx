import React from 'react';
import { useSessionStore } from '../store/sessionStore';

const styles = {
  container: {
    display: 'flex',
    alignItems: 'center',
    gap: '2px',
    backgroundColor: '#0f1729',
    borderRadius: '6px',
    padding: '2px',
    border: '1px solid #0f3460',
  },
  button: {
    padding: '6px 14px',
    fontSize: '12px',
    fontWeight: 500,
    border: 'none',
    borderRadius: '4px',
    cursor: 'pointer',
    transition: 'background-color 0.15s, color 0.15s',
    color: '#888',
    backgroundColor: 'transparent',
  },
  buttonActive: {
    backgroundColor: '#0f3460',
    color: '#eee',
  },
};

export function ViewToggle() {
  const viewMode = useSessionStore((state) => state.viewMode);
  const setViewMode = useSessionStore((state) => state.setViewMode);

  return (
    <div style={styles.container}>
      <button
        style={{
          ...styles.button,
          ...(viewMode === 'tree' ? styles.buttonActive : {}),
        }}
        onClick={() => setViewMode('tree')}
        title="Tree View"
      >
        Tree
      </button>
      <button
        style={{
          ...styles.button,
          ...(viewMode === 'graph' ? styles.buttonActive : {}),
        }}
        onClick={() => setViewMode('graph')}
        title="Graph View"
      >
        Graph
      </button>
    </div>
  );
}
