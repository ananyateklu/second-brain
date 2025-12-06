/**
 * Image Generation Model Configuration
 * 
 * Defines image generation models and their capabilities for each provider.
 */

export interface ImageGenerationModelConfig {
  /** Provider name */
  provider: string;
  /** Available image generation models */
  models: ImageModelInfo[];
  /** Default model for this provider */
  defaultModel: string;
}

export interface ImageModelInfo {
  /** Model identifier */
  id: string;
  /** Display name */
  name: string;
  /** Supported sizes */
  sizes: string[];
  /** Default size */
  defaultSize: string;
  /** Whether quality options are supported */
  supportsQuality: boolean;
  /** Whether style options are supported */
  supportsStyle: boolean;
  /** Maximum images per request */
  maxCount: number;
  /** Description/notes about the model */
  description?: string;
}

/**
 * Image generation configurations for each provider
 */
export const IMAGE_GENERATION_CONFIGS: Record<string, ImageGenerationModelConfig> = {
  OpenAI: {
    provider: 'OpenAI',
    defaultModel: 'dall-e-3',
    models: [
      {
        id: 'dall-e-3',
        name: 'DALL-E 3',
        sizes: ['1024x1024', '1792x1024', '1024x1792'],
        defaultSize: '1024x1024',
        supportsQuality: true,
        supportsStyle: true,
        maxCount: 1, // DALL-E 3 only supports n=1
        description: 'Most advanced model with enhanced prompt following and detail',
      },
      {
        id: 'dall-e-2',
        name: 'DALL-E 2',
        sizes: ['256x256', '512x512', '1024x1024'],
        defaultSize: '1024x1024',
        supportsQuality: false,
        supportsStyle: false,
        maxCount: 10,
        description: 'Previous generation model, faster and more cost-effective',
      },
    ],
  },

  Gemini: {
    provider: 'Gemini',
    defaultModel: 'gemini-3-pro-image-preview',
    models: [
      {
        id: 'gemini-3-pro-image-preview',
        name: 'Gemini 3 Pro Image Preview',
        sizes: ['1024x1024', '1536x1024', '1024x1536', '1792x1024', '1024x1792'],
        defaultSize: '1024x1024',
        supportsQuality: false,
        supportsStyle: false,
        maxCount: 4,
        description: 'Native multimodal image generation with Gemini 3 Pro',
      },
      {
        id: 'gemini-2.5-flash-image-preview',
        name: 'Gemini 2.5 Flash Image Preview',
        sizes: ['1024x1024', '1536x1024', '1024x1536', '1792x1024', '1024x1792'],
        defaultSize: '1024x1024',
        supportsQuality: false,
        supportsStyle: false,
        maxCount: 4,
        description: 'Native multimodal image generation with Gemini 2.5 Flash Preview',
      },
      {
        id: 'gemini-2.5-flash-image',
        name: 'Gemini 2.5 Flash Image',
        sizes: ['1024x1024', '1536x1024', '1024x1536', '1792x1024', '1024x1792'],
        defaultSize: '1024x1024',
        supportsQuality: false,
        supportsStyle: false,
        maxCount: 4,
        description: 'Native multimodal image generation with Gemini 2.5 Flash Image',
      },
      {
        id: 'gemini-2.0-flash-exp-image-generation',
        name: 'Gemini 2.0 Flash Exp Image Generation',
        sizes: ['1024x1024', '1536x1024', '1024x1536', '1792x1024', '1024x1792'],
        defaultSize: '1024x1024',
        supportsQuality: false,
        supportsStyle: false,
        maxCount: 4,
        description: 'Native multimodal image generation with Gemini 2.5 Flash',
      },
      {
        id: 'gemini-2.0-flash-exp-image-generation',
        name: 'Gemini 2.0 Flash Exp Image Generation',
        sizes: ['1024x1024', '1536x1024', '1024x1536', '1792x1024', '1024x1792'],
        defaultSize: '1024x1024',
        supportsQuality: false,
        supportsStyle: false,
        maxCount: 4,
        description: 'Native multimodal image generation with Gemini 2.0 Flash Exp',
      },
    ],
  },

  Grok: {
    provider: 'Grok',
    defaultModel: 'grok-2-image',
    models: [
      {
        id: 'grok-2-image',
        name: 'Grok 2 Image (Aurora)',
        sizes: ['1024x1024', '1024x768', '768x1024'],
        defaultSize: '1024x1024',
        supportsQuality: false,
        supportsStyle: false,
        maxCount: 4,
        description: 'xAI\'s Aurora image generation model',
      },
      {
        id: 'grok-2-image-1212',
        name: 'Grok 2 Image (1212)',
        sizes: ['1024x1024', '1024x768', '768x1024'],
        defaultSize: '1024x1024',
        supportsQuality: false,
        supportsStyle: false,
        maxCount: 4,
        description: 'December 2024 version of Aurora',
      },
    ],
  },
};

