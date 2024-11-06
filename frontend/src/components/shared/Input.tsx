import { LucideIcon } from 'lucide-react';
import { AlertCircle } from 'lucide-react';

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label: string;
  icon: LucideIcon;
  error?: string;
}

export function Input({ label, icon: Icon, error, className = '', ...props }: InputProps) {
  return (
    <div className="space-y-1">
      {label && (
        <label 
          htmlFor={props.id} 
          className="block text-sm font-medium text-white"
        >
          {label}
        </label>
      )}
      <div className="relative">
        {Icon && (
          <div className="absolute inset-y-0 left-3 flex items-center pointer-events-none">
            <Icon className="h-5 w-5 text-white" />
          </div>
        )}
        <input
          {...props}
          className={`
            w-full
            px-4 py-2
            ${Icon ? 'pl-10' : ''}
            rounded-lg
            border
            focus:outline-none
            focus:ring-2
            focus:ring-primary-500/50
            transition-colors
            disabled:opacity-50
            disabled:cursor-not-allowed
            ${error ? 'border-red-500 focus:border-red-500' : 'border-white/20'}
            ${className}
          `}
        />
      </div>
      {error && (
        <p className="text-sm text-red-400 mt-1">{error}</p>
      )}
    </div>
  );
}