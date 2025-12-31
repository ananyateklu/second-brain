import { memo } from 'react';
import { useAuthenticatedImage } from '../hooks/use-authenticated-image';

interface AuthenticatedImageProps {
  /** The relative URL path (e.g., "/api/notes/images/{id}") or full URL */
  url: string;
  /** Alt text for the image */
  alt: string;
  /** CSS class name for the image */
  className?: string;
  /** Optional click handler */
  onClick?: () => void;
  /** Optional title attribute */
  title?: string;
}

/**
 * Image component that handles authenticated image fetching.
 * Uses fetch() with Authorization header and creates a blob URL for display.
 */
export const AuthenticatedImage = memo(function AuthenticatedImage({
  url,
  alt,
  className,
  onClick,
  title,
}: AuthenticatedImageProps) {
  const { src, isLoading, error } = useAuthenticatedImage(url);

  if (isLoading) {
    return (
      <div
        className={className}
        style={{
          backgroundColor: 'var(--surface-card)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          minHeight: '100px',
        }}
      >
        <div
          className="animate-pulse rounded"
          style={{
            width: '24px',
            height: '24px',
            backgroundColor: 'var(--border)',
          }}
        />
      </div>
    );
  }

  if (error || !src) {
    return (
      <div
        className={className}
        style={{
          backgroundColor: 'var(--surface-card)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '12px',
          minHeight: '100px',
        }}
      >
        <div className="text-center">
          <svg
            className="w-6 h-6 mx-auto mb-1"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            style={{ color: 'var(--text-tertiary)' }}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1.5}
              d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
            />
          </svg>
          <span
            className="text-xs"
            style={{ color: 'var(--text-tertiary)' }}
          >
            {error || 'Failed to load'}
          </span>
        </div>
      </div>
    );
  }

  return (
    <img
      src={src}
      alt={alt}
      className={className}
      onClick={onClick}
      title={title}
    />
  );
});
