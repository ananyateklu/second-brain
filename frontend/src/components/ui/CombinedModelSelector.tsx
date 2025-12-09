import { useState, useRef, useEffect, useMemo } from 'react';
import { formatModelName } from '../../utils/model-name-formatter';
import { groupModelsByCategory } from '../../utils/model-categorizer';
import { useThemeStore } from '../../store/theme-store';
import { useProviderLogo, getProviderLogo } from '../../utils/provider-logos';

interface Provider {
  provider: string;
  isHealthy: boolean;
  availableModels: string[];
}

interface CombinedModelSelectorProps {
  providers: Provider[];
  selectedProvider: string;
  selectedModel: string;
  onProviderChange: (provider: string) => void;
  onModelChange: (model: string) => void;
  disabled?: boolean;
  /** Callback to refresh providers by clearing cache and fetching fresh data */
  onRefresh?: () => Promise<void>;
  /** Whether providers are currently being refreshed */
  isRefreshing?: boolean;
}

export function CombinedModelSelector({
  providers,
  selectedProvider,
  selectedModel,
  onProviderChange,
  onModelChange,
  disabled = false,
  onRefresh,
  isRefreshing = false,
}: CombinedModelSelectorProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [focusedIndex, setFocusedIndex] = useState<number | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const selectedModelRef = useRef<HTMLButtonElement>(null);
  const { theme } = useThemeStore();
  const isBlueTheme = theme === 'blue';
  const isDarkMode = theme === 'dark' || theme === 'blue';

  // Get logo for selected provider using hook
  const selectedProviderLogo = useProviderLogo(selectedProvider || '');

  const selectedProviderData = providers.find((p) => p.provider === selectedProvider);

  const availableModels = useMemo(
    () => selectedProviderData?.availableModels || [],
    [selectedProviderData?.availableModels]
  );

  const groupedModels = useMemo(() => groupModelsByCategory(availableModels), [availableModels]);

  const flatModelList = useMemo(() => {
    const flat: { type: 'model' | 'header'; value: string; category?: string }[] = [];
    groupedModels.forEach(group => {
      flat.push({ type: 'header', value: group.displayName, category: group.category });
      group.models.forEach(model => {
        flat.push({ type: 'model', value: model });
      });
    });
    return flat;
  }, [groupedModels]);

  // Scroll to selected model when dropdown opens
  useEffect(() => {
    if (isOpen && selectedModelRef.current && dropdownRef.current) {
      requestAnimationFrame(() => {
        selectedModelRef.current?.scrollIntoView({
          behavior: 'smooth',
          block: 'center',
          inline: 'nearest',
        });
      });
    }
  }, [isOpen, selectedModel]);

  // Close dropdown when clicking outside
  useEffect(() => {
    if (!isOpen) return;

    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
        setFocusedIndex(null);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => { document.removeEventListener('mousedown', handleClickOutside); };
  }, [isOpen]);

  // Keyboard navigation
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsOpen(false);
        setFocusedIndex(null);
        buttonRef.current?.focus();
        return;
      }

      if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
        e.preventDefault();
        if (flatModelList.length === 0) return;

        let currentModelIndex: number;
        if (focusedIndex !== null && flatModelList[focusedIndex]?.type === 'model') {
          currentModelIndex = focusedIndex;
        } else {
          currentModelIndex = flatModelList.findIndex((item) => item.type === 'model' && item.value === selectedModel);
          if (currentModelIndex === -1) {
            currentModelIndex = flatModelList.findIndex((item) => item.type === 'model');
          }
        }

        let newIndex = -1;
        if (e.key === 'ArrowDown') {
          for (let i = currentModelIndex + 1; i < flatModelList.length; i++) {
            if (flatModelList[i].type === 'model') {
              newIndex = i;
              break;
            }
          }
          if (newIndex === -1) {
            for (let i = 0; i < currentModelIndex; i++) {
              if (flatModelList[i].type === 'model') {
                newIndex = i;
                break;
              }
            }
          }
        } else {
          for (let i = currentModelIndex - 1; i >= 0; i--) {
            if (flatModelList[i].type === 'model') {
              newIndex = i;
              break;
            }
          }
          if (newIndex === -1) {
            for (let i = flatModelList.length - 1; i > currentModelIndex; i--) {
              if (flatModelList[i].type === 'model') {
                newIndex = i;
                break;
              }
            }
          }
        }

        if (newIndex !== -1) {
          setFocusedIndex(newIndex);
        }
      }

      if (e.key === 'Enter' && focusedIndex !== null) {
        const item = flatModelList[focusedIndex];
        if (item?.type === 'model') {
          e.preventDefault();
          onModelChange(item.value);
          setIsOpen(false);
          setFocusedIndex(null);
          buttonRef.current?.focus();
        }
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => { document.removeEventListener('keydown', handleKeyDown); };
  }, [isOpen, focusedIndex, flatModelList, selectedModel, onModelChange]);

  const handleProviderSelect = (provider: string) => {
    onProviderChange(provider);
    // Reset focus when switching providers
    setFocusedIndex(null);
  };

  const handleModelSelect = (model: string) => {
    onModelChange(model);
    setIsOpen(false);
    setFocusedIndex(null);
  };

  if (providers.length === 0) {
    return null;
  }

  // Get short display text for the button
  const getDisplayText = () => {
    if (!selectedProvider || !selectedModel) return 'Select Model';
    const shortModel = formatModelName(selectedModel);
    return `${selectedProvider} / ${shortModel}`;
  };

  // Handle refresh click
  const handleRefresh = async (e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent opening dropdown
    if (onRefresh && !isRefreshing) {
      await onRefresh();
    }
  };

  return (
    <div ref={containerRef} className="relative flex items-center gap-1.5">
      <button
        ref={buttonRef}
        type="button"
        onClick={() => !disabled && !isRefreshing && setIsOpen(!isOpen)}
        disabled={disabled || isRefreshing}
        className="group px-4 py-2 rounded-xl text-sm font-medium transition-all duration-200 hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 max-w-[280px]"
        style={{
          backgroundColor: isOpen ? 'var(--surface-elevated)' : 'var(--surface-card)',
          color: 'var(--text-primary)',
          border: `1px solid ${isRefreshing ? 'var(--color-primary)' : 'var(--border)'}`,
          boxShadow: isOpen ? 'var(--shadow-lg)' : 'var(--shadow-sm)',
        }}
        aria-expanded={isOpen}
        aria-haspopup="listbox"
      >
        {/* Loading spinner when refreshing, otherwise show provider logo */}
        {isRefreshing ? (
          <svg
            className="w-4 h-4 flex-shrink-0 animate-spin"
            style={{ color: 'var(--color-primary)' }}
            fill="none"
            viewBox="0 0 24 24"
          >
            <circle
              className="opacity-25"
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              strokeWidth="4"
            />
            <path
              className="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
            />
          </svg>
        ) : selectedProvider && selectedProviderLogo ? (
          <img
            src={selectedProviderLogo}
            alt={selectedProvider}
            className="w-4 h-4 flex-shrink-0 object-contain"
          />
        ) : (
          // Fallback icon when no provider selected or logo not found
          <svg
            className="w-4 h-4 flex-shrink-0 transition-colors"
            style={{ color: 'var(--text-secondary)' }}
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
            />
          </svg>
        )}

        <span className="truncate flex-1 text-left">
          {isRefreshing ? (
            <span style={{ color: 'var(--color-primary)' }}>Refreshing...</span>
          ) : selectedProvider && selectedModel ? (
            <>
              <span style={{ color: 'var(--color-brand-400)' }}>{selectedProvider}</span>
              <span className="mx-1" style={{ color: 'var(--text-secondary)' }}>/</span>
              <span style={{ color: 'var(--color-brand-400)' }}>{formatModelName(selectedModel)}</span>
            </>
          ) : (
            getDisplayText()
          )}
        </span>

        <svg
          className={`w-4 h-4 transition-transform duration-200 flex-shrink-0 ${isOpen ? 'rotate-180' : ''}`}
          style={{ color: 'var(--text-tertiary)' }}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {/* Refresh Button */}
      {onRefresh && (
        <button
          type="button"
          onClick={(e) => { void handleRefresh(e); }}
          disabled={isRefreshing || disabled}
          className="p-2 rounded-lg transition-all duration-200 hover:scale-105 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
          style={{
            backgroundColor: 'var(--surface-card)',
            color: isRefreshing ? 'var(--color-primary)' : 'var(--text-secondary)',
            border: '1px solid var(--border)',
          }}
          title={isRefreshing ? 'Refreshing providers...' : 'Refresh providers & models'}
        >
          <svg
            className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`}
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
            />
          </svg>
        </button>
      )}

      {isOpen && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 z-40"
            onClick={() => { setIsOpen(false); }}
            style={{ backgroundColor: 'rgba(0, 0, 0, 0.2)' }}
          />

          <div
            ref={dropdownRef}
            className="absolute top-full left-0 mt-2 w-[420px] rounded-xl border z-50 overflow-hidden"
            style={{
              backgroundColor: isBlueTheme
                ? 'rgba(10, 22, 40, 0.98)'
                : 'var(--surface-card-solid)',
              borderColor: 'var(--border)',
              boxShadow: 'var(--shadow-xl), 0 0 60px -20px var(--color-primary-alpha)',
              backdropFilter: 'blur(12px) saturate(180%)',
              WebkitBackdropFilter: 'blur(12px) saturate(180%)',
            }}
          >
            {/* Provider Tabs */}
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
                    onClick={() => { handleProviderSelect(provider.provider); }}
                    className="flex-1 px-3 py-2.5 text-sm font-medium transition-all duration-200 relative"
                    style={{
                      color: isSelected ? 'var(--color-brand-400)' : 'var(--text-secondary)',
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

            {/* Models List */}
            <div
              className="max-h-[320px] overflow-y-auto [&::-webkit-scrollbar]:w-1 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-[color:var(--border)] [&::-webkit-scrollbar-thumb]:hover:bg-[color:var(--text-secondary)]"
              style={{
                scrollbarWidth: 'thin',
                scrollbarColor: 'var(--border) transparent',
              }}
            >
              {groupedModels.length === 0 ? (
                <div
                  className="px-4 py-8 text-center text-sm"
                  style={{ color: 'var(--text-tertiary)' }}
                >
                  No models available
                </div>
              ) : (
                groupedModels.map((group) => (
                  <div key={group.category}>
                    {/* Category Header */}
                    <div
                      className="px-4 py-2 text-xs font-semibold uppercase tracking-wider sticky top-0"
                      style={{
                        backgroundColor: isBlueTheme
                          ? 'rgba(10, 22, 40, 0.98)'
                          : 'var(--surface-card-solid)',
                        color: 'var(--text-secondary)',
                        borderBottom: '1px solid var(--border)',
                      }}
                    >
                      {group.displayName}
                    </div>

                    {/* Models */}
                    {group.models.map((model) => {
                      const flatIndex = flatModelList.findIndex(item => item.type === 'model' && item.value === model);
                      const isSelected = model === selectedModel;
                      const isFocused = focusedIndex === flatIndex;

                      return (
                        <button
                          key={model}
                          ref={isSelected ? selectedModelRef : null}
                          type="button"
                          onClick={() => { handleModelSelect(model); }}
                          onMouseEnter={() => { setFocusedIndex(flatIndex); }}
                          className="w-full text-left px-4 py-2.5 transition-colors duration-150 text-sm"
                          style={{
                            backgroundColor: isFocused
                              ? 'var(--surface-elevated)'
                              : 'transparent',
                            color: isSelected ? 'var(--color-brand-400)' : 'var(--text-primary)',
                          }}
                          role="option"
                          aria-selected={isSelected}
                        >
                          <div className="flex items-center justify-between gap-2">
                            <span className="truncate font-medium">{formatModelName(model)}</span>
                            {isSelected && (
                              <svg
                                className="w-4 h-4 flex-shrink-0"
                                fill="none"
                                viewBox="0 0 24 24"
                                stroke="currentColor"
                                style={{ color: 'var(--color-brand-400)' }}
                              >
                                <path
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  strokeWidth={2.5}
                                  d="M5 13l4 4L19 7"
                                />
                              </svg>
                            )}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                ))
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}

