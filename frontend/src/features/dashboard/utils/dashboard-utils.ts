/**
 * Dashboard Utilities
 * Re-exports theme color utilities and provides dashboard-specific helpers
 */

// Re-export theme color utilities from shared module
export {
  getThemeColors,
  getRagChartColor,
  getRegularChartColor,
  getImageGenChartColor,
  resetThemeColorCache as resetDashboardColorCache,
} from '../../../utils/theme-colors';

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
