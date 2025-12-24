import { cn } from '@/lib/utils';
import type { UserAvatarProps } from './types';

const sizeClasses = {
  sm: 'w-9 h-9 text-sm',
  md: 'w-12 h-12 text-base',
  lg: 'w-14 h-14 text-lg',
} as const;

/**
 * User avatar with gradient background and initials.
 * Uses CSS hover classes instead of inline handlers.
 */
export function UserAvatar({ user, size = 'sm', className, isActive }: UserAvatarProps) {
  const initial = user.displayName?.[0]?.toUpperCase() || user.email?.[0]?.toUpperCase() || 'U';

  return (
    <div
      className={cn(
        'rounded-full flex items-center justify-center text-white font-semibold transition-all duration-200',
        sizeClasses[size],
        className
      )}
      style={{
        background: 'linear-gradient(135deg, var(--color-brand-600) 0%, var(--color-brand-500) 100%)',
        boxShadow: isActive
          ? '0 4px 12px color-mix(in srgb, var(--color-brand-600) 30%, transparent)'
          : '0 2px 8px color-mix(in srgb, var(--color-brand-600) 20%, transparent)',
      }}
    >
      {initial}
    </div>
  );
}
