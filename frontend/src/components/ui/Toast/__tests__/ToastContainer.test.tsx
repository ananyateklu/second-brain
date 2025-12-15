/**
 * Toast Container Tests
 * Unit tests for ToastContainer component and position styles
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, act } from '@testing-library/react';
import { ToastContainer, ToastPosition } from '../ToastContainer';
import { ToastProvider, ToastContextValue, ToastContext } from '../ToastContext';
import { useContext, useEffect } from 'react';

// Mock createPortal to render inline for testing
vi.mock('react-dom', async () => {
    const actual = await vi.importActual<typeof import('react-dom')>('react-dom');
    return {
        ...actual,
        createPortal: (children: React.ReactNode) => children,
    };
});

// Helper to get container element
function getContainer() {
    return screen.getByLabelText('Notifications');
}

// Helper to render ToastContainer with provider
function renderWithProvider(
    props: { position?: ToastPosition; gap?: number } = {}
) {
    return render(
        <ToastProvider>
            <ToastContainer {...props} />
        </ToastProvider>
    );
}

// Helper component to add toasts
function ToastAdder({ onContext }: { onContext: (ctx: ToastContextValue | null) => void }) {
    const context = useContext(ToastContext);
    useEffect(() => {
        onContext(context);
    }, [context, onContext]);
    return null;
}

describe('ToastContainer', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    afterEach(() => {
        vi.resetAllMocks();
    });

    // ============================================
    // Basic Rendering Tests
    // ============================================
    describe('basic rendering', () => {
        it('should render container with default position (top-right)', () => {
            renderWithProvider();

            const container = getContainer();
            expect(container).toBeInTheDocument();
        });

        it('should have aria-live="polite" for accessibility', () => {
            renderWithProvider();

            const container = getContainer();
            expect(container).toHaveAttribute('aria-live', 'polite');
        });

        it('should have aria-label="Notifications"', () => {
            renderWithProvider();

            const container = screen.getByLabelText('Notifications');
            expect(container).toBeInTheDocument();
        });

        it('should render empty when no toasts', () => {
            renderWithProvider();

            // Container should exist but have no toast items
            const container = getContainer();
            expect(container).toBeInTheDocument();
            // Check there are no toast items (no buttons/dismiss elements)
            expect(screen.queryByRole('button')).not.toBeInTheDocument();
        });
    });

    // ============================================
    // Position Style Tests
    // ============================================
    describe('position styles', () => {
        const positions: ToastPosition[] = [
            'top-left',
            'top-center',
            'top-right',
            'bottom-left',
            'bottom-center',
            'bottom-right',
        ];

        positions.forEach((position) => {
            it(`should apply correct styles for position="${position}"`, () => {
                renderWithProvider({ position });

                const container = getContainer();
                expect(container).toBeInTheDocument();

                const style = container.style;

                // All positions should have these base styles
                expect(style.position).toBe('fixed');
                expect(style.zIndex).toBe('9999');
                expect(style.pointerEvents).toBe('none');
                expect(style.display).toBe('flex');
                expect(style.padding).toBe('1rem');

                // Position-specific styles - flexDirection depends on top vs bottom
                if (position.startsWith('top')) {
                    expect(style.top).toBe('0px');
                    expect(style.flexDirection).toBe('column');
                } else {
                    expect(style.bottom).toBe('0px');
                    expect(style.flexDirection).toBe('column-reverse');
                }

                if (position.includes('left')) {
                    expect(style.left).toBe('0px');
                    expect(style.alignItems).toBe('flex-start');
                } else if (position.includes('center')) {
                    expect(style.left).toBe('50%');
                    expect(style.transform).toBe('translateX(-50%)');
                    expect(style.alignItems).toBe('center');
                } else {
                    expect(style.right).toBe('0px');
                    expect(style.alignItems).toBe('flex-end');
                }
            });
        });

        it('should use default position when not specified', () => {
            renderWithProvider();

            const container = getContainer();

            // Default is top-right
            expect(container.style.top).toBe('0px');
            expect(container.style.right).toBe('0px');
            expect(container.style.alignItems).toBe('flex-end');
        });
    });

    // ============================================
    // Gap Prop Tests
    // ============================================
    describe('gap prop', () => {
        it('should use default gap of 12px', () => {
            renderWithProvider();

            const container = getContainer();
            const innerDiv = container.firstChild as HTMLElement;

            expect(innerDiv.style.gap).toBe('12px');
        });

        it('should apply custom gap value', () => {
            renderWithProvider({ gap: 20 });

            const container = getContainer();
            const innerDiv = container.firstChild as HTMLElement;

            expect(innerDiv.style.gap).toBe('20px');
        });

        it('should apply zero gap', () => {
            renderWithProvider({ gap: 0 });

            const container = getContainer();
            const innerDiv = container.firstChild as HTMLElement;

            expect(innerDiv.style.gap).toBe('0px');
        });
    });

    // ============================================
    // Inner Container Styles Tests
    // ============================================
    describe('inner container styles', () => {
        it('should have correct inner container styles for top position', () => {
            renderWithProvider({ position: 'top-right' });

            const container = getContainer();
            const innerDiv = container.firstChild as HTMLElement;

            expect(innerDiv.style.display).toBe('flex');
            expect(innerDiv.style.flexDirection).toBe('column');
            expect(innerDiv.style.pointerEvents).toBe('auto');
        });

        it('should have column-reverse for bottom position', () => {
            renderWithProvider({ position: 'bottom-right' });

            const container = getContainer();
            const innerDiv = container.firstChild as HTMLElement;

            expect(innerDiv.style.flexDirection).toBe('column-reverse');
        });

        it('should have column for top-left position', () => {
            renderWithProvider({ position: 'top-left' });

            const container = getContainer();
            const innerDiv = container.firstChild as HTMLElement;

            expect(innerDiv.style.flexDirection).toBe('column');
        });

        it('should have column-reverse for bottom-left position', () => {
            renderWithProvider({ position: 'bottom-left' });

            const container = getContainer();
            const innerDiv = container.firstChild as HTMLElement;

            expect(innerDiv.style.flexDirection).toBe('column-reverse');
        });

        it('should have column-reverse for bottom-center position', () => {
            renderWithProvider({ position: 'bottom-center' });

            const container = getContainer();
            const innerDiv = container.firstChild as HTMLElement;

            expect(innerDiv.style.flexDirection).toBe('column-reverse');
        });
    });

    // ============================================
    // Toast Rendering Tests
    // ============================================
    describe('toast rendering', () => {
        it('should render toasts from context', () => {
            let contextValue: ToastContextValue | null = null;

            render(
                <ToastProvider>
                    <ToastAdder onContext={(ctx) => { contextValue = ctx; }} />
                    <ToastContainer />
                </ToastProvider>
            );

            // Add toasts via context
            act(() => {
                if (contextValue) {
                    contextValue.addToast({ type: 'success', title: 'Success Toast', duration: 5000 });
                    contextValue.addToast({ type: 'error', title: 'Error Toast', duration: 5000 });
                }
            });

            // Toasts should be rendered
            expect(screen.getByText('Success Toast')).toBeInTheDocument();
            expect(screen.getByText('Error Toast')).toBeInTheDocument();
        });

        it('should render multiple toast types', () => {
            let contextValue: ToastContextValue | null = null;

            render(
                <ToastProvider>
                    <ToastAdder onContext={(ctx) => { contextValue = ctx; }} />
                    <ToastContainer />
                </ToastProvider>
            );

            act(() => {
                if (contextValue) {
                    contextValue.addToast({ type: 'info', title: 'Info Toast', duration: 5000 });
                    contextValue.addToast({ type: 'warning', title: 'Warning Toast', duration: 5000 });
                }
            });

            expect(screen.getByText('Info Toast')).toBeInTheDocument();
            expect(screen.getByText('Warning Toast')).toBeInTheDocument();
        });
    });

    // ============================================
    // Edge Cases
    // ============================================
    describe('edge cases', () => {
        it('should handle position prop change', () => {
            const { rerender } = render(
                <ToastProvider>
                    <ToastContainer position="top-left" />
                </ToastProvider>
            );

            let container = getContainer();
            expect(container.style.left).toBe('0px');
            expect(container.style.top).toBe('0px');

            rerender(
                <ToastProvider>
                    <ToastContainer position="bottom-right" />
                </ToastProvider>
            );

            container = getContainer();
            expect(container.style.right).toBe('0px');
            expect(container.style.bottom).toBe('0px');
        });

        it('should handle gap prop change', () => {
            const { rerender } = render(
                <ToastProvider>
                    <ToastContainer gap={10} />
                </ToastProvider>
            );

            let container = getContainer();
            let innerDiv = container.firstChild as HTMLElement;
            expect(innerDiv.style.gap).toBe('10px');

            rerender(
                <ToastProvider>
                    <ToastContainer gap={24} />
                </ToastProvider>
            );

            container = getContainer();
            innerDiv = container.firstChild as HTMLElement;
            expect(innerDiv.style.gap).toBe('24px');
        });
    });
});
