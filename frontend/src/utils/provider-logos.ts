import { useBoundStore } from '../store/bound-store';
import { isDarkTheme, type ThemeId } from '../config/themes';
import anthropicLight from '../assets/anthropic-light.svg';
import anthropicDark from '../assets/anthropic-dark.svg';
import googleLogo from '../assets/google.svg';
import ollamaLogo from '../assets/ollama.svg';
import openaiLight from '../assets/openai-light.svg';
import openaiDark from '../assets/openai-dark.svg';
import xaiLight from '../assets/xai-light.svg';
import xaiDark from '../assets/xai-dark.svg';

/**
 * CSS variable names for AI provider brand colors
 * Colors are defined in styles/globals/theme/colors.css
 */
const PROVIDER_CSS_VARS: Record<string, string> = {
  openai: '--color-provider-openai',
  anthropic: '--color-provider-anthropic',
  google: '--color-provider-google',
  xai: '--color-provider-xai',
  ollama: '--color-provider-ollama',
  cohere: '--color-provider-cohere',
  unknown: '--color-provider-unknown',
};

/**
 * Fallback CSS variable names for unknown providers
 */
const FALLBACK_CSS_VARS = [
  '--color-provider-fallback-1',
  '--color-provider-fallback-2',
  '--color-provider-fallback-3',
  '--color-provider-fallback-4',
  '--color-provider-fallback-5',
  '--color-provider-fallback-6',
];

/**
 * Get CSS variable value from the document
 */
function getCssVariableValue(varName: string): string {
  if (typeof document === 'undefined') {
    // SSR fallback - return the variable reference
    return `var(${varName})`;
  }
  const value = getComputedStyle(document.documentElement).getPropertyValue(varName).trim();
  return value || `var(${varName})`;
}

/**
 * Get the official brand color for a provider
 * Returns the computed CSS color value
 */
export function getProviderColor(providerName: string): string {
  const normalizedName = providerName.toLowerCase();
  const cssVar = PROVIDER_CSS_VARS[normalizedName] ?? PROVIDER_CSS_VARS.unknown;
  return getCssVariableValue(cssVar);
}

/**
 * Get provider color by name with fallback for unknown providers
 * Used when providers are displayed in a list/chart
 */
export function getProviderColorByName(providerName: string, fallbackIndex?: number): string {
  const normalizedName = providerName.toLowerCase();
  const cssVar = PROVIDER_CSS_VARS[normalizedName];

  if (cssVar) {
    return getCssVariableValue(cssVar);
  }

  // Use fallback colors for unknown providers
  if (fallbackIndex !== undefined) {
    const fallbackVar = FALLBACK_CSS_VARS[fallbackIndex % FALLBACK_CSS_VARS.length];
    return getCssVariableValue(fallbackVar);
  }

  return getCssVariableValue(PROVIDER_CSS_VARS.unknown);
}

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
  } else if (normalizedName === 'google') {
    return googleLogo;
  } else if (normalizedName === 'ollama') {
    return ollamaLogo;
  } else if (normalizedName === 'xai') {
    return isDarkMode ? xaiDark : xaiLight;
  }

  return null;
}

/**
 * Hook to get provider logo with automatic theme detection.
 * Use this in React components.
 */
export function useProviderLogo(providerName: string): string | null {
  const theme = useBoundStore((state) => state.theme) as ThemeId;
  return getProviderLogo(providerName, isDarkTheme(theme));
}
