/**
 * Suggested Prompts Data
 * Default suggested prompts configuration and templates
 * 
 * Uses the SuggestedPrompt type from types/chat.ts for API compatibility
 */

import type { SuggestedPrompt } from '../../../../types/chat';

// Re-export the type for convenience
export type { SuggestedPrompt };

// Default suggested prompts configuration (matches API response format)
export const SUGGESTED_PROMPTS: SuggestedPrompt[] = [
  {
    id: 'summarize',
    label: 'Summarize my notes',
    promptTemplate: 'Please summarize my notes on ',
    category: 'summarize',
  },
  {
    id: 'connections',
    label: 'Find connections',
    promptTemplate: 'What connections can you find between my notes about ',
    category: 'explore',
  },
  {
    id: 'ideas',
    label: 'Generate ideas',
    promptTemplate: 'Based on my notes, can you generate some ideas for ',
    category: 'create',
  },
  {
    id: 'questions',
    label: 'Ask questions',
    promptTemplate: 'What questions should I explore based on my notes about ',
    category: 'explore',
  },
];

// Prompt templates for each suggestion (legacy compatibility)
export const PROMPT_TEMPLATES: Record<string, string> = {
  summarize: 'Please summarize my notes on ',
  connections: 'What connections can you find between my notes about ',
  ideas: 'Based on my notes, can you generate some ideas for ',
  questions: 'What questions should I explore based on my notes about ',
};
