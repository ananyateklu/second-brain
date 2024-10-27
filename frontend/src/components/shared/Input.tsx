import { LucideIcon } from 'lucide-react';
import { AlertCircle } from 'lucide-react';

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label: string;
  icon: LucideIcon;
  error?: string;
}

export function Input({ label, icon: Icon, error, className = '', ...props }: InputProps) {
  return (
    <div className="space-y-1.5">
      <label htmlFor={props.id} className="block text-sm font-medium text-gray-700 dark:text-gray-300">
        {label}
      </label>
      <div className="relative">
        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
          <Icon className={`w-5 h-5 ${error ? 'text-red-500' : 'text-gray-400 dark:text-gray-500'}`} />
        </div>
        <input
          {...props}
          className={`
            block w-full pl-10 pr-3 py-2.5 sm:text-sm rounded-lg
            bg-white dark:bg-dark-bg
            border border-gray-300 dark:border-dark-border
            text-gray-900 dark:text-white
            placeholder-gray-400 dark:placeholder-gray-500
            focus:ring-2 focus:ring-primary-500 dark:focus:ring-primary-500 focus:border-transparent
            disabled:bg-gray-50 dark:disabled:bg-dark-card disabled:cursor-not-allowed
            transition-colors duration-200
            ${error ? 'border-red-500 dark:border-red-500 focus:ring-red-500 dark:focus:ring-red-500' : ''}
            ${className}
          `}
        />
        {error && (
          <div className="absolute inset-y-0 right-0 flex items-center pr-3">
            <AlertCircle className="h-5 w-5 text-red-500" />
          </div>
        )}
      </div>
      {error && (
        <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
      )}
    </div>
  );
}