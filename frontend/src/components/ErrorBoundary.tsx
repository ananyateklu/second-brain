/**
 * Error Boundary Components
 * Provides multiple error boundary variants for different use cases
 */

import { Component, ErrorInfo, ReactNode } from 'react';
import { Button } from './ui/Button';
import { ApiError, ApiErrorCode, isApiError } from '../types/api';

// ============================================
// Types
// ============================================

interface ErrorBoundaryProps {
  children: ReactNode;
  /** Fallback component to render on error */
  fallback?: ReactNode | ((error: Error, reset: () => void) => ReactNode);
  /** Called when an error is caught */
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
  /** Whether to show error details */
  showDetails?: boolean;
  /** Custom reset handler */
  onReset?: () => void;
  /** Feature name for context */
  feature?: string;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

// ============================================
// Main Error Boundary
// ============================================

export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error: Error): Partial<ErrorBoundaryState> {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    this.setState({ errorInfo });
    
    // Log error
    console.error('ErrorBoundary caught an error:', {
      error,
      errorInfo,
      feature: this.props.feature,
    });
    
    // Call custom error handler if provided
    this.props.onError?.(error, errorInfo);
  }

  handleReset = (): void => {
    this.setState({ hasError: false, error: null, errorInfo: null });
    
    if (this.props.onReset) {
      this.props.onReset();
    } else {
      window.location.href = '/';
    }
  };

  render(): ReactNode {
    if (this.state.hasError) {
      // Use custom fallback if provided
      if (this.props.fallback) {
        if (typeof this.props.fallback === 'function') {
          return this.props.fallback(this.state.error ?? new Error('Unknown error'), this.handleReset);
        }
        return this.props.fallback;
      }

      // Default error UI
      return (
        <ErrorFallback
          error={this.state.error}
          errorInfo={this.state.errorInfo}
          onReset={this.handleReset}
          showDetails={this.props.showDetails}
          feature={this.props.feature}
        />
      );
    }

    return this.props.children;
  }
}

// ============================================
// Error Fallback Component
// ============================================

interface ErrorFallbackProps {
  error: Error | null;
  errorInfo?: ErrorInfo | null;
  onReset: () => void;
  showDetails?: boolean;
  feature?: string;
  variant?: 'full' | 'inline' | 'minimal';
}

