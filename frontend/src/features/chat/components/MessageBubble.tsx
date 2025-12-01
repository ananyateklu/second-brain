import { useState, useCallback } from 'react';
import { ChatMessage, GeneratedImage } from '../../../types/chat';
import { MarkdownMessage } from '../../../components/MarkdownMessage';
import { TokenUsageDisplay } from '../../../components/TokenUsageDisplay';
import { stripThinkingTags } from '../../../utils/thinking-utils';
import { downloadGeneratedImage, getImageDataUrl } from '../../../utils/image-generation-models';
import { MessageFeedback } from './MessageFeedback';

export interface MessageBubbleProps {
  message: ChatMessage;
  modelName?: string;
  userName?: string;
  hasToolCalls?: boolean;
  hasThinkingContent?: boolean;
  // For streaming messages that haven't been persisted yet
  streamingInputTokens?: number;
  streamingOutputTokens?: number;
  streamingDuration?: number;
  agentModeEnabled?: boolean;
  isLastMessage?: boolean;
  // RAG feedback
  ragLogId?: string;
  showFeedback?: boolean;
}

/**
 * Component to display a generated image with download and lightbox functionality
 */
function GeneratedImageDisplay({ image, index }: { image: GeneratedImage; index: number }) {
  const [isHovered, setIsHovered] = useState(false);
  const [showLightbox, setShowLightbox] = useState(false);

  const handleDownload = useCallback(() => {
    const timestamp = new Date().toISOString().slice(0, 19).replace(/[:-]/g, '');
    const filename = `generated-image-${timestamp}-${index + 1}.png`;
    downloadGeneratedImage(image.base64Data, image.url, filename);
  }, [image, index]);

  const imageUrl = image.base64Data
    ? getImageDataUrl(image.base64Data, image.mediaType)
    : image.url;

  if (!imageUrl) return null;

  return (
    <>
      <div
        className="relative rounded-xl overflow-hidden cursor-pointer transition-transform duration-200 hover:scale-[1.02]"
        style={{
          width: image.width ? Math.min(image.width, 512) : 512,
          maxWidth: '100%',
          aspectRatio: image.width && image.height ? `${image.width}/${image.height}` : '1/1',
        }}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        onClick={() => setShowLightbox(true)}
      >
        <img
          src={imageUrl}
          alt={image.revisedPrompt || 'Generated image'}
          className="w-full h-full object-cover"
          style={{ backgroundColor: 'var(--surface-card)' }}
        />

        {/* Hover overlay with actions */}
        <div
          className={`absolute inset-0 flex items-end justify-between p-3 transition-opacity duration-200 ${
            isHovered ? 'opacity-100' : 'opacity-0'
          }`}
          style={{
            background: 'linear-gradient(transparent 50%, rgba(0,0,0,0.7))',
          }}
        >
          <div className="flex gap-2">
            {/* Download button */}
            <button
              onClick={(e) => {
                e.stopPropagation();
                handleDownload();
              }}
              className="p-2 rounded-lg transition-colors hover:bg-white/20"
              style={{ backgroundColor: 'rgba(0,0,0,0.5)', color: 'white' }}
              title="Download image"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"
                />
              </svg>
            </button>

            {/* Expand button */}
            <button
              onClick={(e) => {
                e.stopPropagation();
                setShowLightbox(true);
              }}
              className="p-2 rounded-lg transition-colors hover:bg-white/20"
              style={{ backgroundColor: 'rgba(0,0,0,0.5)', color: 'white' }}
              title="View full size"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4"
                />
              </svg>
            </button>
          </div>

          {/* Size indicator */}
          {image.width && image.height && (
            <span
              className="text-xs px-2 py-1 rounded"
              style={{ backgroundColor: 'rgba(0,0,0,0.5)', color: 'white' }}
            >
              {image.width}×{image.height}
            </span>
          )}
        </div>
      </div>

      {/* Revised prompt */}
      {image.revisedPrompt && (
        <p
          className="mt-2 text-xs italic px-3 py-2 rounded-lg"
          style={{
            backgroundColor: 'var(--surface-elevated)',
            color: 'var(--text-tertiary)',
            maxWidth: image.width ? Math.min(image.width, 512) : 512,
          }}
        >
          <span className="font-medium" style={{ color: 'var(--text-secondary)' }}>
            Revised prompt:{' '}
          </span>
          {image.revisedPrompt}
        </p>
      )}

      {/* Lightbox Modal */}
      {showLightbox && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-8"
          style={{ backgroundColor: 'rgba(0,0,0,0.9)' }}
          onClick={() => setShowLightbox(false)}
        >
          <button
            className="absolute top-4 right-4 p-2 rounded-full transition-colors hover:bg-white/10"
            style={{ color: 'white' }}
            onClick={() => setShowLightbox(false)}
          >
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>

          {/* Download button in lightbox */}
          <button
            className="absolute top-4 left-4 p-2 rounded-full transition-colors hover:bg-white/10 flex items-center gap-2"
            style={{ color: 'white', backgroundColor: 'rgba(255,255,255,0.1)' }}
            onClick={(e) => {
              e.stopPropagation();
              handleDownload();
            }}
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"
              />
            </svg>
            <span className="text-sm">Download</span>
          </button>

          <img
            src={imageUrl}
            alt={image.revisedPrompt || 'Generated image'}
            className="max-w-full max-h-full object-contain rounded-lg"
            onClick={(e) => e.stopPropagation()}
          />

          {image.revisedPrompt && (
            <div
              className="absolute bottom-4 left-1/2 -translate-x-1/2 max-w-2xl px-4 py-3 rounded-lg text-center"
              style={{ backgroundColor: 'rgba(0,0,0,0.7)', color: 'white' }}
            >
              <p className="text-sm">{image.revisedPrompt}</p>
            </div>
          )}
        </div>
      )}
    </>
  );
}

