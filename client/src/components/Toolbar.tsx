import React, { useState } from 'react';
import { useSessionStore } from '../store/sessionStore';
import { FilterBar } from './FilterBar';
import { getSessionTitle } from '../utils/sessionName';

interface ToolbarProps {
  connected: boolean;
  onOpenSettings: () => void;
}

const styles = {
  toolbar: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '8px 20px',
    backgroundColor: '#16213e',
    borderBottom: '1px solid #0f3460',
  },
  leftSection: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
  },
  rightSection: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
  },
  title: {
    fontSize: '18px',
    fontWeight: 600,
    color: '#e94560',
    margin: 0,
  },
  sessionTitle: {
    fontSize: '16px',
    fontWeight: 500,
    color: '#eee',
    margin: 0,
    maxWidth: '400px',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap' as const,
  },
  button: {
    padding: '6px 10px',
    fontSize: '14px',
    background: 'none',
    border: '1px solid #0f3460',
    borderRadius: '6px',
    color: '#888',
    cursor: 'pointer',
    transition: 'color 0.15s, border-color 0.15s',
    lineHeight: 1,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  settingsButton: {
    padding: '6px 10px',
    fontSize: '16px',
    background: 'none',
    border: '1px solid #0f3460',
    borderRadius: '6px',
    color: '#888',
    cursor: 'pointer',
    transition: 'color 0.15s, border-color 0.15s',
    lineHeight: 1,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  sessionCount: {
    fontSize: '13px',
    color: '#888',
    whiteSpace: 'nowrap' as const,
  },
  sessionSwitcher: {
    backgroundColor: '#16213e',
    color: '#eee',
    border: '1px solid #0f3460',
    borderRadius: '4px',
    padding: '4px 8px',
    fontSize: '13px',
    outline: 'none',
    cursor: 'pointer',
    maxWidth: '200px',
  },
  connectionStatus: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    fontSize: '12px',
    color: '#888',
  },
  statusDot: {
    width: '6px',
    height: '6px',
    borderRadius: '50%',
  },
  filterChip: {
    padding: '2px 8px',
    fontSize: '11px',
    borderRadius: '10px',
    border: '1px solid #0f3460',
    background: 'none',
    color: '#888',
    cursor: 'pointer',
    transition: 'all 0.15s',
    lineHeight: '16px',
  },
  filterChipActive: {
    padding: '2px 8px',
    fontSize: '11px',
    borderRadius: '10px',
    border: '1px solid #0f3460',
    backgroundColor: '#1a1a2e',
    color: '#eee',
    cursor: 'pointer',
    transition: 'all 0.15s',
    lineHeight: '16px',
  },
  filterGroup: {
    display: 'flex',
    alignItems: 'center',
    gap: '4px',
    flexWrap: 'wrap' as const,
  },
  filterContainer: {
    position: 'relative' as const,
  },
  filterPanel: {
    position: 'absolute' as const,
    top: 'calc(100% + 8px)',
    right: 0,
    zIndex: 20,
    minWidth: '640px',
    backgroundColor: '#16213e',
    border: '1px solid #0f3460',
    borderRadius: '8px',
    padding: '10px',
    boxShadow: '0 8px 24px rgba(0, 0, 0, 0.35)',
  },
  contentFilterRow: {
    display: 'flex',
    alignItems: 'center',
    flexWrap: 'wrap' as const,
    gap: '8px',
    marginTop: '10px',
    paddingTop: '10px',
    borderTop: '1px solid #0f3460',
    borderLeft: 'none',
    marginLeft: 0,
    paddingLeft: 0,
  },
  filterInputGroup: {
    display: 'flex',
    alignItems: 'center',
    gap: '4px',
  },
  filterLabel: {
    fontSize: '11px',
    color: '#888',
    whiteSpace: 'nowrap' as const,
  },
  filterInput: {
    backgroundColor: '#16213e',
    color: '#eee',
    border: '1px solid #0f3460',
    borderRadius: '4px',
    padding: '3px 6px',
    fontSize: '11px',
    outline: 'none',
    width: '120px',
    transition: 'border-color 0.15s',
  },
  clearFilterButton: {
    background: 'none',
    border: 'none',
    color: '#888',
    cursor: 'pointer',
    fontSize: '12px',
    padding: '0 2px',
    lineHeight: 1,
    transition: 'color 0.15s',
  },
  filterChipWithIndicator: {
    padding: '2px 8px',
    fontSize: '11px',
    borderRadius: '10px',
    border: '1px solid #0f3460',
    backgroundColor: '#1a1a2e',
    color: '#eee',
    cursor: 'pointer',
    transition: 'all 0.15s',
    lineHeight: '16px',
    position: 'relative' as const,
  },
  filterIndicator: {
    position: 'absolute' as const,
    top: '1px',
    right: '2px',
    width: '4px',
    height: '4px',
    borderRadius: '50%',
    backgroundColor: '#10b981',
  },
  switchButton: {
    padding: '4px 12px',
    fontSize: '12px',
    fontWeight: 500,
    background: '#1a1a2e',
    border: '1px solid #374151',
    borderRadius: '12px',
    color: '#6b7280',
    cursor: 'pointer',
    transition: 'all 0.2s',
    lineHeight: 1.2,
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
  },
  switchButtonActive: {
    padding: '4px 12px',
    fontSize: '12px',
    fontWeight: 500,
    background: '#052e16',
    border: '1px solid #16a34a',
    borderRadius: '12px',
    color: '#22c55e',
    cursor: 'pointer',
    transition: 'all 0.2s',
    lineHeight: 1.2,
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
  },
  switchDot: {
    width: '8px',
    height: '8px',
    borderRadius: '50%',
  },
};

