/**
 * Model categorization utility
 * Categorizes AI models by their capabilities based on model name patterns
 */

export type ModelCategory = 'text' | 'vision' | 'audio' | 'embedding' | 'image-gen' | 'other';

export interface CategorizedModel {
  model: string;
  category: ModelCategory;
}

export interface ModelCategoryGroup {
  category: ModelCategory;
  displayName: string;
  models: string[];
}

/**
 * Categorizes a model based on its name
 */
export function categorizeModel(modelName: string): ModelCategory {
  if (!modelName) return 'other';

  const lower = modelName.toLowerCase();

  // Image Generation models
  if (
    lower.includes('dall-e') ||
    lower.includes('sora') ||
    lower.includes('grok-2-image') ||
    lower.includes('grok-2-vision-image') ||
    // Gemini image generation models
    (lower.includes('gemini') && lower.includes('image') && !lower.includes('vision'))
  ) {
    return 'image-gen';
  }

  // Embedding models
  if (lower.includes('text-embedding') || lower.includes('-embedding')) {
    return 'embedding';
  }

  // Audio models
  if (
    lower.includes('-audio') ||
    lower.includes('-tts') ||
    lower.includes('-transcribe') ||
    lower.includes('-diarize') ||
    lower.includes('whisper')
  ) {
    return 'audio';
  }

  // Vision/Multimodal models
  // Only models with explicit vision/image indicators or vision-specific models
  // Note: Most models that support vision are still primarily text models, so they go in "text"
  if (
    lower.includes('-vision') ||
    lower.includes('gpt-4-vision') ||
    lower.includes('grok-2-vision') ||
    // Only include explicit vision variants, not all models from a series
    (lower.includes('gemini') && (lower.includes('-image') || lower.includes('-vision')))
  ) {
    return 'vision';
  }

  // Text models (default for chat/completion models)
  // This includes multimodal models that are primarily text-based (Claude, GPT-4o, Gemini, etc.)
  if (
    lower.startsWith('gpt-') ||
    lower.startsWith('claude-') ||
    lower.startsWith('gemini-') ||
    lower.startsWith('grok-') ||
    lower.startsWith('o1') ||
    lower.startsWith('o3') ||
    lower.includes('llama') ||
    lower.includes('chatgpt')
  ) {
    return 'text';
  }

  // Default to other for unknown models
  return 'other';
}

/**
 * Groups models by category
 */
export function groupModelsByCategory(models: string[]): ModelCategoryGroup[] {
  const categoryMap = new Map<ModelCategory, string[]>();

  // Initialize all categories
  const categories: ModelCategory[] = ['text', 'vision', 'audio', 'embedding', 'image-gen', 'other'];
  categories.forEach(cat => categoryMap.set(cat, []));

  // Categorize each model
  models.forEach(model => {
    const category = categorizeModel(model);
    const categoryModels = categoryMap.get(category) || [];
    categoryModels.push(model);
    categoryMap.set(category, categoryModels);
  });

  // Convert to array of groups, filtering out empty categories
  const categoryDisplayNames: Record<ModelCategory, string> = {
    text: 'Text',
    vision: 'Vision',
    audio: 'Audio',
    embedding: 'Embedding',
    'image-gen': 'Image Generation',
    other: 'Other',
  };

  return categories
    .map(category => ({
      category,
      displayName: categoryDisplayNames[category],
      models: categoryMap.get(category) || [],
    }))
    .filter(group => group.models.length > 0);
}

/**
 * Gets the display name for a category
 */
export function getCategoryDisplayName(category: ModelCategory): string {
  const displayNames: Record<ModelCategory, string> = {
    text: 'Text',
    vision: 'Vision',
    audio: 'Audio',
    embedding: 'Embedding',
    'image-gen': 'Image Generation',
    other: 'Other',
  };
  return displayNames[category];
}

