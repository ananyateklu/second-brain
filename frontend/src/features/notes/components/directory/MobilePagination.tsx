/**
 * Mobile Pagination Component
 * Inline pagination for mobile view, positioned at the bottom of the notes content area
 */

import { memo } from 'react';
import { Pagination } from '../../../../components/ui/Pagination';

export interface MobilePaginationProps {
  currentPage: number;
  totalPages: number;
  totalItems: number;
  itemsPerPage: number;
  onPageChange: (page: number) => void;
}

export const MobilePagination = memo(({
  currentPage,
  totalPages,
  totalItems,
  itemsPerPage,
  onPageChange,
}: MobilePaginationProps) => {
  if (totalPages <= 1) return null;

  return (
    <div className="md:hidden mt-6 pb-4 flex justify-center">
      <div
        className="px-4 py-2.5 rounded-2xl border"
        style={{
          backgroundColor: 'color-mix(in srgb, var(--background) 90%, transparent)',
          borderColor: 'color-mix(in srgb, var(--text-primary) 6%, transparent)',
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
    </div>
  );
});

MobilePagination.displayName = 'MobilePagination';
