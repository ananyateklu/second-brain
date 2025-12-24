import { useEffect, useCallback } from 'react';
import type { UseModelSelectorKeyboardOptions, FlatModelItem } from '../types';

/**
 * Keyboard navigation hook for the model selector dropdown.
 * Handles ArrowUp/ArrowDown navigation, Enter selection, and Escape to close.
 */
export function useModelSelectorKeyboard({
  isOpen,
  flatModelList,
  selectedModel,
  focusedIndex,
  setFocusedIndex,
  onModelChange,
  onClose,
  buttonRef,
}: UseModelSelectorKeyboardOptions): void {
  /**
   * Find the next model index in a given direction, skipping headers.
   */
  const findNextModelIndex = useCallback(
    (currentIndex: number, direction: 'up' | 'down'): number => {
      if (flatModelList.length === 0) return -1;

      const step = direction === 'down' ? 1 : -1;
      const start = currentIndex + step;
      const end = direction === 'down' ? flatModelList.length : -1;

      // Search in the direction
      for (let i = start; direction === 'down' ? i < end : i > end; i += step) {
        if (flatModelList[i]?.type === 'model') {
          return i;
        }
      }

      // Wrap around
      const wrapStart = direction === 'down' ? 0 : flatModelList.length - 1;
      const wrapEnd = direction === 'down' ? currentIndex : currentIndex;

      for (
        let i = wrapStart;
        direction === 'down' ? i < wrapEnd : i > wrapEnd;
        i += step
      ) {
        if (flatModelList[i]?.type === 'model') {
          return i;
        }
      }

      return -1;
    },
    [flatModelList]
  );

  /**
   * Get the current model index for navigation starting point.
   */
  const getCurrentModelIndex = useCallback(
    (flatList: FlatModelItem[]): number => {
      if (focusedIndex !== null && flatList[focusedIndex]?.type === 'model') {
        return focusedIndex;
      }

      const selectedIndex = flatList.findIndex(
        (item) => item.type === 'model' && item.value === selectedModel
      );

      if (selectedIndex !== -1) {
        return selectedIndex;
      }

      return flatList.findIndex((item) => item.type === 'model');
    },
    [focusedIndex, selectedModel]
  );

  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
        setFocusedIndex(null);
        buttonRef.current?.focus();
        return;
      }

      if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
        e.preventDefault();
        if (flatModelList.length === 0) return;

        const currentIndex = getCurrentModelIndex(flatModelList);
        const direction = e.key === 'ArrowDown' ? 'down' : 'up';
        const newIndex = findNextModelIndex(currentIndex, direction);

        if (newIndex !== -1) {
          setFocusedIndex(newIndex);
        }
      }

      if (e.key === 'Enter' && focusedIndex !== null) {
        const item = flatModelList[focusedIndex];
        if (item?.type === 'model') {
          e.preventDefault();
          onModelChange(item.value);
          onClose();
          setFocusedIndex(null);
          buttonRef.current?.focus();
        }
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [
    isOpen,
    focusedIndex,
    flatModelList,
    onModelChange,
    onClose,
    setFocusedIndex,
    buttonRef,
    findNextModelIndex,
    getCurrentModelIndex,
  ]);
}