/**
 * Renders a single message bubble (user or assistant).
 */
/**
 * Helper to check if content is an image generation request
 */
function isImageGenerationRequest(content: string): boolean {
  return content.startsWith('[Image Generation Request]');
}

/**
 * Extract the prompt from an image generation request
 */
function extractImagePrompt(content: string): string {
  return content.replace('[Image Generation Request]\n', '').replace('[Image Generation Request]', '').trim();
}

export function MessageBubble({
  message,
  modelName,
  userName,
  hasToolCalls = false,
  hasThinkingContent = false,
  streamingInputTokens,
  streamingOutputTokens,
  streamingDuration,
  agentModeEnabled = false,
  isLastMessage = false,
  ragLogId,
  showFeedback = true,
}: MessageBubbleProps) {
  const isUser = message.role === 'user';
  const hasGeneratedImages = message.generatedImages && message.generatedImages.length > 0;
  const isImageRequest = isUser && isImageGenerationRequest(message.content);
  const displayContent = isImageRequest ? extractImagePrompt(message.content) : message.content;
  
  // Determine if we should show feedback (assistant message with RAG log ID)
  const effectiveRagLogId = ragLogId || message.ragLogId;
  const shouldShowFeedback = !isUser && effectiveRagLogId && showFeedback;

  return (
    <div className={`flex ${isUser ? 'justify-end' : 'justify-start'}`}>
      <div
        className={`${isUser ? 'max-w-[80%]' : 'w-full'} rounded-2xl px-5 ${isImageRequest ? 'py-4' : 'py-3'} ${
          isUser ? 'rounded-br-md' : 'rounded-bl-md'
        }`}
        style={{
          backgroundColor: isUser ? 'var(--btn-primary-bg)' : 'var(--surface-card)',
          color: isUser ? 'var(--btn-primary-text)' : 'var(--text-primary)',
          ...(isUser && {
            border: '1px solid var(--btn-primary-border)',
          }),
        }}
      >
        {isUser ? (
          <>
            {/* Image generation request badge */}
            {isImageRequest && (
              <div className="flex items-center gap-2 mb-3">
                <div
                  className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium"
                  style={{
                    backgroundColor: 'rgba(255, 255, 255, 0.15)',
                    backdropFilter: 'blur(4px)',
                  }}
                >
                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
                    />
                  </svg>
                  <span>Generate Image</span>
                </div>
              </div>
            )}
            {message.images && message.images.length > 0 && (
              <div className="flex flex-wrap gap-2 mb-2">
                {message.images.map((image, index) => (
                  <div
                    key={index}
                    className="relative rounded-lg overflow-hidden border border-white/20"
                    style={{ width: '80px', height: '80px' }}
                  >
                    <img
                      src={`data:${image.mediaType};base64,${image.base64Data}`}
                      alt={image.fileName || 'Attached image'}
                      className="w-full h-full object-cover"
                    />
                  </div>
                ))}
              </div>
            )}
            <p className={`whitespace-pre-wrap break-words ${isImageRequest ? 'text-[15px] leading-relaxed' : ''}`}>{displayContent}</p>
            <TokenUsageDisplay
              inputTokens={message.inputTokens}
              outputTokens={message.outputTokens}
              role="user"
              userName={userName}
            />
          </>
        ) : (
          <>
            {/* Display generated images */}
            {hasGeneratedImages && (
              <div className="mb-4 space-y-4">
                {message.generatedImages!.map((image, index) => (
                  <GeneratedImageDisplay key={index} image={image} index={index} />
                ))}
              </div>
            )}

            {/* Regular message content (may be empty for pure image generation) */}
            {message.content && !message.content.startsWith('[Generated Image]') && (
              <MarkdownMessage
                content={(hasToolCalls || hasThinkingContent) ? stripThinkingTags(message.content) : message.content}
              />
            )}

            {/* Show "Image Generated" label if only image content */}
            {hasGeneratedImages && message.content.startsWith('[Generated Image]') && (
              <div
                className="flex items-center gap-2 mt-2 text-xs"
                style={{ color: 'var(--text-tertiary)' }}
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M5 13l4 4L19 7"
                  />
                </svg>
                Image generated successfully
              </div>
            )}

            <TokenUsageDisplay
              inputTokens={
                message.inputTokens ??
                (isLastMessage && agentModeEnabled ? streamingInputTokens : undefined)
              }
              outputTokens={
                message.outputTokens ??
                (isLastMessage && agentModeEnabled ? streamingOutputTokens : undefined)
              }
              role="assistant"
              modelName={modelName}
              durationMs={
                message.durationMs ??
                (isLastMessage && agentModeEnabled ? streamingDuration : undefined)
              }
            />

            {/* RAG Feedback buttons */}
            {shouldShowFeedback && effectiveRagLogId && (
              <MessageFeedback 
                ragLogId={effectiveRagLogId} 
                currentFeedback={message.ragFeedback as 'thumbs_up' | 'thumbs_down' | undefined}
              />
            )}
          </>
        )}
      </div>
    </div>
  );
}

