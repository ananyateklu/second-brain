/**
 * Pagination Component
 * Reusable pagination controls for lists
 */

import { memo, useMemo } from 'react';

interface PaginationProps {
  currentPage: number;
  totalPages: number;
  totalItems: number;
  itemsPerPage: number;
  onPageChange: (page: number) => void;
  showItemCount?: boolean;
  maxVisiblePages?: number;
}

export const Pagination = memo(({
  currentPage,
  totalPages,
  totalItems,
  itemsPerPage,
  onPageChange,
  showItemCount = true,
  maxVisiblePages = 5,
}: PaginationProps) => {
  // Calculate visible page numbers - must be before any early returns
  const visiblePages = useMemo(() => {
    if (totalPages <= 1) return [];

    const pages: (number | 'ellipsis')[] = [];
    const halfVisible = Math.floor(maxVisiblePages / 2);

    let startPage = Math.max(1, currentPage - halfVisible);
    let endPage = Math.min(totalPages, currentPage + halfVisible);

    // Adjust if we're near the beginning
    if (currentPage <= halfVisible) {
      endPage = Math.min(totalPages, maxVisiblePages);
    }

    // Adjust if we're near the end
    if (currentPage > totalPages - halfVisible) {
      startPage = Math.max(1, totalPages - maxVisiblePages + 1);
    }

    // Add first page and ellipsis if needed
    if (startPage > 1) {
      pages.push(1);
      if (startPage > 2) {
        pages.push('ellipsis');
      }
    }

    // Add visible pages
    for (let i = startPage; i <= endPage; i++) {
      pages.push(i);
    }

    // Add ellipsis and last page if needed
    if (endPage < totalPages) {
      if (endPage < totalPages - 1) {
        pages.push('ellipsis');
      }
      pages.push(totalPages);
    }

    return pages;
  }, [currentPage, totalPages, maxVisiblePages]);

  // Don't render pagination if there's only one page
  if (totalPages <= 1) {
    return null;
  }

  const startItem = (currentPage - 1) * itemsPerPage + 1;
  const endItem = Math.min(currentPage * itemsPerPage, totalItems);

  return (
    <div className="flex flex-col sm:flex-row items-center justify-between gap-3 py-4">
      {/* Item count */}
      {showItemCount && (
        <div className="text-xs" style={{ color: 'var(--text-secondary)' }}>
          Showing {startItem}–{endItem} of {totalItems} items
        </div>
      )}

      {/* Pagination controls */}
      <div className="flex items-center gap-1">
        {/* Previous button */}
        <button
          type="button"
          onClick={() => onPageChange(currentPage - 1)}
          disabled={currentPage === 1}
          className="p-2 rounded-lg border transition-all duration-200 disabled:opacity-40 disabled:cursor-not-allowed hover:border-[color:var(--color-brand-600)] disabled:hover:border-[color:var(--border)]"
          style={{
            backgroundColor: 'var(--surface-elevated)',
            borderColor: 'var(--border)',
            color: 'var(--text-primary)',
          }}
          aria-label="Previous page"
        >
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
          </svg>
        </button>

        {/* Page numbers */}
        <div className="flex items-center gap-1">
          {visiblePages.map((page, index) => {
            if (page === 'ellipsis') {
              return (
                <span
                  key={`ellipsis-${index}`}
                  className="px-2 py-1 text-xs"
                  style={{ color: 'var(--text-secondary)' }}
                >
                  ...
                </span>
              );
            }

            const isActive = page === currentPage;
            return (
              <button
                key={page}
                type="button"
                onClick={() => onPageChange(page)}
                className="min-w-[2rem] px-2 py-1 rounded-lg border text-xs font-medium transition-all duration-200"
                style={{
                  backgroundColor: isActive
                    ? 'var(--color-brand-600)'
                    : 'var(--surface-elevated)',
                  borderColor: isActive ? 'var(--color-brand-600)' : 'var(--border)',
                  color: isActive ? 'white' : 'var(--text-primary)',
                  boxShadow: isActive
                    ? '0 4px 12px color-mix(in srgb, var(--color-brand-600) 30%, transparent)'
                    : 'none',
                }}
                aria-label={`Page ${page}`}
                aria-current={isActive ? 'page' : undefined}
              >
                {page}
              </button>
            );
          })}
        </div>

        {/* Next button */}
        <button
          type="button"
          onClick={() => onPageChange(currentPage + 1)}
          disabled={currentPage === totalPages}
          className="p-2 rounded-lg border transition-all duration-200 disabled:opacity-40 disabled:cursor-not-allowed hover:border-[color:var(--color-brand-600)] disabled:hover:border-[color:var(--border)]"
          style={{
            backgroundColor: 'var(--surface-elevated)',
            borderColor: 'var(--border)',
            color: 'var(--text-primary)',
          }}
          aria-label="Next page"
        >
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
          </svg>
        </button>
      </div>
    </div>
  );
});

Pagination.displayName = 'Pagination';
