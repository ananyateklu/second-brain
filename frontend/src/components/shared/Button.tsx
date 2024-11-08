import { ChevronRight } from 'lucide-react';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary';
  showIcon?: boolean;
}

export function Button({
  variant = 'primary',
  showIcon = true,
  children,
  disabled,
  className = '',
  ...props
}: ButtonProps) {
  const baseStyles = "w-full py-3 rounded-lg transition-colors flex items-center justify-center gap-2 group disabled:opacity-50 disabled:cursor-not-allowed";
  const variants = {
    primary: `bg-primary text-white dark:bg-primary/90 ${!disabled && 'hover:bg-primary/90 dark:hover:bg-primary/80'}`,
    secondary: `bg-white dark:bg-gray-800 text-primary dark:text-primary-400 border-2 border-primary dark:border-primary-400 ${!disabled && 'hover:bg-primary/10 dark:hover:bg-primary-400/10'}`
  };

  return (
    <button
      {...props}
      disabled={disabled}
      className={`${baseStyles} ${variants[variant]} ${className}`}
    >
      {children}
      {showIcon && !disabled && (
        <ChevronRight className="w-4 h-4 transform group-hover:translate-x-1 transition-transform" />
      )}
    </button>
  );
}