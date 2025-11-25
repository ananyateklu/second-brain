import { ButtonHTMLAttributes, forwardRef } from 'react';

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
  isLoading?: boolean;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ variant = 'primary', size = 'md', isLoading = false, className = '', children, disabled, ...props }, ref) => {
    const baseStyles = 'inline-flex items-center justify-center gap-2 rounded-3xl font-semibold transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed';
    
    const variantStyles = {
      primary: 'border hover:scale-105 active:scale-95',
      secondary: 'border hover:scale-105 active:scale-95',
      danger: 'border hover:scale-105 active:scale-95',
      ghost: '',
    };

    const sizeStyles = {
      sm: 'px-3 py-1.5 text-xs',
      md: 'px-5 py-2.5 text-sm',
      lg: 'px-6 py-3 text-base',
    };

    const getVariantStyles = () => {
      switch (variant) {
        case 'primary':
          return {
            backgroundColor: 'var(--btn-primary-bg)',
            color: 'var(--btn-primary-text)',
            borderColor: 'var(--btn-primary-border)',
            boxShadow: 'var(--btn-primary-shadow)',
          };
        case 'secondary':
          return {
            backgroundColor: 'transparent',
            color: 'var(--btn-secondary-text)',
            borderColor: 'var(--btn-secondary-border)',
            boxShadow: 'var(--btn-secondary-shadow)',
          };
        case 'danger':
          return {
            backgroundColor: 'var(--color-error)',
            color: '#ffffff',
            borderColor: 'transparent',
            boxShadow: 'var(--shadow-lg)',
          };
        case 'ghost':
          return {
            backgroundColor: 'transparent',
            color: 'var(--text-secondary)',
            borderColor: 'transparent',
            boxShadow: 'none',
          };
        default:
          return {};
      }
    };

    const getHoverStyles = () => {
      switch (variant) {
        case 'primary':
          return {
            backgroundColor: 'var(--btn-primary-hover-bg)',
            borderColor: 'var(--btn-primary-hover-border)',
            boxShadow: 'var(--btn-primary-hover-shadow)',
          };
        case 'secondary':
          return {
            backgroundColor: 'var(--btn-secondary-hover-bg)',
            color: 'var(--btn-secondary-hover-text)',
            borderColor: 'var(--btn-secondary-hover-border)',
            boxShadow: 'var(--btn-secondary-hover-shadow)',
          };
        case 'danger':
          return {
            backgroundColor: 'var(--color-error-text)',
            boxShadow: 'var(--shadow-xl)',
          };
        case 'ghost':
          return {
            backgroundColor: 'var(--surface-elevated)',
            color: 'var(--text-primary)',
          };
        default:
          return {};
      }
    };

    return (
      <button
        ref={ref}
        className={`${baseStyles} ${variantStyles[variant]} ${sizeStyles[size]} ${className}`}
        style={getVariantStyles()}
        onMouseEnter={(e) => {
          if (disabled || isLoading) return;
          const hoverStyles = getHoverStyles();
          Object.assign(e.currentTarget.style, hoverStyles);
        }}
        onMouseLeave={(e) => {
          if (disabled || isLoading) return;
          const defaultStyles = getVariantStyles();
          Object.assign(e.currentTarget.style, defaultStyles);
        }}
        disabled={disabled || isLoading}
        {...props}
      >
        {isLoading ? (
          <>
            <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
            {children}
          </>
        ) : (
          children
        )}
      </button>
    );
  }
);

Button.displayName = 'Button';

