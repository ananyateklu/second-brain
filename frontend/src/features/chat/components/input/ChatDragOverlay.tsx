/**
 * Drag Overlay Component
 * Shows a visual indicator when dragging files over the chat input
 */

export function ChatDragOverlay() {
  return (
    <div
      className="absolute inset-0 flex items-center justify-center rounded-3xl z-30 animate-in fade-in duration-150"
      style={{
        backgroundColor: 'rgba(var(--primary-rgb), 0.1)',
        border: '3px dashed var(--primary)',
        backdropFilter: 'blur(4px)',
      }}
    >
      <div className="text-center">
        <svg
          className="w-14 h-14 mx-auto mb-3"
          style={{ color: 'var(--primary)' }}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={1.5}
            d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
          />
        </svg>
        <p style={{ color: 'var(--primary)' }} className="font-medium text-lg">
          Drop files here
        </p>
        <p className="text-sm mt-1" style={{ color: 'var(--text-tertiary)' }}>
          Images, PDFs, documents supported
        </p>
      </div>
    </div>
  );
}