export function ErrorFallback({
  error,
  errorInfo,
  onReset,
  showDetails = true,
  feature,
  variant = 'full',
}: ErrorFallbackProps) {
  // Check if it's an API error
  const apiError = isApiError(error) ? error : null;
  
  // Get appropriate message
  const title = getErrorTitle(apiError);
  const message = getErrorMessage(error, apiError);

  if (variant === 'minimal') {
    return (
      <div
        className="p-4 rounded-lg text-center"
        style={{
          backgroundColor: 'var(--error-bg)',
          border: '1px solid var(--error-border)',
        }}
      >
        <p style={{ color: 'var(--error-text)' }}>{message}</p>
        <button
          onClick={onReset}
          className="mt-2 text-sm underline"
          style={{ color: 'var(--error-text)' }}
        >
          Try again
        </button>
      </div>
    );
  }

  if (variant === 'inline') {
    return (
      <div
        className="p-6 rounded-xl border"
        style={{
          backgroundColor: 'var(--surface-card)',
          borderColor: 'var(--error-border)',
        }}
      >
        <div className="flex items-start gap-4">
          <div
            className="p-2 rounded-lg flex-shrink-0"
            style={{ backgroundColor: 'var(--error-bg)' }}
          >
            <ErrorIcon className="w-5 h-5" />
          </div>
          <div className="flex-1">
            <h3
              className="font-semibold mb-1"
              style={{ color: 'var(--text-primary)' }}
            >
              {title}
            </h3>
            <p className="text-sm mb-3" style={{ color: 'var(--text-secondary)' }}>
              {message}
            </p>
            {showDetails && error && (
              <details className="mb-3">
                <summary
                  className="cursor-pointer text-xs"
                  style={{ color: 'var(--text-tertiary)' }}
                >
                  Technical details
                </summary>
                <pre
                  className="mt-2 p-2 rounded text-xs overflow-auto"
                  style={{
                    backgroundColor: 'var(--surface-elevated)',
                    color: 'var(--error-text)',
                  }}
                >
                  {error.toString()}
                </pre>
              </details>
            )}
            <Button onClick={onReset} variant="secondary" size="sm">
              {apiError?.isAuthError() ? 'Sign in again' : 'Try again'}
            </Button>
          </div>
        </div>
      </div>
    );
  }

  // Full variant (default)
  return (
    <div
      className="min-h-screen flex items-center justify-center p-4"
      style={{ background: 'var(--background)' }}
    >
      <div
        className="rounded-2xl backdrop-blur-sm border p-16 text-center shadow-lg max-w-2xl"
        style={{
          backgroundColor: 'var(--surface-card)',
          borderColor: 'var(--error-border)',
        }}
      >
        <div
          className="mb-4 inline-flex items-center justify-center w-16 h-16 rounded-full"
          style={{ backgroundColor: 'var(--error-bg)' }}
        >
          <ErrorIcon className="w-8 h-8" />
        </div>
        
        <h2 className="font-bold mb-3" style={{ color: 'var(--text-primary)' }}>
          {title}
        </h2>
        
        <p className="text-base mb-4" style={{ color: 'var(--text-secondary)' }}>
          {message}
        </p>
        
        {feature && (
          <p className="text-sm mb-4" style={{ color: 'var(--text-tertiary)' }}>
            Error in: {feature}
          </p>
        )}
        
        {showDetails && error && (
          <details className="mb-6 text-left">
            <summary
              className="cursor-pointer text-sm font-medium mb-2"
              style={{ color: 'var(--text-secondary)' }}
            >
              Error Details
            </summary>
            <pre
              className="text-xs p-4 rounded-lg overflow-auto"
              style={{
                backgroundColor: 'var(--surface-elevated)',
                color: 'var(--error-text)',
              }}
            >
              {error.toString()}
              {errorInfo?.componentStack && (
                <>
                  {'\n\nComponent Stack:'}
                  {errorInfo.componentStack}
                </>
              )}
            </pre>
          </details>
        )}
        
        <Button onClick={onReset} variant="primary">
          <svg
            className="h-4 w-4"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"
            />
          </svg>
          Go Back Home
        </Button>
      </div>
    </div>
  );
}

// ============================================
// Feature Error Boundary
// ============================================

interface FeatureErrorBoundaryProps {
  children: ReactNode;
  feature: string;
  fallback?: ReactNode;
}

/**
 * Lightweight error boundary for feature sections
 */
export class FeatureErrorBoundary extends Component<
  FeatureErrorBoundaryProps,
  { hasError: boolean; error: Error | null }
> {
  constructor(props: FeatureErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Feature error:', {
      feature: this.props.feature,
      error,
      errorInfo,
    });
  }

  handleRetry = () => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <ErrorFallback
          error={this.state.error}
          onReset={this.handleRetry}
          showDetails={false}
          feature={this.props.feature}
          variant="inline"
        />
      );
    }

    return this.props.children;
  }
}

// ============================================
// Helper Functions
// ============================================

function getErrorTitle(apiError: ApiError | null): string {
  if (!apiError) {
    return 'Something Went Wrong';
  }

  switch (apiError.code) {
    case ApiErrorCode.UNAUTHORIZED:
    case ApiErrorCode.FORBIDDEN:
      return 'Access Denied';
    case ApiErrorCode.NOT_FOUND:
      return 'Not Found';
    case ApiErrorCode.VALIDATION_ERROR:
      return 'Invalid Data';
    case ApiErrorCode.NETWORK_ERROR:
    case ApiErrorCode.TIMEOUT:
      return 'Connection Error';
    case ApiErrorCode.SERVICE_UNAVAILABLE:
      return 'Service Unavailable';
    default:
      return 'Something Went Wrong';
  }
}

function getErrorMessage(error: Error | null, apiError: ApiError | null): string {
  if (apiError) {
    return apiError.message;
  }

  if (error) {
    return error.message || 'An unexpected error occurred. Please try again.';
  }

  return 'An unexpected error occurred. Please try again.';
}

// ============================================
// Icons
// ============================================

function ErrorIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      style={{ color: 'var(--error-text)' }}
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
      />
    </svg>
  );
}

// ============================================
// Exports
// ============================================

export default ErrorBoundary;
