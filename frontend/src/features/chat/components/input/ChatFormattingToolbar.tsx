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
      className={`${styles.toolbar} mb-2 flex items-center gap-1 px-3 py-2 rounded-2xl backdrop-blur-xl`}
      style={{
        background: 'var(--glass-bg)',
        border: '1px solid var(--glass-border)',
        boxShadow: 'var(--glass-shadow)',
      }}
    >
      {actions.map((action, index) => (
        <React.Fragment key={action.id}>
          {action.separator && index > 0 && (
            <div className="w-px h-4 mx-1" style={{ backgroundColor: 'var(--glass-border)' }} />
          )}
          <button
            onClick={() => { onFormat(action.before, action.after); }}
            className="p-1.5 rounded-lg transition-colors"
            title={action.title}
            style={{ color: 'var(--text-secondary)' }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = 'color-mix(in srgb, var(--text-primary) 4%, transparent)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = 'transparent';
            }}
          >
            {action.icon}
          </button>
        </React.Fragment>
      ))}
    </div>
  );
}

