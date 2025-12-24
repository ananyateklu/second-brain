import { useState, useRef, useEffect, useMemo, useCallback } from 'react';
import { groupModelsByCategory } from '@/utils/model-categorizer';
import { useBoundStore } from '@/store/bound-store';
import { useProviderLogo } from '@/utils/provider-logos';
import { useModelSelectorKeyboard } from './hooks/use-model-selector-keyboard';
import { ProviderTabs } from './ProviderTabs';
import { ModelsList } from './ModelsList';
import { ModelSelectorTrigger } from './ModelSelectorTrigger';
import { RefreshButton } from './RefreshButton';
import type { CombinedModelSelectorProps, FlatModelItem } from './types';

/**
 * Combined model selector with provider tabs and grouped model list.
 * Features keyboard navigation, theme-aware styling, and refresh capability.
 */
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

  const theme = useBoundStore((state) => state.theme);
  const isBlueTheme = theme === 'blue';
  const isDarkMode = theme === 'dark' || theme === 'blue';

  const selectedProviderLogo = useProviderLogo(selectedProvider || '');
  const selectedProviderData = providers.find(
    (p) => p.provider === selectedProvider
  );

  const availableModels = useMemo(
    () => selectedProviderData?.availableModels || [],
    [selectedProviderData?.availableModels]
  );

  const groupedModels = useMemo(
    () => groupModelsByCategory(availableModels),
    [availableModels]
  );

  const flatModelList = useMemo(() => {
    const flat: FlatModelItem[] = [];
    groupedModels.forEach((group) => {
      flat.push({
        type: 'header',
        value: group.displayName,
        category: group.category,
      });
      group.models.forEach((model) => {
        flat.push({ type: 'model', value: model });
      });
    });
    return flat;
  }, [groupedModels]);

  // Close handler
  const handleClose = useCallback(() => {
    setIsOpen(false);
  }, []);

  // Keyboard navigation hook
  useModelSelectorKeyboard({
    isOpen,
    flatModelList,
    selectedModel,
    focusedIndex,
    setFocusedIndex,
    onModelChange,
    onClose: handleClose,
    buttonRef,
  });

  // Close dropdown when clicking outside
  useEffect(() => {
    if (!isOpen) return;

    const handleClickOutside = (event: MouseEvent) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
        setFocusedIndex(null);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  // Scroll to selected model when dropdown opens
  useEffect(() => {
    if (isOpen && dropdownRef.current) {
      // The ModelsList component handles scrolling internally
    }
  }, [isOpen]);

  const handleProviderSelect = useCallback(
    (provider: string) => {
      onProviderChange(provider);
      setFocusedIndex(null);
    },
    [onProviderChange]
  );

  const handleModelSelect = useCallback(
    (model: string) => {
      onModelChange(model);
      setIsOpen(false);
      setFocusedIndex(null);
    },
    [onModelChange]
  );

  const handleModelHover = useCallback((index: number) => {
    setFocusedIndex(index);
  }, []);

  const handleTriggerClick = useCallback(() => {
    if (!disabled && !isRefreshing) {
      setIsOpen((prev) => !prev);
    }
  }, [disabled, isRefreshing]);

  if (providers.length === 0) {
    return null;
  }

  return (
    <div ref={containerRef} className="relative flex items-center gap-1.5">
      <ModelSelectorTrigger
        ref={buttonRef}
        selectedProvider={selectedProvider}
        selectedModel={selectedModel}
        selectedProviderLogo={selectedProviderLogo}
        isOpen={isOpen}
        isRefreshing={isRefreshing}
        disabled={disabled}
        isDarkMode={isDarkMode}
        onClick={handleTriggerClick}
      />

      {onRefresh && (
        <RefreshButton
          onRefresh={onRefresh}
          isRefreshing={isRefreshing}
          disabled={disabled}
        />
      )}

      {isOpen && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 z-40"
            onClick={handleClose}
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
              boxShadow:
                'var(--shadow-xl), 0 0 60px -20px var(--color-primary-alpha)',
              backdropFilter: 'blur(12px) saturate(180%)',
              WebkitBackdropFilter: 'blur(12px) saturate(180%)',
            }}
          >
            <ProviderTabs
              providers={providers}
              selectedProvider={selectedProvider}
              onProviderSelect={handleProviderSelect}
              isDarkMode={isDarkMode}
            />

            <div className="max-h-[320px] overflow-y-auto thin-scrollbar">
              <ModelsList
                groupedModels={groupedModels}
                flatModelList={flatModelList}
                selectedModel={selectedModel}
                focusedIndex={focusedIndex}
                onModelSelect={handleModelSelect}
                onModelHover={handleModelHover}
                isBlueTheme={isBlueTheme}
              />
            </div>
          </div>
        </>
      )}
    </div>
  );
}

// Re-export components for flexibility
export { ProviderTabs } from './ProviderTabs';
export { ModelsList } from './ModelsList';
export { ModelSelectorTrigger } from './ModelSelectorTrigger';
export { RefreshButton } from './RefreshButton';
export type * from './types';
