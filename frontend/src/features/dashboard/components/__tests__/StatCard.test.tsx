/**
 * StatCard Component Tests
 * Unit tests for the StatCard component
 */

import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { StatCard } from '../StatCard';

// Mock icon component
const MockIcon = () => <svg data-testid="mock-icon" />;

describe('StatCard', () => {
    // ============================================
    // Rendering Tests
    // ============================================
    describe('rendering', () => {
        it('should render title correctly', () => {
            // Act
            render(<StatCard title="Test Title" value={100} icon={<MockIcon />} />);

            // Assert
            expect(screen.getByText('Test Title')).toBeInTheDocument();
        });

        it('should render value correctly', () => {
            // Act
            render(<StatCard title="Test" value={42} icon={<MockIcon />} />);

            // Assert
            expect(screen.getByText('42')).toBeInTheDocument();
        });

        it('should render string value correctly', () => {
            // Act
            render(<StatCard title="Test" value="1.5k tokens" icon={<MockIcon />} />);

            // Assert
            expect(screen.getByText('1.5k tokens')).toBeInTheDocument();
        });

        it('should render icon', () => {
            // Act
            render(<StatCard title="Test" value={0} icon={<MockIcon />} />);

            // Assert
            expect(screen.getByTestId('mock-icon')).toBeInTheDocument();
        });

        it('should render zero value', () => {
            // Act
            render(<StatCard title="Test" value={0} icon={<MockIcon />} />);

            // Assert
            expect(screen.getByText('0')).toBeInTheDocument();
        });
    });

    // ============================================
    // Show/Hide Tests
    // ============================================
    describe('visibility', () => {
        it('should render when show is true', () => {
            // Act
            render(<StatCard title="Test" value={100} icon={<MockIcon />} show={true} />);

            // Assert
            expect(screen.getByText('Test')).toBeInTheDocument();
        });

        it('should render by default when show is not provided', () => {
            // Act
            render(<StatCard title="Test" value={100} icon={<MockIcon />} />);

            // Assert
            expect(screen.getByText('Test')).toBeInTheDocument();
        });

        it('should not render when show is false', () => {
            // Act
            render(<StatCard title="Test" value={100} icon={<MockIcon />} show={false} />);

            // Assert
            expect(screen.queryByText('Test')).not.toBeInTheDocument();
        });

        it('should not render value when show is false', () => {
            // Act
            render(<StatCard title="Test" value={100} icon={<MockIcon />} show={false} />);

            // Assert
            expect(screen.queryByText('100')).not.toBeInTheDocument();
        });
    });

    // ============================================
    // Subtitle Tests
    // ============================================
    describe('subtitle', () => {
        it('should render subtitle when provided', () => {
            // Act
            render(
                <StatCard
                    title="Test"
                    value={100}
                    icon={<MockIcon />}
                    subtitle={<span data-testid="subtitle">50% of total</span>}
                />
            );

            // Assert
            expect(screen.getByTestId('subtitle')).toBeInTheDocument();
            expect(screen.getByText('50% of total')).toBeInTheDocument();
        });

        it('should render without subtitle when not provided', () => {
            // Act
            render(<StatCard title="Test" value={100} icon={<MockIcon />} />);

            // Assert
            expect(screen.queryByTestId('subtitle')).not.toBeInTheDocument();
        });

        it('should render complex subtitle with multiple elements', () => {
            // Act
            render(
                <StatCard
                    title="Test"
                    value={100}
                    icon={<MockIcon />}
                    subtitle={
                        <div>
                            <span data-testid="percentage">75%</span>
                            <span data-testid="label"> of total</span>
                        </div>
                    }
                />
            );

            // Assert
            expect(screen.getByTestId('percentage')).toBeInTheDocument();
            expect(screen.getByTestId('label')).toBeInTheDocument();
        });
    });

    // ============================================
    // Large Values Tests
    // ============================================
    describe('large values', () => {
        it('should render large numeric values correctly', () => {
            // Act
            render(<StatCard title="Test" value={1000000} icon={<MockIcon />} />);

            // Assert
            expect(screen.getByText('1000000')).toBeInTheDocument();
        });

        it('should render formatted large values as strings', () => {
            // Act
            render(<StatCard title="Test" value="1.5M" icon={<MockIcon />} />);

            // Assert
            expect(screen.getByText('1.5M')).toBeInTheDocument();
        });
    });

    // ============================================
    // Styling Tests
    // ============================================
    describe('styling', () => {
        it('should have rounded corners class', () => {
            // Act
            const { container } = render(
                <StatCard title="Test" value={100} icon={<MockIcon />} />
            );

            // Assert
            const card = container.querySelector('.rounded-2xl');
            expect(card).toBeInTheDocument();
        });

        it('should have backdrop blur', () => {
            // Act
            const { container } = render(
                <StatCard title="Test" value={100} icon={<MockIcon />} />
            );

            // Assert
            const card = container.querySelector('.backdrop-blur-md');
            expect(card).toBeInTheDocument();
        });
    });

    // ============================================
    // Edge Cases Tests
    // ============================================
    describe('edge cases', () => {
        it('should handle empty string value', () => {
            // Act
            render(<StatCard title="Test" value="" icon={<MockIcon />} />);

            // Assert
            expect(screen.getByText('Test')).toBeInTheDocument();
        });

        it('should handle negative values', () => {
            // Act
            render(<StatCard title="Test" value={-5} icon={<MockIcon />} />);

            // Assert
            expect(screen.getByText('-5')).toBeInTheDocument();
        });

        it('should handle decimal values', () => {
            // Act
            render(<StatCard title="Test" value={3.14} icon={<MockIcon />} />);

            // Assert
            expect(screen.getByText('3.14')).toBeInTheDocument();
        });

        it('should handle long title', () => {
            // Act
            const longTitle = 'This is a very long title that might overflow';
            render(<StatCard title={longTitle} value={100} icon={<MockIcon />} />);

            // Assert
            expect(screen.getByText(longTitle)).toBeInTheDocument();
        });
    });
});

