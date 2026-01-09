/**
 * Floating Pagination Component
 * Desktop-only pagination that floats at the bottom of the viewport
 * Uses portal to render outside scrolling containers
 */

import { memo } from 'react';
import { createPortal } from 'react-dom';
import { Pagination } from '../../../../components/ui/Pagination';

export interface FloatingPaginationProps {
  currentPage: number;
  totalPages: number;
  totalItems: number;
  itemsPerPage: number;
  onPageChange: (page: number) => void;
  /** Whether the pagination is visible (based on scroll direction) */
  isVisible: boolean;
  /** Whether bulk mode is active (shifts position up) */
  isBulkMode: boolean;
}

export const FloatingPagination = memo(({
  currentPage,
  totalPages,
  totalItems,
  itemsPerPage,
  onPageChange,
  isVisible,
  isBulkMode,
}: FloatingPaginationProps) => {
  if (totalPages <= 1) return null;
  if (typeof document === 'undefined') return null;

  const content = (
    <div
      className="hidden md:block fixed z-40 px-6 py-3 rounded-2xl border shadow-2xl transition-all duration-300"
      style={{
        left: '50%',
        bottom: isBulkMode ? '5.75rem' : '1.5rem',
        backgroundColor: 'color-mix(in srgb, var(--background) 90%, transparent)',
        borderColor: 'color-mix(in srgb, var(--text-primary) 6%, transparent)',
        backdropFilter: 'blur(20px) saturate(180%)',
        WebkitBackdropFilter: 'blur(20px) saturate(180%)',
        opacity: isVisible ? 1 : 0,
        transform: `translate(-50%, ${isVisible ? '0' : '20px'})`,
        pointerEvents: isVisible ? 'auto' : 'none',
      }}
    >
      <Pagination
        currentPage={currentPage}
        totalPages={totalPages}
        totalItems={totalItems}
        itemsPerPage={itemsPerPage}
        onPageChange={onPageChange}
      />
    </div>
  );

  return createPortal(content, document.body);
});

FloatingPagination.displayName = 'FloatingPagination';
