import React from 'react';
import { Toolbar } from './Toolbar';
import { TreePanel } from './TreePanel';
import { useSessionStore } from '../store/sessionStore';

interface LayoutProps {
  children: React.ReactNode;
  connected: boolean;
  onOpenSettings: () => void;
}

const styles = {
  container: {
    display: 'flex',
    flexDirection: 'column' as const,
    height: '100vh',
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Oxygen, Ubuntu, sans-serif',
    backgroundColor: '#1a1a2e',
    color: '#eee',
  },
  header: {
    flexShrink: 0,
  },
  main: {
    display: 'flex',
    flex: 1,
    overflow: 'hidden',
  },
  contentWrapper: {
    position: 'relative' as const,
    flex: 1,
    overflow: 'hidden',
  },
  content: {
    width: '100%',
    height: '100%',
  },
};

export function Layout({ children, connected, onOpenSettings }: LayoutProps) {
  const navigationView = useSessionStore((state) => state.navigationView);
  const treePanelOpen = useSessionStore((state) => state.treePanelOpen);

  return (
    <div style={styles.container}>
      <header style={styles.header}>
        <Toolbar connected={connected} onOpenSettings={onOpenSettings} />
      </header>
      <main style={styles.main}>
        <div style={styles.contentWrapper}>
          {navigationView === 'session-timeline' && (
            <TreePanel isOpen={treePanelOpen} />
          )}
          <div style={styles.content}>{children}</div>
        </div>
      </main>
    </div>
  );
}
