import React from 'react';

interface ErrorBoundaryProps {
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

const styles = {
  container: {
    display: 'flex',
    flexDirection: 'column' as const,
    alignItems: 'center',
    justifyContent: 'center',
    height: '100%',
    minHeight: '200px',
    padding: '40px 20px',
    color: '#eee',
    textAlign: 'center' as const,
  },
  icon: {
    fontSize: '48px',
    marginBottom: '16px',
    opacity: 0.6,
  },
  title: {
    fontSize: '18px',
    fontWeight: 600,
    marginBottom: '8px',
    color: '#ef4444',
  },
  message: {
    fontSize: '14px',
    color: '#888',
    marginBottom: '20px',
    maxWidth: '500px',
    lineHeight: 1.5,
  },
  errorDetail: {
    fontSize: '12px',
    fontFamily: 'monospace',
    color: '#666',
    backgroundColor: '#0f0f1a',
    padding: '12px 16px',
    borderRadius: '6px',
    border: '1px solid #1e2a4a',
    maxWidth: '600px',
    width: '100%',
    maxHeight: '120px',
    overflow: 'auto',
    marginBottom: '20px',
    textAlign: 'left' as const,
    whiteSpace: 'pre-wrap' as const,
    wordBreak: 'break-word' as const,
  },
  retryButton: {
    padding: '10px 24px',
    fontSize: '14px',
    fontWeight: 500,
    backgroundColor: '#e94560',
    border: 'none',
    borderRadius: '6px',
    color: '#fff',
    cursor: 'pointer',
    transition: 'background-color 0.15s',
  },
};

export class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo): void {
    console.error('[ErrorBoundary] Caught error:', error, errorInfo);
  }

  handleRetry = (): void => {
    this.setState({ hasError: false, error: null });
  };

  render(): React.ReactNode {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div style={styles.container}>
          <div style={styles.icon}>!</div>
          <div style={styles.title}>Something went wrong</div>
          <div style={styles.message}>
            An unexpected error occurred while rendering this component.
            You can try again or refresh the page.
          </div>
          {this.state.error && (
            <div style={styles.errorDetail}>
              {this.state.error.message}
            </div>
          )}
          <button
            style={styles.retryButton}
            onClick={this.handleRetry}
            onMouseEnter={(e) => {
              (e.target as HTMLButtonElement).style.backgroundColor = '#d13354';
            }}
            onMouseLeave={(e) => {
              (e.target as HTMLButtonElement).style.backgroundColor = '#e94560';
            }}
          >
            Try Again
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}
