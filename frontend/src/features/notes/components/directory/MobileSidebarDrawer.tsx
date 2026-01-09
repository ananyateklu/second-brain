/**
 * Mobile Sidebar Drawer Component
 * Animated drawer for mobile folder navigation
 */

import { memo, type ReactNode } from 'react';

export interface MobileSidebarDrawerProps {
  /** Whether the drawer is open */
  isOpen: boolean;
  /** Callback to close the drawer */
  onClose: () => void;
  /** Title displayed in the drawer header */
  title?: string;
  /** Content to render inside the drawer (typically DirectorySidebar) */
  children: ReactNode;
}

export const MobileSidebarDrawer = memo(({
  isOpen,
  onClose,
  title = 'Folders',
  children,
}: MobileSidebarDrawerProps) => {
  return (
    <>
      {/* Overlay - z-50 to be above pagination (z-40) */}
      {isOpen && (
        <div
          className="fixed inset-0 z-50 transition-opacity duration-300"
          style={{
            backgroundColor: 'rgba(0, 0, 0, 0.5)',
            backdropFilter: 'blur(4px)',
          }}
          onClick={onClose}
          aria-hidden="true"
        />
      )}

      {/* Drawer - z-[60] to be above overlay */}
      <aside
        className={`fixed top-0 left-0 bottom-0 z-[60] w-72 max-w-[80vw] transform transition-transform duration-300 ease-out flex flex-col backdrop-blur-xl ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
        style={{
          backgroundColor: 'color-mix(in srgb, var(--background) 92%, transparent)',
          borderRight: '1px solid color-mix(in srgb, var(--text-primary) 6%, transparent)',
        }}
      >
        {/* Drawer Header */}
        <div
          className="flex items-center justify-between px-4 py-4 border-b shrink-0"
          style={{ borderColor: 'color-mix(in srgb, var(--text-primary) 6%, transparent)' }}
        >
          <h2 className="text-base font-semibold" style={{ color: 'var(--text-primary)' }}>
            {title}
          </h2>
          <button
            onClick={onClose}
            className="flex items-center justify-center w-9 h-9 rounded-lg transition-all duration-200 hover:scale-105 active:scale-95"
            style={{
              backgroundColor: 'color-mix(in srgb, var(--text-primary) 6%, transparent)',
              border: '1px solid color-mix(in srgb, var(--text-primary) 10%, transparent)',
            }}
            aria-label="Close sidebar"
          >
            <svg
              className="w-5 h-5"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              style={{ color: 'var(--text-primary)' }}
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Drawer Content */}
        <div className="flex-1 overflow-y-auto">
          {children}
        </div>
      </aside>
    </>
  );
});

MobileSidebarDrawer.displayName = 'MobileSidebarDrawer';
