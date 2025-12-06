/**
 * ChatInputArea Component
 * 
 * Refactored to use the compound component pattern for better composition,
 * maintainability, and testability.
 * 
 * This component now uses ChatInput compound components internally,
 * providing the same public API for backwards compatibility.
 */

import ChatInput from './input/ChatInput';
import { ImageGenerationPanel } from './ImageGenerationPanel';
import { useChatInputContext } from './input/ChatInputContext';
import type { MessageImage, ImageGenerationResponse } from '../types/chat';

export interface ImageGenerationParams {
  prompt: string;
  size: string;
  quality?: string;
  style?: string;
}

export interface ChatInputAreaProps {
  value: string;
  onChange: (value: string) => void;
  onSend: (images?: MessageImage[]) => void;
  onCancel: () => void;
  isStreaming: boolean;
  isLoading: boolean;
  disabled: boolean;
  /** Current provider for multimodal detection */
  provider?: string;
  /** Current model for multimodal detection */
  model?: string;
  /** Whether agent mode is enabled */
  agentModeEnabled?: boolean;
  /** Whether notes capability is enabled in agent mode */
  notesCapabilityEnabled?: boolean;
  /** Current conversation ID for image generation */
  conversationId?: string;
  /** Callback when image generation completes */
  onImageGenerated?: (response: ImageGenerationResponse) => void;
  /** Whether we're in image generation mode (image model selected) */
  isImageGenerationMode?: boolean;
  /** Callback to generate an image (handles conversation creation) */
  onGenerateImage?: (params: ImageGenerationParams) => Promise<void>;
}

/**
 * Inner component that uses the ChatInput context
 * Separated to access context values for the ImageGenerationPanel
 */
function ChatInputAreaInner() {
  const {
    conversationId,
    showImageGenPanel,
    isGeneratingImage,
    isImageGenerationMode,
    onToggleImageGenPanel,
    value,
  } = useChatInputContext();

  return (
    <>
      {/* Smart Prompts */}
      <ChatInput.SmartPrompts />

      {/* Attachment Gallery */}
      <ChatInput.Attachments />

      {/* File Error */}
      <ChatInput.Error errorType="file" />

      {/* Drag Overlay */}
      <ChatInput.DragOverlay />

      {/* Formatting Toolbar */}
      <ChatInput.FormattingToolbar />

      {/* Image Generation Panel (legacy toggle mode) */}
      {!isImageGenerationMode && showImageGenPanel && conversationId && (
        <div className="mb-3">
          <ImageGenerationPanel
            conversationId={conversationId}
            isGenerating={isGeneratingImage}
            onGenerateStart={() => { /* no-op */ }}
            onGenerateComplete={() => { onToggleImageGenPanel(false); }}
            onClose={() => { onToggleImageGenPanel(false); }}
            initialPrompt={value}
          />
        </div>
      )}

      {/* Image Generation Error */}
      <ChatInput.Error errorType="imageGen" />

      {/* Image Settings Bar (inline mode when image model selected) */}
      <ChatInput.ImageSettings />

      {/* Main Input Container */}
      <ChatInput.Container>
        {/* Mentions Dropdown */}
        <ChatInput.Mentions />

        {/* Input Row */}
        <ChatInput.Row>
          {/* Attachment Button */}
          <ChatInput.AttachButton />

          {/* Formatting Toggle */}
          <ChatInput.FormatButton />

          {/* Smart Prompts Toggle */}
          <ChatInput.SmartPromptsButton />

          {/* Image Generation Toggle */}
          <ChatInput.ImageGenButton />

          {/* TextArea */}
          <ChatInput.TextArea />

          {/* Send/Cancel Button */}
          <ChatInput.SendButton />
        </ChatInput.Row>

        {/* Input Metrics */}
        <ChatInput.Metrics />
      </ChatInput.Container>

      {/* Vision Support Indicator */}
      <ChatInput.VisionIndicator />

      {/* Lightbox */}
      <ChatInput.Lightbox />
    </>
  );
}

/**
 * Chat input area with glassmorphism styling, enhanced animations,
 * file attachments, @mentions, and suggested prompts.
 * 
 * Now uses compound components for better code organization.
 */
export function ChatInputArea({
  value,
  onChange,
  onSend,
  onCancel,
  isStreaming,
  isLoading,
  disabled,
  provider,
  model,
  agentModeEnabled = false,
  notesCapabilityEnabled = false,
  conversationId,
  onImageGenerated,
  isImageGenerationMode = false,
  onGenerateImage,
}: ChatInputAreaProps) {
  return (
    <ChatInput.Root
      value={value}
      onChange={onChange}
      onSend={onSend}
      onCancel={onCancel}
      isStreaming={isStreaming}
      isLoading={isLoading}
      disabled={disabled}
      provider={provider}
      model={model}
      agentModeEnabled={agentModeEnabled}
      notesCapabilityEnabled={notesCapabilityEnabled}
      conversationId={conversationId}
      onImageGenerated={onImageGenerated}
      isImageGenerationMode={isImageGenerationMode}
      onGenerateImage={onGenerateImage}
    >
      <ChatInputAreaInner />
    </ChatInput.Root>
  );
}
