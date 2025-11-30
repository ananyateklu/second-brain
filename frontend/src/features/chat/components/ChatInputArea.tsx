import { useMemo, useRef, useCallback, useState, useEffect } from 'react';
import { estimateTokenCount } from '../../../utils/token-utils';
import {
  isMultimodalModel,
  validateImageForProvider,
  getMultimodalConfig,
  type FileAttachment,
  createFileAttachment,
  validateFileForAttachment,
  formatFileSize,
  isImageFile,
  getAllSupportedExtensions,
} from '../../../utils/multimodal-models';
import {
  isImageGenerationProvider,
  getImageModelInfo,
  formatSizeLabel,
  QUALITY_OPTIONS,
  STYLE_OPTIONS,
} from '../../../utils/image-generation-models';
import { MessageImage, ImageGenerationResponse, SuggestedPrompt } from '../types/chat';
import { useNotes } from '../../notes/hooks/use-notes-query';
import { Note } from '../../notes/types/note';
import { ImageGenerationPanel } from './ImageGenerationPanel';
import { chatService } from '../../../services/chat.service';
import { STORAGE_KEYS } from '../../../lib/constants';

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

// Default suggested prompts configuration
const DEFAULT_PROMPTS: SuggestedPrompt[] = [
  {
    id: 'summarize',
    label: 'Summarize my notes',
    promptTemplate: 'Please summarize my notes on ',
    category: 'summarize',
  },
  {
    id: 'connections',
    label: 'Find connections',
    promptTemplate: 'What connections can you find between my notes about ',
    category: 'explore',
  },
  {
    id: 'ideas',
    label: 'Generate ideas',
    promptTemplate: 'Based on my notes, can you generate some ideas for ',
    category: 'create',
  },
  {
    id: 'questions',
    label: 'Ask questions',
    promptTemplate: 'What questions should I explore based on my notes about ',
    category: 'explore',
  },
];

// Get icon for prompt category
const getCategoryIcon = (category: SuggestedPrompt['category']) => {
  switch (category) {
    case 'summarize':
      return (
        <svg className="w-3.5 h-3.5" style={{ color: 'var(--color-brand-400)' }} fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
        </svg>
      );
    case 'analyze':
      return (
        <svg className="w-3.5 h-3.5" style={{ color: 'var(--color-brand-400)' }} fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
        </svg>
      );
    case 'create':
      return (
        <svg className="w-3.5 h-3.5" style={{ color: 'var(--color-brand-400)' }} fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
        </svg>
      );
    case 'explore':
    default:
      return (
        <svg className="w-3.5 h-3.5" style={{ color: 'var(--color-brand-400)' }} fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      );
  }
};

// File type icons
const FILE_ICONS: Record<string, JSX.Element> = {
  pdf: (
    <svg className="w-6 h-6 file-icon-pdf" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 13h6M9 17h4" />
    </svg>
  ),
  document: (
    <svg className="w-6 h-6 file-icon-doc" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
    </svg>
  ),
  text: (
    <svg className="w-6 h-6 file-icon-txt" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
    </svg>
  ),
  other: (
    <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
    </svg>
  ),
};

