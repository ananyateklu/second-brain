/**
 * Suggested Prompts Component
 * Shows quick action prompts when input is empty and agent mode is enabled
 */

import React from 'react';
import { SUGGESTED_PROMPTS, type SuggestedPrompt } from './suggested-prompts-data';

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

