/**
 * Multimodal Model Configuration
 * 
 * Defines which models support image inputs for each AI provider.
 * This is used to enable/disable image upload in the chat interface.
 */

export interface MultimodalModelConfig {
  provider: string;
  // Model patterns that support vision/image inputs
  // Can be exact model names or patterns (with *)
  visionModels: string[];
  // Maximum number of images per message
  maxImages: number;
  // Maximum image size in bytes (default 20MB)
  maxImageSizeBytes: number;
  // Supported image formats
  supportedFormats: string[];
}

/**
 * Provider-specific multimodal configurations
 * 
 * NOTE: Most modern LLMs are multimodal by default. The patterns below
 * are designed to be inclusive of newer model versions.
 */
export const MULTIMODAL_CONFIGS: Record<string, MultimodalModelConfig> = {
  OpenAI: {
    provider: 'OpenAI',
    visionModels: [
      // GPT-4 variants with vision
      'gpt-4o*',              // gpt-4o, gpt-4o-mini, gpt-4o-2024-*, etc.
      'gpt-4-turbo*',         // gpt-4-turbo, gpt-4-turbo-preview, etc.
      'gpt-4-vision*',
      'gpt-4.1*',             // gpt-4.1, gpt-4.1-mini, gpt-4.1-nano, etc.
      'gpt-4.5*',             // gpt-4.5, gpt-4.5-preview, etc.
      // GPT-5 and future versions (all multimodal by default)
      'gpt-5*',
      'gpt-5.1*',             // Explicit support for gpt-5.1
      'gpt-6*',
      'gpt-7*',
      // O-series reasoning models (all support vision)
      'o1*',                  // o1, o1-mini, o1-preview, etc.
      'o3*',                  // o3, o3-mini, etc.
      'o4*',                  // o4, o4-mini, etc.
      'o5*',
      // Chatgpt models
      'chatgpt-4o*',
    ],
    maxImages: 10,
    maxImageSizeBytes: 20 * 1024 * 1024, // 20MB
    supportedFormats: ['image/jpeg', 'image/png', 'image/gif', 'image/webp'],
  },

  Claude: {
    provider: 'Claude',
    visionModels: [
      // All Claude 3.x models support vision (3, 3.5, 3.7, etc.)
      'claude-3*',            // claude-3-opus, claude-3-sonnet, claude-3-haiku, claude-3.5-*, claude-3.7-*, etc.
      // Claude 4.x and beyond (all multimodal)
      'claude-4*',            // claude-4, claude-4.5, claude-4-opus, claude-4-sonnet, etc.
      'claude-5*',
      'claude-6*',
      // Named models without version prefix
      'claude-sonnet*',       // claude-sonnet-4, claude-sonnet-4-*, etc.
      'claude-opus*',         // claude-opus-4, etc.
      'claude-haiku*',
    ],
    maxImages: 20,
    maxImageSizeBytes: 20 * 1024 * 1024, // 20MB for base64
    supportedFormats: ['image/jpeg', 'image/png', 'image/gif', 'image/webp'],
  },

  Gemini: {
    provider: 'Gemini',
    visionModels: [
      // All Gemini models are multimodal by design
      'gemini-1*',            // gemini-1.0-*, gemini-1.5-*, etc.
      'gemini-2*',            // gemini-2.0-*, gemini-2.5-*, etc.
      'gemini-3*',            // gemini-3.0-*, etc.
      'gemini-4*',
      'gemini-5*',
      'gemini-pro*',          // gemini-pro, gemini-pro-vision, gemini-pro-latest
      'gemini-flash*',        // gemini-flash, gemini-flash-*, etc.
      'gemini-ultra*',
      'gemini-nano*',
      // Experimental models
      'gemini-exp*',
    ],
    maxImages: 16,
    maxImageSizeBytes: 20 * 1024 * 1024, // 20MB
    supportedFormats: ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/heic', 'image/heif'],
  },

  Ollama: {
    provider: 'Ollama',
    visionModels: [
      // Vision-capable models in Ollama (must be explicitly vision models)
      'llava*',               // llava, llava:*, llava-llama3, llava-phi3, llava-v1.6-*, etc.
      'bakllava*',
      'moondream*',
      'minicpm-v*',
      'cogvlm*',
      'llama3.2-vision*',     // Meta's vision model
      'llama-3.2-vision*',
      'nanollava*',
      'obsidian*',
      'qwen3-vl*',
    ],
    maxImages: 4,
    maxImageSizeBytes: 10 * 1024 * 1024, // 10MB for local models
    supportedFormats: ['image/jpeg', 'image/png'],
  },

  Grok: {
    provider: 'Grok',
    visionModels: [
      // Only Grok models with "vision" in the name support images
      '*vision*',             // Any model with "vision" in the name
      'grok-2-vision*',
      'grok-vision*',
      'grok-3-vision*',
    ],
    maxImages: 4,
    maxImageSizeBytes: 10 * 1024 * 1024, // 10MB per xAI docs
    supportedFormats: ['image/jpeg', 'image/png'],
  },
};

