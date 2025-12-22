 
/**
 * ChatInput Context
 * Provides shared state and handlers for compound ChatInput components
 *
 * This file exports context and hooks, not components.
 * ESLint react-refresh rule is disabled via config for Context files.
 */

import { createContext, useContext, type RefObject } from 'react';
import type { FileAttachment } from '../../../../utils/multimodal-models';
import type { NoteListItem } from '../../../../types/notes';
import type { SuggestedPrompt } from './suggested-prompts-data';

export interface ImageGenerationSettings {
  size: string;
  quality: string;
  style: string;
}

export interface ImageModelInfo {
  sizes: string[];
  defaultSize: string;
  supportsQuality: boolean;
  supportsStyle: boolean;
  description?: string;
}

export interface ChatInputContextValue {
  // Input state
  value: string;
  onChange: (value: string) => void;

  // Refs
  textareaRef: RefObject<HTMLTextAreaElement | null>;
  fileInputRef: RefObject<HTMLInputElement | null>;

  // Loading/Disabled state
  isLoading: boolean;
  isStreaming: boolean;
  disabled: boolean;

  // Focus and height state (for dynamic sizing)
  isFocused: boolean;
  maxHeight: number;
  isScrollable: boolean;
  onFocus: () => void;
  onBlur: () => void;

  // File attachments
  attachedFiles: FileAttachment[];
  onRemoveFile: (fileId: string) => void;
  onFileSelect: (files: FileList | null) => void;
  fileError: string | null;

  // Drag & drop
  isDragging: boolean;
  onDragOver: (e: React.DragEvent) => void;
  onDragLeave: (e: React.DragEvent) => void;
  onDrop: (e: React.DragEvent) => void;

  // Mentions
  showMentions: boolean;
  mentionQuery: string;
  mentionIndex: number;
  filteredNotes: NoteListItem[];
  onMentionSelect: (note: NoteListItem) => void;
  onMentionIndexChange: (index: number) => void;

  // Formatting toolbar
  showToolbar: boolean;
  onToggleToolbar: () => void;
  onFormat: (before: string, after: string) => void;

  // Smart prompts
  showSmartPrompts: boolean;
  displayPrompts: SuggestedPrompt[];
  isLoadingPrompts: boolean;
  promptsGenerated: boolean;
  onToggleSmartPrompts: (show: boolean) => void;
  onGenerateSmartPrompts: () => void;
  onPromptClick: (prompt: SuggestedPrompt) => void;

  // Image generation
  isImageGenerationMode: boolean;
  isGeneratingImage: boolean;
  imageGenError: string | null;
  showImageGenPanel: boolean;
  onToggleImageGenPanel: (show: boolean) => void;
  imageSettings: ImageGenerationSettings;
  onImageSettingsChange: (settings: Partial<ImageGenerationSettings>) => void;
  currentImageModelInfo: ImageModelInfo | null;
  supportsImageGeneration: boolean;

  // Vision/Multimodal
  supportsVision: boolean;
  maxImages: number;
  imageCount: number;

  // Provider info
  provider?: string;
  model?: string;

  // Agent mode
  agentModeEnabled: boolean;
  notesCapabilityEnabled: boolean;

  // Conversation
  conversationId?: string;

  // Lightbox
  lightboxImage: FileAttachment | null;
  onLightboxOpen: (file: FileAttachment) => void;
  onLightboxClose: () => void;

  // Actions
  onSend: () => void;
  onCancel: () => void;
  handleKeyDown: (e: React.KeyboardEvent<HTMLTextAreaElement>) => void;
  handlePaste: (e: React.ClipboardEvent) => void;

  // Derived state
  hasContent: boolean;
  wordCount: number;
  charCount: number;
  inputTokenCount: number;
}

const ChatInputContext = createContext<ChatInputContextValue | null>(null);

/**
 * Hook that throws if used outside of ChatInput context.
 * Use this when the component MUST be inside a ChatInput.Root.
 */
export function useChatInputContext() {
  const context = useContext(ChatInputContext);
  if (!context) {
    throw new Error(
      'ChatInput compound components must be used within a ChatInput.Root component'
    );
  }
  return context;
}

/**
 * Safe hook that returns null if used outside of ChatInput context.
 * Use this when the component can work both with props and context.
 */
export function useChatInputContextSafe(): ChatInputContextValue | null {
  return useContext(ChatInputContext);
}

export { ChatInputContext };
export type { ChatInputContextValue as ChatInputState };
