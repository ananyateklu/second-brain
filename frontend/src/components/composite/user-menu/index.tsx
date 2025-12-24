import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useBoundStore } from '../../../store/bound-store';
import { toast } from '../../../hooks/use-toast';
import { cn } from '@/lib/utils';
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
} from '@/components/ui/DropdownMenu';
import { UserAvatar } from './UserAvatar';
import { ApiKeySection } from './ApiKeySection';
import { ApiKeyModal } from './ApiKeyModal';
import { useApiKey } from './hooks/use-api-key';

/**
 * User menu dropdown with avatar trigger.
 * Uses shadcn DropdownMenu primitive and CSS hover classes.
 */
export function UserMenu() {
  const [showApiKeyModal, setShowApiKeyModal] = useState(false);
  const navigate = useNavigate();
  const user = useBoundStore((state) => state.user);
  const signOut = useBoundStore((state) => state.signOut);
  const theme = useBoundStore((state) => state.theme);
  const isBlueTheme = theme === 'blue';
  const { copyApiKey } = useApiKey();

  const handleSignOut = () => {
    try {
      signOut();
      void navigate('/login');
    } catch (error) {
      console.error('Sign out error:', error);
      toast.error('Failed to sign out');
    }
  };

  if (!user) return null;

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button
            className={cn(
              'flex items-center gap-2.5 px-3 py-2 rounded-xl transition-all duration-200',
              'hover:scale-105 active:scale-95',
              'hover:bg-[var(--surface-elevated)]',
              'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-[var(--color-brand-600)]',
              'text-[var(--text-primary)]',
              'data-[state=open]:bg-[var(--surface-elevated)]'
            )}
            aria-label="User menu"
          >
            <UserAvatar user={user} size="sm" />
            <svg
              className="w-4 h-4 transition-transform duration-200 [[data-state=open]>&]:rotate-180"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              strokeWidth={2}
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
            </svg>
          </button>
        </DropdownMenuTrigger>

        <DropdownMenuContent
          align="end"
          className={cn(
            'w-80 rounded-2xl py-2 overflow-hidden',
            isBlueTheme
              ? 'bg-[rgba(10,22,40,0.98)]'
              : 'bg-[var(--surface-card-solid)]',
            'backdrop-blur-xl saturate-[1.8]'
          )}
          style={{
            boxShadow: 'var(--shadow-xl), 0 0 60px -20px var(--color-primary-alpha)',
          }}
          sideOffset={8}
        >
          {/* Ambient glow effect */}
          <div
            className="absolute -top-32 -right-32 w-64 h-64 rounded-full opacity-15 blur-3xl pointer-events-none"
            style={{
              background: 'radial-gradient(circle, var(--color-primary), transparent)',
            }}
          />

          <div className="relative z-10">
            {/* User Info */}
            <div className="px-4 py-4 border-b border-[var(--border)]">
              <div className="flex items-center gap-3">
                <UserAvatar user={user} size="md" isActive />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold truncate mb-0.5 text-[var(--text-primary)]">
                    {user.displayName || 'User'}
                  </p>
                  <p className="text-xs truncate flex items-center gap-1.5 text-[var(--text-secondary)]">
                    <svg
                      className="h-3 w-3 flex-shrink-0"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                      strokeWidth={2}
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M16 12a4 4 0 10-8 0 4 4 0 008 0zm0 0v1.5a2.5 2.5 0 005 0V12a9 9 0 10-9 9m4.5-1.206a8.959 8.959 0 01-4.5 1.207"
                      />
                    </svg>
                    {user.email}
                  </p>
                </div>
              </div>
            </div>

            {/* API Key Section */}
            {user.apiKey && (
              <ApiKeySection
                apiKey={user.apiKey}
                onCopy={copyApiKey}
                isBlueTheme={isBlueTheme}
              />
            )}

            {/* Menu Items */}
            <div className="py-2">
              <DropdownMenuItem
                className={cn(
                  'mx-2 px-4 py-2.5 rounded-lg cursor-pointer',
                  'hover:scale-[1.02] active:scale-[0.98]',
                  'focus:bg-[color-mix(in_srgb,var(--color-brand-600)_8%,transparent)]',
                  'text-[var(--text-primary)]'
                )}
                onSelect={() => setShowApiKeyModal(true)}
              >
                <div
                  className="flex h-8 w-8 items-center justify-center rounded-lg flex-shrink-0 mr-3"
                  style={{
                    backgroundColor: 'color-mix(in srgb, var(--color-brand-600) 12%, transparent)',
                  }}
                >
                  <svg
                    className="w-4 h-4 text-[var(--color-brand-600)]"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                    strokeWidth={2}
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z"
                    />
                  </svg>
                </div>
                <span className="font-medium">
                  {user.apiKey ? 'Regenerate' : 'Generate'} API Key
                </span>
              </DropdownMenuItem>

              <DropdownMenuSeparator className="my-1" />

              <DropdownMenuItem
                className={cn(
                  'mx-2 px-4 py-2.5 rounded-lg cursor-pointer',
                  'hover:scale-[1.02] active:scale-[0.98]',
                  'focus:bg-[color-mix(in_srgb,var(--color-error)_10%,transparent)]',
                  'text-[var(--color-error)]'
                )}
                onSelect={handleSignOut}
              >
                <div
                  className="flex h-8 w-8 items-center justify-center rounded-lg flex-shrink-0 mr-3"
                  style={{
                    backgroundColor: 'color-mix(in srgb, var(--color-error) 12%, transparent)',
                  }}
                >
                  <svg
                    className="w-4 h-4 text-[var(--color-error)]"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                    strokeWidth={2}
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"
                    />
                  </svg>
                </div>
                <span className="font-medium">Sign Out</span>
              </DropdownMenuItem>
            </div>
          </div>
        </DropdownMenuContent>
      </DropdownMenu>

      {/* API Key Modal */}
      <ApiKeyModal
        isOpen={showApiKeyModal}
        onClose={() => setShowApiKeyModal(false)}
        user={user}
      />
    </>
  );
}

// Re-export components for flexibility
export { UserAvatar } from './UserAvatar';
export { ApiKeySection } from './ApiKeySection';
export { ApiKeyModal } from './ApiKeyModal';
export type * from './types';
