/* eslint-disable react-refresh/only-export-components */
/**
 * ChatInput Compound Component
 * 
 * A composable chat input that follows the compound component pattern.
 * All sub-components share state through ChatInputContext.
 * 
 * This file is a barrel file that re-exports all compound components.
 * The eslint-disable is intentional as this pattern requires exporting
 * both components and non-components (context, hooks, types).
 * 
 * @example
 * ```tsx
 * <ChatInput.Root value={value} onChange={onChange} onSend={onSend} onCancel={onCancel} ...>
 *   <ChatInput.SmartPrompts />
 *   <ChatInput.Attachments />
 *   <ChatInput.Error />
 *   <ChatInput.DragOverlay />
 *   <ChatInput.FormattingToolbar />
 *   <ChatInput.ImageSettings />
 *   <ChatInput.Container>
 *     <ChatInput.Mentions />
 *     <ChatInput.Row>
 *       <ChatInput.AttachButton />
 *       <ChatInput.FormatButton />
 *       <ChatInput.SmartPromptsButton />
 *       <ChatInput.ImageGenButton />
 *       <ChatInput.TextArea />
 *       <ChatInput.SendButton />
 *     </ChatInput.Row>
 *     <ChatInput.Metrics />
 *   </ChatInput.Container>
 *   <ChatInput.VisionIndicator />
 *   <ChatInput.Lightbox />
 * </ChatInput.Root>
 * ```
 */

// Root component
export { ChatInputRoot as Root } from './ChatInputRoot';
export type { ChatInputRootProps } from './ChatInputRoot';

// Context
export { useChatInputContext, ChatInputContext } from './ChatInputContext';
export type { ChatInputContextValue, ImageGenerationSettings, ImageModelInfo } from './ChatInputContext';

// Container components
export { ChatInputContainer as Container, ChatInputRow as Row, ChatInputVisionIndicator as VisionIndicator } from './ChatInputContainer';

// TextArea
export { ChatInputTextArea as TextArea } from './ChatInputTextArea';
export type { ChatInputTextAreaProps } from './ChatInputTextArea';

// Action buttons
export { ChatInputActions as Actions, ChatInputSendButton as SendButton } from './ChatInputActions';
export {
  ChatInputAttachButton as AttachButton,
  ChatInputFormatButton as FormatButton,
  ChatInputSmartPromptsButton as SmartPromptsButton,
  ChatInputImageGenButton as ImageGenButton,
} from './ChatInputToolbarButton';

// Smart prompts
export { ChatInputSmartPromptsPanel as SmartPrompts } from './ChatInputSmartPrompts';

// Re-export existing components that work with context
export { ChatAttachmentGallery as Attachments } from './ChatAttachmentGallery';
export { ChatErrorMessage as Error } from './ChatErrorMessage';
export { ChatDragOverlay as DragOverlay } from './ChatDragOverlay';
export { ChatFormattingToolbar as FormattingToolbar } from './ChatFormattingToolbar';
export { ChatMentionsDropdown as Mentions } from './ChatMentionsDropdown';
export { ChatImageSettingsBar as ImageSettings } from './ChatImageSettingsBar';
export { ChatInputMetrics as Metrics } from './ChatInputMetrics';
export { ChatLightbox as Lightbox } from './ChatLightbox';

// Default export as namespace object for convenient import
import { ChatInputRoot } from './ChatInputRoot';
import { useChatInputContext, ChatInputContext } from './ChatInputContext';
import { ChatInputContainer, ChatInputRow, ChatInputVisionIndicator } from './ChatInputContainer';
import { ChatInputTextArea } from './ChatInputTextArea';
import { ChatInputActions, ChatInputSendButton } from './ChatInputActions';
import {
  ChatInputAttachButton,
  ChatInputFormatButton,
  ChatInputSmartPromptsButton,
  ChatInputImageGenButton,
} from './ChatInputToolbarButton';
import { ChatInputSmartPromptsPanel } from './ChatInputSmartPrompts';
import { ChatAttachmentGallery } from './ChatAttachmentGallery';
import { ChatErrorMessage } from './ChatErrorMessage';
import { ChatDragOverlay } from './ChatDragOverlay';
import { ChatFormattingToolbar } from './ChatFormattingToolbar';
import { ChatMentionsDropdown } from './ChatMentionsDropdown';
import { ChatImageSettingsBar } from './ChatImageSettingsBar';
import { ChatInputMetrics } from './ChatInputMetrics';
import { ChatLightbox } from './ChatLightbox';

const ChatInput = {
  Root: ChatInputRoot,
  Context: ChatInputContext,
  useContext: useChatInputContext,
  Container: ChatInputContainer,
  Row: ChatInputRow,
  VisionIndicator: ChatInputVisionIndicator,
  TextArea: ChatInputTextArea,
  Actions: ChatInputActions,
  SendButton: ChatInputSendButton,
  AttachButton: ChatInputAttachButton,
  FormatButton: ChatInputFormatButton,
  SmartPromptsButton: ChatInputSmartPromptsButton,
  ImageGenButton: ChatInputImageGenButton,
  SmartPrompts: ChatInputSmartPromptsPanel,
  Attachments: ChatAttachmentGallery,
  Error: ChatErrorMessage,
  DragOverlay: ChatDragOverlay,
  FormattingToolbar: ChatFormattingToolbar,
  Mentions: ChatMentionsDropdown,
  ImageSettings: ChatImageSettingsBar,
  Metrics: ChatInputMetrics,
  Lightbox: ChatLightbox,
};

export default ChatInput;
