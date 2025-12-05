/**
 * ChatInput Toolbar Button Component
 * Individual action buttons for the chat input toolbar
 */

import React from 'react';
import { useChatInputContext } from './ChatInputContext';

interface ToolbarButtonProps {
  onClick: () => void;
  disabled?: boolean;
  active?: boolean;
  title: string;
  icon: React.ReactNode;
  badge?: number;
}

function ToolbarButton({
  onClick,
  disabled = false,
  active = false,
  title,
  icon,
  badge,
}: ToolbarButtonProps) {
  const { isLoading, disabled: contextDisabled } = useChatInputContext();
  const isDisabled = disabled || isLoading || contextDisabled;

  return (
    <button
      onClick={onClick}
      disabled={isDisabled}
      className="flex-shrink-0 p-2 rounded-xl transition-all duration-200 hover:scale-110 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed relative"
      style={{
        color: active ? 'var(--color-brand-400)' : 'var(--text-tertiary)',
        backgroundColor: active ? 'var(--color-primary-alpha)' : 'transparent',
      }}
      title={title}
    >
      {icon}
      {badge !== undefined && badge > 0 && (
        <span
          className="absolute -top-1 -right-1 min-w-4 h-4 px-1 rounded-full text-[10px] font-medium flex items-center justify-center"
          style={{
            backgroundColor: 'var(--color-brand-400)',
            color: 'white',
          }}
        >
          {badge}
        </span>
      )}
    </button>
  );
}

/**
 * Attachment Button - Opens file picker
 */
export function ChatInputAttachButton() {
  const { fileInputRef, attachedFiles, isImageGenerationMode } = useChatInputContext();

  if (isImageGenerationMode) return null;

  return (
    <ToolbarButton
      onClick={() => fileInputRef.current?.click()}
      active={attachedFiles.length > 0}
      title={`Attach files (${attachedFiles.length})`}
      icon={<AttachIcon />}
    />
  );
}

/**
 * Formatting Toggle Button - Shows/hides formatting toolbar
 */
export function ChatInputFormatButton() {
  const { showToolbar, onToggleToolbar, isImageGenerationMode } = useChatInputContext();

  if (isImageGenerationMode) return null;

  return (
    <ToolbarButton
      onClick={onToggleToolbar}
      active={showToolbar}
      title="Formatting options"
      icon={<FormatIcon />}
    />
  );
}

/**
 * Smart Prompts Toggle Button
 */
export function ChatInputSmartPromptsButton() {
  const {
    showSmartPrompts,
    onToggleSmartPrompts,
    value,
    attachedFiles,
    disabled,
    agentModeEnabled,
    notesCapabilityEnabled,
    isImageGenerationMode,
  } = useChatInputContext();

  // Only show when prompts are closed and conditions are met
  if (
    isImageGenerationMode ||
    showSmartPrompts ||
    value.trim() ||
    attachedFiles.length ||
    disabled ||
    !agentModeEnabled ||
    !notesCapabilityEnabled
  ) {
    return null;
  }

  return (
    <ToolbarButton
      onClick={() => onToggleSmartPrompts(true)}
      title="Show smart prompts"
      icon={<SparkleIcon />}
    />
  );
}

/**
 * Image Generation Toggle Button
 */
export function ChatInputImageGenButton() {
  const {
    showImageGenPanel,
    onToggleImageGenPanel,
    supportsImageGeneration,
    conversationId,
    isGeneratingImage,
    isImageGenerationMode,
    onToggleToolbar,
  } = useChatInputContext();

  // Only show for providers that support it when NOT in image model mode
  if (isImageGenerationMode || !supportsImageGeneration || !conversationId) {
    return null;
  }

  return (
    <ToolbarButton
      onClick={() => {
        onToggleImageGenPanel(!showImageGenPanel);
        // Hide toolbar when opening image gen panel
        if (!showImageGenPanel) {
          onToggleToolbar();
        }
      }}
      active={showImageGenPanel}
      disabled={isGeneratingImage}
      title="Generate image"
      icon={<ImageGenIcon />}
    />
  );
}

// Icons
function AttachIcon() {
  return (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13"
      />
    </svg>
  );
}

function FormatIcon() {
  return (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h8m-8 6h16" />
    </svg>
  );
}

function SparkleIcon() {
  return (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z"
      />
    </svg>
  );
}

function ImageGenIcon() {
  return (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
      />
    </svg>
  );
}
