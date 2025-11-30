/**
 * Modal Component Tests
 * Unit tests for the Modal component
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { Modal } from '../Modal';

describe('Modal', () => {
    const defaultProps = {
        isOpen: true,
        onClose: vi.fn(),
        title: 'Test Modal',
        children: <div>Modal content</div>,
    };

    beforeEach(() => {
        vi.clearAllMocks();
    });

    afterEach(() => {
        // Reset body overflow style
        document.body.style.overflow = 'unset';
    });

    // ============================================
    // Rendering Tests
    // ============================================
    describe('rendering', () => {
        it('should render when isOpen is true', () => {
            // Act
            render(<Modal {...defaultProps} />);

            // Assert
            expect(screen.getByText('Test Modal')).toBeInTheDocument();
            expect(screen.getByText('Modal content')).toBeInTheDocument();
        });

        it('should not render when isOpen is false', () => {
            // Act
            render(<Modal {...defaultProps} isOpen={false} />);

            // Assert
            expect(screen.queryByText('Test Modal')).not.toBeInTheDocument();
            expect(screen.queryByText('Modal content')).not.toBeInTheDocument();
        });

        it('should render title', () => {
            // Act
            render(<Modal {...defaultProps} title="Custom Title" />);

            // Assert
            expect(screen.getByText('Custom Title')).toBeInTheDocument();
        });

        it('should render children', () => {
            // Act
            render(
                <Modal {...defaultProps}>
                    <p>Custom content</p>
                </Modal>
            );

            // Assert
            expect(screen.getByText('Custom content')).toBeInTheDocument();
        });
    });

    // ============================================
    // Close Button Tests
    // ============================================
    describe('close button', () => {
        it('should render close button', () => {
            // Act
            render(<Modal {...defaultProps} />);

            // Assert
            expect(screen.getByLabelText('Close modal')).toBeInTheDocument();
        });

        it('should call onClose when close button is clicked', () => {
            // Arrange
            const onClose = vi.fn();

            // Act
            render(<Modal {...defaultProps} onClose={onClose} />);
            fireEvent.click(screen.getByLabelText('Close modal'));

            // Assert
            expect(onClose).toHaveBeenCalledTimes(1);
        });
    });

    // ============================================
    // Overlay Click Tests
    // ============================================
    describe('overlay click', () => {
        it('should call onClose when clicking on overlay', () => {
            // Arrange
            const onClose = vi.fn();

            // Act
            render(<Modal {...defaultProps} onClose={onClose} />);
            // Click on the backdrop (first div with fixed class)
            const overlay = document.querySelector('.fixed');
            fireEvent.click(overlay!);

            // Assert
            expect(onClose).toHaveBeenCalledTimes(1);
        });

        it('should not call onClose when clicking on modal content', () => {
            // Arrange
            const onClose = vi.fn();

            // Act
            render(<Modal {...defaultProps} onClose={onClose} />);
            fireEvent.click(screen.getByText('Modal content'));

            // Assert
            expect(onClose).not.toHaveBeenCalled();
        });
    });

    // ============================================
    // Escape Key Tests
    // ============================================
    describe('escape key', () => {
        it('should call onClose when Escape key is pressed', () => {
            // Arrange
            const onClose = vi.fn();

            // Act
            render(<Modal {...defaultProps} onClose={onClose} />);
            fireEvent.keyDown(document, { key: 'Escape' });

            // Assert
            expect(onClose).toHaveBeenCalledTimes(1);
        });

        it('should not call onClose when other keys are pressed', () => {
            // Arrange
            const onClose = vi.fn();

            // Act
            render(<Modal {...defaultProps} onClose={onClose} />);
            fireEvent.keyDown(document, { key: 'Enter' });

            // Assert
            expect(onClose).not.toHaveBeenCalled();
        });
    });

    // ============================================
    // Body Overflow Tests
    // ============================================
    describe('body overflow', () => {
        it('should set body overflow to hidden when modal opens', () => {
            // Act
            render(<Modal {...defaultProps} />);

            // Assert
            expect(document.body.style.overflow).toBe('hidden');
        });

        it('should reset body overflow when modal closes', () => {
            // Arrange
            const { rerender } = render(<Modal {...defaultProps} />);

            // Act
            rerender(<Modal {...defaultProps} isOpen={false} />);

            // Assert
            expect(document.body.style.overflow).toBe('unset');
        });

        it('should reset body overflow when component unmounts', () => {
            // Arrange
            const { unmount } = render(<Modal {...defaultProps} />);
            expect(document.body.style.overflow).toBe('hidden');

            // Act
            unmount();

            // Assert
            expect(document.body.style.overflow).toBe('unset');
        });
    });

    // ============================================
    // Icon Tests
    // ============================================
    describe('icon', () => {
        it('should render icon when provided', () => {
            // Act
            render(
                <Modal {...defaultProps} icon={<span data-testid="test-icon">🔔</span>} />
            );

            // Assert
            expect(screen.getByTestId('test-icon')).toBeInTheDocument();
        });

        it('should not render icon container when icon is not provided', () => {
            // Act
            render(<Modal {...defaultProps} />);

            // Assert - there should be no gradient icon container
            const iconContainers = document.querySelectorAll('.w-6.h-6.rounded-lg');
            expect(iconContainers.length).toBe(0);
        });
    });

    // ============================================
    // Subtitle Tests
    // ============================================
    describe('subtitle', () => {
        it('should render subtitle when provided', () => {
            // Act
            render(<Modal {...defaultProps} subtitle="This is a subtitle" />);

            // Assert
            expect(screen.getByText('This is a subtitle')).toBeInTheDocument();
        });

        it('should not render subtitle when not provided', () => {
            // Act
            render(<Modal {...defaultProps} />);

            // Assert - only title should be visible, no subtitle span
            const title = screen.getByText('Test Modal');
            expect(title).toBeInTheDocument();
        });
    });

    // ============================================
    // Header Action Tests
    // ============================================
    describe('headerAction', () => {
        it('should render headerAction when provided', () => {
            // Act
            render(
                <Modal
                    {...defaultProps}
                    headerAction={<button data-testid="action-button">Action</button>}
                />
            );

            // Assert
            expect(screen.getByTestId('action-button')).toBeInTheDocument();
        });
    });

    // ============================================
    // MaxWidth Tests
    // ============================================
    describe('maxWidth', () => {
        it('should apply default maxWidth', () => {
            // Act
            render(<Modal {...defaultProps} />);

            // Assert
            const modalContainer = document.querySelector('.max-w-2xl');
            expect(modalContainer).toBeInTheDocument();
        });

        it('should apply custom maxWidth', () => {
            // Act
            render(<Modal {...defaultProps} maxWidth="max-w-lg" />);

            // Assert
            const modalContainer = document.querySelector('.max-w-lg');
            expect(modalContainer).toBeInTheDocument();
        });
    });

    // ============================================
    // Custom ClassName Tests
    // ============================================
    describe('className', () => {
        it('should apply custom className to modal container', () => {
            // Act
            render(<Modal {...defaultProps} className="custom-modal" />);

            // Assert
            const modalContainer = document.querySelector('.custom-modal');
            expect(modalContainer).toBeInTheDocument();
        });
    });

    // ============================================
    // Accessibility Tests
    // ============================================
    describe('accessibility', () => {
        it('should have accessible close button', () => {
            // Act
            render(<Modal {...defaultProps} />);

            // Assert
            expect(screen.getByLabelText('Close modal')).toBeInTheDocument();
        });

        it('should be focusable', () => {
            // Act
            render(<Modal {...defaultProps} />);

            // Assert
            const closeButton = screen.getByLabelText('Close modal');
            closeButton.focus();
            expect(document.activeElement).toBe(closeButton);
        });
    });
});

