/**
 * ChatInput Attach Pill Component
 *
 * Mobile-only grouped pill button for file attachments.
 * Combines attach icon, dropdown chevron, and clear button into a cohesive unit.
 *
 * Design:
 * [📎 | ▼ | ✕]
 *   │   │   └── Clear all (only when files attached)
 *   │   └────── Dropdown for attachment type options
 *   └─────────── Main attach icon (opens file picker)
 */

import { useState, useRef, useEffect, useCallback } from 'react';
import { useChatInputContext } from './ChatInputContext';
import styles from '../../../../styles/components/chat-input.module.css';

export function ChatInputAttachPill() {
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const pillRef = useRef<HTMLDivElement>(null);

  const {
    fileInputRef,
    attachedFiles,
    onRemoveFile,
    isImageGenerationMode,
    isLoading,
    disabled,
  } = useChatInputContext();

  const hasFiles = attachedFiles.length > 0;
  const isDisabled = isLoading || disabled;

  // Clear all attached files
  const clearAllFiles = useCallback(() => {
    attachedFiles.forEach(file => onRemoveFile(file.id));
  }, [attachedFiles, onRemoveFile]);

  // Close dropdown when clicking outside
  useEffect(() => {
    if (!isDropdownOpen) return;

    const handleClickOutside = (e: MouseEvent) => {
      if (
        pillRef.current &&
        !pillRef.current.contains(e.target as Node) &&
        dropdownRef.current &&
        !dropdownRef.current.contains(e.target as Node)
      ) {
        setIsDropdownOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isDropdownOpen]);

  // Handle escape key to close dropdown
  useEffect(() => {
    if (!isDropdownOpen) return;

    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsDropdownOpen(false);
      }
    };

    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [isDropdownOpen]);

  const handleAttachClick = useCallback(() => {
    fileInputRef.current?.click();
  }, [fileInputRef]);

  const handleDropdownItemClick = useCallback((acceptType?: string) => {
    // Set accept attribute on file input if specific type
    if (fileInputRef.current) {
      fileInputRef.current.accept = acceptType || '';
      fileInputRef.current.click();
      // Reset accept after click
      setTimeout(() => {
        if (fileInputRef.current) {
          fileInputRef.current.accept = '';
        }
      }, 100);
    }
    setIsDropdownOpen(false);
  }, [fileInputRef]);

  // Don't show in image generation mode
  if (isImageGenerationMode) return null;

  return (
    <div className="relative md:hidden flex-shrink-0">
      {/* Grouped Pill Container */}
      <div
        ref={pillRef}
        className={styles.mobileButtonGroup}
        style={{
          borderColor: hasFiles
            ? 'color-mix(in srgb, var(--color-brand-500) 40%, transparent)'
            : undefined,
        }}
      >
        {/* Main Attach Button */}
        <button
          onClick={handleAttachClick}
          disabled={isDisabled}
          className={styles.attachPillButton}
          style={{
            color: hasFiles ? 'var(--color-brand-400)' : 'var(--text-secondary)',
          }}
          title={hasFiles ? `${attachedFiles.length} file(s) attached` : 'Attach file'}
          aria-label="Attach file"
        >
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13"
            />
          </svg>
          {/* Badge for file count */}
          {hasFiles && (
            <span className={styles.attachPillBadge}>
              {attachedFiles.length}
            </span>
          )}
        </button>

        {/* Divider */}
        <div className={styles.mobileButtonGroupDivider} />

        {/* Chevron Dropdown Button */}
        <button
          onClick={() => setIsDropdownOpen(!isDropdownOpen)}
          disabled={isDisabled}
          className={styles.attachPillButton}
          style={{
            color: isDropdownOpen ? 'var(--color-brand-400)' : 'var(--text-secondary)',
          }}
          title="Attachment options"
          aria-label="Attachment options"
          aria-expanded={isDropdownOpen}
          aria-haspopup="true"
        >
          <svg
            className="w-4 h-4 transition-transform duration-200"
            style={{ transform: isDropdownOpen ? 'rotate(180deg)' : 'rotate(0deg)' }}
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </button>

        {/* Clear Button - Only visible when files attached */}
        {hasFiles && (
          <>
            <div className={styles.mobileButtonGroupDivider} />
            <button
              onClick={clearAllFiles}
              disabled={isDisabled}
              className={styles.attachPillButton}
              style={{ color: 'var(--color-error)' }}
              title="Clear all attachments"
              aria-label="Clear all attachments"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </>
        )}
      </div>

      {/* Dropdown Menu */}
      {isDropdownOpen && (
        <div
          ref={dropdownRef}
          className={styles.attachDropdown}
          role="menu"
          aria-orientation="vertical"
        >
          {/* All Files */}
          <button
            onClick={() => handleDropdownItemClick()}
            className={styles.attachDropdownItem}
            role="menuitem"
          >
            <span className={styles.attachDropdownIcon}>
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </span>
            <span className={styles.attachDropdownLabel}>All Files</span>
          </button>

          {/* Images Only */}
          <button
            onClick={() => handleDropdownItemClick('image/*')}
            className={styles.attachDropdownItem}
            role="menuitem"
          >
            <span className={styles.attachDropdownIcon}>
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
            </span>
            <span className={styles.attachDropdownLabel}>Images</span>
          </button>

          {/* Documents */}
          <button
            onClick={() => handleDropdownItemClick('.pdf,.doc,.docx,.txt,.md')}
            className={styles.attachDropdownItem}
            role="menuitem"
          >
            <span className={styles.attachDropdownIcon}>
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
              </svg>
            </span>
            <span className={styles.attachDropdownLabel}>Documents</span>
          </button>

          {/* Code Files */}
          <button
            onClick={() => handleDropdownItemClick('.js,.ts,.tsx,.jsx,.py,.json,.css,.html')}
            className={styles.attachDropdownItem}
            role="menuitem"
          >
            <span className={styles.attachDropdownIcon}>
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
              </svg>
            </span>
            <span className={styles.attachDropdownLabel}>Code</span>
          </button>
        </div>
      )}
    </div>
  );
}
