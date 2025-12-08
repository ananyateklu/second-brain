import { useThemeStore } from '../store/theme-store';
import anthropicLight from '../assets/anthropic-light.svg';
import anthropicDark from '../assets/anthropic-dark.svg';
import googleLogo from '../assets/google.svg';
import ollamaLogo from '../assets/ollama.svg';
import openaiLight from '../assets/openai-light.svg';
import openaiDark from '../assets/openai-dark.svg';
import xaiLight from '../assets/xai-light.svg';
import xaiDark from '../assets/xai-dark.svg';

/**
 * Get provider logo based on provider name and theme.
 * This is a pure function that accepts theme as a parameter.
 */
export function getProviderLogo(providerName: string, isDarkMode: boolean): string | null {
  const normalizedName = providerName.toLowerCase();

  // Map provider names to logo IDs
  if (normalizedName === 'openai') {
    return isDarkMode ? openaiDark : openaiLight;
  } else if (normalizedName === 'anthropic' || normalizedName === 'claude') {
    return isDarkMode ? anthropicDark : anthropicLight;
  } else if (normalizedName === 'google' || normalizedName === 'gemini') {
    return googleLogo;
  } else if (normalizedName === 'ollama') {
    return ollamaLogo;
  } else if (normalizedName === 'xai' || normalizedName === 'grok') {
    return isDarkMode ? xaiDark : xaiLight;
  }

  return null;
}

/**
 * Hook to get provider logo with automatic theme detection.
 * Use this in React components.
 */
export function useProviderLogo(providerName: string): string | null {
  const { theme } = useThemeStore();
  const isDarkMode = theme === 'dark' || theme === 'blue';
  return getProviderLogo(providerName, isDarkMode);
}
