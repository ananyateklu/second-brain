/**
 * Formatting Toolbar Component
 * Provides markdown formatting options for chat input
 *
 * Can be used standalone with props or with ChatInputContext
 */

import React from 'react';
import { FORMATTING_ACTIONS, type FormattingAction } from './formatting-actions';
import { useChatInputContextSafe } from './ChatInputContext';
import styles from '@styles/components/chat-input.module.css';

export interface ChatFormattingToolbarProps {
  /** Callback for formatting (optional if using context) */
  onFormat?: (before: string, after: string) => void;
  /** Custom formatting actions */
  actions?: FormattingAction[];
}

export function ChatFormattingToolbar({
  onFormat: propOnFormat,
  actions = FORMATTING_ACTIONS,
}: ChatFormattingToolbarProps) {
  // Use safe context hook - returns null if not in ChatInput context
  const contextValue = useChatInputContextSafe();

  const onFormat = propOnFormat ?? contextValue?.onFormat ?? (() => { /* no-op */ });
  const showToolbar = contextValue?.showToolbar ?? true;

  if (!showToolbar) return null;

  return (
    <div
      className={`${styles.toolbar} mb-2 flex items-center gap-1 px-3 py-2 rounded-xl`}
      style={{
        backgroundColor: 'var(--surface-elevated)',
        border: '1px solid var(--border)',
      }}
    >
      {actions.map((action, index) => (
        <React.Fragment key={action.id}>
          {action.separator && index > 0 && (
            <div className="w-px h-4 mx-1" style={{ backgroundColor: 'var(--border)' }} />
          )}
          <button
            onClick={() => { onFormat(action.before, action.after); }}
            className="p-1.5 rounded-lg transition-colors hover:bg-white/10"
            title={action.title}
            style={{ color: 'var(--text-secondary)' }}
          >
            {action.icon}
          </button>
        </React.Fragment>
      ))}
    </div>
  );
}

