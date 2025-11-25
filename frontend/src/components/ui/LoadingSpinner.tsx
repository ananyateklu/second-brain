interface LoadingSpinnerProps {
  size?: 'sm' | 'md' | 'lg';
  message?: string;
}

export function LoadingSpinner({ size = 'md', message }: LoadingSpinnerProps) {
  const sizeClasses = {
    sm: 'h-6 w-6',
    md: 'h-12 w-12',
    lg: 'h-16 w-16',
  };

  return (
    <div className="flex flex-col items-center justify-center py-20">
      <div className="relative">
        <div
          className={`${sizeClasses[size]} animate-spin rounded-full border-4 border-solid`}
          style={{
            borderColor: 'var(--color-brand-200)',
          }}
        ></div>
        <div
          className={`absolute top-0 left-0 ${sizeClasses[size]} animate-spin rounded-full border-4 border-solid border-t-transparent`}
          style={{
            borderColor: 'var(--color-brand-600)',
          }}
        ></div>
      </div>
      {message && (
        <p
          className="mt-6 text-base font-medium"
          style={{ color: 'var(--text-secondary)' }}
        >
          {message}
        </p>
      )}
    </div>
  );
}

