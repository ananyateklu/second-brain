import { cn } from '@/lib/utils';
import { getProviderLogo } from '@/utils/provider-logos';
import type { ProviderTabsProps } from './types';

/**
 * Provider tab buttons for switching between AI providers.
 */
export function ProviderTabs({
  providers,
  selectedProvider,
  onProviderSelect,
  isDarkMode,
}: ProviderTabsProps) {
  return (
    <div
      className="flex border-b"
      style={{
        borderColor: 'var(--border)',
      }}
    >
      {providers.map((provider) => {
        const isSelected = provider.provider === selectedProvider;
        const logo = getProviderLogo(provider.provider, isDarkMode);

        return (
          <button
            key={provider.provider}
            type="button"
            onClick={() => onProviderSelect(provider.provider)}
            className={cn(
              'flex-1 px-3 py-2.5 text-sm font-medium transition-all duration-200 relative',
              isSelected
                ? 'text-[var(--color-brand-400)]'
                : 'text-[var(--text-secondary)]'
            )}
            style={{
              backgroundColor: 'transparent',
            }}
          >
            <span className="relative z-10 flex items-center justify-center gap-1.5">
              {logo && (
                <img
                  src={logo}
                  alt={provider.provider}
                  className="w-2.5 h-2.5 flex-shrink-0 object-contain"
                />
              )}
              {provider.provider}
              {!provider.isHealthy && (
                <span
                  className="w-2 h-2 rounded-full"
                  style={{ backgroundColor: 'var(--color-error)' }}
                  title="Provider unavailable"
                />
              )}
            </span>
            {isSelected && (
              <span
                className="absolute bottom-0 left-0 right-0 h-0.5 rounded-full"
                style={{ backgroundColor: 'var(--color-brand-400)' }}
              />
            )}
          </button>
        );
      })}
    </div>
  );
}
