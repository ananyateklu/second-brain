import { useState, useRef, useEffect } from 'react';
import { formatModelName } from '../../utils/model-name-formatter';
import { useThemeStore } from '../../store/theme-store';

interface Provider {
  provider: string;
  isHealthy: boolean;
  availableModels: string[];
}

interface ModelSelectorProps {
  providers: Provider[];
  selectedProvider: string;
  selectedModel: string;
  onModelChange: (model: string) => void;
  disabled?: boolean;
}

export function ModelSelector({
  providers,
  selectedProvider,
  selectedModel,
  onModelChange,
  disabled = false,
}: ModelSelectorProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [focusedIndex, setFocusedIndex] = useState<number | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const { theme } = useThemeStore();
  const isBlueTheme = theme === 'blue';

  const selectedProviderData = providers.find((p) => p.provider === selectedProvider);
  const availableModels = selectedProviderData?.availableModels || [];

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
        setFocusedIndex(null);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
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
        if (availableModels.length === 0) return;

        const currentIndex = focusedIndex !== null 
          ? focusedIndex 
          : availableModels.findIndex((m) => m === selectedModel);

        let newIndex: number;
        if (e.key === 'ArrowDown') {
          newIndex = currentIndex === -1 ? 0 : (currentIndex + 1) % availableModels.length;
        } else {
          newIndex = currentIndex === -1 ? availableModels.length - 1 : (currentIndex - 1 + availableModels.length) % availableModels.length;
        }

        setFocusedIndex(newIndex);
      }

      if (e.key === 'Enter' && focusedIndex !== null) {
        e.preventDefault();
        onModelChange(availableModels[focusedIndex]);
        setIsOpen(false);
        setFocusedIndex(null);
        buttonRef.current?.focus();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, focusedIndex, availableModels, selectedModel, onModelChange]);

  const handleSelect = (model: string) => {
    onModelChange(model);
    setIsOpen(false);
    setFocusedIndex(null);
  };

  if (!selectedProvider || availableModels.length === 0) {
    return null;
  }

  return (
    <div 
      ref={containerRef} 
      className="relative"
    >
      <button
        ref={buttonRef}
        type="button"
        onClick={() => !disabled && setIsOpen(!isOpen)}
        disabled={disabled}
        className="px-5 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 hover:scale-105 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 min-w-[180px] sm:min-w-[220px] justify-between"
        style={{
          backgroundColor: isOpen ? 'var(--surface-elevated)' : 'var(--surface-card)',
          color: 'var(--text-primary)',
          border: '1px solid var(--border)',
          boxShadow: isOpen ? 'var(--shadow-lg)' : 'var(--shadow-md)',
        }}
        aria-expanded={isOpen}
        aria-haspopup="listbox"
      >
        <span className="truncate flex-1 text-left font-medium">
          {selectedModel ? formatModelName(selectedModel) : 'Select model'}
        </span>
        <svg
          className={`w-4 h-4 transition-transform duration-200 flex-shrink-0 ${
            isOpen ? 'rotate-180' : ''
          }`}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M19 9l-7 7-7-7"
          />
        </svg>
      </button>

      {isOpen && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 z-40"
            onClick={() => setIsOpen(false)}
            style={{ backgroundColor: 'rgba(0, 0, 0, 0.2)' }}
          />
          <div
            className="absolute top-full left-0 mt-2 w-full min-w-[220px] max-h-80 overflow-y-auto rounded-xl border z-50 [&::-webkit-scrollbar]:w-1 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-[color:var(--border)] [&::-webkit-scrollbar-thumb]:hover:bg-[color:var(--text-secondary)]"
            style={{
              backgroundColor: isBlueTheme 
                ? 'rgba(10, 22, 40, 0.98)' // Darker blue for blue theme - less transparent
                : 'var(--surface-card-solid)',
              borderColor: 'var(--border)',
              boxShadow: 'var(--shadow-xl), 0 0 60px -20px var(--color-primary-alpha)',
              backdropFilter: 'blur(12px) saturate(180%)',
              WebkitBackdropFilter: 'blur(12px) saturate(180%)',
              scrollbarWidth: 'thin',
              scrollbarColor: 'var(--border) transparent',
            }}
            role="listbox"
          >
            {availableModels.map((model, index) => {
              const isSelected = model === selectedModel;
              const isFocused = focusedIndex === index;

              return (
                <button
                  key={model}
                  type="button"
                  onClick={() => handleSelect(model)}
                  onMouseEnter={() => setFocusedIndex(index)}
                  className="w-full text-left px-4 py-2.5 transition-colors duration-150 text-sm first:rounded-t-xl last:rounded-b-xl"
                  style={{
                    backgroundColor: isFocused
                      ? 'var(--surface-elevated)'
                      : 'transparent',
                    color: 'var(--text-primary)',
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
                        style={{ color: 'var(--btn-primary-bg)' }}
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
        </>
      )}
    </div>
  );
}
