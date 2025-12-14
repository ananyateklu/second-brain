import { useState, useEffect, useCallback, useRef } from 'react';
import {
  IMAGE_GENERATION_CONFIGS,
  getImageGenerationConfig,
  getImageModelInfo,
  formatSizeLabel,
  QUALITY_OPTIONS,
  STYLE_OPTIONS,
} from '../../../utils/image-generation-models';
import { ImageGenerationRequest, ImageGenerationResponse } from '../../../types/chat';
import { chatService } from '../../../services/chat.service';

interface ImageGenerationPanelProps {
  /** Current conversation ID */
  conversationId: string;
  /** Whether generation is in progress */
  isGenerating: boolean;
  /** Callback when generation starts */
  onGenerateStart: () => void;
  /** Callback when generation completes */
  onGenerateComplete: (response: ImageGenerationResponse | null, error?: string) => void;
  /** Close the panel */
  onClose: () => void;
  /** Initial prompt value */
  initialPrompt?: string;
}

/**
 * Panel for configuring and generating images
 */
export function ImageGenerationPanel({
  conversationId,
  isGenerating,
  onGenerateStart,
  onGenerateComplete,
  onClose,
  initialPrompt = '',
}: ImageGenerationPanelProps) {
  const [prompt, setPrompt] = useState(initialPrompt);
  const [provider, setProvider] = useState('OpenAI');
  const [model, setModel] = useState('dall-e-3');
  const [size, setSize] = useState('1024x1024');
  const [quality, setQuality] = useState('standard');
  const [style, setStyle] = useState('vivid');
  const [error, setError] = useState<string | null>(null);

  // Get available providers
  const availableProviders = Object.keys(IMAGE_GENERATION_CONFIGS);

  // Get current provider config
  const providerConfig = getImageGenerationConfig(provider);
  const modelInfo = getImageModelInfo(provider, model);

  // Update model when provider changes - valid prop sync for cascading selects
  const prevProviderRef = useRef(provider);
  useEffect(() => {
    if (prevProviderRef.current !== provider) {
      prevProviderRef.current = provider;
      const config = getImageGenerationConfig(provider);
      if (config) {
        /* eslint-disable react-hooks/set-state-in-effect */
        setModel(config.defaultModel);
        const defaultModelInfo = getImageModelInfo(provider, config.defaultModel);
        if (defaultModelInfo) {
          setSize(defaultModelInfo.defaultSize);
        }
        /* eslint-enable react-hooks/set-state-in-effect */
      }
    }
  }, [provider]);

  // Update size when model changes - valid prop sync for cascading selects
  const prevModelRef = useRef(model);
  useEffect(() => {
    if (prevModelRef.current !== model) {
      prevModelRef.current = model;
      const info = getImageModelInfo(provider, model);
      if (info) {
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setSize(info.defaultSize);
      }
    }
  }, [provider, model]);

  const handleGenerate = useCallback(async () => {
    if (!prompt.trim()) {
      setError('Please enter a prompt');
      return;
    }

    setError(null);
    onGenerateStart();

    try {
      const request: ImageGenerationRequest = {
        prompt: prompt.trim(),
        provider,
        model,
        size,
        quality: modelInfo?.supportsQuality ? quality : undefined,
        style: modelInfo?.supportsStyle ? style : undefined,
        count: 1,
      };

      const response = await chatService.generateImage(conversationId, request);

      if (response.success) {
        onGenerateComplete(response);
        setPrompt('');
      } else {
        onGenerateComplete(null, response.error || 'Failed to generate image');
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to generate image';
      onGenerateComplete(null, errorMessage);
    }
  }, [prompt, provider, model, size, quality, style, modelInfo, conversationId, onGenerateStart, onGenerateComplete]);

  return (
    <div
      className="rounded-2xl p-4 animate-in slide-in-from-bottom-2 duration-200"
      style={{
        backgroundColor: 'var(--surface-elevated)',
        border: '1px solid var(--border)',
        boxShadow: 'var(--shadow-lg)',
      }}
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <div
            className="p-2 rounded-lg"
            style={{ backgroundColor: 'var(--color-primary-alpha)' }}
          >
            <svg
              className="w-5 h-5"
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
          <div>
            <h3 className="font-medium text-sm" style={{ color: 'var(--text-primary)' }}>
              Generate Image
            </h3>
            <p className="text-xs" style={{ color: 'var(--text-tertiary)' }}>
              Create AI-generated images from text
            </p>
          </div>
        </div>
        <button
          onClick={onClose}
          className="p-1.5 rounded-lg transition-colors hover:bg-white/10"
          style={{ color: 'var(--text-tertiary)' }}
        >
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      {/* Prompt Input */}
      <div className="mb-4">
        <textarea
          value={prompt}
          onChange={(e) => { setPrompt(e.target.value); }}
          placeholder="Describe the image you want to create..."
          disabled={isGenerating}
          rows={3}
          className="w-full px-3 py-2.5 rounded-xl text-sm resize-none outline-none transition-colors"
          style={{
            backgroundColor: 'var(--surface-card)',
            border: '1px solid var(--border)',
            color: 'var(--text-primary)',
          }}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault();
              void handleGenerate();
            }
          }}
        />
      </div>

      {/* Settings Grid */}
      <div className="grid grid-cols-2 gap-3 mb-4">
        {/* Provider */}
        <div>
          <label
            className="block text-xs font-medium mb-1.5"
            style={{ color: 'var(--text-secondary)' }}
          >
            Provider
          </label>
          <select
            value={provider}
            onChange={(e) => { setProvider(e.target.value); }}
            disabled={isGenerating}
            className="w-full px-3 py-2 rounded-lg text-sm outline-none cursor-pointer"
            style={{
              backgroundColor: 'var(--surface-card)',
              border: '1px solid var(--border)',
              color: 'var(--text-primary)',
            }}
          >
            {availableProviders.map((p) => (
              <option key={p} value={p}>
                {p}
              </option>
            ))}
          </select>
        </div>

        {/* Model */}
        <div>
          <label
            className="block text-xs font-medium mb-1.5"
            style={{ color: 'var(--text-secondary)' }}
          >
            Model
          </label>
          <select
            value={model}
            onChange={(e) => { setModel(e.target.value); }}
            disabled={isGenerating}
            className="w-full px-3 py-2 rounded-lg text-sm outline-none cursor-pointer"
            style={{
              backgroundColor: 'var(--surface-card)',
              border: '1px solid var(--border)',
              color: 'var(--text-primary)',
            }}
          >
            {providerConfig?.models.map((m) => (
              <option key={m.id} value={m.id}>
                {m.name}
              </option>
            ))}
          </select>
        </div>

        {/* Size */}
        <div>
          <label
            className="block text-xs font-medium mb-1.5"
            style={{ color: 'var(--text-secondary)' }}
          >
            Size
          </label>
          <select
            value={size}
            onChange={(e) => { setSize(e.target.value); }}
            disabled={isGenerating}
            className="w-full px-3 py-2 rounded-lg text-sm outline-none cursor-pointer"
            style={{
              backgroundColor: 'var(--surface-card)',
              border: '1px solid var(--border)',
              color: 'var(--text-primary)',
            }}
          >
            {modelInfo?.sizes.map((s) => (
              <option key={s} value={s}>
                {formatSizeLabel(s)}
              </option>
            ))}
          </select>
        </div>

        {/* Quality (if supported) */}
        {modelInfo?.supportsQuality && (
          <div>
            <label
              className="block text-xs font-medium mb-1.5"
              style={{ color: 'var(--text-secondary)' }}
            >
              Quality
            </label>
            <select
              value={quality}
              onChange={(e) => { setQuality(e.target.value); }}
              disabled={isGenerating}
              className="w-full px-3 py-2 rounded-lg text-sm outline-none cursor-pointer"
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

        {/* Style (if supported) */}
        {modelInfo?.supportsStyle && (
          <div>
            <label
              className="block text-xs font-medium mb-1.5"
              style={{ color: 'var(--text-secondary)' }}
            >
              Style
            </label>
            <select
              value={style}
              onChange={(e) => { setStyle(e.target.value); }}
              disabled={isGenerating}
              className="w-full px-3 py-2 rounded-lg text-sm outline-none cursor-pointer"
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
      </div>

      {/* Model Description */}
      {modelInfo?.description && (
        <p
          className="text-xs mb-4 px-3 py-2 rounded-lg"
          style={{
            backgroundColor: 'var(--surface-card)',
            color: 'var(--text-tertiary)',
          }}
        >
          {modelInfo.description}
        </p>
      )}

      {/* Error Message */}
      {error && (
        <div
          className="mb-4 px-3 py-2 rounded-lg text-sm"
          style={{
            backgroundColor: 'var(--error-bg)',
            color: 'var(--error-text)',
            border: '1px solid var(--error-border)',
          }}
        >
          {error}
        </div>
      )}

      {/* Generate Button */}
      <button
        onClick={() => { void handleGenerate(); }}
        disabled={isGenerating || !prompt.trim()}
        className="w-full py-2.5 rounded-xl font-medium text-sm transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
        style={{
          backgroundColor: 'var(--btn-primary-bg)',
          color: 'var(--btn-primary-text)',
          border: '1px solid var(--btn-primary-border)',
        }}
      >
        {isGenerating ? (
          <>
            <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
            </svg>
            Generating...
          </>
        ) : (
          <>
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
            Generate Image
          </>
        )}
      </button>
    </div>
  );
}

