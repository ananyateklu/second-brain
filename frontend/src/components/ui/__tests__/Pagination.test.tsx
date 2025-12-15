/**
 * Pagination Component Tests
 * Unit tests for the Pagination component
 */

import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { Pagination } from '../Pagination';

describe('Pagination', () => {
    const defaultProps = {
        currentPage: 1,
        totalPages: 10,
        totalItems: 100,
        itemsPerPage: 10,
        onPageChange: vi.fn(),
    };

    beforeEach(() => {
        vi.clearAllMocks();
    });

    // ============================================
    // Basic Rendering Tests
    // ============================================
    describe('basic rendering', () => {
        it('should render pagination controls when totalPages > 1', () => {
            render(<Pagination {...defaultProps} />);

            expect(screen.getByLabelText('Previous page')).toBeInTheDocument();
            expect(screen.getByLabelText('Next page')).toBeInTheDocument();
        });

        it('should return null when totalPages is 1', () => {
            const { container } = render(
                <Pagination {...defaultProps} totalPages={1} />
            );

            expect(container.firstChild).toBeNull();
        });

        it('should return null when totalPages is 0', () => {
            const { container } = render(
                <Pagination {...defaultProps} totalPages={0} />
            );

            expect(container.firstChild).toBeNull();
        });
    });

    // ============================================
    // Item Count Display Tests
    // ============================================
    describe('item count display', () => {
        it('should show item count by default', () => {
            render(<Pagination {...defaultProps} />);

            expect(screen.getByText(/Showing 1–10 of 100 items/)).toBeInTheDocument();
        });

        it('should hide item count when showItemCount is false', () => {
            render(<Pagination {...defaultProps} showItemCount={false} />);

            expect(screen.queryByText(/Showing/)).not.toBeInTheDocument();
        });

        it('should show correct item range for middle pages', () => {
            render(<Pagination {...defaultProps} currentPage={5} />);

            expect(screen.getByText(/Showing 41–50 of 100 items/)).toBeInTheDocument();
        });

        it('should show correct item range for last page with partial items', () => {
            render(
                <Pagination
                    {...defaultProps}
                    currentPage={10}
                    totalPages={10}
                    totalItems={95}
                />
            );

            expect(screen.getByText(/Showing 91–95 of 95 items/)).toBeInTheDocument();
        });
    });

    // ============================================
    // Navigation Button Tests
    // ============================================
    describe('navigation buttons', () => {
        it('should disable previous button on first page', () => {
            render(<Pagination {...defaultProps} currentPage={1} />);

            expect(screen.getByLabelText('Previous page')).toBeDisabled();
        });

        it('should enable previous button on pages > 1', () => {
            render(<Pagination {...defaultProps} currentPage={5} />);

            expect(screen.getByLabelText('Previous page')).not.toBeDisabled();
        });

        it('should disable next button on last page', () => {
            render(<Pagination {...defaultProps} currentPage={10} />);

            expect(screen.getByLabelText('Next page')).toBeDisabled();
        });

        it('should enable next button on pages < totalPages', () => {
            render(<Pagination {...defaultProps} currentPage={5} />);

            expect(screen.getByLabelText('Next page')).not.toBeDisabled();
        });

        it('should call onPageChange with previous page when clicking previous', () => {
            const onPageChange = vi.fn();
            render(
                <Pagination
                    {...defaultProps}
                    currentPage={5}
                    onPageChange={onPageChange}
                />
            );

            fireEvent.click(screen.getByLabelText('Previous page'));

            expect(onPageChange).toHaveBeenCalledWith(4);
        });

        it('should call onPageChange with next page when clicking next', () => {
            const onPageChange = vi.fn();
            render(
                <Pagination
                    {...defaultProps}
                    currentPage={5}
                    onPageChange={onPageChange}
                />
            );

            fireEvent.click(screen.getByLabelText('Next page'));

            expect(onPageChange).toHaveBeenCalledWith(6);
        });
    });

    // ============================================
    // Page Number Button Tests
    // ============================================
    describe('page number buttons', () => {
        it('should call onPageChange when clicking a page number', () => {
            const onPageChange = vi.fn();
            render(
                <Pagination
                    {...defaultProps}
                    currentPage={1}
                    onPageChange={onPageChange}
                />
            );

            fireEvent.click(screen.getByLabelText('Page 3'));

            expect(onPageChange).toHaveBeenCalledWith(3);
        });

        it('should mark current page with aria-current', () => {
            render(<Pagination {...defaultProps} currentPage={3} />);

            expect(screen.getByLabelText('Page 3')).toHaveAttribute('aria-current', 'page');
            expect(screen.getByLabelText('Page 2')).not.toHaveAttribute('aria-current');
        });
    });

    // ============================================
    // Visible Pages Logic Tests
    // ============================================
    describe('visible pages logic', () => {
        it('should show first 5 pages when on page 1', () => {
            render(<Pagination {...defaultProps} currentPage={1} />);

            expect(screen.getByLabelText('Page 1')).toBeInTheDocument();
            expect(screen.getByLabelText('Page 2')).toBeInTheDocument();
            expect(screen.getByLabelText('Page 3')).toBeInTheDocument();
            expect(screen.getByLabelText('Page 4')).toBeInTheDocument();
            expect(screen.getByLabelText('Page 5')).toBeInTheDocument();
            expect(screen.getByLabelText('Page 10')).toBeInTheDocument();
        });

        it('should show pages around current page when in middle', () => {
            render(<Pagination {...defaultProps} currentPage={5} />);

            // Should show pages around 5: 3, 4, 5, 6, 7
            expect(screen.getByLabelText('Page 1')).toBeInTheDocument(); // First page always shown
            expect(screen.getByLabelText('Page 3')).toBeInTheDocument();
            expect(screen.getByLabelText('Page 4')).toBeInTheDocument();
            expect(screen.getByLabelText('Page 5')).toBeInTheDocument();
            expect(screen.getByLabelText('Page 6')).toBeInTheDocument();
            expect(screen.getByLabelText('Page 7')).toBeInTheDocument();
            expect(screen.getByLabelText('Page 10')).toBeInTheDocument(); // Last page always shown
        });

        it('should show last 5 pages when near end', () => {
            render(<Pagination {...defaultProps} currentPage={9} />);

            expect(screen.getByLabelText('Page 1')).toBeInTheDocument();
            expect(screen.getByLabelText('Page 6')).toBeInTheDocument();
            expect(screen.getByLabelText('Page 7')).toBeInTheDocument();
            expect(screen.getByLabelText('Page 8')).toBeInTheDocument();
            expect(screen.getByLabelText('Page 9')).toBeInTheDocument();
            expect(screen.getByLabelText('Page 10')).toBeInTheDocument();
        });

        it('should show ellipsis when pages are skipped', () => {
            render(<Pagination {...defaultProps} currentPage={5} />);

            // Should have ellipsis between 1 and 3, and between 7 and 10
            const ellipses = screen.getAllByText('...');
            expect(ellipses.length).toBeGreaterThanOrEqual(1);
        });

        it('should not show ellipsis for consecutive pages', () => {
            render(<Pagination {...defaultProps} totalPages={5} currentPage={3} />);

            // All pages should be visible, no ellipsis needed
            expect(screen.getByLabelText('Page 1')).toBeInTheDocument();
            expect(screen.getByLabelText('Page 2')).toBeInTheDocument();
            expect(screen.getByLabelText('Page 3')).toBeInTheDocument();
            expect(screen.getByLabelText('Page 4')).toBeInTheDocument();
            expect(screen.getByLabelText('Page 5')).toBeInTheDocument();
            expect(screen.queryByText('...')).not.toBeInTheDocument();
        });

        it('should show ellipsis before last page when needed', () => {
            render(<Pagination {...defaultProps} currentPage={3} />);

            // Should have ellipsis between visible pages and page 10
            const ellipses = screen.getAllByText('...');
            expect(ellipses.length).toBe(1);
        });

        it('should show ellipsis after first page when starting far from page 1', () => {
            render(<Pagination {...defaultProps} currentPage={8} />);

            // Should have ellipsis after page 1
            const ellipses = screen.getAllByText('...');
            expect(ellipses.length).toBeGreaterThanOrEqual(1);
        });
    });

    // ============================================
    // Custom maxVisiblePages Tests
    // ============================================
    describe('maxVisiblePages prop', () => {
        it('should show more pages when maxVisiblePages is increased', () => {
            render(
                <Pagination
                    {...defaultProps}
                    currentPage={5}
                    maxVisiblePages={7}
                />
            );

            // Should show more pages around current page
            expect(screen.getByLabelText('Page 2')).toBeInTheDocument();
            expect(screen.getByLabelText('Page 3')).toBeInTheDocument();
            expect(screen.getByLabelText('Page 4')).toBeInTheDocument();
            expect(screen.getByLabelText('Page 5')).toBeInTheDocument();
            expect(screen.getByLabelText('Page 6')).toBeInTheDocument();
            expect(screen.getByLabelText('Page 7')).toBeInTheDocument();
            expect(screen.getByLabelText('Page 8')).toBeInTheDocument();
        });

        it('should show fewer pages when maxVisiblePages is decreased', () => {
            render(
                <Pagination
                    {...defaultProps}
                    currentPage={5}
                    maxVisiblePages={3}
                />
            );

            // Should show fewer pages
            expect(screen.getByLabelText('Page 1')).toBeInTheDocument();
            expect(screen.getByLabelText('Page 4')).toBeInTheDocument();
            expect(screen.getByLabelText('Page 5')).toBeInTheDocument();
            expect(screen.getByLabelText('Page 6')).toBeInTheDocument();
            expect(screen.getByLabelText('Page 10')).toBeInTheDocument();
        });
    });

    // ============================================
    // Edge Cases
    // ============================================
    describe('edge cases', () => {
        it('should handle 2 total pages correctly', () => {
            render(<Pagination {...defaultProps} totalPages={2} />);

            expect(screen.getByLabelText('Page 1')).toBeInTheDocument();
            expect(screen.getByLabelText('Page 2')).toBeInTheDocument();
            expect(screen.queryByText('...')).not.toBeInTheDocument();
        });

        it('should handle being on page 2 of 2', () => {
            render(<Pagination {...defaultProps} totalPages={2} currentPage={2} />);

            expect(screen.getByLabelText('Previous page')).not.toBeDisabled();
            expect(screen.getByLabelText('Next page')).toBeDisabled();
        });

        it('should show ellipsis only when gap is more than 1', () => {
            // With 7 pages and on page 1, should show 1,2,3,4,5...7 (ellipsis before 7)
            render(
                <Pagination
                    {...defaultProps}
                    totalPages={7}
                    currentPage={1}
                />
            );

            // Check that ellipsis appears only when there's a gap > 1
            const ellipses = screen.queryAllByText('...');
            expect(ellipses.length).toBe(1);
        });

        it('should not show ellipsis when endPage equals totalPages - 1', () => {
            // Edge case where we're one page away from end
            render(
                <Pagination
                    {...defaultProps}
                    totalPages={6}
                    currentPage={3}
                />
            );

            // Should show all pages without ellipsis: 1,2,3,4,5,6
            expect(screen.queryByText('...')).not.toBeInTheDocument();
        });
    });
});
