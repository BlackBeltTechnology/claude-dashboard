import React from 'react';
import { useSessionStore } from '../store/sessionStore';

const styles = {
  container: {
    display: 'flex',
    flexDirection: 'row' as const,
    gap: '10px',
    alignItems: 'center',
  },
  checkboxLabel: {
    display: 'flex',
    alignItems: 'center',
    gap: '4px',
    fontSize: '12px',
    color: '#ccc',
    cursor: 'pointer',
    whiteSpace: 'nowrap' as const,
    userSelect: 'none' as const,
  },
  checkbox: {
    cursor: 'pointer',
    accentColor: '#e94560',
  },
};

export function FilterBar() {
  const showActive = useSessionStore((state) => state.showActive);
  const showArchived = useSessionStore((state) => state.showArchived);
  const setShowActive = useSessionStore((state) => state.setShowActive);
  const setShowArchived = useSessionStore((state) => state.setShowArchived);

  return (
    <div style={styles.container}>
      <label style={styles.checkboxLabel}>
        <input
          type="checkbox"
          style={styles.checkbox}
          checked={showActive}
          onChange={(e) => setShowActive(e.target.checked)}
        />
        Active
      </label>

      <label style={styles.checkboxLabel}>
        <input
          type="checkbox"
          style={styles.checkbox}
          checked={showArchived}
          onChange={(e) => setShowArchived(e.target.checked)}
        />
        Archived
      </label>
    </div>
  );
}