/**
 * Chat input area with glassmorphism styling, enhanced animations,
 * file attachments, @mentions, and suggested prompts.
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
  const inputTokenCount = useMemo(() => estimateTokenCount(value), [value]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [attachedFiles, setAttachedFiles] = useState<FileAttachment[]>([]);
  const [fileError, setFileError] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [showToolbar, setShowToolbar] = useState(false);
  const [lightboxImage, setLightboxImage] = useState<FileAttachment | null>(null);
  const [isTyping, setIsTyping] = useState(false);
  const typingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Image generation state
  const [showImageGenPanel, setShowImageGenPanel] = useState(false);
  const [isGeneratingImage, setIsGeneratingImage] = useState(false);
  const [imageGenError, setImageGenError] = useState<string | null>(null);

  // Image generation settings (for inline mode)
  const [imageSize, setImageSize] = useState('1024x1024');
  const [imageQuality, setImageQuality] = useState('standard');
  const [imageStyle, setImageStyle] = useState('vivid');

  // Smart prompts state
  const [smartPrompts, setSmartPrompts] = useState<SuggestedPrompt[] | null>(null);
  const [isLoadingPrompts, setIsLoadingPrompts] = useState(false);
  const [promptsGenerated, setPromptsGenerated] = useState(false);
  const [showSmartPrompts, setShowSmartPrompts] = useState(true);

  // Check if current provider supports image generation
  const supportsImageGeneration = useMemo(() => {
    if (!provider) return false;
    return isImageGenerationProvider(provider);
  }, [provider]);

  // Load cached smart prompts from sessionStorage on mount
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

  // Generate smart prompts
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
        // Cache in sessionStorage
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
      // Keep using default prompts on error
    } finally {
      setIsLoadingPrompts(false);
    }
  }, [isLoadingPrompts, provider, model]);

  // Get current prompts to display
  const displayPrompts = smartPrompts || DEFAULT_PROMPTS;

  // Get current image model info for inline settings
  const currentImageModelInfo = useMemo(() => {
    if (!isImageGenerationMode || !provider || !model) return null;
    return getImageModelInfo(provider, model);
  }, [isImageGenerationMode, provider, model]);

  // Update image size when model changes
  useEffect(() => {
    if (currentImageModelInfo) {
      setImageSize(currentImageModelInfo.defaultSize);
    }
  }, [currentImageModelInfo]);

  // Mentions state
  const [showMentions, setShowMentions] = useState(false);
  const [mentionQuery, setMentionQuery] = useState('');
  const [mentionIndex, setMentionIndex] = useState(0);
  const [mentionStartPos, setMentionStartPos] = useState<number | null>(null);
  const { data: notes = [] } = useNotes();

  // Filter notes for mentions
  const filteredNotes = useMemo(() => {
    if (!mentionQuery) return notes.slice(0, 5);
    const query = mentionQuery.toLowerCase();
    return notes
      .filter((note: Note) => note.title.toLowerCase().includes(query))
      .slice(0, 5);
  }, [notes, mentionQuery]);

  // Check if current model supports vision
  const supportsVision = useMemo(() => {
    if (!provider || !model) return false;
    return isMultimodalModel(provider, model);
  }, [provider, model]);

  // Get max images for current provider
  const maxImages = useMemo(() => {
    if (!provider) return 4;
    const config = getMultimodalConfig(provider);
    return config?.maxImages || 4;
  }, [provider]);

  // Count attached images
  const imageCount = useMemo(() =>
    attachedFiles.filter(f => f.isImage).length,
    [attachedFiles]
  );

  // Clear images when model changes to non-multimodal
  useEffect(() => {
    if (!supportsVision && attachedFiles.some(f => f.isImage)) {
      setAttachedFiles(prev => prev.filter(f => !f.isImage));
      setFileError('Images cleared: current model does not support vision');
      setTimeout(() => setFileError(null), 3000);
    }
  }, [supportsVision, attachedFiles]);

  // Handle typing indicator
  useEffect(() => {
    if (value.trim()) {
      setIsTyping(true);
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
      typingTimeoutRef.current = setTimeout(() => {
        setIsTyping(false);
      }, 1000);
    } else {
      setIsTyping(false);
    }
    return () => {
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
    };
  }, [value]);

  // Handle mention detection
  const handleInputChange = useCallback((newValue: string) => {
    onChange(newValue);

    // Check for @ mentions
    const cursorPos = textareaRef.current?.selectionStart ?? newValue.length;
    const textBeforeCursor = newValue.slice(0, cursorPos);
    const lastAtIndex = textBeforeCursor.lastIndexOf('@');

    if (lastAtIndex !== -1) {
      const textAfterAt = textBeforeCursor.slice(lastAtIndex + 1);
      // Check if there's a space before @ or it's at the start
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

  // Insert mention
  const insertMention = useCallback((note: Note) => {
    if (mentionStartPos === null) return;

    const beforeMention = value.slice(0, mentionStartPos);
    const afterMention = value.slice(
      mentionStartPos + mentionQuery.length + 1
    );
    const mentionText = `@[${note.title}](note:${note.id}) `;

    onChange(beforeMention + mentionText + afterMention);
    setShowMentions(false);
    setMentionQuery('');
    setMentionStartPos(null);

    // Focus back on textarea
    setTimeout(() => textareaRef.current?.focus(), 0);
  }, [value, mentionStartPos, mentionQuery, onChange]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    // Handle mentions navigation
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

    // Normal send behavior
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  // Handle image generation when in image mode
  const handleImageGeneration = useCallback(async () => {
    if (!value.trim() || !onGenerateImage) return;

    setIsGeneratingImage(true);
    setImageGenError(null);

    try {
      await onGenerateImage({
        prompt: value.trim(),
        size: imageSize,
        quality: currentImageModelInfo?.supportsQuality ? imageQuality : undefined,
        style: currentImageModelInfo?.supportsStyle ? imageStyle : undefined,
      });
      onChange('');
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to generate image';
      setImageGenError(errorMessage);
    } finally {
      setIsGeneratingImage(false);
    }
  }, [value, imageSize, imageQuality, imageStyle, currentImageModelInfo, onChange, onGenerateImage]);

  const handleSend = useCallback(() => {
    // Handle image generation mode
    if (isImageGenerationMode) {
      handleImageGeneration();
      return;
    }

    if (!value.trim() && attachedFiles.length === 0) return;

    // Convert image attachments to MessageImage format
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

  const handleFileSelect = useCallback(
    async (files: FileList | null) => {
      if (!files || files.length === 0) return;

      const fileArray = Array.from(files);

      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }

      setFileError(null);

      for (const file of fileArray) {
        // Check if it's an image and validate for provider
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
          // Validate non-image files
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
    },
    [provider, model, supportsVision, maxImages, imageCount]
  );

  const handleRemoveFile = useCallback((fileId: string) => {
    setAttachedFiles((prev) => prev.filter((f) => f.id !== fileId));
    setFileError(null);
  }, []);

  const handleDragOver = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      if (!disabled) {
        setIsDragging(true);
      }
    },
    [disabled]
  );

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragging(false);

      if (disabled) return;

      const files = e.dataTransfer.files;
      handleFileSelect(files);
    },
    [disabled, handleFileSelect]
  );

  const handlePaste = useCallback(
    (e: React.ClipboardEvent) => {
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
    },
    [disabled, handleFileSelect]
  );

  // Insert formatting
  const insertFormatting = useCallback((before: string, after: string) => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const selectedText = value.slice(start, end);
    const newValue = value.slice(0, start) + before + selectedText + after + value.slice(end);

    onChange(newValue);

    // Restore cursor position
    setTimeout(() => {
      textarea.focus();
      const newPos = start + before.length + selectedText.length;
      textarea.setSelectionRange(newPos, newPos);
    }, 0);
  }, [value, onChange]);

  // Handle suggested prompt click
  const handlePromptClick = useCallback((prompt: SuggestedPrompt) => {
    onChange(prompt.promptTemplate);
    textareaRef.current?.focus();
  }, [onChange]);

  // Image generation handlers
  const handleImageGenerateStart = useCallback(() => {
    setIsGeneratingImage(true);
    setImageGenError(null);
  }, []);

  const handleImageGenerateComplete = useCallback((response: ImageGenerationResponse | null, error?: string) => {
    setIsGeneratingImage(false);
    if (error) {
      setImageGenError(error);
    } else if (response) {
      setShowImageGenPanel(false);
      setImageGenError(null);
      onImageGenerated?.(response);
    }
  }, [onImageGenerated]);

  const hasContent = isImageGenerationMode ? value.trim().length > 0 : (value.trim() || attachedFiles.length > 0);
  const wordCount = value.trim() ? value.trim().split(/\s+/).length : 0;
  const charCount = value.length;

  return (
    <div
      className="absolute bottom-0 left-0 right-0 px-6 py-6 z-20"
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      <div className="max-w-3xl mx-auto">
        {/* Suggested Prompts - Only show when input is empty AND agent mode + notes capability are enabled AND not in image mode */}
        {!isImageGenerationMode && !value.trim() && !attachedFiles.length && !disabled && agentModeEnabled && notesCapabilityEnabled && showSmartPrompts && (
          <div className="mb-3 flex flex-col items-center gap-2">
            {/* Generate Smart Prompts Button with Close Button */}
            <div className="flex items-center gap-2">
              <button
                onClick={handleGenerateSmartPrompts}
                disabled={isLoadingPrompts}
                className="px-3 py-1.5 rounded-lg text-xs font-medium transition-all duration-200 hover:scale-105 active:scale-95 flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                style={{
                  backgroundColor: promptsGenerated ? 'var(--surface-card)' : 'var(--color-primary-alpha)',
                  color: promptsGenerated ? 'var(--text-secondary)' : 'var(--color-brand-400)',
                  border: promptsGenerated ? '1px solid var(--border)' : '1px solid var(--color-brand-400)',
                }}
              >
                {isLoadingPrompts ? (
                  <>
                    <svg className="w-3.5 h-3.5 animate-spin" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                    </svg>
                    <span>Generating...</span>
                  </>
                ) : (
                  <>
                    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
                    </svg>
                    <span>{promptsGenerated ? 'Regenerate Smart Prompts' : 'Generate Smart Prompts'}</span>
                  </>
                )}
              </button>
              <button
                onClick={() => setShowSmartPrompts(false)}
                className="p-1.5 rounded-lg transition-all duration-200 hover:scale-110 active:scale-95 flex items-center justify-center"
                style={{
                  color: 'var(--text-tertiary)',
                  backgroundColor: 'transparent',
                }}
                title="Close smart prompts"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Prompt Chips */}
            <div className="flex flex-wrap gap-2 justify-center">
              {displayPrompts.map((prompt, index) => (
                <button
                  key={prompt.id}
                  onClick={() => handlePromptClick(prompt)}
                  className="prompt-chip px-3 py-1.5 rounded-full text-xs font-medium transition-all duration-200 hover:scale-105 active:scale-95 flex items-center gap-1.5 max-w-xs truncate"
                  style={{
                    '--chip-index': index,
                    backgroundColor: smartPrompts
                      ? 'color-mix(in srgb, var(--color-brand-600) 30%, var(--surface-card-solid))'
                      : 'var(--surface-elevated)',
                    color: smartPrompts ? 'var(--color-brand-400)' : 'var(--text-secondary)',
                    border: smartPrompts ? '1px solid var(--color-brand-400)' : '1px solid var(--border)',
                  } as React.CSSProperties}
                  title={prompt.promptTemplate}
                >
                  {getCategoryIcon(prompt.category)}
                  <span className="truncate">{prompt.label}</span>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Attachment Gallery - hidden in image generation mode */}
        {!isImageGenerationMode && attachedFiles.length > 0 && (
          <div
            className="mb-3 flex flex-wrap gap-3 p-3 rounded-2xl transition-all duration-200"
            style={{
              backgroundColor: 'var(--surface-elevated)',
              border: '1px solid var(--border)',
            }}
          >
            {attachedFiles.map((file, index) => (
              <div
                key={file.id}
                className="attachment-item relative group rounded-xl overflow-hidden cursor-pointer transition-transform duration-200 hover:scale-105"
                style={{
                  width: '100px',
                  height: '100px',
                  animationDelay: `${index * 0.05}s`,
                }}
                onClick={() => file.isImage && setLightboxImage(file)}
              >
                {file.isImage ? (
                  <img
                    src={file.dataUrl}
                    alt={file.name}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div
                    className="w-full h-full flex flex-col items-center justify-center p-2"
                    style={{ backgroundColor: 'var(--surface-card)' }}
                  >
                    {FILE_ICONS[file.fileCategory] || FILE_ICONS.other}
                    <span
                      className="mt-1 text-[10px] text-center truncate w-full"
                      style={{ color: 'var(--text-tertiary)' }}
                    >
                      {file.name}
                    </span>
                  </div>
                )}

                {/* Hover overlay */}
                <div
                  className="absolute inset-0 flex flex-col justify-end opacity-0 group-hover:opacity-100 transition-opacity duration-200"
                  style={{
                    background: 'linear-gradient(transparent, rgba(0,0,0,0.7))',
                  }}
                >
                  <div className="p-2 text-white text-[10px]">
                    <div className="truncate font-medium">{file.name}</div>
                    <div className="opacity-70">{formatFileSize(file.size)}</div>
                  </div>
                </div>

                {/* Remove button */}
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleRemoveFile(file.id);
                  }}
                  className="absolute top-1.5 right-1.5 w-6 h-6 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all duration-150 hover:scale-110"
                  style={{
                    backgroundColor: 'rgba(0,0,0,0.7)',
                    color: 'white',
                  }}
                  title="Remove file"
                >
                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            ))}

            {/* Add more button */}
            <button
              onClick={() => fileInputRef.current?.click()}
              className="flex flex-col items-center justify-center rounded-xl transition-all duration-200 hover:scale-105 active:scale-95"
              style={{
                width: '100px',
                height: '100px',
                border: '2px dashed var(--border)',
                color: 'var(--text-tertiary)',
              }}
              title="Add more files"
            >
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              <span className="text-[10px] mt-1">Add file</span>
            </button>
          </div>
        )}

        {/* Error Message */}
        {fileError && (
          <div
            className="mb-2 px-4 py-2.5 rounded-xl text-sm animate-in fade-in duration-200"
            style={{
              backgroundColor: 'var(--error-bg)',
              color: 'var(--error-text)',
              border: '1px solid var(--error-border)',
            }}
          >
            <div className="flex items-center gap-2">
              <svg className="w-4 h-4 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              {fileError}
            </div>
          </div>
        )}

        {/* Drag Overlay */}
        {isDragging && (
          <div
            className="absolute inset-0 flex items-center justify-center rounded-3xl z-30 animate-in fade-in duration-150"
            style={{
              backgroundColor: 'rgba(var(--primary-rgb), 0.1)',
              border: '3px dashed var(--primary)',
              backdropFilter: 'blur(4px)',
            }}
          >
            <div className="text-center">
              <svg
                className="w-14 h-14 mx-auto mb-3"
                style={{ color: 'var(--primary)' }}
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={1.5}
                  d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
                />
              </svg>
              <p style={{ color: 'var(--primary)' }} className="font-medium text-lg">
                Drop files here
              </p>
              <p className="text-sm mt-1" style={{ color: 'var(--text-tertiary)' }}>
                Images, PDFs, documents supported
              </p>
            </div>
          </div>
        )}

        {/* Formatting Toolbar */}
        {showToolbar && (
          <div
            className="formatting-toolbar mb-2 flex items-center gap-1 px-3 py-2 rounded-xl"
            style={{
              backgroundColor: 'var(--surface-elevated)',
              border: '1px solid var(--border)',
            }}
          >
            <button
              onClick={() => insertFormatting('**', '**')}
              className="p-1.5 rounded-lg transition-colors hover:bg-white/10"
              title="Bold (Ctrl+B)"
              style={{ color: 'var(--text-secondary)' }}
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path d="M6 4h8a4 4 0 014 4 4 4 0 01-4 4H6z" />
                <path d="M6 12h9a4 4 0 014 4 4 4 0 01-4 4H6z" />
              </svg>
            </button>
            <button
              onClick={() => insertFormatting('*', '*')}
              className="p-1.5 rounded-lg transition-colors hover:bg-white/10"
              title="Italic (Ctrl+I)"
              style={{ color: 'var(--text-secondary)' }}
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path d="M10 4h4M14 4l-4 16M6 20h4" />
              </svg>
            </button>
            <button
              onClick={() => insertFormatting('`', '`')}
              className="p-1.5 rounded-lg transition-colors hover:bg-white/10"
              title="Code"
              style={{ color: 'var(--text-secondary)' }}
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
              </svg>
            </button>
            <button
              onClick={() => insertFormatting('[', '](url)')}
              className="p-1.5 rounded-lg transition-colors hover:bg-white/10"
              title="Link"
              style={{ color: 'var(--text-secondary)' }}
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
              </svg>
            </button>
            <div className="w-px h-4 mx-1" style={{ backgroundColor: 'var(--border)' }} />
            <button
              onClick={() => insertFormatting('```\n', '\n```')}
              className="p-1.5 rounded-lg transition-colors hover:bg-white/10"
              title="Code block"
              style={{ color: 'var(--text-secondary)' }}
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4" />
              </svg>
            </button>
            <button
              onClick={() => insertFormatting('- ', '')}
              className="p-1.5 rounded-lg transition-colors hover:bg-white/10"
              title="List"
              style={{ color: 'var(--text-secondary)' }}
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 10h16M4 14h16M4 18h16" />
              </svg>
            </button>
          </div>
        )}

        {/* Image Generation Panel - only show when not in image generation mode (legacy toggle panel) */}
        {!isImageGenerationMode && showImageGenPanel && conversationId && (
          <div className="mb-3">
            <ImageGenerationPanel
              conversationId={conversationId}
              isGenerating={isGeneratingImage}
              onGenerateStart={handleImageGenerateStart}
              onGenerateComplete={handleImageGenerateComplete}
              onClose={() => setShowImageGenPanel(false)}
              initialPrompt={value}
            />
          </div>
        )}

        {/* Image Generation Error */}
        {imageGenError && (
          <div
            className="mb-2 px-4 py-2.5 rounded-xl text-sm animate-in fade-in duration-200"
            style={{
              backgroundColor: 'var(--error-bg)',
              color: 'var(--error-text)',
              border: '1px solid var(--error-border)',
            }}
          >
            <div className="flex items-center gap-2">
              <svg className="w-4 h-4 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              {imageGenError}
              <button
                onClick={() => setImageGenError(null)}
                className="ml-auto p-0.5 rounded hover:bg-white/10"
              >
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          </div>
        )}

        {/* Image Generation Settings Bar - shown when in image mode */}
        {isImageGenerationMode && currentImageModelInfo && (
          <div
            className="mb-3 flex items-center gap-3 p-3 rounded-2xl animate-in slide-in-from-bottom-2 duration-200"
            style={{
              backgroundColor: 'var(--surface-elevated)',
              border: '1px solid var(--border)',
            }}
          >
            {/* Icon */}
            <div
              className="p-2 rounded-lg flex-shrink-0"
              style={{ backgroundColor: 'var(--color-primary-alpha)' }}
            >
              <svg
                className="w-4 h-4"
                style={{ color: 'var(--color-brand-400)' }}
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
                />
              </svg>
            </div>

            {/* Size Selector */}
            <div className="flex items-center gap-2">
              <label className="text-xs font-medium" style={{ color: 'var(--text-tertiary)' }}>
                Size
              </label>
              <select
                value={imageSize}
                onChange={(e) => setImageSize(e.target.value)}
                disabled={isGeneratingImage}
                className="px-2.5 py-1.5 rounded-lg text-xs outline-none cursor-pointer"
                style={{
                  backgroundColor: 'var(--surface-card)',
                  border: '1px solid var(--border)',
                  color: 'var(--text-primary)',
                }}
              >
                {currentImageModelInfo.sizes.map((s) => (
                  <option key={s} value={s}>
                    {formatSizeLabel(s)}
                  </option>
                ))}
              </select>
            </div>

            {/* Quality Selector (if supported) */}
            {currentImageModelInfo.supportsQuality && (
              <div className="flex items-center gap-2">
                <label className="text-xs font-medium" style={{ color: 'var(--text-tertiary)' }}>
                  Quality
                </label>
                <select
                  value={imageQuality}
                  onChange={(e) => setImageQuality(e.target.value)}
                  disabled={isGeneratingImage}
                  className="px-2.5 py-1.5 rounded-lg text-xs outline-none cursor-pointer"
                  style={{
                    backgroundColor: 'var(--surface-card)',
                    border: '1px solid var(--border)',
                    color: 'var(--text-primary)',
                  }}
                >
                  {QUALITY_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* Style Selector (if supported) */}
            {currentImageModelInfo.supportsStyle && (
              <div className="flex items-center gap-2">
                <label className="text-xs font-medium" style={{ color: 'var(--text-tertiary)' }}>
                  Style
                </label>
                <select
                  value={imageStyle}
                  onChange={(e) => setImageStyle(e.target.value)}
                  disabled={isGeneratingImage}
                  className="px-2.5 py-1.5 rounded-lg text-xs outline-none cursor-pointer"
                  style={{
                    backgroundColor: 'var(--surface-card)',
                    border: '1px solid var(--border)',
                    color: 'var(--text-primary)',
                  }}
                >
                  {STYLE_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* Model description tooltip */}
            {currentImageModelInfo.description && (
              <div className="ml-auto" title={currentImageModelInfo.description}>
                <svg
                  className="w-4 h-4"
                  style={{ color: 'var(--text-tertiary)' }}
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
              </div>
            )}
          </div>
        )}

        {/* Main Input Container - Glassmorphism */}
        <div
          className={`chat-input-glass relative flex flex-col rounded-3xl px-4 py-3 transition-all duration-300 ${isTyping ? 'is-typing' : ''}`}
        >
          {/* Hidden file input */}
          <input
            ref={fileInputRef}
            type="file"
            accept={getAllSupportedExtensions().join(',')}
            multiple
            className="hidden"
            onChange={(e) => handleFileSelect(e.target.files)}
          />

          {/* Mentions Dropdown */}
          {showMentions && filteredNotes.length > 0 && (
            <div
              className="mentions-dropdown absolute bottom-full left-4 right-4 mb-2 rounded-xl overflow-hidden z-50"
              style={{
                backgroundColor: 'var(--surface-elevated)',
                border: '1px solid var(--border)',
                boxShadow: 'var(--shadow-lg)',
              }}
            >
              <div className="px-3 py-2 text-xs font-medium" style={{ color: 'var(--text-tertiary)', borderBottom: '1px solid var(--border)' }}>
                Notes
              </div>
              {filteredNotes.map((note: Note, index: number) => (
                <button
                  key={note.id}
                  onClick={() => insertMention(note)}
                  className={`w-full px-3 py-2.5 text-left text-sm transition-colors flex items-center gap-2 ${index === mentionIndex ? 'bg-white/10' : ''
                    }`}
                  style={{
                    color: 'var(--text-primary)',
                    backgroundColor: index === mentionIndex ? 'var(--color-primary-alpha)' : 'transparent',
                  }}
                >
                  <svg className="w-4 h-4 flex-shrink-0" style={{ color: 'var(--color-brand-400)' }} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  <span className="truncate">{note.title}</span>
                  {note.tags.length > 0 && (
                    <span className="text-xs px-1.5 py-0.5 rounded" style={{ backgroundColor: 'var(--surface-card)', color: 'var(--text-tertiary)' }}>
                      {note.tags[0]}
                    </span>
                  )}
                </button>
              ))}
            </div>
          )}

          {/* Input Row */}
          <div className="flex items-end gap-3">
            {/* Attachment Button - hidden in image generation mode */}
            {!isImageGenerationMode && (
              <button
                onClick={() => fileInputRef.current?.click()}
                disabled={isLoading || disabled}
                className="flex-shrink-0 p-2 rounded-xl transition-all duration-200 hover:scale-110 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
                style={{
                  color: attachedFiles.length > 0 ? 'var(--color-brand-400)' : 'var(--text-tertiary)',
                  backgroundColor: attachedFiles.length > 0 ? 'var(--color-primary-alpha)' : 'transparent',
                }}
                title={`Attach files (${attachedFiles.length})`}
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13"
                  />
                </svg>
              </button>
            )}

            {/* Formatting Toggle - hidden in image generation mode */}
            {!isImageGenerationMode && (
              <button
                onClick={() => setShowToolbar(!showToolbar)}
                disabled={isLoading || disabled}
                className="flex-shrink-0 p-2 rounded-xl transition-all duration-200 hover:scale-110 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
                style={{
                  color: showToolbar ? 'var(--color-brand-400)' : 'var(--text-tertiary)',
                  backgroundColor: showToolbar ? 'var(--color-primary-alpha)' : 'transparent',
                }}
                title="Formatting options"
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h8m-8 6h16" />
                </svg>
              </button>
            )}

            {/* Smart Prompts Toggle - Show when prompts are closed and conditions are met */}
            {!isImageGenerationMode && !showSmartPrompts && !value.trim() && !attachedFiles.length && !disabled && agentModeEnabled && notesCapabilityEnabled && (
              <button
                onClick={() => setShowSmartPrompts(true)}
                disabled={isLoading || disabled}
                className="flex-shrink-0 p-2 rounded-xl transition-all duration-200 hover:scale-110 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
                style={{
                  color: 'var(--text-tertiary)',
                  backgroundColor: 'transparent',
                }}
                title="Show smart prompts"
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
                </svg>
              </button>
            )}

            {/* Image Generation Toggle - only show for providers that support it when NOT in image model mode */}
            {!isImageGenerationMode && supportsImageGeneration && conversationId && (
              <button
                onClick={() => {
                  setShowImageGenPanel(!showImageGenPanel);
                  setShowToolbar(false);
                }}
                disabled={isLoading || disabled || isGeneratingImage}
                className="flex-shrink-0 p-2 rounded-xl transition-all duration-200 hover:scale-110 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
                style={{
                  color: showImageGenPanel ? 'var(--color-brand-400)' : 'var(--text-tertiary)',
                  backgroundColor: showImageGenPanel ? 'var(--color-primary-alpha)' : 'transparent',
                }}
                title="Generate image"
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
                  />
                </svg>
              </button>
            )}

            {/* Textarea */}
            <div className="flex-1 relative">
              <textarea
                ref={textareaRef}
                value={value}
                onChange={(e) => handleInputChange(e.target.value)}
                onKeyDown={handleKeyDown}
                onPaste={!isImageGenerationMode ? handlePaste : undefined}
                placeholder={
                  isImageGenerationMode
                    ? 'Describe the image you want to create...'
                    : supportsVision
                      ? 'Type a message... (@ to mention notes, paste/drop files)'
                      : 'Type a message... (@ to mention notes, Shift+Enter for new line)'
                }
                disabled={isLoading || disabled || isGeneratingImage}
                rows={1}
                className="w-full resize-none outline-none text-sm leading-relaxed placeholder:opacity-50 overflow-hidden"
                style={{
                  backgroundColor: 'transparent',
                  color: 'var(--text-primary)',
                  minHeight: '24px',
                }}
                onInput={(e) => {
                  const target = e.target as HTMLTextAreaElement;
                  target.style.height = 'auto';
                  target.style.height = `${target.scrollHeight}px`;
                }}
                onFocus={() => setShowToolbar(false)}
              />
            </div>

            {/* Send/Cancel Button */}
            <button
              onClick={isStreaming ? onCancel : handleSend}
              disabled={!isStreaming && (isLoading || isGeneratingImage || !hasContent || disabled)}
              className={`send-button-animated flex-shrink-0 p-2.5 rounded-xl transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed ${hasContent && !isStreaming && !isGeneratingImage ? 'has-content' : ''
                }`}
              style={{
                backgroundColor: isStreaming ? 'var(--error-bg)' : 'var(--btn-primary-bg)',
                color: isStreaming ? 'var(--error-text)' : 'var(--btn-primary-text)',
                border: isStreaming
                  ? '1px solid var(--error-border)'
                  : '1px solid var(--btn-primary-border)',
                boxShadow: 'var(--btn-primary-shadow)',
              }}
              title={
                isStreaming
                  ? 'Cancel streaming'
                  : isGeneratingImage
                    ? 'Generating image...'
                    : isImageGenerationMode
                      ? 'Generate image'
                      : isLoading
                        ? 'Sending...'
                        : 'Send message'
              }
            >
              {isStreaming ? (
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              ) : isLoading || isGeneratingImage ? (
                <svg className="w-5 h-5 animate-spin" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
              ) : isImageGenerationMode ? (
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
                  />
                </svg>
              ) : (
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                </svg>
              )}
            </button>
          </div>

          {/* Input Metrics */}
          {hasContent && (
            <div
              className="flex items-center justify-end gap-3 mt-2 pt-2 animate-in fade-in duration-200"
              style={{
                borderTop: '1px solid var(--border)',
                color: 'var(--text-tertiary)',
                fontSize: '10.5px',
                fontFeatureSettings: '"tnum"',
              }}
            >
              {attachedFiles.length > 0 && (
                <span className="flex items-center gap-1">
                  <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
                  </svg>
                  {attachedFiles.length} {attachedFiles.length === 1 ? 'file' : 'files'}
                </span>
              )}
              {value.trim() && (
                <>
                  <span>{charCount.toLocaleString()} chars</span>
                  <span>{wordCount.toLocaleString()} {wordCount === 1 ? 'word' : 'words'}</span>
                  <span>{inputTokenCount.toLocaleString()} {inputTokenCount === 1 ? 'token' : 'tokens'}</span>
                </>
              )}
            </div>
          )}
        </div>

        {/* Vision support indicator - hidden in image generation mode */}
        {!isImageGenerationMode && provider && model && !supportsVision && (
          <div
            className="mt-2 text-center text-xs"
            style={{ color: 'var(--text-tertiary)', opacity: 0.7 }}
          >
            <span className="inline-flex items-center gap-1">
              <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              {model} doesn&apos;t support image inputs
            </span>
          </div>
        )}
      </div>

      {/* Lightbox Modal */}
      {lightboxImage && (
        <div
          className="lightbox-overlay fixed inset-0 z-50 flex items-center justify-center p-8"
          style={{ backgroundColor: 'rgba(0,0,0,0.9)' }}
          onClick={() => setLightboxImage(null)}
        >
          <button
            className="absolute top-4 right-4 p-2 rounded-full transition-colors hover:bg-white/10"
            style={{ color: 'white' }}
            onClick={() => setLightboxImage(null)}
          >
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
          <img
            src={lightboxImage.dataUrl}
            alt={lightboxImage.name}
            className="lightbox-image max-w-full max-h-full object-contain rounded-lg"
            onClick={(e) => e.stopPropagation()}
          />
          <div
            className="absolute bottom-4 left-1/2 -translate-x-1/2 px-4 py-2 rounded-lg"
            style={{ backgroundColor: 'rgba(0,0,0,0.7)', color: 'white' }}
          >
            <div className="text-sm font-medium">{lightboxImage.name}</div>
            <div className="text-xs opacity-70">{formatFileSize(lightboxImage.size)}</div>
          </div>
        </div>
      )}
    </div>
  );
}
