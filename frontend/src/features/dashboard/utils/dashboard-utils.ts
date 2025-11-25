// Cache theme colors - read once instead of on every render
let cachedThemeColors: string[] | null = null;
let cachedRagChartColor: string | null = null;
let cachedRegularChartColor: string | null = null;

export const getThemeColors = (): string[] => {
  if (cachedThemeColors) return cachedThemeColors;

  const style = getComputedStyle(document.documentElement);
  cachedThemeColors = [
    style.getPropertyValue('--color-brand-600').trim() || '#36693d', // Primary green
    style.getPropertyValue('--color-brand-500').trim() || '#4a7d52', // Medium green
    style.getPropertyValue('--color-brand-700').trim() || '#2f5638', // Medium-dark green
    style.getPropertyValue('--color-brand-400').trim() || '#5e9167', // Medium-light green
    style.getPropertyValue('--color-brand-300').trim() || '#7aa884', // Light green
    style.getPropertyValue('--color-brand-800').trim() || '#25422b', // Dark green
  ];
  return cachedThemeColors;
};

export const getRagChartColor = (): string => {
  if (cachedRagChartColor) return cachedRagChartColor;

  const style = getComputedStyle(document.documentElement);
  cachedRagChartColor = style.getPropertyValue('--color-brand-600').trim() || '#36693d';
  return cachedRagChartColor;
};

export const getRegularChartColor = (): string => {
  if (cachedRegularChartColor) return cachedRegularChartColor;

  const style = getComputedStyle(document.documentElement);
  cachedRegularChartColor = style.getPropertyValue('--color-brand-400').trim() || '#5e9167';
  return cachedRegularChartColor;
};

// Reset cache when theme changes (call this from your theme switcher)
export const resetDashboardColorCache = (): void => {
  cachedThemeColors = null;
  cachedRagChartColor = null;
  cachedRegularChartColor = null;
};

export const formatTokenCount = (count: number): string => {
  if (count >= 1000000) return `${(count / 1000000).toFixed(1)}M`;
  if (count >= 1000) return `${(count / 1000).toFixed(1)}k`;
  return count.toString();
};

// Extract provider from model name - static function for better performance
export const getProviderFromModelName = (modelName: string): string => {
  const lower = modelName.toLowerCase();
  if (lower.startsWith('claude-')) return 'Anthropic';
  if (lower.startsWith('gpt-') || /^o\d/.test(lower) ||
    lower.includes('dall-e') || lower.includes('whisper') || lower.includes('text-embedding') ||
    lower.includes('chatgpt') || lower.includes('sora') || lower.includes('codex')) return 'OpenAI';
  if (lower.startsWith('gemini-')) return 'Google';
  if (lower.startsWith('grok-')) return 'xAI';
  if (lower.includes(':') || lower.includes('llama')) return 'Ollama';
  return 'Other';
};

// Time range options in days
export const TIME_RANGE_OPTIONS = [
  { label: '7D', days: 7 },
  { label: '30D', days: 30 },
  { label: '90D', days: 90 },
  { label: '6M', days: 180 },
  { label: '1Y', days: 365 },
  { label: '2Y', days: 730 },
] as const;

export type TimeRangeOption = typeof TIME_RANGE_OPTIONS[number];