export function Toolbar({ connected, onOpenSettings }: ToolbarProps) {
  const [filtersOpen, setFiltersOpen] = useState(false);
  const navigationView = useSessionStore((state) => state.navigationView);
  const sessions = useSessionStore((state) => state.sessions);
  const selectedSessionId = useSessionStore((state) => state.selectedSessionId);
  const currentDirectoryCwd = useSessionStore((state) => state.currentDirectoryCwd);
  const getFilteredSessions = useSessionStore((state) => state.getFilteredSessions);
  const exitToDirectory = useSessionStore((state) => state.exitToDirectory);
  const enterSession = useSessionStore((state) => state.enterSession);
  const toggleTreePanel = useSessionStore((state) => state.toggleTreePanel);
  const expandAllSubagentBoxes = useSessionStore((state) => state.expandAllSubagentBoxes);
  const collapseAllSubagentBoxes = useSessionStore((state) => state.collapseAllSubagentBoxes);
  const expandedSubagentBoxes = useSessionStore((state) => state.expandedSubagentBoxes);
  const jumpToEnd = useSessionStore((state) => state.jumpToEnd);
  const followPipelineEnd = useSessionStore((state) => state.followPipelineEnd);
  const setFollowPipelineEnd = useSessionStore((state) => state.setFollowPipelineEnd);
  const hiddenNodeTypes = useSessionStore((state) => state.hiddenNodeTypes);
  const toggleNodeTypeVisibility = useSessionStore((state) => state.toggleNodeTypeVisibility);
  const nodeTypeFilters = useSessionStore((state) => state.nodeTypeFilters);
  const setNodeTypeFilter = useSessionStore((state) => state.setNodeTypeFilter);
  const clearNodeTypeFilter = useSessionStore((state) => state.clearNodeTypeFilter);

  const filteredSessions = getFilteredSessions();
  const totalSessions = sessions.length;
  const filteredCount = filteredSessions.length;

  const handleButtonHover = (e: React.MouseEvent<HTMLButtonElement>, isEnter: boolean) => {
    const btn = e.currentTarget;
    if (isEnter) {
      btn.style.color = '#eee';
      btn.style.borderColor = '#e94560';
    } else {
      btn.style.color = '#888';
      btn.style.borderColor = '#0f3460';
    }
  };

  if (navigationView === 'directory') {
    // Directory view: title, filters, session count, settings
    const sessionCountText =
      filteredCount === totalSessions
        ? `${totalSessions} session${totalSessions === 1 ? '' : 's'}`
        : `${filteredCount} / ${totalSessions} sessions`;

    return (
      <div style={styles.toolbar}>
        <div style={styles.leftSection}>
          <h1 style={styles.title}>Claude Session Dashboard</h1>
          <div style={styles.connectionStatus}>
            <div
              style={{
                ...styles.statusDot,
                backgroundColor: connected ? '#22c55e' : '#ef4444',
              }}
            />
            {connected ? 'Connected' : 'Disconnected'}
          </div>
        </div>
        <div style={styles.rightSection}>
          <FilterBar />
          <span style={styles.sessionCount}>{sessionCountText}</span>
          <button
            style={styles.settingsButton}
            onClick={onOpenSettings}
            title="Settings"
            onMouseEnter={(e) => handleButtonHover(e, true)}
            onMouseLeave={(e) => handleButtonHover(e, false)}
          >
            {'\u2699'}
          </button>
        </div>
      </div>
    );
  }

  // Session timeline view: back button, session title, tree toggle, session switcher, settings
  const selectedSession = sessions.find((s) => s.id === selectedSessionId);
  const sessionTitle = selectedSession ? getSessionTitle(selectedSession) : 'Session';
  const hasSubagents = selectedSession && selectedSession.subagents.length > 0;

  // Get other active/waiting sessions from same directory for session switcher (exclude current session)
  const otherActiveSessions = sessions.filter(
    (s) => s.cwd === currentDirectoryCwd && s.id !== selectedSessionId && s.state === 'active'
  );

  const handleSessionSwitch = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newSessionId = e.target.value;
    const newSession = sessions.find((s) => s.id === newSessionId);
    if (newSession) {
      enterSession(newSessionId, newSession.cwd || '');
    }
  };

  return (
    <div style={styles.toolbar}>
      <div style={styles.leftSection}>
        <button
          style={styles.button}
          onClick={exitToDirectory}
          title="Back to directory"
          onMouseEnter={(e) => handleButtonHover(e, true)}
          onMouseLeave={(e) => handleButtonHover(e, false)}
        >
          {'\u2190 Back'}
        </button>
        <h2 style={styles.sessionTitle}>{sessionTitle}</h2>
      </div>
      <div style={styles.rightSection}>
        <button
          style={styles.button}
          onClick={toggleTreePanel}
          title="Toggle tree panel"
          onMouseEnter={(e) => handleButtonHover(e, true)}
          onMouseLeave={(e) => handleButtonHover(e, false)}
        >
          Tree
        </button>
        <div style={styles.filterContainer}>
          <button
            style={filtersOpen ? { ...styles.button, color: '#eee', borderColor: '#e94560' } : styles.button}
            onClick={() => setFiltersOpen(!filtersOpen)}
            title="Toggle advanced filters"
            onMouseEnter={(e) => handleButtonHover(e, true)}
            onMouseLeave={(e) => {
              if (!filtersOpen) {
                handleButtonHover(e, false);
              }
            }}
          >
            {filtersOpen ? 'Filters ▲' : 'Filters ▼'}
          </button>

          {filtersOpen && (
            <div style={styles.filterPanel}>
              <div style={styles.filterGroup}>
                {([
                  { key: 'tools', label: 'Tools' },
                  { key: 'model', label: 'Model' },
                  { key: 'prompts', label: 'Prompts' },
                  { key: 'subagents', label: 'Agents' },
                  { key: 'skills', label: 'Skills' },
                ] as const).map(({ key, label }) => {
                  const isVisible = !hiddenNodeTypes.has(key);
                  const hasActiveFilter = nodeTypeFilters.has(key) && nodeTypeFilters.get(key) !== '';
                  return (
                    <button
                      key={key}
                      style={
                        isVisible
                          ? (hasActiveFilter ? styles.filterChipWithIndicator : styles.filterChipActive)
                          : styles.filterChip
                      }
                      onClick={() => toggleNodeTypeVisibility(key)}
                      title={`${isVisible ? 'Hide' : 'Show'} ${label.toLowerCase()} nodes`}
                    >
                      {label}
                      {isVisible && hasActiveFilter && <div style={styles.filterIndicator} />}
                    </button>
                  );
                })}
              </div>

              <div style={styles.contentFilterRow}>
                {([
                  { key: 'tools', label: 'Tools', placeholder: 'Filter by name...' },
                  { key: 'subagents', label: 'Agents', placeholder: 'Filter by agent...' },
                  { key: 'prompts', label: 'Prompts', placeholder: 'Filter by text...' },
                  { key: 'model', label: 'Model', placeholder: 'Filter by response...' },
                  { key: 'skills', label: 'Skills', placeholder: 'Filter by skill...' },
                ] as const)
                  .filter(({ key }) => !hiddenNodeTypes.has(key))
                  .map(({ key, label, placeholder }) => {
                    const filterValue = nodeTypeFilters.get(key) || '';
                    return (
                      <div key={key} style={styles.filterInputGroup}>
                        <label style={styles.filterLabel}>{label}:</label>
                        <input
                          type="text"
                          value={filterValue}
                          onChange={(e) => setNodeTypeFilter(key, e.target.value)}
                          placeholder={placeholder}
                          style={styles.filterInput}
                          onFocus={(e) => {
                            e.currentTarget.style.borderColor = '#e94560';
                          }}
                          onBlur={(e) => {
                            e.currentTarget.style.borderColor = '#0f3460';
                          }}
                        />
                        {filterValue && (
                          <button
                            style={styles.clearFilterButton}
                            onClick={() => clearNodeTypeFilter(key)}
                            title={`Clear ${label.toLowerCase()} filter`}
                            onMouseEnter={(e) => {
                              e.currentTarget.style.color = '#e94560';
                            }}
                            onMouseLeave={(e) => {
                              e.currentTarget.style.color = '#888';
                            }}
                          >
                            ×
                          </button>
                        )}
                      </div>
                    );
                  })}
              </div>
            </div>
          )}
        </div>
        {hasSubagents && selectedSessionId && (() => {
          const sessionBoxes = expandedSubagentBoxes.get(selectedSessionId);
          const allExpanded = selectedSession && selectedSession.subagents.length > 0 && selectedSession.subagents.every(s => sessionBoxes?.has(s.id));

          return (
            <button
              style={allExpanded ? styles.switchButtonActive : styles.switchButton}
              onClick={() => {
                if (selectedSession && selectedSessionId) {
                  if (allExpanded) {
                    collapseAllSubagentBoxes(selectedSessionId);
                  } else {
                    const allSubagentIds = selectedSession.subagents.map(s => s.id);
                    expandAllSubagentBoxes(selectedSessionId, allSubagentIds);
                  }
                }
              }}
              title={allExpanded ? 'Collapse all agent boxes' : 'Expand all agent boxes'}
            >
              <div
                style={{
                  ...styles.switchDot,
                  backgroundColor: allExpanded ? '#22c55e' : '#374151',
                }}
              />
              {allExpanded ? 'Agents: ON' : 'Agents: OFF'}
            </button>
          );
        })()}
        <button
          style={followPipelineEnd ? styles.switchButtonActive : styles.switchButton}
          onClick={(e) => {
            if (e.shiftKey) {
              jumpToEnd();
              return;
            }
            const next = !followPipelineEnd;
            setFollowPipelineEnd(next);
            if (next) {
              jumpToEnd();
            }
          }}
          title={followPipelineEnd
            ? 'Auto-follow END is ON (click to turn off, Shift+click to jump once)'
            : 'Auto-follow END is OFF (click to turn on, Shift+click to jump once)'}
        >
          <div
            style={{
              ...styles.switchDot,
              backgroundColor: followPipelineEnd ? '#22c55e' : '#374151',
            }}
          />
          Follow End
        </button>
        {otherActiveSessions.length > 0 && (
          <>
            <span style={{ fontSize: '12px', color: '#888' }}>Other Sessions</span>
            <select
              style={styles.sessionSwitcher}
              value=""
              onChange={handleSessionSwitch}
              title="Switch to another active session"
            >
              <option value="" disabled>Switch to...</option>
              {otherActiveSessions.map((s) => {
                const title = getSessionTitle(s);
                const short = title.length > 30 ? title.slice(0, 30) + '...' : title;
                return (
                  <option key={s.id} value={s.id}>
                    {short}
                  </option>
                );
              })}
            </select>
          </>
        )}
        <button
          style={styles.settingsButton}
          onClick={onOpenSettings}
          title="Settings"
          onMouseEnter={(e) => handleButtonHover(e, true)}
          onMouseLeave={(e) => handleButtonHover(e, false)}
        >
          {'\u2699'}
        </button>
      </div>
    </div>
  );
}
