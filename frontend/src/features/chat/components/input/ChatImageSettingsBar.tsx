/**
 * Image Settings Bar Component
 * Shows image generation options when an image model is selected
 * 
 * Can be used standalone with props or with ChatInputContext
 */

import {
  formatSizeLabel,
  QUALITY_OPTIONS,
  STYLE_OPTIONS,
} from '../../../../utils/image-generation-models';
import { useChatInputContextSafe, type ImageModelInfo } from './ChatInputContext';

export type { ImageModelInfo };

export interface ChatImageSettingsBarProps {
  /** Model info (optional if using context) */
  modelInfo?: ImageModelInfo;
  /** Current size (optional if using context) */
  size?: string;
  /** Current quality (optional if using context) */
  quality?: string;
  /** Current style (optional if using context) */
  style?: string;
  /** Size change callback (optional if using context) */
  onSizeChange?: (size: string) => void;
  /** Quality change callback (optional if using context) */
  onQualityChange?: (quality: string) => void;
  /** Style change callback (optional if using context) */
  onStyleChange?: (style: string) => void;
  /** Whether controls are disabled */
  disabled?: boolean;
}

export function ChatImageSettingsBar({
  modelInfo: propModelInfo,
  size: propSize,
  quality: propQuality,
  style: propStyle,
  onSizeChange: propOnSizeChange,
  onQualityChange: propOnQualityChange,
  onStyleChange: propOnStyleChange,
  disabled: propDisabled,
}: ChatImageSettingsBarProps) {
  // Use safe context hook - returns null if not in ChatInput context
  const contextValue = useChatInputContextSafe();

  const modelInfo = propModelInfo ?? contextValue?.currentImageModelInfo;
  const size = propSize ?? contextValue?.imageSettings.size ?? '1024x1024';
  const quality = propQuality ?? contextValue?.imageSettings.quality ?? 'standard';
  const style = propStyle ?? contextValue?.imageSettings.style ?? 'vivid';
  const onSizeChange = propOnSizeChange ?? ((s: string) => contextValue?.onImageSettingsChange({ size: s }));
  const onQualityChange = propOnQualityChange ?? ((q: string) => contextValue?.onImageSettingsChange({ quality: q }));
  const onStyleChange = propOnStyleChange ?? ((s: string) => contextValue?.onImageSettingsChange({ style: s }));
  const disabled = propDisabled ?? contextValue?.isGeneratingImage ?? false;
  const isImageGenerationMode = contextValue?.isImageGenerationMode ?? true;

  // Don't render if no model info or not in image generation mode
  if (!modelInfo || !isImageGenerationMode) return null;

  return (
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
          value={size}
          onChange={(e) => { onSizeChange(e.target.value); }}
          disabled={disabled}
          className="px-2.5 py-1.5 rounded-lg text-xs outline-none cursor-pointer"
          style={{
            backgroundColor: 'var(--surface-card)',
            border: '1px solid var(--border)',
            color: 'var(--text-primary)',
          }}
        >
          {modelInfo.sizes.map((s) => (
            <option key={s} value={s}>
              {formatSizeLabel(s)}
            </option>
          ))}
        </select>
      </div>

      {/* Quality Selector (if supported) */}
      {modelInfo.supportsQuality && (
        <div className="flex items-center gap-2">
          <label className="text-xs font-medium" style={{ color: 'var(--text-tertiary)' }}>
            Quality
          </label>
          <select
            value={quality}
            onChange={(e) => { onQualityChange(e.target.value); }}
            disabled={disabled}
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
      {modelInfo.supportsStyle && (
        <div className="flex items-center gap-2">
          <label className="text-xs font-medium" style={{ color: 'var(--text-tertiary)' }}>
            Style
          </label>
          <select
            value={style}
            onChange={(e) => { onStyleChange(e.target.value); }}
            disabled={disabled}
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
      {modelInfo.description && (
        <div className="ml-auto" title={modelInfo.description}>
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
  );
}

