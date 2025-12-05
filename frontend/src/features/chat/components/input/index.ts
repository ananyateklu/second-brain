/**
 * Chat Input Components Index
 * Re-exports all chat input sub-components
 */

// Main Compound Component (default export)
export { default as ChatInput } from './ChatInput';

// Named exports for tree-shaking
export * from './ChatInput';

// Legacy standalone component exports (for backwards compatibility)
export { ChatSuggestedPrompts } from './ChatSuggestedPrompts';
export { SUGGESTED_PROMPTS, PROMPT_TEMPLATES } from './suggested-prompts-data';
export type { SuggestedPrompt } from './suggested-prompts-data';
export type { ChatSuggestedPromptsProps } from './ChatSuggestedPrompts';

export { ChatAttachmentGallery } from './ChatAttachmentGallery';
export { FILE_ICONS } from './file-icons';
export type { ChatAttachmentGalleryProps } from './ChatAttachmentGallery';

export { ChatFormattingToolbar } from './ChatFormattingToolbar';
export { FORMATTING_ACTIONS } from './formatting-actions';
export type { FormattingAction } from './formatting-actions';
export type { ChatFormattingToolbarProps } from './ChatFormattingToolbar';

export { ChatMentionsDropdown } from './ChatMentionsDropdown';
export type { ChatMentionsDropdownProps } from './ChatMentionsDropdown';

export { ChatImageSettingsBar } from './ChatImageSettingsBar';
export type { ChatImageSettingsBarProps } from './ChatImageSettingsBar';

export { ChatInputMetrics } from './ChatInputMetrics';
export type { ChatInputMetricsProps } from './ChatInputMetrics';

export { ChatDragOverlay } from './ChatDragOverlay';
export type { ChatDragOverlayProps } from './ChatDragOverlay';

export { ChatLightbox } from './ChatLightbox';
export type { ChatLightboxProps } from './ChatLightbox';

export { ChatErrorMessage } from './ChatErrorMessage';
export type { ChatErrorMessageProps } from './ChatErrorMessage';

// Context exports
export { ChatInputContext, useChatInputContext } from './ChatInputContext';
export type { ChatInputContextValue, ImageGenerationSettings, ImageModelInfo } from './ChatInputContext';

// Root component
export { ChatInputRoot } from './ChatInputRoot';
export type { ChatInputRootProps } from './ChatInputRoot';

// Container components
export { ChatInputContainer, ChatInputRow, ChatInputVisionIndicator } from './ChatInputContainer';
export type { ChatInputContainerProps } from './ChatInputContainer';

// TextArea
export { ChatInputTextArea } from './ChatInputTextArea';
export type { ChatInputTextAreaProps } from './ChatInputTextArea';

// Actions
export { ChatInputActions, ChatInputSendButton } from './ChatInputActions';
export type { ChatInputActionsProps } from './ChatInputActions';

// Toolbar buttons
export {
  ChatInputAttachButton,
  ChatInputFormatButton,
  ChatInputSmartPromptsButton,
  ChatInputImageGenButton,
} from './ChatInputToolbarButton';

// Smart Prompts Panel
export { ChatInputSmartPromptsPanel } from './ChatInputSmartPrompts';
