/**
 * ChatInput Root Component
 * Main container for the compound ChatInput pattern
 * Provides context to all child components
 */

import React, { useRef, useState, useCallback, useEffect, useMemo } from 'react';
import { ChatInputContext, type ChatInputContextValue, type ImageGenerationSettings, type ImageModelInfo } from './ChatInputContext';
import type { FileAttachment } from '../../../../utils/multimodal-models';
import type { Note } from '../../../notes/types/note';
import type { SuggestedPrompt } from './suggested-prompts-data';
import { SUGGESTED_PROMPTS } from './suggested-prompts-data';
import { estimateTokenCount } from '../../../../utils/token-utils';
import {
  isMultimodalModel,
  validateImageForProvider,
  getMultimodalConfig,
  createFileAttachment,
  validateFileForAttachment,
  isImageFile,
} from '../../../../utils/multimodal-models';
import {
  isImageGenerationProvider,
  getImageModelInfo,
} from '../../../../utils/image-generation-models';
import { useNotes } from '../../../notes/hooks/use-notes-query';
import { chatService } from '../../../../services/chat.service';
import { STORAGE_KEYS } from '../../../../lib/constants';
import type { MessageImage, ImageGenerationResponse } from '../../types/chat';

export interface ImageGenerationParams {
  prompt: string;
  size: string;
  quality?: string;
  style?: string;
}

export interface ChatInputRootProps {
  children: React.ReactNode;
  /** Current input value */
  value: string;
  /** Callback when value changes */
  onChange: (value: string) => void;
  /** Callback when message is sent */
  onSend: (images?: MessageImage[]) => void;
  /** Callback when streaming is cancelled */
  onCancel: () => void;
  /** Whether AI is currently streaming a response */
  isStreaming: boolean;
  /** Whether a message is being sent */
  isLoading: boolean;
  /** Whether input is disabled */
  disabled: boolean;
  /** Current AI provider */
  provider?: string;
  /** Current AI model */
  model?: string;
  /** Whether agent mode is enabled */
  agentModeEnabled?: boolean;
  /** Whether notes capability is enabled in agent mode */
  notesCapabilityEnabled?: boolean;
  /** Current conversation ID */
  conversationId?: string;
  /** Callback when image generation completes */
  onImageGenerated?: (response: ImageGenerationResponse) => void;
  /** Whether we're in image generation mode (image model selected) */
  isImageGenerationMode?: boolean;
  /** Callback to generate an image */
  onGenerateImage?: (params: ImageGenerationParams) => Promise<void>;
  /** Additional class names */
  className?: string;
}

