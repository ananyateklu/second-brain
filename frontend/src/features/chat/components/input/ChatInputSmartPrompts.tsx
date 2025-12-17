/**
 * ChatInput Smart Prompts Component
 * Shows AI-generated smart prompts when input is empty and conditions are met
 */

import React from 'react';
import { useChatInputContext } from './ChatInputContext';
import type { SuggestedPrompt } from './suggested-prompts-data';
import styles from '@styles/components/chat-input.module.css';

// Get icon for prompt category
function getCategoryIcon(category: SuggestedPrompt['category']) {
  switch (category) {
    case 'summarize':
      return (
        <svg className="w-3.5 h-3.5" style={{ color: 'var(--color-brand-400)' }} fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
        </svg>
      );
    case 'analyze':
      return (
        <svg className="w-3.5 h-3.5" style={{ color: 'var(--color-brand-400)' }} fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
        </svg>
      );
    case 'create':
      return (
        <svg className="w-3.5 h-3.5" style={{ color: 'var(--color-brand-400)' }} fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
        </svg>
      );
    case 'explore':
    default:
      return (
        <svg className="w-3.5 h-3.5" style={{ color: 'var(--color-brand-400)' }} fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      );
  }
}

export function ChatInputSmartPromptsPanel() {
  const {
    value,
    attachedFiles,
    disabled,
    agentModeEnabled,
    notesCapabilityEnabled,
    showSmartPrompts,
    displayPrompts,
    isLoadingPrompts,
    promptsGenerated,
    onToggleSmartPrompts,
    onGenerateSmartPrompts,
    onPromptClick,
    isImageGenerationMode,
  } = useChatInputContext();

  // Don't show if conditions aren't met
  if (
    isImageGenerationMode ||
    value.trim() ||
    attachedFiles.length ||
    disabled ||
    !agentModeEnabled ||
    !notesCapabilityEnabled ||
    !showSmartPrompts
  ) {
    return null;
  }

  return (
    <div className="mb-3 flex flex-col items-center gap-2">
      {/* Generate Smart Prompts Button with Close Button */}
      <div className="flex items-center gap-2">
        <button
          onClick={onGenerateSmartPrompts}
          disabled={isLoadingPrompts}
          className="px-3 py-1.5 rounded-lg text-xs font-medium transition-all duration-200 hover:scale-105 active:scale-95 flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
          style={{
            backgroundColor: promptsGenerated ? 'var(--surface-card-solid)' : 'var(--surface-card-solid)',
            color: promptsGenerated ? 'var(--text-secondary)' : 'var(--color-brand-400)',
            border: promptsGenerated ? '1px solid var(--border)' : '1px solid var(--color-brand-400)',
          }}
        >
          {isLoadingPrompts ? (
            <>
              <svg className="w-3.5 h-3.5 animate-spin" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
              </svg>
              <span>Generating...</span>
            </>
          ) : (
            <>
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
              </svg>
              <span>{promptsGenerated ? 'Regenerate Smart Prompts' : 'Generate Smart Prompts'}</span>
            </>
          )}
        </button>
        <button
          onClick={() => { onToggleSmartPrompts(false); }}
          className="p-1.5 rounded-lg transition-all duration-200 hover:scale-110 active:scale-95 flex items-center justify-center"
          style={{
            color: 'var(--text-tertiary)',
            backgroundColor: 'transparent',
          }}
          title="Close smart prompts"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      {/* Prompt Chips */}
      <div className="flex flex-wrap gap-2 justify-center">
        {displayPrompts.map((prompt, index) => (
          <button
            key={prompt.id}
            onClick={() => { onPromptClick(prompt); }}
            className={`${styles.promptChip} px-3 py-1.5 rounded-full text-xs font-medium transition-all duration-200 hover:scale-105 active:scale-95 flex items-center gap-1.5 max-w-xs truncate`}
            style={{
              '--chip-index': index,
              backgroundColor: promptsGenerated
                ? 'var(--prompt-chip-bg)'
                : 'var(--surface-elevated)',
              color: promptsGenerated ? 'var(--prompt-chip-text)' : 'var(--text-secondary)',
              border: promptsGenerated ? '1px solid var(--prompt-chip-border)' : '1px solid var(--border)',
            } as React.CSSProperties}
            title={prompt.promptTemplate}
          >
            {getCategoryIcon(prompt.category)}
            <span className="truncate">{prompt.label}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
