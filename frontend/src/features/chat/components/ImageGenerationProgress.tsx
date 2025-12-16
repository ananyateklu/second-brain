/**
 * ImageGenerationProgress Component
 * 
 * Displays the progress of image generation with stage indicators,
 * provider/model info, and animated visuals.
 */

import type { ImageGenerationStage } from '../../../core/streaming/types';

interface ImageGenerationProgressProps {
  /** Current stage of image generation */
  stage: ImageGenerationStage;
  /** Provider name (e.g., "OpenAI", "Gemini", "Grok") */
  provider: string | null;
  /** Model name (e.g., "dall-e-3") */
  model: string | null;
  /** The prompt being used */
  prompt: string | null;
  /** Progress percentage (0-100), if available */
  progress?: number | null;
  /** Whether generation is in progress */
  isGenerating: boolean;
}

/**
 * Get a user-friendly stage label
 */
function getStageLabel(stage: ImageGenerationStage): string {
  switch (stage) {
    case 'preparing':
      return 'Preparing request...';
    case 'generating':
      return 'Generating image...';
    case 'processing':
      return 'Processing result...';
    case 'complete':
      return 'Complete';
    case 'error':
      return 'Error';
    default:
      return 'Starting...';
  }
}

/**
 * Get the stage icon
 */
function getStageIcon(stage: ImageGenerationStage, isGenerating: boolean) {
  if (stage === 'complete') {
    return (
      <svg
        className="w-4 h-4"
        style={{ color: 'var(--success-text)' }}
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M5 13l4 4L19 7"
        />
      </svg>
    );
  }

  if (stage === 'error') {
    return (
      <svg
        className="w-4 h-4"
        style={{ color: 'var(--error-text)' }}
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
        />
      </svg>
    );
  }

  // Animated icon for in-progress states
  return (
    <svg
      className={`w-4 h-4 ${isGenerating ? 'animate-pulse' : ''}`}
      style={{ color: 'var(--color-brand-500)' }}
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
  );
}

/**
 * Get the progress bar color based on stage
 */
function getProgressColor(stage: ImageGenerationStage): string {
  switch (stage) {
    case 'complete':
      return 'var(--success-text)';
    case 'error':
      return 'var(--error-text)';
    default:
      return 'var(--color-brand-500)';
  }
}

/**
 * Get the estimated progress based on stage (when actual progress is not available)
 */
function getEstimatedProgress(stage: ImageGenerationStage): number {
  switch (stage) {
    case 'idle':
      return 0;
    case 'preparing':
      return 15;
    case 'generating':
      return 50;
    case 'processing':
      return 85;
    case 'complete':
      return 100;
    case 'error':
      return 0;
    default:
      return 0;
  }
}

export function ImageGenerationProgress({
  stage,
  provider,
  model,
  prompt,
  progress,
  isGenerating,
}: ImageGenerationProgressProps) {
  const displayProgress = progress ?? getEstimatedProgress(stage);
  const progressColor = getProgressColor(stage);

  return (
    <div className="relative pl-12 py-2 group">
      {/* Icon on the timeline */}
      <div
        className={`absolute left-2.5 top-2.5 w-5 h-5 rounded-full flex items-center justify-center border transition-colors ${isGenerating ? 'animate-pulse' : ''
          }`}
        style={{
          backgroundColor: 'var(--surface-card)',
          borderColor: isGenerating ? 'var(--color-brand-500)' : 'var(--border)',
        }}
      >
        {getStageIcon(stage, isGenerating)}
      </div>

      {/* Content */}
      <div className="text-sm space-y-2">
        {/* Header */}
        <div className="flex items-center gap-2">
          <span
            className="font-medium"
            style={{ color: 'var(--text-primary)' }}
          >
            Image Generation
          </span>
          {provider && model && (
            <span
              className="text-xs px-1.5 py-0.5 rounded"
              style={{
                backgroundColor: 'var(--color-brand-alpha)',
                color: 'var(--color-brand-text)',
              }}
            >
              {provider} / {model}
            </span>
          )}
        </div>

        {/* Progress Card */}
        <div
          className="rounded-lg p-3 space-y-3"
          style={{
            backgroundColor: 'var(--surface-card)',
            border: '1px solid var(--border)',
          }}
        >
          {/* Status indicator */}
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-2">
              {isGenerating && stage !== 'complete' && stage !== 'error' && (
                <div className="relative w-4 h-4 flex-shrink-0">
                  <div
                    className="absolute inset-0 rounded-full border-2 border-transparent animate-spin"
                    style={{
                      borderTopColor: 'var(--color-brand-500)',
                      borderRightColor: 'var(--color-brand-500)',
                    }}
                  />
                </div>
              )}
              <span
                className="text-sm font-medium"
                style={{ color: 'var(--text-primary)' }}
              >
                {getStageLabel(stage)}
              </span>
            </div>
          </div>

          {/* Progress bar */}
          {isGenerating && stage !== 'complete' && stage !== 'error' && (
            <div className="space-y-1">
              <div
                className="h-1.5 rounded-full overflow-hidden"
                style={{ backgroundColor: 'var(--border)' }}
              >
                <div
                  className="h-full rounded-full transition-all duration-500 ease-out"
                  style={{
                    width: `${displayProgress}%`,
                    backgroundColor: progressColor,
                  }}
                />
              </div>
              {progress !== null && progress !== undefined && (
                <div
                  className="text-xs text-right"
                  style={{ color: 'var(--text-tertiary)' }}
                >
                  {Math.round(displayProgress)}%
                </div>
              )}
            </div>
          )}

          {/* Prompt preview */}
          {prompt && (
            <div
              className="text-xs line-clamp-2"
              style={{ color: 'var(--text-secondary)' }}
            >
              <span style={{ color: 'var(--text-tertiary)' }}>Prompt: </span>
              {prompt}
            </div>
          )}

          {/* Image placeholder during generation */}
          {isGenerating && stage !== 'complete' && stage !== 'error' && (
            <div
              className="relative w-full aspect-square max-w-[200px] rounded-lg overflow-hidden mt-2"
              style={{
                backgroundColor: 'var(--border)',
                opacity: 0.3,
              }}
            >
              {/* Shimmer animation */}
              <div
                className="absolute inset-0 -translate-x-full"
                style={{
                  background:
                    'linear-gradient(90deg, transparent, rgba(var(--btn-primary-bg-rgb, 59, 130, 246), 0.2), transparent)',
                  animation: 'shimmer 2s infinite',
                }}
              />
              {/* Centered image icon */}
              <div className="absolute inset-0 flex items-center justify-center">
                <svg
                  className="w-8 h-8 opacity-30"
                  style={{ color: 'var(--text-tertiary)' }}
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={1.5}
                    d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
                  />
                </svg>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
