/**
 * Suggested Prompts Component
 * Shows quick action prompts when input is empty and agent mode is enabled
 */

import React from 'react';

export interface SuggestedPrompt {
  id: string;
  label: string;
  icon: React.ReactNode;
}

// Default suggested prompts configuration
export const SUGGESTED_PROMPTS: SuggestedPrompt[] = [
  {
    id: 'summarize',
    label: 'Summarize my notes',
    icon: (
      <svg className="w-3.5 h-3.5" style={{ color: 'var(--color-brand-400)' }} fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
      </svg>
    )
  },
  {
    id: 'connections',
    label: 'Find connections',
    icon: (
      <svg className="w-3.5 h-3.5" style={{ color: 'var(--color-brand-400)' }} fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
      </svg>
    )
  },
  {
    id: 'ideas',
    label: 'Generate ideas',
    icon: (
      <svg className="w-3.5 h-3.5" style={{ color: 'var(--color-brand-400)' }} fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
      </svg>
    )
  },
  {
    id: 'questions',
    label: 'Ask questions',
    icon: (
      <svg className="w-3.5 h-3.5" style={{ color: 'var(--color-brand-400)' }} fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    )
  },
];

// Prompt templates for each suggestion
export const PROMPT_TEMPLATES: Record<string, string> = {
  summarize: 'Please summarize my notes on ',
  connections: 'What connections can you find between my notes about ',
  ideas: 'Based on my notes, can you generate some ideas for ',
  questions: 'What questions should I explore based on my notes about ',
};

export interface ChatSuggestedPromptsProps {
  onPromptClick: (promptId: string) => void;
  prompts?: SuggestedPrompt[];
}

export function ChatSuggestedPrompts({
  onPromptClick,
  prompts = SUGGESTED_PROMPTS,
}: ChatSuggestedPromptsProps) {
  return (
    <div className="mb-3 flex flex-wrap gap-2 justify-center">
      {prompts.map((prompt, index) => (
        <button
          key={prompt.id}
          onClick={() => onPromptClick(prompt.id)}
          className="prompt-chip px-3 py-1.5 rounded-full text-xs font-medium transition-all duration-200 hover:scale-105 active:scale-95 flex items-center gap-1.5"
          style={{
            '--chip-index': index,
            backgroundColor: 'var(--surface-elevated)',
            color: 'var(--text-secondary)',
            border: '1px solid var(--border)',
          } as React.CSSProperties}
        >
          {prompt.icon}
          {prompt.label}
        </button>
      ))}
    </div>
  );
}