export function ChatInputRoot({
  children,
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
  onImageGenerated: _onImageGenerated,
  isImageGenerationMode = false,
  onGenerateImage,
  className,
}: ChatInputRootProps) {
  // Refs
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // File attachment state
  const [attachedFiles, setAttachedFiles] = useState<FileAttachment[]>([]);
  const [fileError, setFileError] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [lightboxImage, setLightboxImage] = useState<FileAttachment | null>(null);

  // UI state
  const [showToolbar, setShowToolbar] = useState(false);
  const [showSmartPrompts, setShowSmartPrompts] = useState(false);
  const [showImageGenPanel, setShowImageGenPanel] = useState(false);

  // Mentions state
  const [showMentions, setShowMentions] = useState(false);
  const [mentionQuery, setMentionQuery] = useState('');
  const [mentionIndex, setMentionIndex] = useState(0);
  const [mentionStartPos, setMentionStartPos] = useState<number | null>(null);
  const { data: notes = [] } = useNotes();

  // Smart prompts state
  const [smartPrompts, setSmartPrompts] = useState<SuggestedPrompt[] | null>(null);
  const [isLoadingPrompts, setIsLoadingPrompts] = useState(false);
  const [promptsGenerated, setPromptsGenerated] = useState(false);

  // Image generation state
  const [isGeneratingImage, setIsGeneratingImage] = useState(false);
  const [imageGenError, setImageGenError] = useState<string | null>(null);
  const [imageSettings, setImageSettings] = useState<ImageGenerationSettings>({
    size: '1024x1024',
    quality: 'standard',
    style: 'vivid',
  });

  // Computed values
  const inputTokenCount = useMemo(() => estimateTokenCount(value), [value]);

  const supportsVision = useMemo(() => {
    if (!provider || !model) return false;
    return isMultimodalModel(provider, model);
  }, [provider, model]);

  const maxImages = useMemo(() => {
    if (!provider) return 4;
    const config = getMultimodalConfig(provider);
    return config?.maxImages || 4;
  }, [provider]);

  const imageCount = useMemo(
    () => attachedFiles.filter(f => f.isImage).length,
    [attachedFiles]
  );

  const supportsImageGeneration = useMemo(() => {
    if (!provider) return false;
    return isImageGenerationProvider(provider);
  }, [provider]);

  const currentImageModelInfo = useMemo((): ImageModelInfo | null => {
    if (!isImageGenerationMode || !provider || !model) return null;
    const info = getImageModelInfo(provider, model);
    if (!info) return null;
    return {
      sizes: info.sizes,
      defaultSize: info.defaultSize,
      supportsQuality: info.supportsQuality,
      supportsStyle: info.supportsStyle,
      description: info.description,
    };
  }, [isImageGenerationMode, provider, model]);

  const filteredNotes = useMemo(() => {
    if (!mentionQuery) return notes.slice(0, 5);
    const query = mentionQuery.toLowerCase();
    return notes
      .filter((note: Note) => note.title.toLowerCase().includes(query))
      .slice(0, 5);
  }, [notes, mentionQuery]);

  const displayPrompts = smartPrompts || SUGGESTED_PROMPTS;

  const { hasContent, wordCount, charCount } = useMemo(() => ({
    hasContent: isImageGenerationMode
      ? value.trim().length > 0
      : Boolean(value.trim() || attachedFiles.length > 0),
    wordCount: value.trim() ? value.trim().split(/\s+/).length : 0,
    charCount: value.length,
  }), [value, attachedFiles.length, isImageGenerationMode]);

  // Update image size when model changes
  useEffect(() => {
    if (currentImageModelInfo) {
      setImageSettings(prev => ({
        ...prev,
        size: currentImageModelInfo.defaultSize,
      }));
    }
  }, [currentImageModelInfo]);

  // Clear images when model changes to non-multimodal
  useEffect(() => {
    if (!supportsVision && attachedFiles.some(f => f.isImage)) {
      setAttachedFiles(prev => prev.filter(f => !f.isImage));
      setFileError('Images cleared: current model does not support vision');
      setTimeout(() => setFileError(null), 3000);
    }
  }, [supportsVision, attachedFiles]);

  // Load cached smart prompts
  useEffect(() => {
    try {
      const cached = sessionStorage.getItem(STORAGE_KEYS.SUGGESTED_PROMPTS);
      if (cached) {
        const parsed = JSON.parse(cached);
        if (parsed.prompts && Array.isArray(parsed.prompts) && parsed.prompts.length > 0) {
          setSmartPrompts(parsed.prompts);
          setPromptsGenerated(true);
        }
      }
    } catch {
      // Ignore parsing errors
    }
  }, []);

  // Adjust textarea height when value changes
  const adjustTextareaHeight = useCallback(() => {
    const textarea = textareaRef.current;
    if (textarea) {
      textarea.style.height = 'auto';
      textarea.style.height = `${textarea.scrollHeight}px`;
    }
  }, []);

  useEffect(() => {
    if (textareaRef.current) {
      if (!value) {
        textareaRef.current.style.height = 'auto';
      } else {
        adjustTextareaHeight();
      }
    }
  }, [value, adjustTextareaHeight]);

  // Handlers
  const handleInputChange = useCallback((newValue: string) => {
    onChange(newValue);

    const cursorPos = textareaRef.current?.selectionStart ?? newValue.length;
    const textBeforeCursor = newValue.slice(0, cursorPos);
    const lastAtIndex = textBeforeCursor.lastIndexOf('@');

    if (lastAtIndex !== -1) {
      const textAfterAt = textBeforeCursor.slice(lastAtIndex + 1);
      const charBeforeAt = lastAtIndex > 0 ? textBeforeCursor[lastAtIndex - 1] : ' ';

      if ((charBeforeAt === ' ' || charBeforeAt === '\n' || lastAtIndex === 0) &&
        !textAfterAt.includes(' ') && !textAfterAt.includes('\n')) {
        setShowMentions(true);
        setMentionQuery(textAfterAt);
        setMentionStartPos(lastAtIndex);
        setMentionIndex(0);
        return;
      }
    }

    setShowMentions(false);
    setMentionQuery('');
    setMentionStartPos(null);
  }, [onChange]);

  const insertMention = useCallback((note: Note) => {
    if (mentionStartPos === null) return;

    const beforeMention = value.slice(0, mentionStartPos);
    const afterMention = value.slice(mentionStartPos + mentionQuery.length + 1);
    const mentionText = `@[${note.title}](note:${note.id}) `;

    onChange(beforeMention + mentionText + afterMention);
    setShowMentions(false);
    setMentionQuery('');
    setMentionStartPos(null);

    setTimeout(() => textareaRef.current?.focus(), 0);
  }, [value, mentionStartPos, mentionQuery, onChange]);

  const insertFormatting = useCallback((before: string, after: string) => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const selectedText = value.slice(start, end);
    const newValue = value.slice(0, start) + before + selectedText + after + value.slice(end);

    onChange(newValue);

    setTimeout(() => {
      textarea.focus();
      const newPos = start + before.length + selectedText.length;
      textarea.setSelectionRange(newPos, newPos);
    }, 0);
  }, [value, onChange]);

  const handleImageGeneration = useCallback(async () => {
    if (!value.trim() || !onGenerateImage) return;

    setIsGeneratingImage(true);
    setImageGenError(null);

    try {
      await onGenerateImage({
        prompt: value.trim(),
        size: imageSettings.size,
        quality: currentImageModelInfo?.supportsQuality ? imageSettings.quality : undefined,
        style: currentImageModelInfo?.supportsStyle ? imageSettings.style : undefined,
      });
      onChange('');
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to generate image';
      setImageGenError(errorMessage);
    } finally {
      setIsGeneratingImage(false);
    }
  }, [value, imageSettings, currentImageModelInfo, onChange, onGenerateImage]);

  const handleSend = useCallback(() => {
    if (isImageGenerationMode) {
      handleImageGeneration();
      return;
    }

    if (!value.trim() && attachedFiles.length === 0) return;

    const images: MessageImage[] | undefined =
      attachedFiles.filter(f => f.isImage).length > 0
        ? attachedFiles.filter(f => f.isImage).map((img) => {
          const base64Match = img.dataUrl.match(/^data:([^;]+);base64,(.+)$/);
          return {
            base64Data: base64Match ? base64Match[2] : img.dataUrl,
            mediaType: img.type,
            fileName: img.name,
          };
        })
        : undefined;

    onSend(images);
    setAttachedFiles([]);
    setFileError(null);
    setShowToolbar(false);
  }, [value, attachedFiles, onSend, isImageGenerationMode, handleImageGeneration]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (showMentions && filteredNotes.length > 0) {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setMentionIndex(prev => (prev + 1) % filteredNotes.length);
        return;
      }
      if (e.key === 'ArrowUp') {
        e.preventDefault();
        setMentionIndex(prev => (prev - 1 + filteredNotes.length) % filteredNotes.length);
        return;
      }
      if (e.key === 'Enter' || e.key === 'Tab') {
        e.preventDefault();
        insertMention(filteredNotes[mentionIndex]);
        return;
      }
      if (e.key === 'Escape') {
        e.preventDefault();
        setShowMentions(false);
        return;
      }
    }

    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  }, [showMentions, filteredNotes, mentionIndex, insertMention, handleSend]);

  const handleFileSelect = useCallback(async (files: FileList | null) => {
    if (!files || files.length === 0) return;

    const fileArray = Array.from(files);

    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }

    setFileError(null);

    for (const file of fileArray) {
      if (isImageFile(file.type)) {
        if (!provider) {
          setFileError('Please select a provider first');
          continue;
        }
        if (!supportsVision) {
          setFileError(`${model} does not support image inputs`);
          continue;
        }
        if (imageCount >= maxImages) {
          setFileError(`Maximum ${maxImages} images allowed`);
          continue;
        }
        const validation = validateImageForProvider(file, provider);
        if (!validation.valid) {
          setFileError(validation.error || 'Invalid image');
          continue;
        }
      } else {
        const validation = validateFileForAttachment(file);
        if (!validation.valid) {
          setFileError(validation.error || 'Invalid file');
          continue;
        }
      }

      try {
        const attachment = await createFileAttachment(file);
        setAttachedFiles((prev) => [...prev, attachment]);
      } catch {
        setFileError('Failed to process file');
      }
    }
  }, [provider, model, supportsVision, maxImages, imageCount]);

  const handleRemoveFile = useCallback((fileId: string) => {
    setAttachedFiles((prev) => prev.filter((f) => f.id !== fileId));
    setFileError(null);
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    if (!disabled) {
      setIsDragging(true);
    }
  }, [disabled]);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);

    if (disabled) return;

    const files = e.dataTransfer.files;
    handleFileSelect(files);
  }, [disabled, handleFileSelect]);

  const handlePaste = useCallback((e: React.ClipboardEvent) => {
    if (disabled) return;

    const items = e.clipboardData.items;
    const files: File[] = [];

    for (const item of items) {
      if (item.kind === 'file') {
        const file = item.getAsFile();
        if (file) files.push(file);
      }
    }

    if (files.length > 0) {
      e.preventDefault();
      const dataTransfer = new DataTransfer();
      files.forEach((f) => dataTransfer.items.add(f));
      handleFileSelect(dataTransfer.files);
    }
  }, [disabled, handleFileSelect]);

  const handleGenerateSmartPrompts = useCallback(async () => {
    if (isLoadingPrompts) return;

    setIsLoadingPrompts(true);
    try {
      const response = await chatService.generateSuggestedPrompts({
        provider,
        model,
      });

      if (response.success && response.prompts.length > 0) {
        setSmartPrompts(response.prompts);
        setPromptsGenerated(true);
        try {
          sessionStorage.setItem(
            STORAGE_KEYS.SUGGESTED_PROMPTS,
            JSON.stringify({ prompts: response.prompts, timestamp: Date.now() })
          );
        } catch {
          // Ignore storage errors
        }
      }
    } catch (error) {
      console.error('Failed to generate smart prompts:', { error });
    } finally {
      setIsLoadingPrompts(false);
    }
  }, [isLoadingPrompts, provider, model]);

  const handlePromptClick = useCallback((prompt: SuggestedPrompt) => {
    onChange(prompt.promptTemplate);
    textareaRef.current?.focus();
  }, [onChange]);

  const handleImageSettingsChange = useCallback((settings: Partial<ImageGenerationSettings>) => {
    setImageSettings(prev => ({ ...prev, ...settings }));
  }, []);

  // Create context value
  const contextValue: ChatInputContextValue = {
    value,
    onChange: handleInputChange,
    textareaRef,
    fileInputRef,
    isLoading,
    isStreaming,
    disabled,
    attachedFiles,
    onRemoveFile: handleRemoveFile,
    onFileSelect: handleFileSelect,
    fileError,
    isDragging,
    onDragOver: handleDragOver,
    onDragLeave: handleDragLeave,
    onDrop: handleDrop,
    showMentions,
    mentionQuery,
    mentionIndex,
    filteredNotes,
    onMentionSelect: insertMention,
    onMentionIndexChange: setMentionIndex,
    showToolbar,
    onToggleToolbar: () => setShowToolbar(prev => !prev),
    onFormat: insertFormatting,
    showSmartPrompts,
    displayPrompts,
    isLoadingPrompts,
    promptsGenerated,
    onToggleSmartPrompts: setShowSmartPrompts,
    onGenerateSmartPrompts: handleGenerateSmartPrompts,
    onPromptClick: handlePromptClick,
    isImageGenerationMode,
    isGeneratingImage,
    imageGenError,
    showImageGenPanel,
    onToggleImageGenPanel: setShowImageGenPanel,
    imageSettings,
    onImageSettingsChange: handleImageSettingsChange,
    currentImageModelInfo,
    supportsImageGeneration,
    supportsVision,
    maxImages,
    imageCount,
    provider,
    model,
    agentModeEnabled,
    notesCapabilityEnabled,
    conversationId,
    lightboxImage,
    onLightboxOpen: setLightboxImage,
    onLightboxClose: () => setLightboxImage(null),
    onSend: handleSend,
    onCancel,
    handleKeyDown,
    handlePaste,
    hasContent,
    wordCount,
    charCount,
    inputTokenCount,
  };

  return (
    <ChatInputContext.Provider value={contextValue}>
      <div
        className={`absolute bottom-0 left-0 right-0 px-6 py-6 z-20 ${className || ''}`}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      >
        <div className="max-w-3xl mx-auto">
          {children}
        </div>
      </div>
    </ChatInputContext.Provider>
  );
}
