import React, { useCallback } from 'react';
import { useSessionStore, FilterType } from '../store/sessionStore';

const FILTER_OPTIONS: { value: FilterType; label: string }[] = [
  { value: 'all', label: 'All' },
  { value: 'session', label: 'Sessions only' },
  { value: 'subagent', label: 'Subagents only' },
  { value: 'tool', label: 'Tools only' },
  { value: 'skill', label: 'Skills only' },
];

const styles = {
  container: {
    display: 'flex',
    gap: '8px',
    padding: '8px 16px',
    borderBottom: '1px solid #0f3460',
    alignItems: 'center',
  },
  select: {
    backgroundColor: '#16213e',
    color: '#eee',
    border: '1px solid #0f3460',
    borderRadius: '4px',
    padding: '4px 8px',
    fontSize: '12px',
    outline: 'none',
    cursor: 'pointer',
    minWidth: '120px',
  },
  searchInput: {
    backgroundColor: '#16213e',
    color: '#eee',
    border: '1px solid #0f3460',
    borderRadius: '4px',
    padding: '4px 8px',
    fontSize: '12px',
    outline: 'none',
    flex: 1,
    minWidth: '80px',
  },
  clearButton: {
    backgroundColor: 'transparent',
    color: '#888',
    border: '1px solid #0f3460',
    borderRadius: '4px',
    padding: '4px 8px',
    fontSize: '11px',
    cursor: 'pointer',
    whiteSpace: 'nowrap' as const,
  },
};

export function FilterBar() {
  const filter = useSessionStore((state) => state.filter);
  const searchTerm = useSessionStore((state) => state.searchTerm);
  const setFilter = useSessionStore((state) => state.setFilter);
  const setSearchTerm = useSessionStore((state) => state.setSearchTerm);

  const handleFilterChange = useCallback(
    (e: React.ChangeEvent<HTMLSelectElement>) => {
      setFilter(e.target.value as FilterType);
    },
    [setFilter]
  );

  const handleSearchChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      setSearchTerm(e.target.value);
    },
    [setSearchTerm]
  );

  const handleClear = useCallback(() => {
    setFilter('all');
    setSearchTerm('');
  }, [setFilter, setSearchTerm]);

  const isActive = filter !== 'all' || searchTerm !== '';

  return (
    <div style={styles.container}>
      <select
        style={styles.select}
        value={filter}
        onChange={handleFilterChange}
        aria-label="Filter by node type"
      >
        {FILTER_OPTIONS.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>

      <input
        style={styles.searchInput}
        type="text"
        placeholder="Search..."
        value={searchTerm}
        onChange={handleSearchChange}
        aria-label="Search nodes"
      />

      {isActive && (
        <button
          style={styles.clearButton}
          onClick={handleClear}
          title="Clear filters"
        >
          Clear
        </button>
      )}
    </div>
  );
}
