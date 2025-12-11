/**
 * ViewModeToggle Component
 * Reusable toggle for switching between card/grid and list view modes
 */

import { memo } from 'react';
import type { NotesViewMode } from '../../store/types';

interface ViewModeToggleProps {
  viewMode: NotesViewMode;
  onViewModeChange: (mode: NotesViewMode) => void;
  size?: 'sm' | 'md';
  className?: string;
}

export const ViewModeToggle = memo(({
  viewMode,
  onViewModeChange,
  size = 'md',
  className = '',
}: ViewModeToggleProps) => {
  const buttonSize = size === 'sm' ? 'w-8 h-8' : 'w-9 h-9';
  const iconSize = size === 'sm' ? 'w-3.5 h-3.5' : 'w-4 h-4';

  return (
    <div
      className={`flex items-center rounded-xl border overflow-hidden ${className}`}
      style={{
        backgroundColor: 'var(--surface-elevated)',
        borderColor: 'var(--border)',
      }}
    >
      <button
        type="button"
        onClick={() => onViewModeChange('card')}
        className={`flex items-center justify-center ${buttonSize} transition-all duration-200`}
        style={{
          backgroundColor: viewMode === 'card' ? 'var(--color-brand-600)' : 'transparent',
          color: viewMode === 'card' ? '#ffffff' : 'var(--text-secondary)',
        }}
        onMouseEnter={(e) => {
          if (viewMode !== 'card') {
            e.currentTarget.style.backgroundColor = 'var(--surface-hover)';
            e.currentTarget.style.color = 'var(--text-primary)';
          }
        }}
        onMouseLeave={(e) => {
          if (viewMode !== 'card') {
            e.currentTarget.style.backgroundColor = 'transparent';
            e.currentTarget.style.color = 'var(--text-secondary)';
          }
        }}
        title="Grid view"
        aria-label="Grid view"
        aria-pressed={viewMode === 'card'}
      >
        {/* Grid/Card icon */}
        <svg className={iconSize} fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
        </svg>
      </button>
      <div
        className="w-px h-5"
        style={{ backgroundColor: 'var(--border)' }}
      />
      <button
        type="button"
        onClick={() => onViewModeChange('list')}
        className={`flex items-center justify-center ${buttonSize} transition-all duration-200`}
        style={{
          backgroundColor: viewMode === 'list' ? 'var(--color-brand-600)' : 'transparent',
          color: viewMode === 'list' ? '#ffffff' : 'var(--text-secondary)',
        }}
        onMouseEnter={(e) => {
          if (viewMode !== 'list') {
            e.currentTarget.style.backgroundColor = 'var(--surface-hover)';
            e.currentTarget.style.color = 'var(--text-primary)';
          }
        }}
        onMouseLeave={(e) => {
          if (viewMode !== 'list') {
            e.currentTarget.style.backgroundColor = 'transparent';
            e.currentTarget.style.color = 'var(--text-secondary)';
          }
        }}
        title="List view"
        aria-label="List view"
        aria-pressed={viewMode === 'list'}
      >
        {/* List icon */}
        <svg className={iconSize} fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
        </svg>
      </button>
    </div>
  );
});

ViewModeToggle.displayName = 'ViewModeToggle';
