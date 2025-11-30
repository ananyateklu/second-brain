/**
 * ErrorBoundary Component Tests
 * Unit tests for error boundary functionality
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { ErrorBoundary, ErrorFallback, FeatureErrorBoundary } from '../ErrorBoundary';

// Component that throws an error
function ThrowError({ shouldThrow = true }: { shouldThrow?: boolean }) {
    if (shouldThrow) {
        throw new Error('Test error');
    }
    return <div data-testid="child-content">Child rendered successfully</div>;
}

// Suppress console.error for expected errors
const originalError = console.error;

describe('ErrorBoundary', () => {
    beforeEach(() => {
        console.error = vi.fn();
    });

    afterEach(() => {
        console.error = originalError;
        vi.restoreAllMocks();
    });

    // ============================================
    // Basic Rendering Tests
    // ============================================
    describe('rendering', () => {
        it('should render children when no error', () => {
            // Act
            render(
                <ErrorBoundary>
                    <div data-testid="child">Child content</div>
                </ErrorBoundary>
            );

            // Assert
            expect(screen.getByTestId('child')).toBeInTheDocument();
            expect(screen.getByText('Child content')).toBeInTheDocument();
        });

        it('should render fallback UI when error occurs', () => {
            // Act
            render(
                <ErrorBoundary>
                    <ThrowError />
                </ErrorBoundary>
            );

            // Assert
            expect(screen.queryByTestId('child-content')).not.toBeInTheDocument();
            expect(screen.getByText('Something Went Wrong')).toBeInTheDocument();
        });

        it('should render custom fallback when provided as ReactNode', () => {
            // Act
            render(
                <ErrorBoundary fallback={<div data-testid="custom-fallback">Custom Error UI</div>}>
                    <ThrowError />
                </ErrorBoundary>
            );

            // Assert
            expect(screen.getByTestId('custom-fallback')).toBeInTheDocument();
            expect(screen.getByText('Custom Error UI')).toBeInTheDocument();
        });

        it('should render custom fallback when provided as function', () => {
            // Act
            render(
                <ErrorBoundary
                    fallback={(error, reset) => (
                        <div data-testid="custom-fallback">
                            <span>Error: {error.message}</span>
                            <button onClick={reset}>Reset</button>
                        </div>
                    )}
                >
                    <ThrowError />
                </ErrorBoundary>
            );

            // Assert
            expect(screen.getByTestId('custom-fallback')).toBeInTheDocument();
            expect(screen.getByText('Error: Test error')).toBeInTheDocument();
        });
    });

    // ============================================
    // Error Callback Tests
    // ============================================
    describe('error callback', () => {
        it('should call onError when error is caught', () => {
            // Arrange
            const onError = vi.fn();

            // Act
            render(
                <ErrorBoundary onError={onError}>
                    <ThrowError />
                </ErrorBoundary>
            );

            // Assert
            expect(onError).toHaveBeenCalledTimes(1);
            expect(onError).toHaveBeenCalledWith(
                expect.objectContaining({ message: 'Test error' }),
                expect.objectContaining({ componentStack: expect.any(String) })
            );
        });

        it('should log error to console', () => {
            // Act
            render(
                <ErrorBoundary>
                    <ThrowError />
                </ErrorBoundary>
            );

            // Assert
            expect(console.error).toHaveBeenCalled();
        });
    });

    // ============================================
    // Reset Tests
    // ============================================
    describe('reset functionality', () => {
        it('should call onReset when reset button is clicked', () => {
            // Arrange
            const onReset = vi.fn();

            // Act
            render(
                <ErrorBoundary onReset={onReset}>
                    <ThrowError />
                </ErrorBoundary>
            );

            const resetButton = screen.getByText('Go Back Home');
            fireEvent.click(resetButton);

            // Assert
            expect(onReset).toHaveBeenCalledTimes(1);
        });

        it('should call custom reset function from fallback', () => {
            // Arrange
            const resetFn = vi.fn();

            // Act
            render(
                <ErrorBoundary
                    fallback={(_error, reset) => (
                        <button onClick={() => { reset(); resetFn(); }}>
                            Custom Reset
                        </button>
                    )}
                >
                    <ThrowError />
                </ErrorBoundary>
            );

            fireEvent.click(screen.getByText('Custom Reset'));

            // Assert
            expect(resetFn).toHaveBeenCalled();
        });
    });

    // ============================================
    // Feature Context Tests
    // ============================================
    describe('feature context', () => {
        it('should display feature name in error UI', () => {
            // Act
            render(
                <ErrorBoundary feature="ChatComponent">
                    <ThrowError />
                </ErrorBoundary>
            );

            // Assert
            expect(screen.getByText('Error in: ChatComponent')).toBeInTheDocument();
        });
    });

    // ============================================
    // Show Details Tests
    // ============================================
    describe('error details', () => {
        it('should show error details when showDetails is true', () => {
            // Act
            render(
                <ErrorBoundary showDetails={true}>
                    <ThrowError />
                </ErrorBoundary>
            );

            // Assert
            expect(screen.getByText('Error Details')).toBeInTheDocument();
        });

        it('should hide error details when showDetails is false', () => {
            // Act
            render(
                <ErrorBoundary showDetails={false}>
                    <ThrowError />
                </ErrorBoundary>
            );

            // Assert
            expect(screen.queryByText('Error Details')).not.toBeInTheDocument();
        });
    });
});

// ============================================
// ErrorFallback Tests
// ============================================
describe('ErrorFallback', () => {
    beforeEach(() => {
        console.error = vi.fn();
    });

    afterEach(() => {
        console.error = originalError;
    });

    describe('variants', () => {
        it('should render full variant by default', () => {
            // Act
            const { container } = render(
                <ErrorFallback error={new Error('Test')} onReset={vi.fn()} />
            );

            // Assert
            expect(container.querySelector('.min-h-screen')).toBeInTheDocument();
        });

        it('should render minimal variant', () => {
            // Act
            const { container } = render(
                <ErrorFallback error={new Error('Test')} onReset={vi.fn()} variant="minimal" />
            );

            // Assert
            expect(container.querySelector('.min-h-screen')).not.toBeInTheDocument();
            expect(screen.getByText('Try again')).toBeInTheDocument();
        });

        it('should render inline variant', () => {
            // Act
            render(
                <ErrorFallback error={new Error('Test')} onReset={vi.fn()} variant="inline" />
            );

            // Assert
            expect(screen.getByText('Technical details')).toBeInTheDocument();
        });
    });

    describe('error message display', () => {
        it('should display error message', () => {
            // Act
            render(
                <ErrorFallback error={new Error('Custom error message')} onReset={vi.fn()} />
            );

            // Assert
            expect(screen.getByText('Custom error message')).toBeInTheDocument();
        });

        it('should display default message when error is null', () => {
            // Act
            render(
                <ErrorFallback error={null} onReset={vi.fn()} />
            );

            // Assert
            expect(screen.getByText('An unexpected error occurred. Please try again.')).toBeInTheDocument();
        });
    });

    describe('reset button', () => {
        it('should call onReset when clicked in minimal variant', () => {
            // Arrange
            const onReset = vi.fn();

            // Act
            render(
                <ErrorFallback error={new Error('Test')} onReset={onReset} variant="minimal" />
            );
            fireEvent.click(screen.getByText('Try again'));

            // Assert
            expect(onReset).toHaveBeenCalledTimes(1);
        });

        it('should call onReset when clicked in inline variant', () => {
            // Arrange
            const onReset = vi.fn();

            // Act
            render(
                <ErrorFallback error={new Error('Test')} onReset={onReset} variant="inline" />
            );
            fireEvent.click(screen.getByText('Try again'));

            // Assert
            expect(onReset).toHaveBeenCalledTimes(1);
        });
    });
});

// ============================================
// FeatureErrorBoundary Tests
// ============================================
describe('FeatureErrorBoundary', () => {
    beforeEach(() => {
        console.error = vi.fn();
    });

    afterEach(() => {
        console.error = originalError;
    });

    it('should render children when no error', () => {
        // Act
        render(
            <FeatureErrorBoundary feature="TestFeature">
                <div data-testid="feature-content">Feature content</div>
            </FeatureErrorBoundary>
        );

        // Assert
        expect(screen.getByTestId('feature-content')).toBeInTheDocument();
    });

    it('should render inline error UI on error', () => {
        // Act
        render(
            <FeatureErrorBoundary feature="TestFeature">
                <ThrowError />
            </FeatureErrorBoundary>
        );

        // Assert
        expect(screen.getByText('Something Went Wrong')).toBeInTheDocument();
    });

    it('should render custom fallback if provided', () => {
        // Act
        render(
            <FeatureErrorBoundary
                feature="TestFeature"
                fallback={<div data-testid="custom-feature-fallback">Feature error</div>}
            >
                <ThrowError />
            </FeatureErrorBoundary>
        );

        // Assert
        expect(screen.getByTestId('custom-feature-fallback')).toBeInTheDocument();
    });

    it('should log error with feature context', () => {
        // Act
        render(
            <FeatureErrorBoundary feature="TestFeature">
                <ThrowError />
            </FeatureErrorBoundary>
        );

        // Assert
        expect(console.error).toHaveBeenCalled();
    });

    it('should allow retry after error', () => {
        // Arrange
        let shouldThrow = true;

        const ConditionalThrow = () => {
            if (shouldThrow) {
                throw new Error('Test error');
            }
            return <div data-testid="recovered">Recovered!</div>;
        };

        // Act
        const { rerender } = render(
            <FeatureErrorBoundary feature="TestFeature">
                <ConditionalThrow />
            </FeatureErrorBoundary>
        );

        // Error state
        expect(screen.getByText('Something Went Wrong')).toBeInTheDocument();

        // Simulate fixing the error
        shouldThrow = false;

        // Click try again (this will reset the error state)
        fireEvent.click(screen.getByText('Try again'));

        // Re-render to show the component is trying to render children again
        rerender(
            <FeatureErrorBoundary feature="TestFeature">
                <ConditionalThrow />
            </FeatureErrorBoundary>
        );

        // Should show recovered content
        expect(screen.getByTestId('recovered')).toBeInTheDocument();
    });
});