/**
 * Check if a model name matches a pattern
 * Supports wildcards (*) at the start, end, or middle of patterns
 * Examples:
 *   - "gpt-4o*" matches "gpt-4o", "gpt-4o-mini", "gpt-4o-2024"
 *   - "*vision*" matches "grok-2-vision", "grok-vision-beta"
 *   - "claude-3*" matches "claude-3-opus", "claude-3.5-sonnet"
 */
function matchesPattern(modelName: string, pattern: string): boolean {
  const lowerModel = modelName.toLowerCase();
  const lowerPattern = pattern.toLowerCase();

  // Check if pattern contains wildcard
  if (lowerPattern.includes('*')) {
    // Convert glob pattern to regex
    // Escape special regex chars except *, then replace * with .*
    const regexPattern = lowerPattern
      .replace(/[.+?^${}()|[\]\\]/g, '\\$&')  // Escape special chars
      .replace(/\*/g, '.*');                    // Replace * with .*

    const regex = new RegExp(`^${regexPattern}$`);
    return regex.test(lowerModel);
  }

  return lowerModel === lowerPattern;
}

/**
 * Check if a model supports image/vision inputs
 */
export function isMultimodalModel(provider: string, model: string): boolean {
  const config = MULTIMODAL_CONFIGS[provider];
  if (!config) {
    return false;
  }

  return config.visionModels.some(pattern => matchesPattern(model, pattern));
}

/**
 * Get multimodal configuration for a provider
 */
export function getMultimodalConfig(provider: string): MultimodalModelConfig | null {
  return MULTIMODAL_CONFIGS[provider] ?? null;
}

/**
 * Validate an image file against provider constraints
 */
export function validateImageForProvider(
  file: File,
  provider: string
): { valid: boolean; error?: string } {
  const config = MULTIMODAL_CONFIGS[provider];

  if (!config) {
    return { valid: false, error: `Provider ${provider} does not support images` };
  }

  // Check file type
  if (!config.supportedFormats.includes(file.type)) {
    return {
      valid: false,
      error: `Unsupported image format. Supported: ${config.supportedFormats.join(', ')}`,
    };
  }

  // Check file size
  if (file.size > config.maxImageSizeBytes) {
    const maxMB = Math.round(config.maxImageSizeBytes / (1024 * 1024));
    return {
      valid: false,
      error: `Image too large. Maximum size: ${maxMB}MB`,
    };
  }

  return { valid: true };
}

/**
 * Convert a File to base64 data URL
 */
export function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      resolve(result);
    };
    reader.onerror = () => {
      reject(new Error('Failed to read file'));
    };
    reader.readAsDataURL(file);
  });
}

/**
 * Extract base64 data and media type from a data URL
 */
export function parseDataUrl(dataUrl: string): { mediaType: string; base64Data: string } | null {
  const match = /^data:([^;]+);base64,(.+)$/.exec(dataUrl);
  if (!match) {
    return null;
  }
  return {
    mediaType: match[1],
    base64Data: match[2],
  };
}

/**
 * Resize an image if it exceeds maximum dimensions
 * Returns the original dataUrl if no resizing is needed
 */
export async function resizeImageIfNeeded(
  dataUrl: string,
  maxWidth = 2048,
  maxHeight = 2048,
  quality = 0.9
): Promise<string> {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      // Check if resizing is needed
      if (img.width <= maxWidth && img.height <= maxHeight) {
        resolve(dataUrl);
        return;
      }

      // Calculate new dimensions
      let newWidth = img.width;
      let newHeight = img.height;

      if (newWidth > maxWidth) {
        newHeight = (maxWidth / newWidth) * newHeight;
        newWidth = maxWidth;
      }
      if (newHeight > maxHeight) {
        newWidth = (maxHeight / newHeight) * newWidth;
        newHeight = maxHeight;
      }

      // Create canvas and resize
      const canvas = document.createElement('canvas');
      canvas.width = newWidth;
      canvas.height = newHeight;

      const ctx = canvas.getContext('2d');
      if (!ctx) {
        resolve(dataUrl);
        return;
      }

      ctx.drawImage(img, 0, 0, newWidth, newHeight);

      // Get the result as data URL
      const parsed = parseDataUrl(dataUrl);
      const mimeType = parsed?.mediaType || 'image/jpeg';
      resolve(canvas.toDataURL(mimeType, quality));
    };
    img.onerror = () => { resolve(dataUrl); };
    img.src = dataUrl;
  });
}

/**
 * Image attachment type for the frontend
 */
