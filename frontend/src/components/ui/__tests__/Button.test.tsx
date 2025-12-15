/**
 * Button Component Tests
 * Unit tests for the Button component
 */

import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { Button } from '../Button';

describe('Button', () => {
    // ============================================
    // Rendering Tests
    // ============================================
    describe('rendering', () => {
        it('should render children correctly', () => {
            // Act
            render(<Button>Click me</Button>);

            // Assert
            expect(screen.getByText('Click me')).toBeInTheDocument();
        });

        it('should render as a button element', () => {
            // Act
            render(<Button>Test</Button>);

            // Assert
            expect(screen.getByRole('button')).toBeInTheDocument();
        });

        it('should forward ref to button element', () => {
            // Arrange
            const ref = vi.fn();

            // Act
            render(<Button ref={ref}>Test</Button>);

            // Assert
            expect(ref).toHaveBeenCalled();
        });
    });

    // ============================================
    // Variant Tests
    // ============================================
    describe('variants', () => {
        it('should apply primary variant styles by default', () => {
            // Act
            render(<Button>Primary</Button>);

            // Assert
            const button = screen.getByRole('button');
            expect(button).toHaveClass('border');
        });

        it('should apply secondary variant styles', () => {
            // Act
            render(<Button variant="secondary">Secondary</Button>);

            // Assert
            const button = screen.getByRole('button');
            expect(button).toHaveClass('border');
        });

        it('should apply danger variant styles', () => {
            // Act
            render(<Button variant="danger">Danger</Button>);

            // Assert
            const button = screen.getByRole('button');
            expect(button).toHaveClass('border');
        });

        it('should apply ghost variant styles', () => {
            // Act
            render(<Button variant="ghost">Ghost</Button>);

            // Assert
            expect(screen.getByRole('button')).toBeInTheDocument();
        });
    });

    // ============================================
    // Size Tests
    // ============================================
    describe('sizes', () => {
        it('should apply medium size by default', () => {
            // Act
            render(<Button>Medium</Button>);

            // Assert
            const button = screen.getByRole('button');
            expect(button).toHaveClass('px-5', 'py-2.5', 'text-sm');
        });

        it('should apply small size', () => {
            // Act
            render(<Button size="sm">Small</Button>);

            // Assert
            const button = screen.getByRole('button');
            expect(button).toHaveClass('px-3', 'py-1.5', 'text-xs');
        });

        it('should apply large size', () => {
            // Act
            render(<Button size="lg">Large</Button>);

            // Assert
            const button = screen.getByRole('button');
            expect(button).toHaveClass('px-6', 'py-3', 'text-base');
        });
    });

    // ============================================
    // Loading State Tests
    // ============================================
    describe('loading state', () => {
        it('should show spinner when loading', () => {
            // Act
            render(<Button isLoading>Loading</Button>);

            // Assert
            const spinner = screen.getByRole('button').querySelector('svg');
            expect(spinner).toHaveClass('animate-spin');
        });

        it('should still show children when loading', () => {
            // Act
            render(<Button isLoading>Loading</Button>);

            // Assert
            expect(screen.getByText('Loading')).toBeInTheDocument();
        });

        it('should be disabled when loading', () => {
            // Act
            render(<Button isLoading>Loading</Button>);

            // Assert
            expect(screen.getByRole('button')).toBeDisabled();
        });
    });

    // ============================================
    // Disabled State Tests
    // ============================================
    describe('disabled state', () => {
        it('should be disabled when disabled prop is true', () => {
            // Act
            render(<Button disabled>Disabled</Button>);

            // Assert
            expect(screen.getByRole('button')).toBeDisabled();
        });

        it('should have disabled styles', () => {
            // Act
            render(<Button disabled>Disabled</Button>);

            // Assert
            const button = screen.getByRole('button');
            expect(button).toHaveClass('disabled:opacity-50', 'disabled:cursor-not-allowed');
        });
    });

    // ============================================
    // Click Handler Tests
    // ============================================
    describe('click handling', () => {
        it('should call onClick when clicked', () => {
            // Arrange
            const handleClick = vi.fn();

            // Act
            render(<Button onClick={handleClick}>Click me</Button>);
            fireEvent.click(screen.getByRole('button'));

            // Assert
            expect(handleClick).toHaveBeenCalledTimes(1);
        });

        it('should not call onClick when disabled', () => {
            // Arrange
            const handleClick = vi.fn();

            // Act
            render(
                <Button onClick={handleClick} disabled>
                    Click me
                </Button>
            );
            fireEvent.click(screen.getByRole('button'));

            // Assert
            expect(handleClick).not.toHaveBeenCalled();
        });

        it('should not call onClick when loading', () => {
            // Arrange
            const handleClick = vi.fn();

            // Act
            render(
                <Button onClick={handleClick} isLoading>
                    Click me
                </Button>
            );
            fireEvent.click(screen.getByRole('button'));

            // Assert
            expect(handleClick).not.toHaveBeenCalled();
        });
    });

    // ============================================
    // Custom Props Tests
    // ============================================
    describe('custom props', () => {
        it('should apply custom className', () => {
            // Act
            render(<Button className="custom-class">Custom</Button>);

            // Assert
            expect(screen.getByRole('button')).toHaveClass('custom-class');
        });

        it('should pass through additional HTML attributes', () => {
            // Act
            render(
                <Button data-testid="custom-button" type="submit">
                    Submit
                </Button>
            );

            // Assert
            const button = screen.getByTestId('custom-button');
            expect(button).toHaveAttribute('type', 'submit');
        });

        it('should pass through aria attributes', () => {
            // Act
            render(<Button aria-label="Custom label">Aria</Button>);

            // Assert
            expect(screen.getByLabelText('Custom label')).toBeInTheDocument();
        });
    });

    // ============================================
    // Base Styles Tests
    // ============================================
    describe('base styles', () => {
        it('should have base styling classes', () => {
            // Act
            render(<Button>Base</Button>);

            // Assert
            const button = screen.getByRole('button');
            expect(button).toHaveClass('inline-flex');
            expect(button).toHaveClass('items-center');
            expect(button).toHaveClass('justify-center');
            expect(button).toHaveClass('rounded-3xl');
            expect(button).toHaveClass('font-semibold');
        });

        it('should have transition classes', () => {
            render(<Button>Transition</Button>);
            const button = screen.getByRole('button');
            expect(button).toHaveClass('transition-all', 'duration-200');
        });

        it('should have gap class for icon spacing', () => {
            render(<Button>Gap</Button>);
            expect(screen.getByRole('button')).toHaveClass('gap-2');
        });
    });

    // ============================================
    // Inline Styles Tests (getVariantStyles)
    // ============================================
    describe('inline styles', () => {
        it('should apply primary variant inline styles', () => {
            render(<Button variant="primary">Primary</Button>);
            const button = screen.getByRole('button');
            expect(button).toHaveStyle({
                backgroundColor: 'var(--btn-primary-bg)',
                color: 'var(--btn-primary-text)',
                borderColor: 'var(--btn-primary-border)',
                boxShadow: 'var(--btn-primary-shadow)',
            });
        });

        it('should apply secondary variant inline styles', () => {
            render(<Button variant="secondary">Secondary</Button>);
            const button = screen.getByRole('button');
            expect(button).toHaveStyle({
                color: 'var(--btn-secondary-text)',
                borderColor: 'var(--btn-secondary-border)',
                boxShadow: 'var(--btn-secondary-shadow)',
            });
        });

        it('should apply danger variant inline styles', () => {
            render(<Button variant="danger">Danger</Button>);
            const button = screen.getByRole('button');
            expect(button).toHaveStyle({
                backgroundColor: 'var(--color-error)',
                color: '#ffffff',
                borderColor: 'transparent',
                boxShadow: 'var(--shadow-lg)',
            });
        });

        it('should apply ghost variant inline styles', () => {
            render(<Button variant="ghost">Ghost</Button>);
            const button = screen.getByRole('button');
            expect(button).toHaveStyle({
                color: 'var(--text-secondary)',
                boxShadow: 'none',
            });
        });
    });

    // ============================================
    // Hover Interaction Tests
    // ============================================
    describe('hover interactions', () => {
        it('should apply primary hover styles on mouseEnter', () => {
            render(<Button variant="primary">Primary</Button>);
            const button = screen.getByRole('button');

            fireEvent.mouseEnter(button);

            expect(button).toHaveStyle({
                backgroundColor: 'var(--btn-primary-hover-bg)',
                borderColor: 'var(--btn-primary-hover-border)',
                boxShadow: 'var(--btn-primary-hover-shadow)',
            });
        });

        it('should apply secondary hover styles on mouseEnter', () => {
            render(<Button variant="secondary">Secondary</Button>);
            const button = screen.getByRole('button');

            fireEvent.mouseEnter(button);

            expect(button).toHaveStyle({
                backgroundColor: 'var(--btn-secondary-hover-bg)',
                color: 'var(--btn-secondary-hover-text)',
                borderColor: 'var(--btn-secondary-hover-border)',
                boxShadow: 'var(--btn-secondary-hover-shadow)',
            });
        });

        it('should apply danger hover styles on mouseEnter', () => {
            render(<Button variant="danger">Danger</Button>);
            const button = screen.getByRole('button');

            fireEvent.mouseEnter(button);

            expect(button).toHaveStyle({
                backgroundColor: 'var(--color-error-text)',
                boxShadow: 'var(--shadow-xl)',
            });
        });

        it('should apply ghost hover styles on mouseEnter', () => {
            render(<Button variant="ghost">Ghost</Button>);
            const button = screen.getByRole('button');

            fireEvent.mouseEnter(button);

            expect(button).toHaveStyle({
                backgroundColor: 'var(--surface-elevated)',
                color: 'var(--text-primary)',
            });
        });

        it('should reset primary styles on mouseLeave', () => {
            render(<Button variant="primary">Primary</Button>);
            const button = screen.getByRole('button');

            fireEvent.mouseEnter(button);
            fireEvent.mouseLeave(button);

            expect(button).toHaveStyle({
                backgroundColor: 'var(--btn-primary-bg)',
                color: 'var(--btn-primary-text)',
            });
        });

        it('should reset secondary styles on mouseLeave', () => {
            render(<Button variant="secondary">Secondary</Button>);
            const button = screen.getByRole('button');

            fireEvent.mouseEnter(button);
            fireEvent.mouseLeave(button);

            expect(button).toHaveStyle({
                color: 'var(--btn-secondary-text)',
            });
        });

        it('should reset danger styles on mouseLeave', () => {
            render(<Button variant="danger">Danger</Button>);
            const button = screen.getByRole('button');

            fireEvent.mouseEnter(button);
            fireEvent.mouseLeave(button);

            expect(button).toHaveStyle({
                backgroundColor: 'var(--color-error)',
                color: '#ffffff',
            });
        });

        it('should reset ghost styles on mouseLeave', () => {
            render(<Button variant="ghost">Ghost</Button>);
            const button = screen.getByRole('button');

            fireEvent.mouseEnter(button);
            fireEvent.mouseLeave(button);

            expect(button).toHaveStyle({
                color: 'var(--text-secondary)',
            });
        });

        it('should not apply hover styles when disabled', () => {
            render(<Button variant="primary" disabled>Disabled</Button>);
            const button = screen.getByRole('button');
            const originalStyle = button.style.backgroundColor;

            fireEvent.mouseEnter(button);

            expect(button.style.backgroundColor).toBe(originalStyle);
        });

        it('should not apply hover styles when loading', () => {
            render(<Button variant="primary" isLoading>Loading</Button>);
            const button = screen.getByRole('button');
            const originalStyle = button.style.backgroundColor;

            fireEvent.mouseEnter(button);

            expect(button.style.backgroundColor).toBe(originalStyle);
        });

        it('should not reset styles on mouseLeave when disabled', () => {
            render(<Button variant="primary" disabled>Disabled</Button>);
            const button = screen.getByRole('button');
            const originalStyle = button.style.backgroundColor;

            fireEvent.mouseLeave(button);

            expect(button.style.backgroundColor).toBe(originalStyle);
        });

        it('should not reset styles on mouseLeave when loading', () => {
            render(<Button variant="primary" isLoading>Loading</Button>);
            const button = screen.getByRole('button');
            const originalStyle = button.style.backgroundColor;

            fireEvent.mouseLeave(button);

            expect(button.style.backgroundColor).toBe(originalStyle);
        });
    });

    // ============================================
    // Variant Class Tests
    // ============================================
    describe('variant classes', () => {
        it('should apply hover:scale-105 for primary', () => {
            render(<Button variant="primary">Primary</Button>);
            const button = screen.getByRole('button');
            expect(button).toHaveClass('hover:scale-105', 'active:scale-95');
        });

        it('should apply hover:scale-105 for secondary', () => {
            render(<Button variant="secondary">Secondary</Button>);
            const button = screen.getByRole('button');
            expect(button).toHaveClass('hover:scale-105', 'active:scale-95');
        });

        it('should apply hover:scale-105 for danger', () => {
            render(<Button variant="danger">Danger</Button>);
            const button = screen.getByRole('button');
            expect(button).toHaveClass('hover:scale-105', 'active:scale-95');
        });

        it('should not apply hover:scale-105 for ghost', () => {
            render(<Button variant="ghost">Ghost</Button>);
            const button = screen.getByRole('button');
            expect(button).not.toHaveClass('hover:scale-105');
        });
    });

    // ============================================
    // Edge Cases
    // ============================================
    describe('edge cases', () => {
        it('should handle empty children', () => {
            render(<Button>{''}</Button>);
            expect(screen.getByRole('button')).toBeInTheDocument();
        });

        it('should handle no children', () => {
            render(<Button />);
            expect(screen.getByRole('button')).toBeInTheDocument();
        });

        it('should handle complex children', () => {
            render(
                <Button>
                    <span>Icon</span>
                    <span>Text</span>
                </Button>
            );
            const button = screen.getByRole('button');
            expect(button).toHaveTextContent('IconText');
        });

        it('should handle all size and variant combinations', () => {
            const variants = ['primary', 'secondary', 'danger', 'ghost'] as const;
            const sizes = ['sm', 'md', 'lg'] as const;

            variants.forEach((variant) => {
                sizes.forEach((size) => {
                    const { unmount } = render(
                        <Button variant={variant} size={size}>
                            {variant}-{size}
                        </Button>
                    );
                    expect(screen.getByRole('button')).toBeInTheDocument();
                    unmount();
                });
            });
        });
    });
});

