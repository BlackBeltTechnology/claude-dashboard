import React from 'react';

interface LayoutProps {
  sidebar: React.ReactNode;
  children: React.ReactNode;
  headerActions?: React.ReactNode;
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
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '12px 20px',
    backgroundColor: '#16213e',
    borderBottom: '1px solid #0f3460',
  },
  title: {
    margin: 0,
    fontSize: '18px',
    fontWeight: 600,
    color: '#e94560',
  },
  main: {
    display: 'flex',
    flex: 1,
    overflow: 'hidden',
  },
  sidebar: {
    width: '250px',
    minWidth: '250px',
    backgroundColor: '#16213e',
    borderRight: '1px solid #0f3460',
    overflowY: 'auto' as const,
  },
  content: {
    flex: 1,
    overflow: 'auto',
    padding: '20px',
  },
};

export function Layout({ sidebar, children, headerActions }: LayoutProps) {
  return (
    <div style={styles.container}>
      <header style={styles.header}>
        <h1 style={styles.title}>Claude Session Dashboard</h1>
        {headerActions && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            {headerActions}
          </div>
        )}
      </header>
      <main style={styles.main}>
        <aside style={styles.sidebar}>{sidebar}</aside>
        <div style={styles.content}>{children}</div>
      </main>
    </div>
  );
}
