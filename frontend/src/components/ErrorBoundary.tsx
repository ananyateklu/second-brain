import { Component, ErrorInfo, ReactNode } from 'react';
import { Button } from './ui/Button';

interface ErrorBoundaryProps {
  children: ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    console.error('ErrorBoundary caught an error:', { error, errorInfo });
  }

  handleReset = (): void => {
    this.setState({ hasError: false, error: null });
    window.location.href = '/';
  };

  render(): ReactNode {
    if (this.state.hasError) {
      return (
        <div
          className="min-h-screen flex items-center justify-center p-4"
          style={{
            background: 'var(--background)',
          }}
        >
          <div
            className="rounded-2xl backdrop-blur-sm border p-16 text-center shadow-lg max-w-2xl"
            style={{
              backgroundColor: 'var(--surface-card)',
              borderColor: 'var(--color-error-border)',
            }}
          >
            <div
              className="mb-4 inline-flex items-center justify-center w-16 h-16 rounded-full"
              style={{
                backgroundColor: 'var(--color-error-light)',
              }}
            >
              <svg className="h-8 w-8" style={{ color: 'var(--color-error-text)' }} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            </div>
            <h2 className="font-bold mb-3" style={{ color: 'var(--text-primary)' }}>
              Something Went Wrong
            </h2>
            <p className="text-base mb-4" style={{ color: 'var(--text-secondary)' }}>
              An unexpected error occurred. Don't worry, we've logged it and will look into it.
            </p>
            {this.state.error && (
              <details className="mb-6 text-left">
                <summary className="cursor-pointer text-sm font-medium mb-2" style={{ color: 'var(--text-secondary)' }}>
                  Error Details
                </summary>
                <pre
                  className="text-xs p-4 rounded-lg overflow-auto"
                  style={{
                    backgroundColor: 'var(--surface-elevated)',
                    color: 'var(--color-error-text)',
                  }}
                >
                  {this.state.error.toString()}
                </pre>
              </details>
            )}
            <Button onClick={this.handleReset} variant="primary">
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
              </svg>
              Go Back Home
            </Button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