export interface ImageAttachment {
  id: string;
  file: File;
  dataUrl: string;
  name: string;
  size: number;
  type: string;
}

/**
 * File attachment type for the frontend (extends beyond images)
 */
export interface FileAttachment {
  id: string;
  file: File;
  dataUrl: string;
  name: string;
  size: number;
  type: string;
  isImage: boolean;
  fileCategory: 'image' | 'pdf' | 'document' | 'text' | 'other';
}

/**
 * File type configuration
 */
export interface FileTypeConfig {
  mimeTypes: string[];
  extensions: string[];
  maxSizeBytes: number;
  category: FileAttachment['fileCategory'];
  icon: string;
}

/**
 * Supported file types configuration
 */
export const FILE_TYPE_CONFIGS: Record<string, FileTypeConfig> = {
  image: {
    mimeTypes: ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/heic', 'image/heif'],
    extensions: ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.heic', '.heif'],
    maxSizeBytes: 20 * 1024 * 1024, // 20MB
    category: 'image',
    icon: 'image',
  },
  pdf: {
    mimeTypes: ['application/pdf'],
    extensions: ['.pdf'],
    maxSizeBytes: 25 * 1024 * 1024, // 25MB
    category: 'pdf',
    icon: 'file-text',
  },
  document: {
    mimeTypes: [
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    ],
    extensions: ['.doc', '.docx', '.xls', '.xlsx'],
    maxSizeBytes: 25 * 1024 * 1024, // 25MB
    category: 'document',
    icon: 'file',
  },
  text: {
    mimeTypes: ['text/plain', 'text/markdown', 'text/csv', 'application/json'],
    extensions: ['.txt', '.md', '.csv', '.json'],
    maxSizeBytes: 5 * 1024 * 1024, // 5MB
    category: 'text',
    icon: 'file-text',
  },
};

/**
 * Image file type configuration (extracted for type safety)
 */
const IMAGE_CONFIG = FILE_TYPE_CONFIGS.image;

/**
 * Get file category from MIME type
 */
export function getFileCategory(mimeType: string): FileAttachment['fileCategory'] {
  for (const [, config] of Object.entries(FILE_TYPE_CONFIGS)) {
    if (config.mimeTypes.includes(mimeType)) {
      return config.category;
    }
  }
  return 'other';
}

/**
 * Check if a file type is an image
 */
export function isImageFile(mimeType: string): boolean {
  return IMAGE_CONFIG.mimeTypes.includes(mimeType);
}

/**
 * Get all supported MIME types
 */
export function getAllSupportedMimeTypes(): string[] {
  return Object.values(FILE_TYPE_CONFIGS).flatMap(config => config.mimeTypes);
}

/**
 * Get all supported file extensions
 */
export function getAllSupportedExtensions(): string[] {
  return Object.values(FILE_TYPE_CONFIGS).flatMap(config => config.extensions);
}

/**
 * Validate a file for attachment
 */
export function validateFileForAttachment(file: File): { valid: boolean; error?: string } {
  const category = getFileCategory(file.type);

  if (category === 'other') {
    const supportedTypes = getAllSupportedExtensions().join(', ');
    return {
      valid: false,
      error: `Unsupported file type. Supported: ${supportedTypes}`,
    };
  }

  const config = Object.values(FILE_TYPE_CONFIGS).find(c => c.category === category);
  if (config && file.size > config.maxSizeBytes) {
    const maxMB = Math.round(config.maxSizeBytes / (1024 * 1024));
    return {
      valid: false,
      error: `File too large. Maximum size for ${category} files: ${maxMB}MB`,
    };
  }

  return { valid: true };
}

/**
 * Format file size for display
 */
export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

/**
 * Create an image attachment from a file
 */
export async function createImageAttachment(file: File): Promise<ImageAttachment> {
  const dataUrl = await fileToBase64(file);
  const resizedDataUrl = await resizeImageIfNeeded(dataUrl);

  return {
    id: `img_${Date.now()}_${Math.random().toString(36).slice(2, 11)}`,
    file,
    dataUrl: resizedDataUrl,
    name: file.name,
    size: file.size,
    type: file.type,
  };
}

/**
 * Create a file attachment from a file (supports all file types)
 */
export async function createFileAttachment(file: File): Promise<FileAttachment> {
  const isImage = isImageFile(file.type);
  const dataUrl = await fileToBase64(file);
  const finalDataUrl = isImage ? await resizeImageIfNeeded(dataUrl) : dataUrl;

  return {
    id: `file_${Date.now()}_${Math.random().toString(36).slice(2, 11)}`,
    file,
    dataUrl: finalDataUrl,
    name: file.name,
    size: file.size,
    type: file.type,
    isImage,
    fileCategory: getFileCategory(file.type),
  };
}