/**
 * Quality options for models that support it
 */
export const QUALITY_OPTIONS = [
  { value: 'standard', label: 'Standard' },
  { value: 'hd', label: 'HD' },
];

/**
 * Style options for models that support it
 */
export const STYLE_OPTIONS = [
  { value: 'vivid', label: 'Vivid' },
  { value: 'natural', label: 'Natural' },
];

/**
 * Get image generation config for a provider
 */
export function getImageGenerationConfig(provider: string): ImageGenerationModelConfig | null {
  return IMAGE_GENERATION_CONFIGS[provider] || null;
}

/**
 * Get model info for a specific model
 */
export function getImageModelInfo(provider: string, modelId: string): ImageModelInfo | null {
  const config = IMAGE_GENERATION_CONFIGS[provider];
  if (!config) return null;
  return config.models.find(m => m.id === modelId) || null;
}

/**
 * Check if a provider supports image generation
 */
export function isImageGenerationProvider(provider: string): boolean {
  return provider in IMAGE_GENERATION_CONFIGS;
}

/**
 * Check if a specific model is an image generation model
 */
export function isImageGenerationModel(provider: string, modelId: string): boolean {
  const config = IMAGE_GENERATION_CONFIGS[provider];
  if (!config) return false;
  return config.models.some(m => m.id === modelId);
}

/**
 * Get all providers that support image generation
 */
export function getImageGenerationProviders(): string[] {
  return Object.keys(IMAGE_GENERATION_CONFIGS);
}

/**
 * Get default model for a provider
 */
export function getDefaultImageModel(provider: string): string | null {
  const config = IMAGE_GENERATION_CONFIGS[provider];
  return config?.defaultModel || null;
}

/**
 * Get available sizes for a specific model
 */
export function getModelSizes(provider: string, modelId: string): string[] {
  const modelInfo = getImageModelInfo(provider, modelId);
  return modelInfo?.sizes || ['1024x1024'];
}

/**
 * Format size for display
 */
export function formatSizeLabel(size: string): string {
  const [width, height] = size.split('x').map(Number);
  if (width === height) {
    return `${width}×${height} (Square)`;
  }
  const aspectRatio = width > height ? 'Landscape' : 'Portrait';
  return `${width}×${height} (${aspectRatio})`;
}

/**
 * Download a generated image
 */
export function downloadGeneratedImage(
  base64Data: string | undefined,
  url: string | undefined,
  filename = 'generated-image.png'
): void {
  if (base64Data) {
    // Create blob from base64
    const byteCharacters = atob(base64Data);
    const byteNumbers = new Array(byteCharacters.length);
    for (let i = 0; i < byteCharacters.length; i++) {
      byteNumbers[i] = byteCharacters.charCodeAt(i);
    }
    const byteArray = new Uint8Array(byteNumbers);
    const blob = new Blob([byteArray], { type: 'image/png' });

    // Create download link
    const downloadUrl = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = downloadUrl;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(downloadUrl);
  } else if (url) {
    // Open URL in new tab for download
    window.open(url, '_blank');
  }
}

/**
 * Get data URL from base64 data
 */
export function getImageDataUrl(base64Data: string, mediaType = 'image/png'): string {
  return `data:${mediaType};base64,${base64Data}`;
}

