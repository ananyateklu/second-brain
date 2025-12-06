/**
 * ChatInput TextArea Component
 * The main text input area for the compound ChatInput
 */

import { useCallback } from 'react';
import { useChatInputContext } from './ChatInputContext';
import { getAllSupportedExtensions } from '../../../../utils/multimodal-models';

export interface ChatInputTextAreaProps {
  /** Custom placeholder text */
  placeholder?: string;
}

export function ChatInputTextArea({ placeholder }: ChatInputTextAreaProps) {
  const {
    value,
    onChange,
    textareaRef,
    fileInputRef,
    isLoading,
    disabled,
    isGeneratingImage,
    isImageGenerationMode,
    supportsVision,
    handleKeyDown,
    handlePaste,
    onFileSelect,
  } = useChatInputContext();

  const adjustTextareaHeight = useCallback(() => {
    const textarea = textareaRef.current;
    if (textarea) {
      textarea.style.height = 'auto';
      textarea.style.height = `${textarea.scrollHeight}px`;
    }
  }, [textareaRef]);

  const defaultPlaceholder = isImageGenerationMode
    ? 'Describe the image you want to create...'
    : supportsVision
      ? 'Type a message... (@ to mention notes, paste/drop files)'
      : 'Type a message... (@ to mention notes, Shift+Enter for new line)';

  return (
    <div className="flex-1 relative">
      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        accept={getAllSupportedExtensions().join(',')}
        multiple
        className="hidden"
        onChange={(e) => { onFileSelect(e.target.files); }}
      />

      <textarea
        ref={textareaRef}
        value={value}
        onChange={(e) => { onChange(e.target.value); }}
        onKeyDown={handleKeyDown}
        onPaste={!isImageGenerationMode ? handlePaste : undefined}
        placeholder={placeholder || defaultPlaceholder}
        disabled={isLoading || disabled || isGeneratingImage}
        rows={1}
        className="w-full resize-none outline-none text-sm leading-relaxed placeholder:opacity-50 overflow-hidden"
        style={{
          backgroundColor: 'transparent',
          color: 'var(--text-primary)',
          minHeight: '24px',
        }}
        onInput={adjustTextareaHeight}
        onFocus={() => {
          // Could add toolbar hiding logic here if needed
        }}
      />
    </div>
  );
}
