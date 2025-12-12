interface LoadingSpinnerProps {
  size?: 'xs' | 'sm' | 'md' | 'lg';
  message?: string;
  className?: string;
  inline?: boolean;
}

export function LoadingSpinner({ size = 'md', message, className = '', inline = false }: LoadingSpinnerProps) {
  const sizeClasses = {
    xs: 'h-4 w-4',
    sm: 'h-6 w-6',
    md: 'h-8 w-8',
    lg: 'h-12 w-12',
  };

  const borderClasses = {
    xs: 'border-2',
    sm: 'border-2',
    md: 'border-[3px]',
    lg: 'border-4',
  };

  const spinner = (
    <div className="relative">
      <div
        className={`${sizeClasses[size]} animate-spin rounded-full ${borderClasses[size]} border-solid`}
        style={{
          borderColor: 'var(--color-brand-200)',
        }}
      ></div>
      <div
        className={`absolute top-0 left-0 ${sizeClasses[size]} animate-spin rounded-full ${borderClasses[size]} border-solid border-t-transparent`}
        style={{
          borderColor: 'var(--color-brand-600)',
        }}
      ></div>
    </div>
  );

  if (inline) {
    return spinner;
  }

  return (
    <div className={`flex flex-col items-center justify-center py-12 ${className}`}>
      {spinner}
      {message && (
        <p
          className="mt-4 text-sm font-medium"
          style={{ color: 'var(--text-secondary)' }}
        >
          {message}
        </p>
      )}
    </div>
  );
}

