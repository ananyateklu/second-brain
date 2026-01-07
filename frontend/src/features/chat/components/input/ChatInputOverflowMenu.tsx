/**
 * ChatInput Overflow Menu Component
 *
 * Shows secondary toolbar actions in a popover menu on mobile devices.
 * Contains: Formatting, Smart Prompts, Image Generation buttons
 *
 * Redesigned with ChatGPT-style plus button that rotates to X when open.
 */

import { useState, useRef, useEffect } from 'react';
import { useChatInputContext } from './ChatInputContext';
import styles from '../../../../styles/components/chat-input.module.css';

export function ChatInputOverflowMenu() {
  const [isOpen, setIsOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);

  const {
    showToolbar,
    onToggleToolbar,
    showSmartPrompts,
    onToggleSmartPrompts,
    showImageGenPanel,
    onToggleImageGenPanel,
    value,
    attachedFiles,
    disabled,
    agentModeEnabled,
    notesCapabilityEnabled,
    supportsImageGeneration,
    conversationId,
    isGeneratingImage,
    isImageGenerationMode,
    isLoading,
  } = useChatInputContext();

  // Check if any menu items are available
  const hasFormattingOption = true;
  const hasSmartPromptsOption = !showSmartPrompts && !value.trim() && !attachedFiles.length && !disabled && agentModeEnabled && notesCapabilityEnabled;
  const hasImageGenOption = supportsImageGeneration && conversationId && !isGeneratingImage;

  // Close menu when clicking outside - hook must be before any returns
  useEffect(() => {
    if (!isOpen) return;

    const handleClickOutside = (e: MouseEvent) => {
      if (
        menuRef.current &&
        !menuRef.current.contains(e.target as Node) &&
        buttonRef.current &&
        !buttonRef.current.contains(e.target as Node)
      ) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen]);

  // Don't show in image generation mode
  if (isImageGenerationMode) return null;

  // If no options available, don't show the menu
  if (!hasFormattingOption && !hasSmartPromptsOption && !hasImageGenOption) return null;

  const handleFormatClick = () => {
    onToggleToolbar();
    setIsOpen(false);
  };

  const handleSmartPromptsClick = () => {
    onToggleSmartPrompts(true);
    setIsOpen(false);
  };

  const handleImageGenClick = () => {
    onToggleImageGenPanel(!showImageGenPanel);
    if (!showImageGenPanel) {
      onToggleToolbar(); // Hide toolbar when opening image gen
    }
    setIsOpen(false);
  };

  return (
    <div className="relative md:hidden flex-shrink-0">
      {/* Trigger Button - Plus icon that rotates to X */}
      <button
        ref={buttonRef}
        onClick={() => setIsOpen(!isOpen)}
        disabled={isLoading || disabled}
        className={styles.mobilePillButton}
        style={{
          color: isOpen ? 'var(--color-brand-400)' : 'var(--text-tertiary)',
          backgroundColor: isOpen
            ? 'color-mix(in srgb, var(--color-brand-600) 20%, transparent)'
            : 'transparent',
        }}
        title="More options"
        aria-label="More input options"
        aria-expanded={isOpen}
        aria-haspopup="true"
      >
        <svg
          className="w-5 h-5 transition-transform duration-200"
          style={{ transform: isOpen ? 'rotate(45deg)' : 'rotate(0deg)' }}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M12 4v16m8-8H4"
          />
        </svg>
      </button>

      {/* Dropdown Menu - Redesigned with icon boxes */}
      {isOpen && (
        <div
          ref={menuRef}
          className={styles.overflowDropdown}
          role="menu"
          aria-orientation="vertical"
        >
          {/* Formatting Option */}
          {hasFormattingOption && (
            <button
              onClick={handleFormatClick}
              className={`${styles.overflowMenuItem} ${showToolbar ? styles.overflowMenuItemActive : ''}`}
              role="menuitem"
            >
              <span className={styles.overflowMenuIcon}>
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h8m-8 6h16" />
                </svg>
              </span>
              <span className={styles.overflowMenuLabel}>Formatting</span>
              {showToolbar && (
                <span className={styles.overflowMenuCheck}>
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                  </svg>
                </span>
              )}
            </button>
          )}

          {/* Smart Prompts Option */}
          {hasSmartPromptsOption && (
            <button
              onClick={handleSmartPromptsClick}
              className={styles.overflowMenuItem}
              role="menuitem"
            >
              <span className={styles.overflowMenuIcon}>
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
                </svg>
              </span>
              <span className={styles.overflowMenuLabel}>Smart Prompts</span>
            </button>
          )}

          {/* Image Generation Option */}
          {hasImageGenOption && (
            <button
              onClick={handleImageGenClick}
              className={`${styles.overflowMenuItem} ${showImageGenPanel ? styles.overflowMenuItemActive : ''}`}
              role="menuitem"
            >
              <span className={styles.overflowMenuIcon}>
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
              </span>
              <span className={styles.overflowMenuLabel}>Generate Image</span>
              {showImageGenPanel && (
                <span className={styles.overflowMenuCheck}>
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                  </svg>
                </span>
              )}
            </button>
          )}
        </div>
      )}
    </div>
  );
}
